import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { env } from '../config/environment.js';
import { UploadedFile, FileCategory, AccessTier } from '../models/UploadedFile.js';
import { FieldVisit } from '../models/FieldVisit.js';
import { Appointment } from '../models/Appointment.js';
import { AppError } from '../middleware/errorHandler.js';

export interface UploadIntentDTO {
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  fileCategory: FileCategory;
  userId: string;
  patientId?: string;
}

export interface PresignedUploadResponse {
  fileId: string;
  uploadUrl: string;
  method: 'PUT';
  s3Key: string;
  expiresInSeconds: number;
  accessTier: AccessTier;
  headers: Record<string, string>;
  isMockAdapter: boolean;
  notice?: string;
}

const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  profile_picture: ['image/jpeg', 'image/png', 'image/webp'],
  professional_profile_image: ['image/jpeg', 'image/png', 'image/webp'],
  equipment_product_image: ['image/jpeg', 'image/png', 'image/webp'],
  credential_document: ['application/pdf', 'image/jpeg', 'image/png'],
  prescription: ['application/pdf', 'image/jpeg', 'image/png'],
  clinical_report: ['application/pdf', 'image/jpeg', 'image/png'],
};

const MAX_FILE_SIZES: Record<FileCategory, number> = {
  profile_picture: 5 * 1024 * 1024, // 5MB
  professional_profile_image: 5 * 1024 * 1024, // 5MB
  equipment_product_image: 8 * 1024 * 1024, // 8MB
  credential_document: 10 * 1024 * 1024, // 10MB
  prescription: 10 * 1024 * 1024, // 10MB
  clinical_report: 15 * 1024 * 1024, // 15MB
};

const CATEGORY_ACCESS_TIER: Record<FileCategory, AccessTier> = {
  profile_picture: 'PUBLIC_READ',
  professional_profile_image: 'PUBLIC_READ',
  equipment_product_image: 'PUBLIC_READ',
  credential_document: 'RESTRICTED_VERIFICATION_ONLY',
  prescription: 'PATIENT_CLINICIAN_CONFIDENTIAL',
  clinical_report: 'PATIENT_CLINICIAN_CONFIDENTIAL',
};

// Initialize S3 client only if real credentials provided
const isAwsConfigured = Boolean(
  env.AWS_ACCESS_KEY_ID && 
  env.AWS_SECRET_ACCESS_KEY && 
  env.AWS_ACCESS_KEY_ID !== 'mock_aws_access_key'
);

const s3Client = isAwsConfigured
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

export const createUploadIntent = async (
  data: UploadIntentDTO
): Promise<PresignedUploadResponse> => {
  const { filename, mimeType, fileSizeBytes, fileCategory, userId, patientId } = data;

  // 1. Validate Category
  if (!ALLOWED_MIME_TYPES[fileCategory]) {
    throw new AppError(
      `Invalid file category '${fileCategory}'. Allowed: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`,
      400
    );
  }

  // 2. Validate MIME Type
  const allowedTypes = ALLOWED_MIME_TYPES[fileCategory];
  if (!allowedTypes.includes(mimeType.toLowerCase())) {
    throw new AppError(
      `File format '${mimeType}' is not supported for ${fileCategory}. Supported types: ${allowedTypes.join(', ')}`,
      400
    );
  }

  // 3. Validate File Size
  const maxSize = MAX_FILE_SIZES[fileCategory];
  if (fileSizeBytes <= 0 || fileSizeBytes > maxSize) {
    throw new AppError(
      `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)}MB) exceeds maximum permitted limit (${maxSize / (1024 * 1024)}MB) for ${fileCategory}`,
      400
    );
  }

  // 4. Generate unique fileId and S3 Key (structured path)
  const fileId = `vq_file_${crypto.randomBytes(8).toString('hex')}`;
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const s3Key = `uploads/${fileCategory}/${userId}/${Date.now()}_${sanitizedFilename}`;
  const accessTier = CATEGORY_ACCESS_TIER[fileCategory];

  const parsedPatientId = patientId && mongoose.Types.ObjectId.isValid(patientId)
    ? new mongoose.Types.ObjectId(patientId)
    : (['prescription', 'clinical_report'].includes(fileCategory) ? new mongoose.Types.ObjectId(userId) : undefined);

  // 5. Create File Metadata Document in MongoDB
  // Storing ONLY metadata, bucket, s3Key, size. ZERO Base64 binaries in MongoDB.
  await UploadedFile.create({
    fileId,
    s3Key,
    s3Bucket: env.AWS_S3_BUCKET,
    originalFilename: filename,
    mimeType: mimeType.toLowerCase(),
    fileSizeBytes,
    uploadedBy: new mongoose.Types.ObjectId(userId),
    patientId: parsedPatientId,
    fileCategory,
    accessTier,
    uploadStatus: 'pending_upload',
    kmsEncrypted: true,
  });

  const ttlSeconds = env.S3_PRESIGNED_UPLOAD_TTL_SECONDS;

  // 6. Generate presigned PUT URL
  if (isAwsConfigured && s3Client) {
    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: s3Key,
      ContentType: mimeType,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: env.AWS_KMS_KEY_ID || undefined,
      Metadata: {
        'x-uploaded-by': userId,
        'x-file-category': fileCategory,
        'x-access-tier': accessTier,
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: ttlSeconds,
    });

    return {
      fileId,
      uploadUrl: presignedUrl,
      method: 'PUT',
      s3Key,
      expiresInSeconds: ttlSeconds,
      accessTier,
      headers: {
        'Content-Type': mimeType,
      },
      isMockAdapter: false,
    };
  }

  // Safe Mock Adapter fallback
  const mockUrl = `${env.API_BASE_URL}/api/v1/mock-storage/upload/${fileId}`;
  return {
    fileId,
    uploadUrl: mockUrl,
    method: 'PUT',
    s3Key,
    expiresInSeconds: ttlSeconds,
    accessTier,
    headers: {
      'Content-Type': mimeType,
    },
    isMockAdapter: true,
    notice: 'MOCK_STORAGE_ADAPTER_ACTIVE: AWS S3 credentials are not configured or set to mock. Metadata has been safely registered in MongoDB; real object upload is disabled in local test environment.',
  };
};

