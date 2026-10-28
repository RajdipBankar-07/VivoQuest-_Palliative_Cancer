import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  caregiverApi,
  setOnUnauthorizedListener,
  SessionExpiredError,
  getMobileApiBaseUrl,
} from './src/services/apiClient';
import { authStorage, StorageType } from './src/services/authStorage';
import { LoginView } from './src/components/LoginView';
import {
  CaregiverSession,
  FieldVisit,
  AssignedPatient,
  FieldVisitStatus,
  VisitRescheduleRequest,
  FullProfessionalProfileResponse,
  ProfessionalCredential,
  HealthcareProfileData,
} from './src/types';

export default function CaregiverApp() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'record' | 'patients' | 'profile'>('schedule');
  const [userSession, setUserSession] = useState<CaregiverSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [storageType, setStorageType] = useState<StorageType>('in_memory_transient_fallback');

  // Live Backend Data States
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [assignedPatients, setAssignedPatients] = useState<AssignedPatient[]>([]);
  const [rescheduleRequests, setRescheduleRequests] = useState<VisitRescheduleRequest[]>([]);
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Phase 2: Reschedule Approval / Rejection State
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<VisitRescheduleRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState<boolean>(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // Phase 3: Assignment Acceptance / Rejection State
  const [rejectingVisit, setRejectingVisit] = useState<FieldVisit | null>(null);
  const [visitRejectionReason, setVisitRejectionReason] = useState<string>('');
  const [isSubmittingVisitRejection, setIsSubmittingVisitRejection] = useState<boolean>(false);
  const [visitRejectionError, setVisitRejectionError] = useState<string | null>(null);
  const [processingVisitId, setProcessingVisitId] = useState<string | null>(null);

  // Vitals & Care Report Form State
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [systolicBP, setSystolicBP] = useState('120');
  const [diastolicBP, setDiastolicBP] = useState('80');
  const [pulseRate, setPulseRate] = useState('74');
  const [spo2, setSpo2] = useState('98');
  const [temperature, setTemperature] = useState('98.4');
  const [bloodSugar, setBloodSugar] = useState('110');
  const [painScore, setPainScore] = useState('2');
  const [respiratoryRate, setRespiratoryRate] = useState('18');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [proceduresPerformed, setProceduresPerformed] = useState<string[]>([
    'Vitals Assessment (BP, Pulse, SpO2, Temp)',
  ]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);

  // Phase 13: Healthcare Professional Profile & Credentials State
  const [profileData, setProfileData] = useState<FullProfessionalProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);
  const [profileActionLoading, setProfileActionLoading] = useState<boolean>(false);
  const [profileBannerError, setProfileBannerError] = useState<string | null>(null);
  const [profileBannerSuccess, setProfileBannerSuccess] = useState<string | null>(null);

  // Edit Profile Modal State
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editTitle, setEditTitle] = useState<string>('');
  const [editHighestQual, setEditHighestQual] = useState<string>('');
  const [editInstitution, setEditInstitution] = useState<string>('');
  const [editSpecialization, setEditSpecialization] = useState<string>('');
  const [editYearsExp, setEditYearsExp] = useState<string>('3');
  const [editExpSummary, setEditExpSummary] = useState<string>('');
  const [editSkills, setEditSkills] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');

  // Add Credential Modal State
  const [isAddCredModalOpen, setIsAddCredModalOpen] = useState<boolean>(false);
  const [newCertTitle, setNewCertTitle] = useState<string>('');
  const [newIssuingOrg, setNewIssuingOrg] = useState<string>('');
  const [newCredCategory, setNewCredCategory] = useState<string>('');
  const [newDocNumber, setNewDocNumber] = useState<string>('');
  const [newDocType, setNewDocType] = useState<string>('other_certification');

  // ---------------------------------------------------------------------------
  // 1. Session Bootstrap & 401 Listener Setup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    setOnUnauthorizedListener(() => {
      if (isMounted) {
        setUserSession(null);
        Alert.alert('Session Expired', 'Your session has expired. Please sign in again.');
      }
    });

    async function bootstrap() {
      try {
        const type = await authStorage.getStorageType();
        if (isMounted) setStorageType(type);

        const token = await authStorage.getToken();
        const savedUser = await authStorage.getUser();

        if (token && savedUser) {
          if (isMounted) setUserSession(savedUser);
        }
      } catch (err) {
        console.warn('[CaregiverApp] Bootstrap error:', err);
      } finally {
        if (isMounted) setIsBootstrapping(false);
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
      setOnUnauthorizedListener(null);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Fetch Live Visits & Patients
  // ---------------------------------------------------------------------------
  const loadVisits = useCallback(async () => {
    if (!userSession) return;
    setIsLoadingVisits(true);
    setApiError(null);

    try {
      const data = await caregiverApi.getAssignedVisits();
      setVisits(data);
      if (data.length > 0 && !selectedVisitId) {
        // Default selected visit to the first active or upcoming visit
        const activeOne = data.find((v) => v.status === 'in_progress' || v.status === 'arrived') || data[0];
        setSelectedVisitId(activeOne.id);
      }
    } catch (err: any) {
      if (!(err instanceof SessionExpiredError)) {
        setApiError(err.message || 'Unable to load assigned visits.');
      }
    } finally {
      setIsLoadingVisits(false);
    }
  }, [userSession, selectedVisitId]);

  const loadPatients = useCallback(async () => {
    if (!userSession) return;
    setIsLoadingPatients(true);

    try {
      const data = await caregiverApi.getAssignedPatients();
      setAssignedPatients(data);
    } catch (err: any) {
      if (!(err instanceof SessionExpiredError)) {
        console.warn('[CaregiverApp] Error fetching patients:', err.message);
      }
    } finally {
      setIsLoadingPatients(false);
    }
  }, [userSession]);

  const loadRescheduleRequests = useCallback(async () => {
    if (!userSession) return;
    setIsLoadingRequests(true);

    try {
      const data = await caregiverApi.getPendingRescheduleRequests();
      setRescheduleRequests(data);
    } catch (err: any) {
      if (!(err instanceof SessionExpiredError)) {
        console.warn('[CaregiverApp] Error fetching reschedule requests:', err.message);
      }
    } finally {
      setIsLoadingRequests(false);
    }
  }, [userSession]);

  const loadProfile = useCallback(async () => {
    if (!userSession) return;
    setIsLoadingProfile(true);
    try {
      const data = await caregiverApi.getProfessionalProfile();
      if (data) {
        setProfileData(data);
        setEditFullName(data.user?.fullName || '');
        setEditEmail(data.user?.email || '');
        setEditTitle(data.profile?.title || '');
        setEditHighestQual(data.profile?.highestQualification || '');
        setEditInstitution(data.profile?.institution || '');
        setEditSpecialization(data.profile?.specializations?.join(', ') || '');
        setEditYearsExp(String(data.profile?.yearsOfExperience ?? 3));
        setEditExpSummary(data.profile?.experienceSummary || '');
        setEditSkills(data.profile?.skills?.join(', ') || '');
        setEditBio(data.profile?.bio || '');
      }
    } catch (err: any) {
      if (!(err instanceof SessionExpiredError)) {
        console.warn('[CaregiverApp] Error fetching professional profile:', err.message);
      }
    } finally {
      setIsLoadingProfile(false);
    }
  }, [userSession]);

  const handleOpenEditProfile = () => {
    if (profileData) {
      setEditFullName(profileData.user?.fullName || '');
      setEditEmail(profileData.user?.email || '');
      setEditTitle(profileData.profile?.title || '');
      setEditHighestQual(profileData.profile?.highestQualification || '');
      setEditInstitution(profileData.profile?.institution || '');
      setEditSpecialization(profileData.profile?.specializations?.join(', ') || '');
      setEditYearsExp(String(profileData.profile?.yearsOfExperience ?? 3));
      setEditExpSummary(profileData.profile?.experienceSummary || '');
      setEditSkills(profileData.profile?.skills?.join(', ') || '');
      setEditBio(profileData.profile?.bio || '');
    }
    setProfileBannerError(null);
    setProfileBannerSuccess(null);
    setIsEditProfileModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editFullName.trim()) {
      setProfileBannerError('Full legal name is required.');
      return;
    }

    setProfileActionLoading(true);
    setProfileBannerError(null);
    try {
      const payload: any = {
        fullName: editFullName.trim(),
        email: editEmail.trim() || undefined,
        title: editTitle.trim() || undefined,
        highestQualification: editHighestQual.trim(),
        institution: editInstitution.trim(),
        specializations: editSpecialization
          ? editSpecialization.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        yearsOfExperience: parseInt(editYearsExp, 10) || 0,
        experienceSummary: editExpSummary.trim(),
        skills: editSkills
          ? editSkills.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        bio: editBio.trim(),
      };

      await caregiverApi.updateProfessionalProfile(payload);
      setProfileBannerSuccess('Profile details saved successfully.');
      setIsEditProfileModalOpen(false);
      await loadProfile();
    } catch (err: any) {
      setProfileBannerError(err.message || 'Failed to update professional profile.');
    } finally {
      setProfileActionLoading(false);
    }
  };

  const handleAddCredential = async () => {
    if (!newCertTitle.trim()) {
      setProfileBannerError('Certificate title is required.');
      return;
    }
    if (!newIssuingOrg.trim()) {
      setProfileBannerError('Issuing authority or organization is required.');
      return;
    }

    setProfileActionLoading(true);
    setProfileBannerError(null);
    try {
      await caregiverApi.addCredential({
        certificateTitle: newCertTitle.trim(),
        issuingAuthority: newIssuingOrg.trim(),
        issuingOrganization: newIssuingOrg.trim(),
        credentialCategory: newCredCategory.trim() || 'Professional Certificate',
        documentNumber: newDocNumber.trim() || 'N/A',
        documentType: newDocType,
      });

      setProfileBannerSuccess('Certification submitted for Admin verification.');
      setIsAddCredModalOpen(false);
      setNewCertTitle('');
      setNewIssuingOrg('');
      setNewCredCategory('');
      setNewDocNumber('');
      await loadProfile();
    } catch (err: any) {
      setProfileBannerError(err.message || 'Failed to add certification.');
    } finally {
      setProfileActionLoading(false);
    }
  };

  const handleDeleteCredential = async (credId: string, title?: string) => {
    Alert.alert(
      'Remove Certification',
      `Are you sure you want to remove "${title || 'this certificate'}" from your profile?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await caregiverApi.deleteCredential(credId);
              setProfileBannerSuccess('Certification removed.');
              await loadProfile();
            } catch (err: any) {
              Alert.alert('Removal Failed', err.message || 'Could not remove certificate.');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (userSession) {
      loadVisits();
      loadPatients();
      loadRescheduleRequests();
      loadProfile();
    }
  }, [userSession, loadVisits, loadPatients, loadRescheduleRequests, loadProfile]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadVisits(), loadPatients(), loadRescheduleRequests(), loadProfile()]);
    setIsRefreshing(false);
  };

  // ---------------------------------------------------------------------------
  // 3. Visit Status Transitions
  // ---------------------------------------------------------------------------
  const handleUpdateVisitStatus = async (visitId: string, newStatus: FieldVisitStatus) => {
    try {
      const updated = await caregiverApi.updateVisitStatus(visitId, newStatus);
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
      Alert.alert('Visit Status Updated', `Visit status is now ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      Alert.alert('Status Update Failed', err.message || 'Could not update visit status.');
    }
  };

  // ---------------------------------------------------------------------------
  // Phase 2: Reschedule Request Approvals & Rejections
  // ---------------------------------------------------------------------------
  const handleApproveReschedule = (request: VisitRescheduleRequest) => {
    Alert.alert(
      'Approve Visit Reschedule',
      `Approve rescheduling Visit #${request.visitNumber} for ${request.patientName}?\n\nOriginal: ${request.originalSchedule.scheduledDate} (${request.originalSchedule.timeSlot})\nRequested: ${request.requestedSchedule.scheduledDate} (${request.requestedSchedule.timeSlot})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Update Schedule',
          onPress: async () => {
            setProcessingRequestId(request.id);
            try {
              await caregiverApi.approveRescheduleRequest(request.id);
              Alert.alert('Reschedule Approved', 'Field visit schedule has been updated to the requested time slot.');
              await Promise.all([loadVisits(), loadRescheduleRequests()]);
            } catch (err: any) {
              Alert.alert('Approval Rejected', err.message || 'Could not approve rescheduling request.');
            } finally {
              setProcessingRequestId(null);
            }
          },
        },
      ]
    );
  };

  const handleOpenRejectModal = (request: VisitRescheduleRequest) => {
    setRejectingRequest(request);
    setRejectionReasonInput('');
    setRejectionError(null);
  };

  const handleSubmitRejection = async () => {
    if (!rejectingRequest) return;

    const trimmedReason = rejectionReasonInput.trim();
    if (trimmedReason.length < 3) {
      setRejectionError('Please enter a rejection reason of at least 3 characters.');
      return;
    }

    setIsSubmittingRejection(true);
    setRejectionError(null);

    try {
      await caregiverApi.rejectRescheduleRequest(rejectingRequest.id, trimmedReason);
      Alert.alert('Request Rejected', 'The rescheduling request has been rejected. The original schedule remains unchanged.');
      setRejectingRequest(null);
      await loadRescheduleRequests();
    } catch (err: any) {
      setRejectionError(err.message || 'Failed to reject rescheduling request.');
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Phase 3: Assignment Acceptance & Rejection Handlers
  // ---------------------------------------------------------------------------
  const handleAcceptAssignment = async (visitId: string) => {
    setProcessingVisitId(visitId);
    try {
      const updated = await caregiverApi.acceptVisitAssignment(visitId);
      setVisits((prev) => prev.map((v) => (v.id === visitId ? updated : v)));
      Alert.alert('Assignment Accepted', 'Visit confirmed and moved to your active schedule.');
      await loadVisits();
    } catch (err: any) {
      Alert.alert('Acceptance Failed', err.message || 'Could not accept visit assignment.');
    } finally {
      setProcessingVisitId(null);
    }
  };

  const handleOpenRejectVisitModal = (visit: FieldVisit) => {
    setRejectingVisit(visit);
    setVisitRejectionReason('');
    setVisitRejectionError(null);
  };

  const handleSubmitVisitRejection = async () => {
    if (!rejectingVisit) return;
    const trimmed = visitRejectionReason.trim();
    if (trimmed.length < 3) {
      setVisitRejectionError('Please enter a rejection reason of at least 3 characters.');
      return;
    }
    setIsSubmittingVisitRejection(true);
    setVisitRejectionError(null);
    try {
      await caregiverApi.rejectVisitAssignment(rejectingVisit.id, trimmed);
      Alert.alert('Assignment Rejected', 'The assignment has been rejected and the operational desk notified.');
      setRejectingVisit(null);
      await loadVisits();
    } catch (err: any) {
      setVisitRejectionError(err.message || 'Failed to reject assignment.');
    } finally {
      setIsSubmittingVisitRejection(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. Submit Daily Care Report
  // ---------------------------------------------------------------------------
  const handleSubmitDailyReport = async () => {
    if (!selectedVisitId) {
      Alert.alert('No Visit Selected', 'Please select a visit to document.');
      return;
    }

    if (!systolicBP || !diastolicBP || !pulseRate || !spo2) {
      Alert.alert('Missing Clinical Data', 'Please enter blood pressure, pulse rate, and SpO2.');
      return;
    }

    if (!clinicalNotes.trim()) {
      Alert.alert('Missing Clinical Notes', 'Please enter nursing observations or clinical notes.');
      return;
    }

    setSubmittingReport(true);
    setReportSuccessMsg(null);

    try {
      const bloodPressure = `${systolicBP.trim()}/${diastolicBP.trim()}`;
      const updatedVisit = await caregiverApi.recordClinicalDocumentation(selectedVisitId, {
        vitals: {
          bloodPressure,
          pulse: parseInt(pulseRate.trim(), 10) || undefined,
          spO2: parseInt(spo2.trim(), 10) || undefined,
          temperature: temperature.trim() || undefined,
          bloodGlucose: bloodSugar.trim() ? parseInt(bloodSugar.trim(), 10) : undefined,
          painScale: painScore.trim() ? parseInt(painScore.trim(), 10) : undefined,
          respiratoryRate: respiratoryRate.trim() ? parseInt(respiratoryRate.trim(), 10) : undefined,
        },
        clinicalNotes: clinicalNotes.trim(),
        proceduresPerformed,
        recommendations: recommendations.trim() || undefined,
        markAsCompleted: true,
      });

      // Update visit list locally
      setVisits((prev) => prev.map((v) => (v.id === selectedVisitId ? updatedVisit : v)));
      setReportSuccessMsg(
        'Bedside vitals and daily care report successfully synchronized with central clinical operations!'
      );
      Alert.alert('Report Submitted', 'Visit marked as completed and documentation saved.');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit clinical report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Logout
  // ---------------------------------------------------------------------------
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to conclude your shift and sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await caregiverApi.logout();
          setUserSession(null);
          setVisits([]);
          setAssignedPatients([]);
          setRescheduleRequests([]);
          setSelectedVisitId('');
          setClinicalNotes('');
          setRecommendations('');
          setProceduresPerformed([]);
          setReportSuccessMsg(null);
          setSystolicBP('120');
          setDiastolicBP('80');
          setPulseRate('74');
          setSpo2('98');
        },
      },
    ]);
  };

  const handleHideCompletedVisit = (visitId: string, visitNumber: string) => {
    Alert.alert(
      'Hide Completed Visit',
      `Are you sure you want to remove completed Visit #${visitNumber} from your history? Clinical documentation and audit trails remain permanently preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            try {
              await caregiverApi.hideVisit(visitId);
              Alert.alert('Visit Hidden', 'The completed visit has been hidden from your history.');
              await loadVisits();
            } catch (err: any) {
              Alert.alert('Unable to Hide Visit', err.message || 'An error occurred while hiding the visit.');
            }
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // 6. Call Patient Helper
  // ---------------------------------------------------------------------------
  const handleCallPatient = (phone?: string) => {
    if (!phone) {
      Alert.alert('No Phone', 'No contact number provided for this patient.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('Contact Number', `Patient Phone: ${phone}`);
    });
  };

  // Toggle procedure checklist item
  const toggleProcedure = (proc: string) => {
    setProceduresPerformed((prev) =>
      prev.includes(proc) ? prev.filter((p) => p !== proc) : [...prev, proc]
    );
  };

  const formatPatientAddress = (details?: {
    street?: string;
    cluster?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
  }) => {
    if (!details) return '📍 Address not available (Incomplete profile)';
    const parts = [
      details.street,
      details.cluster,
      details.city,
      details.state,
      details.pincode ? `PIN: ${details.pincode}` : undefined,
    ].filter(Boolean);

    if (parts.length > 0) {
      return `📍 ${parts.join(', ')}`;
    }

    if (details.address && details.address !== 'Address not available') {
      return `📍 ${details.address}`;
    }

    return '📍 Address not available (Incomplete profile)';
  };

  const handleDownloadCaregiverReport = async (visitId: string) => {
    try {
      const token = await authStorage.getToken();
      const downloadUrl = `${getMobileApiBaseUrl()}/visits/${visitId}/report/download?format=pdf${
        token ? `&token=${encodeURIComponent(token)}` : ''
      }`;
      Linking.openURL(downloadUrl).catch(() => {
        Alert.alert('Report Download', `Please open in your browser:\n${downloadUrl}`);
      });
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Unable to download report.');
    }
  };

  // Loading Screen
  if (isBootstrapping) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Initializing VivoQuest Caregiver Portal...</Text>
      </SafeAreaView>
    );
  }

  // Unauthenticated -> Login View
  if (!userSession) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoginView
          onLoginSuccess={(user) => {
            setUserSession(user);
          }}
        />
      </SafeAreaView>
    );
  }

  // Active / Selected visit
  const currentVisit = visits.find((v) => v.id === selectedVisitId) || visits[0];
  const completedCount = visits.filter((v) => v.status === 'completed').length;
  const totalScheduled = visits.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>VivoQuest Caregiver</Text>
          <Text style={styles.headerSubtitle}>
            {userSession.fullName} • {userSession.role.toUpperCase()}
          </Text>
        </View>
        <View style={styles.shiftBadge}>
          <Text style={styles.shiftText}>● ON DUTY</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#0284c7" />}
      >
        {/* API Error Banner */}
        {apiError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {apiError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadVisits}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ================= TAB 1: SCHEDULE ================= */}
        {activeTab === 'schedule' && (
          <View>
            {/* KPI Progress Card */}
            <View style={styles.kpiCard}>
              <View style={styles.cardRowBetween}>
                <View>
                  <Text style={styles.kpiTitle}>Today's Schedule Progress</Text>
                  <Text style={styles.kpiValue}>
                    {completedCount} / {totalScheduled} Visits Completed
                  </Text>
                </View>
                <View style={styles.kpiCircle}>
                  <Text style={styles.kpiPercent}>
                    {totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Phase 2: Pending Reschedule Requests Section */}
            {rescheduleRequests.length > 0 && (
              <View style={styles.rescheduleSectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.rescheduleSectionTitle}>
                    ⏳ Pending Reschedule Requests ({rescheduleRequests.length})
                  </Text>
                  {isLoadingRequests && <ActivityIndicator size="small" color="#d97706" />}
                </View>

                {rescheduleRequests.map((req) => (
                  <View key={req.id || (req as any)._id || 'resched-' + req.visitNumber} style={styles.rescheduleCard}>
                    <View style={styles.cardRowBetween}>
                      <Text style={styles.rescheduleBadge}>Caregiver Approval Required</Text>
                      <Text style={styles.rescheduleTimestamp}>
                        {new Date(req.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>

                    <Text style={styles.reschedulePatientName}>{req.patientName}</Text>
                    <Text style={styles.rescheduleSubtext}>
                      Visit #{req.visitNumber} • Tel: +91 {req.patientPhone}
                    </Text>

                    <View style={styles.scheduleComparisonBox}>
                      <View style={styles.comparisonCol}>
                        <Text style={styles.comparisonLabel}>Current Schedule:</Text>
                        <Text style={styles.comparisonOriginalVal}>
                          {req.originalSchedule.scheduledDate}
                        </Text>
                        <Text style={styles.comparisonOriginalSlot}>
                          {req.originalSchedule.timeSlot}
                        </Text>
                      </View>
                      <Text style={styles.comparisonArrow}>➔</Text>
                      <View style={styles.comparisonCol}>
                        <Text style={styles.comparisonLabel}>Requested Slot:</Text>
                        <Text style={styles.comparisonRequestedVal}>
                          {req.requestedSchedule.scheduledDate}
                        </Text>
                        <Text style={styles.comparisonRequestedSlot}>
                          {req.requestedSchedule.timeSlot}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rescheduleReasonBox}>
                      <Text style={styles.rescheduleReasonHeading}>Patient's Reason:</Text>
                      <Text style={styles.rescheduleReasonContent}>"{req.reason}"</Text>
                    </View>

                    <View style={styles.rescheduleButtonRow}>
                      <TouchableOpacity
                        style={styles.rejectOutlineButton}
                        onPress={() => handleOpenRejectModal(req)}
                        disabled={processingRequestId === req.id}
                      >
                        <Text style={styles.rejectOutlineButtonText}>✕ Reject Request</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.approveButton}
                        onPress={() => handleApproveReschedule(req)}
                        disabled={processingRequestId === req.id}
                      >
                        {processingRequestId === req.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.approveButtonText}>✓ Approve Reschedule</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Phase 3: Dedicated Pending Assignment Acceptance Section */}
            {visits.some((v) => v.status === 'assigned') && (
              <View style={styles.rescheduleSectionContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: '#b45309' }]}>
                    ⏳ Pending Acceptance ({visits.filter((v) => v.status === 'assigned').length})
                  </Text>
                </View>

                {visits
                  .filter((v) => v.status === 'assigned')
                  .map((vis) => (
                    <View
                      key={vis.id || (vis as any)._id || vis.visitNumber}
                      style={[
                        styles.card,
                        { borderColor: '#f59e0b', borderWidth: 1.5, backgroundColor: '#fffbeb' },
                      ]}
                    >
                      <View style={styles.cardRowBetween}>
                        <Text style={styles.visitTime}>⏰ {vis.timeSlot}</Text>
                        <Text
                          style={[
                            styles.statusPill,
                            { backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '800' },
                          ]}
                        >
                          ACTION REQUIRED: PENDING ACCEPTANCE
                        </Text>
                      </View>

                      <Text style={styles.patientName}>{vis.patientDetails.fullName}</Text>
                      <Text style={styles.patientSubtext}>
                        Visit #{vis.visitNumber} • {vis.visitType.replace('_', ' ').toUpperCase()} • Date: {vis.scheduledDate}
                      </Text>
                      <Text style={styles.patientAddress}>{formatPatientAddress(vis.patientDetails)}</Text>

                      {vis.patientDetails.instructions ? (
                        <Text style={styles.instructionsText}>
                          ℹ️ Clinical Notes: {vis.patientDetails.instructions}
                        </Text>
                      ) : null}

                      <View style={styles.divider} />

                      <View style={styles.rescheduleButtonRow}>
                        <TouchableOpacity
                          style={styles.rejectOutlineButton}
                          onPress={() => handleOpenRejectVisitModal(vis)}
                          disabled={processingVisitId === vis.id}
                        >
                          <Text style={styles.rejectOutlineButtonText}>✕ Reject Assignment</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => handleAcceptAssignment(vis.id)}
                          disabled={processingVisitId === vis.id}
                        >
                          {processingVisitId === vis.id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text style={styles.approveButtonText}>✓ Accept Assignment</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                {visits.some((v) => v.status === 'assigned')
                  ? 'Confirmed & In-Progress Visits'
                  : 'Assigned Patient Visits'}
              </Text>
              {isLoadingVisits && <ActivityIndicator size="small" color="#0284c7" />}
            </View>

            {visits.filter((v) => v.status !== 'assigned').length === 0 && !isLoadingVisits && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>
                  {visits.some((v) => v.status === 'assigned')
                    ? 'Pending Acceptance Required'
                    : 'No Visits Scheduled'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {visits.some((v) => v.status === 'assigned')
                    ? 'You have pending visit assignments awaiting your acceptance above.'
                    : 'You have no field visits assigned for today. Pull down to refresh or check back later.'}
                </Text>
              </View>
            )}

            {visits
              .filter((v) => v.status !== 'assigned')
              .map((vis) => {
              const isCompleted = vis.status === 'completed';
              const isInProgress = vis.status === 'in_progress';
              const isArrived = vis.status === 'arrived';
              const isEnRoute = vis.status === 'en_route';
              const isAccepted = vis.status === 'accepted';
              const isAssigned = vis.status === 'assigned';

              return (
                <View
                  key={vis.id || (vis as any)._id || vis.visitNumber}
                  style={[
                    styles.card,
                    (isInProgress || isArrived) && styles.cardActiveBorder,
                  ]}
                >
                  <View style={styles.cardRowBetween}>
                    <Text style={styles.visitTime}>⏰ {vis.timeSlot}</Text>
                    <Text
                      style={[
                        styles.statusPill,
                        isCompleted
                          ? styles.statusCompleted
                          : isInProgress || isArrived
                          ? styles.statusProgress
                          : styles.statusScheduled,
                      ]}
                    >
                      {vis.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.patientName}>{vis.patientDetails.fullName}</Text>
                  <Text style={styles.patientSubtext}>
                    Visit #{vis.visitNumber} • {vis.visitType.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.patientAddress}>{formatPatientAddress(vis.patientDetails)}</Text>

                  {vis.patientDetails.instructions ? (
                    <Text style={styles.instructionsText}>
                      ℹ️ Notes: {vis.patientDetails.instructions}
                    </Text>
                  ) : null}

                  <View style={styles.divider} />

                  {/* Operational Status Actions */}
                  <View style={styles.buttonRow}>
                    {isAssigned && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpdateVisitStatus(vis.id, 'accepted')}
                      >
                        <Text style={styles.buttonText}>Accept Visit</Text>
                      </TouchableOpacity>
                    )}

                    {isAccepted && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpdateVisitStatus(vis.id, 'en_route')}
                      >
                        <Text style={styles.buttonText}>Start Travel (En Route)</Text>
                      </TouchableOpacity>
                    )}

                    {isEnRoute && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpdateVisitStatus(vis.id, 'arrived')}
                      >
                        <Text style={styles.buttonText}>Mark Arrived On-Site</Text>
                      </TouchableOpacity>
                    )}

                    {isArrived && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpdateVisitStatus(vis.id, 'in_progress')}
                      >
                        <Text style={styles.buttonText}>Begin Clinical Care</Text>
                      </TouchableOpacity>
                    )}

                    {(isInProgress || isCompleted) && (
                      <TouchableOpacity
                        style={styles.recordButton}
                        onPress={() => {
                          setSelectedVisitId(vis.id);
                          setActiveTab('record');
                        }}
                      >
                        <Text style={styles.buttonText}>
                          {isCompleted ? 'View Documentation' : 'Record Vitals & Report'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {isCompleted && (
                      <TouchableOpacity
                        style={[styles.recordButton, { backgroundColor: '#0284c7' }]}
                        onPress={() => handleDownloadCaregiverReport(vis.id)}
                      >
                        <Text style={styles.buttonText}>📥 PDF</Text>
                      </TouchableOpacity>
                    )}

                    {isCompleted && (
                      <TouchableOpacity
                        style={[styles.recordButton, { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' }]}
                        onPress={() => handleHideCompletedVisit(vis.id, vis.visitNumber)}
                      >
                        <Text style={[styles.buttonText, { color: '#b91c1c' }]}>🗑️ Hide</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallPatient(vis.patientDetails.phone)}
                    >
                      <Text style={styles.callButtonText}>📞 Call</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ================= TAB 2: RECORD VITALS & REPORT ================= */}
        {activeTab === 'record' && (
          <View>
            <Text style={styles.sectionTitle}>Bedside Vitals & Daily Report</Text>

            {currentVisit ? (
              <Text style={styles.subtext}>
                Documenting for:{' '}
                <Text style={{ fontWeight: '800', color: '#0f172a' }}>
                  {currentVisit.patientDetails.fullName}
                </Text>{' '}
                (Visit #{currentVisit.visitNumber})
              </Text>
            ) : (
              <Text style={styles.subtext}>Select a visit from your schedule to document.</Text>
            )}

            {reportSuccessMsg && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✅ {reportSuccessMsg}</Text>
              </View>
            )}

            {currentVisit && (
              <View style={styles.card}>
                <Text style={styles.formSectionHeader}>1. Vital Signs Surveillance</Text>

                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Systolic BP (mmHg)</Text>
                    <TextInput
                      style={styles.input}
                      value={systolicBP}
                      onChangeText={setSystolicBP}
                      keyboardType="numeric"
                      placeholder="120"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Diastolic BP (mmHg)</Text>
                    <TextInput
                      style={styles.input}
                      value={diastolicBP}
                      onChangeText={setDiastolicBP}
                      keyboardType="numeric"
                      placeholder="80"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Pulse Rate (bpm)</Text>
                    <TextInput
                      style={styles.input}
                      value={pulseRate}
                      onChangeText={setPulseRate}
                      keyboardType="numeric"
                      placeholder="74"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>SpO2 (%)</Text>
                    <TextInput
                      style={styles.input}
                      value={spo2}
                      onChangeText={setSpo2}
                      keyboardType="numeric"
                      placeholder="98"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Temp (°F)</Text>
                    <TextInput
                      style={styles.input}
                      value={temperature}
                      onChangeText={setTemperature}
                      placeholder="98.4"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Blood Glucose (mg/dL)</Text>
                    <TextInput
                      style={styles.input}
                      value={bloodSugar}
                      onChangeText={setBloodSugar}
                      keyboardType="numeric"
                      placeholder="110"
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Pain Score (0 - 10)</Text>
                    <TextInput
                      style={styles.input}
                      value={painScore}
                      onChangeText={setPainScore}
                      keyboardType="numeric"
                      placeholder="2"
                    />
                  </View>
                  <View style={styles.inputCol}>
                    <Text style={styles.inputLabel}>Resp Rate (breaths/min)</Text>
                    <TextInput
                      style={styles.input}
                      value={respiratoryRate}
                      onChangeText={setRespiratoryRate}
                      keyboardType="numeric"
                      placeholder="18"
                    />
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Clinical Checklist */}
                <Text style={styles.formSectionHeader}>2. Procedures & Interventions Performed</Text>
                {[
                  'Vitals Assessment (BP, Pulse, SpO2, Temp)',
                  'Oral Medication Administration',
                  'Bedside Stoma / Catheter Inspection',
                  'Nebulization / O2 Therapy Review',
                  'Pressure Sore Prevention & Repositioning',
                  'Hydration & Nutrition Counseling',
                ].map((proc) => {
                  const isChecked = proceduresPerformed.includes(proc);
                  return (
                    <TouchableOpacity
                      key={proc}
                      style={styles.checkItem}
                      onPress={() => toggleProcedure(proc)}
                    >
                      <Text style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                        {isChecked ? '✓' : ' '}
                      </Text>
                      <Text style={styles.checkText}>{proc}</Text>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.divider} />

                <Text style={styles.formSectionHeader}>3. Clinical Observations & Nursing Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={clinicalNotes}
                  onChangeText={setClinicalNotes}
                  multiline
                  numberOfLines={4}
                  placeholder="Record patient comfort, alertness, skin integrity, respiration, and family counseling..."
                />

                <Text style={styles.inputLabel}>Clinical Recommendations & Follow-Up</Text>
                <TextInput
                  style={styles.input}
                  value={recommendations}
                  onChangeText={setRecommendations}
                  placeholder="e.g., Maintain hydration; review pain analgesia with physician..."
                />

                <TouchableOpacity
                  style={[styles.submitButton, submittingReport && styles.submitButtonDisabled]}
                  disabled={submittingReport}
                  onPress={handleSubmitDailyReport}
                >
                  {submittingReport ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Documentation & Complete Visit</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Submitted Care Reports & History */}
            <View style={{ marginTop: 24 }}>
              <Text style={styles.sectionTitle}>Submitted Care Reports &amp; History</Text>
              <Text style={styles.subtext}>
                Verified daily clinical documentation and signed vitals recorded for your patients
              </Text>

              {visits.filter((v) => (v.status === 'completed' || v.clinicalDocumentation?.signedAt) && !v.clinicalDocumentation?.isDeleted && !v.clinicalDocumentation?.hiddenFromCaregiver).length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>📄</Text>
                  <Text style={styles.emptyTitle}>No Reports Submitted Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    When you document bedside visits, your saved reports will appear here.
                  </Text>
                </View>
              ) : (
                visits
                  .filter((v) => (v.status === 'completed' || v.clinicalDocumentation?.signedAt) && !v.clinicalDocumentation?.isDeleted && !v.clinicalDocumentation?.hiddenFromCaregiver)
                  .map((v) => (
                    <View key={v.id || (v as any)._id || v.visitNumber} style={styles.card}>
                      <View style={styles.cardRowBetween}>
                        <Text style={styles.visitTime}>
                          Visit #{v.visitNumber} • {v.scheduledDate}
                        </Text>
                        <Text style={[styles.statusPill, styles.statusCompleted]}>
                          SIGNED
                        </Text>
                      </View>
                      <Text style={styles.patientName}>{v.patientDetails?.fullName}</Text>
                      <Text style={styles.patientAddress}>{formatPatientAddress(v.patientDetails)}</Text>

                      {v.clinicalDocumentation?.vitals && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 }}>
                          {v.clinicalDocumentation.vitals.bloodPressure && (
                            <View style={styles.vitalBadge}>
                              <Text style={styles.vitalBadgeText}>BP: {v.clinicalDocumentation.vitals.bloodPressure}</Text>
                            </View>
                          )}
                          {v.clinicalDocumentation.vitals.pulse && (
                            <View style={styles.vitalBadge}>
                              <Text style={styles.vitalBadgeText}>Pulse: {v.clinicalDocumentation.vitals.pulse} bpm</Text>
                            </View>
                          )}
                          {v.clinicalDocumentation.vitals.spO2 && (
                            <View style={styles.vitalBadge}>
                              <Text style={styles.vitalBadgeText}>SpO2: {v.clinicalDocumentation.vitals.spO2}%</Text>
                            </View>
                          )}
                          {v.clinicalDocumentation.vitals.temperature && (
                            <View style={styles.vitalBadge}>
                              <Text style={styles.vitalBadgeText}>Temp: {v.clinicalDocumentation.vitals.temperature}°F</Text>
                            </View>
                          )}
                        </View>
                      )}

                      {v.clinicalDocumentation?.clinicalNotes ? (
                        <Text style={[styles.patientSubtext, { fontStyle: 'italic', marginBottom: 8 }]}>
                          "{v.clinicalDocumentation.clinicalNotes}"
                        </Text>
                      ) : null}

                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <TouchableOpacity
                          style={[styles.actionButton, { flex: 1, backgroundColor: '#0284c7', marginTop: 0 }]}
                          onPress={() => handleDownloadCaregiverReport(v.id)}
                        >
                          <Text style={styles.buttonText}>📥 Download PDF Report</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5', marginTop: 0, paddingHorizontal: 12 }]}
                          onPress={() => handleHideCompletedVisit(v.id, v.visitNumber)}
                        >
                          <Text style={[styles.buttonText, { color: '#b91c1c' }]}>🗑️ Hide</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
              )}
            </View>
          </View>
        )}

        {/* ================= TAB 3: ASSIGNED PATIENTS ================= */}
        {activeTab === 'patients' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Assigned Patient Cohort</Text>
              {isLoadingPatients && <ActivityIndicator size="small" color="#0284c7" />}
            </View>

            {assignedPatients.length === 0 && !isLoadingPatients && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>👥</Text>
                <Text style={styles.emptyTitle}>No Patients Assigned</Text>
                <Text style={styles.emptySubtitle}>
                  You have no active patient assignments in your clinical queue.
                </Text>
              </View>
            )}

            {assignedPatients.map((pat) => (
              <View key={pat.patientId || (pat as any)._id || pat.phone} style={styles.card}>
                <View style={styles.cardRowBetween}>
                  <Text style={styles.patientName}>{pat.fullName}</Text>
                  <Text style={styles.assignedCountBadge}>
                    {pat.assignedVisitsCount} Visit{pat.assignedVisitsCount === 1 ? '' : 's'}
                  </Text>
                </View>

                <Text style={styles.patientSubtext}>Phone: +91 {pat.phone}</Text>
                <Text style={styles.patientAddress}>
                  {pat.address
                    ? `📍 ${[
                        pat.address.street,
                        pat.address.cluster,
                        pat.address.city,
                        pat.address.state,
                        pat.address.pincode ? `PIN: ${pat.address.pincode}` : undefined,
                      ]
                        .filter(Boolean)
                        .join(', ')}`
                    : '📍 Address not available (Incomplete profile)'}
                </Text>

                {pat.activeSubscription ? (
                  <View style={styles.subscriptionBox}>
                    <Text style={styles.subscriptionTitle}>
                      📋 {pat.activeSubscription.planTitle}
                    </Text>
                    <Text style={styles.subscriptionRemaining}>
                      {pat.activeSubscription.visitsRemaining} of{' '}
                      {pat.activeSubscription.totalVisitsIncluded} visits remaining
                    </Text>
                  </View>
                ) : null}

                <View style={styles.divider} />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCallPatient(pat.phone)}
                  >
                    <Text style={styles.callButtonText}>📞 Call Patient</Text>
                  </TouchableOpacity>

                  {pat.emergencyContact?.phone ? (
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => handleCallPatient(pat.emergencyContact?.phone)}
                    >
                      <Text style={styles.secondaryButtonText}>
                        🚨 Emergency ({pat.emergencyContact.relation || 'Contact'})
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ================= TAB 4: PROFILE ================= */}
        {activeTab === 'profile' && (
          <View>
            <View style={styles.cardRowBetween}>
              <View>
                <Text style={styles.sectionTitle}>My Professional Profile</Text>
                <Text style={styles.sectionSubtitle}>
                  Qualifications, certificates, and clinical settings
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editProfileTopBtn}
                onPress={handleOpenEditProfile}
              >
                <Text style={styles.editProfileTopBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>

            {profileBannerSuccess && (
              <View style={styles.profileSuccessBanner}>
                <Text style={styles.profileSuccessBannerText}>✓ {profileBannerSuccess}</Text>
              </View>
            )}

            {profileBannerError && (
              <View style={styles.profileErrorBanner}>
                <Text style={styles.profileErrorBannerText}>⚠️ {profileBannerError}</Text>
              </View>
            )}

            {/* Profile Completion Indicator */}
            {profileData?.completion && (
              <View style={styles.completionCard}>
                <View style={styles.cardRowBetween}>
                  <Text style={styles.completionHeading}>Profile Completion</Text>
                  <Text style={styles.completionPercentText}>
                    {profileData.completion.percentage}%
                  </Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(5, profileData.completion.percentage)}%`,
                        backgroundColor:
                          profileData.completion.percentage >= 80 ? '#10b981' : '#f59e0b',
                      },
                    ]}
                  />
                </View>

                {profileData.completion.missingFields && profileData.completion.missingFields.length > 0 ? (
                  <Text style={styles.completionMissingText}>
                    Pending details: {profileData.completion.missingFields.join(', ')}
                  </Text>
                ) : (
                  <Text style={styles.completionCompleteText}>
                    ✓ Your professional profile is fully completed and up-to-date.
                  </Text>
                )}
              </View>
            )}

            {/* 1. Basic Identity Card */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.profAvatarCircle}>
                  <Text style={styles.profAvatarText}>
                    {(userSession.fullName || 'CP')
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.profHeaderName}>
                    {profileData?.profile?.title ? `${profileData.profile.title} ` : ''}
                    {userSession.fullName}
                  </Text>
                  <Text style={styles.profHeaderRole}>
                    {(profileData?.profile?.professionType || userSession.role).toUpperCase()}
                  </Text>
                  <View style={styles.profStatusBadgeRow}>
                    <View
                      style={[
                        styles.profStatusBadge,
                        profileData?.profile?.verificationStatus === 'verified'
                          ? styles.badgeVerified
                          : profileData?.profile?.verificationStatus === 'rejected'
                          ? styles.badgeRejected
                          : styles.badgePending,
                      ]}
                    >
                      <Text style={styles.profStatusBadgeText}>
                        {profileData?.profile?.verificationStatus === 'verified'
                          ? '● Verified by Admin'
                          : profileData?.profile?.verificationStatus === 'rejected'
                          ? '✕ Verification Rejected'
                          : '⏳ Pending Admin Review'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.profileLabel}>Registered Mobile (Source of Truth)</Text>
              <Text style={styles.profileValue}>+91 {userSession.phone}</Text>

              <Text style={styles.profileLabel}>Email Address</Text>
              <Text style={styles.profileValue}>
                {userSession.email || 'Not provided (optional)'}
              </Text>

              <Text style={styles.profileLabel}>Account Status</Text>
              <Text style={[styles.profileValue, { color: '#059669', fontWeight: '800' }]}>
                {userSession.status.toUpperCase()}
              </Text>
            </View>

            {/* 2. Professional Qualifications Card */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Professional Qualifications</Text>

              <Text style={styles.profileLabel}>Highest Qualification / Degree</Text>
              <Text style={styles.profileValueHighlight}>
                {profileData?.profile?.highestQualification || 'Not specified (tap Edit to add)'}
              </Text>

              <Text style={styles.profileLabel}>Institution / University</Text>
              <Text style={styles.profileValue}>
                {profileData?.profile?.institution || 'Not specified'}
              </Text>

              <Text style={styles.profileLabel}>Primary Specialization</Text>
              <Text style={styles.profileValue}>
                {profileData?.profile?.specializations && profileData.profile.specializations.length > 0
                  ? profileData.profile.specializations.join(', ')
                  : 'General Palliative Care'}
              </Text>

              <Text style={styles.profileLabel}>Total Years of Clinical Experience</Text>
              <Text style={styles.profileValue}>
                {profileData?.profile?.yearsOfExperience !== undefined
                  ? `${profileData.profile.yearsOfExperience} Years`
                  : 'Not specified'}
              </Text>

              {profileData?.profile?.skills && profileData.profile.skills.length > 0 ? (
                <>
                  <Text style={styles.profileLabel}>Skills & Clinical Competencies</Text>
                  <View style={styles.skillsChipRow}>
                    {profileData.profile.skills.map((skill, idx) => (
                      <View key={idx} style={styles.skillChip}>
                        <Text style={styles.skillChipText}>✓ {skill}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {profileData?.profile?.experienceSummary ? (
                <>
                  <Text style={styles.profileLabel}>Experience Summary</Text>
                  <Text style={styles.profileValueBio}>"{profileData.profile.experienceSummary}"</Text>
                </>
              ) : null}
            </View>

            {/* 3. Certifications & Credentials Card */}
            <View style={styles.card}>
              <View style={styles.cardRowBetween}>
                <View>
                  <Text style={styles.cardSectionTitle}>Certifications & Credentials</Text>
                  <Text style={styles.cardSubtext}>
                    {profileData?.credentials?.length || 0} documented credential(s)
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addCredBtn}
                  onPress={() => {
                    setProfileBannerError(null);
                    setProfileBannerSuccess(null);
                    setIsAddCredModalOpen(true);
                  }}
                >
                  <Text style={styles.addCredBtnText}>➕ Add Credential</Text>
                </TouchableOpacity>
              </View>

              {profileData?.credentials && profileData.credentials.length > 0 ? (
                profileData.credentials.map((cred) => (
                  <View key={cred.id || (cred as any)._id} style={styles.credItemBox}>
                    <View style={styles.cardRowBetween}>
                      <Text style={styles.credItemTitle}>
                        {cred.certificateTitle || cred.documentType.replace(/_/g, ' ').toUpperCase()}
                      </Text>
                      <TouchableOpacity
                        style={styles.credDeleteBtn}
                        onPress={() => handleDeleteCredential(cred.id || (cred as any)._id, cred.certificateTitle)}
                      >
                        <Text style={styles.credDeleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.credAuthorityText}>
                      Issuing Authority: {cred.issuingOrganization || cred.issuingAuthority}
                    </Text>

                    {cred.credentialCategory ? (
                      <Text style={styles.credCategoryText}>
                        Category: {cred.credentialCategory}
                      </Text>
                    ) : null}

                    {cred.documentNumber && cred.documentNumber !== 'N/A' ? (
                      <Text style={styles.credDocNumberText}>
                        Ref #: {cred.documentNumber}
                      </Text>
                    ) : null}

                    {/* Verification Status Pill */}
                    <View style={styles.credStatusRow}>
                      <View
                        style={[
                          styles.credStatusPill,
                          cred.verificationStatus === 'verified' || cred.verificationStatus === 'approved'
                            ? styles.credVerifiedPill
                            : cred.verificationStatus === 'rejected'
                            ? styles.credRejectedPill
                            : styles.credPendingPill,
                        ]}
                      >
                        <Text style={styles.credStatusPillText}>
                          {cred.verificationStatus === 'verified' || cred.verificationStatus === 'approved'
                            ? '● Verified by Admin'
                            : cred.verificationStatus === 'rejected'
                            ? '✕ Rejected'
                            : '⏳ Verification Pending'}
                        </Text>
                      </View>
                    </View>

                    {/* Rejection Reason (Admin feedback) */}
                    {cred.verificationStatus === 'rejected' && cred.rejectionReason ? (
                      <View style={styles.rejectionReasonBanner}>
                        <Text style={styles.rejectionReasonTitle}>Admin Rejection Reason:</Text>
                        <Text style={styles.rejectionReasonBody}>"{cred.rejectionReason}"</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              ) : (
                <View style={styles.emptyCredBox}>
                  <Text style={styles.emptyCredIcon}>📜</Text>
                  <Text style={styles.emptyCredTitle}>No Certificates Added Yet</Text>
                  <Text style={styles.emptyCredSubtext}>
                    Certificates are optional. Add degrees, state council registrations, or training certificates anytime.
                  </Text>
                </View>
              )}
            </View>

            {/* 4. App Security & Settings */}
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>Application & Security Settings</Text>

              <Text style={styles.profileLabel}>Secure Credential Storage Engine</Text>
              <Text style={styles.profileValue}>
                {storageType === 'hardware_secure_store'
                  ? '🔒 Hardware Keystore / Keychain (expo-secure-store)'
                  : '⚠️ Non-persistent In-Memory Fallback'}
              </Text>

              <Text style={styles.profileLabel}>Connected API Endpoint</Text>
              <Text style={styles.profileValue}>{getMobileApiBaseUrl()}</Text>

              <View style={styles.divider} />

              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Conclude Shift & Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'schedule' && styles.tabItemActive]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.tabTextActive]}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'record' && styles.tabItemActive]}
          onPress={() => setActiveTab('record')}
        >
          <Text style={[styles.tabText, activeTab === 'record' && styles.tabTextActive]}>Record Vitals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'patients' && styles.tabItemActive]}
          onPress={() => setActiveTab('patients')}
        >
          <Text style={[styles.tabText, activeTab === 'patients' && styles.tabTextActive]}>My Patients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Phase 2: Rejection Reason Modal */}
      <Modal
        visible={!!rejectingRequest}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRejectingRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.cardRowBetween}>
              <Text style={styles.modalTitle}>Reject Rescheduling Request</Text>
              <TouchableOpacity onPress={() => setRejectingRequest(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubheading}>
              Visit #{rejectingRequest?.visitNumber} for {rejectingRequest?.patientName}
            </Text>

            <Text style={styles.modalInstructionText}>
              Please explain why this visit cannot be rescheduled to {rejectingRequest?.requestedSchedule.scheduledDate} ({rejectingRequest?.requestedSchedule.timeSlot}). This reason will be shown to the patient.
            </Text>

            {rejectionError && (
              <View style={styles.rejectionErrorBox}>
                <Text style={styles.rejectionErrorText}>⚠️ {rejectionError}</Text>
              </View>
            )}

            <TextInput
              style={styles.rejectionInput}
              value={rejectionReasonInput}
              onChangeText={setRejectionReasonInput}
              placeholder="e.g., Critical patient procedure scheduled, outside shift hours, etc."
              placeholderTextColor="#94a3b8"
              multiline={true}
              numberOfLines={3}
            />

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setRejectingRequest(null)}
                disabled={isSubmittingRejection}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRejectButton}
                onPress={handleSubmitRejection}
                disabled={isSubmittingRejection}
              >
                {isSubmittingRejection ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmRejectButtonText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phase 3: Visit Assignment Rejection Modal */}
      <Modal
        visible={!!rejectingVisit}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRejectingVisit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.cardRowBetween}>
              <Text style={styles.modalTitle}>Reject Visit Assignment</Text>
              <TouchableOpacity onPress={() => setRejectingVisit(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubheading}>
              Visit #{rejectingVisit?.visitNumber} for {rejectingVisit?.patientDetails?.fullName}
            </Text>

            <Text style={styles.modalInstructionText}>
              A mandatory reason is required to reject this assignment. This will be transmitted to the clinical operations desk for immediate reassignment.
            </Text>

            {visitRejectionError && (
              <View style={styles.rejectionErrorBox}>
                <Text style={styles.rejectionErrorText}>⚠️ {visitRejectionError}</Text>
              </View>
            )}

            <TextInput
              style={styles.rejectionInput}
              value={visitRejectionReason}
              onChangeText={setVisitRejectionReason}
              placeholder="e.g., Unavailability due to prior shift overlap, transport constraint, clinical procedure mismatch..."
              placeholderTextColor="#94a3b8"
              multiline={true}
              numberOfLines={3}
            />

            <View style={styles.modalActionButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setRejectingVisit(null)}
                disabled={isSubmittingVisitRejection}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmRejectButton}
                onPress={handleSubmitVisitRejection}
                disabled={isSubmittingVisitRejection}
              >
                {isSubmittingVisitRejection ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmRejectButtonText}>Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Phase 13: Edit Profile Modal */}
      <Modal
        visible={isEditProfileModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditProfileModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.cardRowBetween}>
              <Text style={styles.modalTitle}>Edit Professional Profile</Text>
              <TouchableOpacity onPress={() => setIsEditProfileModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInstructionText}>
                Update your professional qualifications and practice details. If verified qualifications change, verification status will be re-evaluated by clinical administration.
              </Text>

              {profileBannerError && (
                <View style={styles.profileErrorBanner}>
                  <Text style={styles.profileErrorBannerText}>⚠️ {profileBannerError}</Text>
                </View>
              )}

              <Text style={styles.inputModalLabel}>Full Legal Name *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editFullName}
                onChangeText={setEditFullName}
                placeholder="Full Legal Name"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Email Address</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="name@organization.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.inputModalLabel}>Professional Title Prefix</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="e.g., Dr., Sister, Nurse, Caregiver"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Highest Qualification / Degree</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editHighestQual}
                onChangeText={setEditHighestQual}
                placeholder="e.g., MBBS, B.Sc Nursing, GNM, Certified Aide"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Institution or Awarding Organization</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editInstitution}
                onChangeText={setEditInstitution}
                placeholder="e.g., Maharashtra Nursing Council / MUHS"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Specialization(s) (Comma separated)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editSpecialization}
                onChangeText={setEditSpecialization}
                placeholder="e.g., Palliative Oncology, Wound Care, Geriatrics"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Years of Clinical Experience</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editYearsExp}
                onChangeText={setEditYearsExp}
                placeholder="e.g., 4"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />

              <Text style={styles.inputModalLabel}>Skills & Clinical Competencies (Comma separated)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={editSkills}
                onChangeText={setEditSkills}
                placeholder="e.g., Catheterization, Vitals, Pain Scale, Tracheostomy"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Experience Summary</Text>
              <TextInput
                style={[styles.modalTextInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={editExpSummary}
                onChangeText={setEditExpSummary}
                placeholder="Brief summary of clinical or caregiving background..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setIsEditProfileModalOpen(false)}
                  disabled={profileActionLoading}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleSaveProfile}
                  disabled={profileActionLoading}
                >
                  {profileActionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Phase 13: Add Credential Modal */}
      <Modal
        visible={isAddCredModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddCredModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.cardRowBetween}>
              <Text style={styles.modalTitle}>Add Certification or Degree</Text>
              <TouchableOpacity onPress={() => setIsAddCredModalOpen(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalInstructionText}>
                Submit your credential for authorized clinical verification. All certifications remain optional.
              </Text>

              {profileBannerError && (
                <View style={styles.profileErrorBanner}>
                  <Text style={styles.profileErrorBannerText}>⚠️ {profileBannerError}</Text>
                </View>
              )}

              <Text style={styles.inputModalLabel}>Certificate or Degree Title *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newCertTitle}
                onChangeText={setNewCertTitle}
                placeholder="e.g., Basic Life Support (BLS) / GNM License"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Issuing Organization / Authority *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newIssuingOrg}
                onChangeText={setNewIssuingOrg}
                placeholder="e.g., Indian Red Cross / Maharashtra Nursing Council"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Credential Category</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newCredCategory}
                onChangeText={setNewCredCategory}
                placeholder="e.g., State Council License / Training Certificate"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputModalLabel}>Document / Registration Reference # (Optional)</Text>
              <TextInput
                style={styles.modalTextInput}
                value={newDocNumber}
                onChangeText={setNewDocNumber}
                placeholder="e.g., MNC-2024-8849"
                placeholderTextColor="#94a3b8"
              />

              <View style={styles.securityNoticeBox}>
                <Text style={styles.securityNoticeBoxText}>
                  🛡️ Verification Status: Submitted credentials are filed with Pending review status. Verification is performed by authorized Admin reviewers.
                </Text>
              </View>

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setIsAddCredModalOpen(false)}
                  disabled={profileActionLoading}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={handleAddCredential}
                  disabled={profileActionLoading}
                >
                  {profileActionLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>Submit Credential</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  shiftBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  shiftText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  kpiCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  cardRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  kpiCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#34d399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiPercent: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtext: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardActiveBorder: {
    borderColor: '#0284c7',
    borderWidth: 2,
  },
  visitTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  statusProgress: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  statusScheduled: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 8,
  },
  patientSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '600',
  },
  patientAddress: {
    fontSize: 12,
    color: '#475569',
    marginTop: 6,
  },
  instructionsText: {
    fontSize: 11,
    color: '#b45309',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  recordButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  callButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '700',
  },
  formSectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  textArea: {
    height: 88,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    marginRight: 10,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  checkboxActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  checkText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  successBanner: {
    backgroundColor: '#dcfce7',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  successBannerText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  assignedCountBadge: {
    backgroundColor: '#e0f2fe',
    color: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '700',
  },
  subscriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subscriptionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  subscriptionRemaining: {
    fontSize: 11,
    color: '#059669',
    marginTop: 2,
    fontWeight: '600',
  },
  profileLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 10,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#0284c7',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0284c7',
  },

  // Phase 2: Reschedule Approval Styles
  rescheduleSectionContainer: {
    marginBottom: 20,
  },
  rescheduleSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b45309',
  },
  rescheduleCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#fcd34d',
    marginBottom: 12,
  },
  rescheduleBadge: {
    backgroundColor: '#fef3c7',
    color: '#b45309',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rescheduleTimestamp: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '600',
  },
  reschedulePatientName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#78350f',
    marginTop: 8,
  },
  rescheduleSubtext: {
    fontSize: 12,
    color: '#92400e',
    marginTop: 2,
    marginBottom: 10,
  },
  scheduleComparisonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginBottom: 10,
  },
  comparisonCol: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  comparisonOriginalVal: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  comparisonOriginalSlot: {
    fontSize: 11,
    color: '#94a3b8',
  },
  comparisonArrow: {
    fontSize: 18,
    color: '#0284c7',
    paddingHorizontal: 8,
    fontWeight: '800',
  },
  comparisonRequestedVal: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '800',
    marginTop: 2,
  },
  comparisonRequestedSlot: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  rescheduleReasonBox: {
    backgroundColor: '#fefce8',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginBottom: 12,
  },
  rescheduleReasonHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  rescheduleReasonContent: {
    fontSize: 12,
    color: '#78350f',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  rescheduleButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectOutlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectOutlineButtonText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
  approveButton: {
    flex: 1.5,
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  modalSubheading: {
    fontSize: 13,
    color: '#0284c7',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 8,
  },
  modalInstructionText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginBottom: 12,
  },
  rejectionErrorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  rejectionErrorText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectionInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    height: 80,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  modalConfirmRejectButton: {
    flex: 1.5,
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalConfirmRejectButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  vitalBadge: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vitalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  // Phase 13 Profile Styles
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 8,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  cardSubtext: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  editProfileTopBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editProfileTopBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  profileSuccessBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  profileSuccessBannerText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700',
  },
  profileErrorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  profileErrorBannerText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '600',
  },
  completionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  completionPercentText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionMissingText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '600',
  },
  completionCompleteText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profHeaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  profHeaderRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
  },
  profStatusBadgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  profStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeVerified: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  profStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileValueHighlight: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
    marginBottom: 8,
  },
  profileValueBio: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  skillsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    marginTop: 2,
  },
  skillChip: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  skillChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369a1',
  },
  addCredBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addCredBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  credItemBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  credItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
  },
  credDeleteBtn: {
    padding: 4,
  },
  credDeleteBtnText: {
    fontSize: 14,
  },
  credAuthorityText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  credCategoryText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  credDocNumberText: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  credStatusRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  credStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  credVerifiedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  credRejectedPill: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  credPendingPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  credStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
  },
  rejectionReasonBanner: {
    backgroundColor: '#fff1f2',
    borderLeftWidth: 3,
    borderLeftColor: '#e11d48',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  rejectionReasonTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9f1239',
  },
  rejectionReasonBody: {
    fontSize: 11,
    color: '#be123c',
    marginTop: 2,
    lineHeight: 15,
  },
  emptyCredBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyCredIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyCredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  emptyCredSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  inputModalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 10,
    textTransform: 'uppercase',
  },
  modalTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  modalSaveButton: {
    flex: 1.5,
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  securityNoticeBox: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  securityNoticeBoxText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
});