export const confirmUpload = async (fileId: string, userId: string) => {
  const file = await UploadedFile.findOne({ fileId });
  if (!file) {
    throw new AppError('File metadata record not found', 404);
  }

  if (file.uploadedBy.toString() !== userId) {
    throw new AppError('Forbidden: You are not authorized to confirm this file upload', 403);
  }

  file.uploadStatus = 'confirmed';
  file.confirmedAt = new Date();
  await file.save();

  return file;
};

export const getSecureDownloadUrl = async (fileId: string, requestingUserId: string, requestingUserRole: string) => {
  const file = await UploadedFile.findOne({ fileId });
  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Authorization check based on AccessTier
  if (file.accessTier === 'RESTRICTED_VERIFICATION_ONLY') {
    if (file.uploadedBy.toString() !== requestingUserId && !['admin', 'super_admin'].includes(requestingUserRole)) {
      throw new AppError('Access to private credential documents is restricted to credentialing admins and the owner.', 403);
    }
  }

  if (file.accessTier === 'PATIENT_CLINICIAN_CONFIDENTIAL') {
    const isOwner = file.uploadedBy.toString() === requestingUserId;
    const isTargetPatient = file.patientId && file.patientId.toString() === requestingUserId;
    const isAdmin = ['admin', 'super_admin'].includes(requestingUserRole);

    if (!isOwner && !isTargetPatient && !isAdmin) {
      const isClinicianOrCaregiver = ['professional', 'doctor', 'nurse', 'caregiver'].includes(requestingUserRole);
      if (!isClinicianOrCaregiver) {
        throw new AppError('Forbidden: Confidential medical records are accessible only to the patient, assigned clinicians, and administrators.', 403);
      }

      // Target patient is either explicit patientId or uploader (if patient uploaded)
      const targetPatientId = file.patientId || file.uploadedBy;

      const [assignedVisit, assignedAppointment] = await Promise.all([
        FieldVisit.exists({
          providerId: new mongoose.Types.ObjectId(requestingUserId),
          patientId: targetPatientId,
        }),
        Appointment.exists({
          doctorId: new mongoose.Types.ObjectId(requestingUserId),
          patientId: targetPatientId,
        }),
      ]);

      if (!assignedVisit && !assignedAppointment) {
        throw new AppError('Forbidden: Access denied. You are not an assigned clinician or caregiver for this patient.', 403);
      }
    }
  }

  if (isAwsConfigured && s3Client) {
    const command = new GetObjectCommand({
      Bucket: file.s3Bucket,
      Key: file.s3Key,
    });
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: env.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS,
    });
    return { url, expiresAt: new Date(Date.now() + env.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS * 1000) };
  }

  return {
    url: `${env.API_BASE_URL}/api/v1/mock-storage/download/${file.fileId}`,
    expiresAt: new Date(Date.now() + env.S3_PRESIGNED_DOWNLOAD_TTL_SECONDS * 1000),
    isMockAdapter: true,
  };
};
