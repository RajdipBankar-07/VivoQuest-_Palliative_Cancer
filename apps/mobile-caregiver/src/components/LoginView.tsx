import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { caregiverApi } from '../services/apiClient';
import { CaregiverSession } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: CaregiverSession) => void;
}

export type SelectedRole = 'doctor' | 'nurse' | 'caregiver' | 'anm';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Sign In State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Register Professional State
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<SelectedRole>('nurse');
  const [highestQualification, setHighestQualification] = useState('');
  const [institution, setInstitution] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('3');
  const [experienceSummary, setExperienceSummary] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  
  // Optional initial certification entry
  const [certTitle, setCertTitle] = useState('');
  const [certAuthority, setCertAuthority] = useState('');
  const [certCategory, setCertCategory] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { user } = await caregiverApi.login(cleanPhone, password);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your phone number and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    const cleanPhone = regPhone.trim().replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      setErrorMessage('Please provide your full legal name.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    // Role mapping: doctor -> professional (physician), nurse -> professional (nurse), caregiver -> caregiver (caregiver), anm -> professional (anm)
    let apiRole = 'professional';
    let profType = 'physician';

    if (selectedRole === 'doctor') {
      apiRole = 'professional';
      profType = 'physician';
    } else if (selectedRole === 'nurse') {
      apiRole = 'professional';
      profType = 'nurse';
    } else if (selectedRole === 'caregiver') {
      apiRole = 'caregiver';
      profType = 'caregiver';
    } else if (selectedRole === 'anm') {
      apiRole = 'professional';
      profType = 'anm';
    }

    // Optional credentials list
    const credentials = [];
    if (certTitle.trim()) {
      credentials.push({
        certificateTitle: certTitle.trim(),
        issuingAuthority: certAuthority.trim() || 'Awarding Body',
        credentialCategory: certCategory.trim() || 'Professional Certificate',
        documentType: 'other_certification',
      });
    }

    const skills = skillsInput
      ? skillsInput
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { user } = await caregiverApi.register({
        fullName: regFullName.trim(),
        phone: cleanPhone,
        email: regEmail.trim() || undefined,
        password: regPassword,
        role: apiRole,
        professionType: profType,
        highestQualification: highestQualification.trim() || undefined,
        institution: institution.trim() || undefined,
        specialization: specialization.trim() || undefined,
        yearsOfExperience: parseInt(yearsOfExperience, 10) || 1,
        experienceSummary: experienceSummary.trim() || undefined,
        skills: skills.length > 0 ? skills : undefined,
        credentials: credentials.length > 0 ? credentials : undefined,
      });

      setSuccessMessage('Professional account created successfully!');
      setTimeout(() => {
        onLoginSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Registration failed. Please check your details and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getRolePlaceholderHint = () => {
    switch (selectedRole) {
      case 'doctor':
        return 'e.g., MBBS, MD (Palliative Medicine)';
      case 'nurse':
        return 'e.g., B.Sc Nursing, GNM, Critical Care Diploma';
      case 'caregiver':
        return 'e.g., Certified Bedside Caregiver, Geriatric Aide';
      case 'anm':
        return 'e.g., ANM Diploma, Multi-Purpose Health Worker';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>👩‍⚕️</Text>
          </View>
          <Text style={styles.brandTitle}>VivoQuest Clinical</Text>
          <Text style={styles.brandTagline}>Healthcare Professional & Caregiver Portal</Text>
          <Text style={styles.brandDescription}>
            Doctors, Nurses, ANMs, and Palliative Caregivers: enter your professional credentials, access assigned patient dossiers, and manage verified bedside care.
          </Text>
        </View>

        {/* Auth Mode Segmented Switch */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, authMode === 'signin' && styles.segmentBtnActive]}
            onPress={() => {
              setAuthMode('signin');
              setErrorMessage(null);
            }}
          >
            <Text style={[styles.segmentBtnText, authMode === 'signin' && styles.segmentBtnTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, authMode === 'register' && styles.segmentBtnActive]}
            onPress={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
          >
            <Text style={[styles.segmentBtnText, authMode === 'register' && styles.segmentBtnTextActive]}>
              Register Professional
            </Text>
          </TouchableOpacity>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {successMessage}</Text>
          </View>
        )}

        {/* ----------------- TAB 1: SIGN IN ----------------- */}
        {authMode === 'signin' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Clinician Sign In</Text>

            {/* Phone Input */}
            <Text style={styles.inputLabel}>Registered Mobile Number</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="98200 11004"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(val) => {
                  setPhone(val);
                  setErrorMessage(null);
                }}
                maxLength={10}
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your clinician password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={(val) => {
                setPassword(val);
                setErrorMessage(null);
              }}
              editable={!isLoading}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Authenticate & Begin Shift</Text>
              )}
            </TouchableOpacity>

            <View style={styles.securityNotice}>
              <Text style={styles.securityNoticeText}>
                🔒 Protected by DPDP Act 2023 Compliance & Role-Based Access Controls.
              </Text>
            </View>
          </View>
        )}

        {/* ----------------- TAB 2: REGISTER PROFESSIONAL ----------------- */}
        {authMode === 'register' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Professional Registration</Text>
            <Text style={styles.cardSubtitle}>
              Create your persistent healthcare professional profile. Complete mandatory fields to register; optional certificates can be added now or later.
            </Text>

            {/* Professional Role Selection */}
            <Text style={styles.inputLabel}>Professional Role</Text>
            <View style={styles.roleGrid}>
              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'doctor' && styles.roleCardActive]}
                onPress={() => setSelectedRole('doctor')}
              >
                <Text style={styles.roleCardIcon}>👨‍⚕️</Text>
                <Text style={[styles.roleCardTitle, selectedRole === 'doctor' && styles.roleCardTitleActive]}>
                  Doctor
                </Text>
                <Text style={styles.roleCardSub}>Physician</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'nurse' && styles.roleCardActive]}
                onPress={() => setSelectedRole('nurse')}
              >
                <Text style={styles.roleCardIcon}>👩‍⚕️</Text>
                <Text style={[styles.roleCardTitle, selectedRole === 'nurse' && styles.roleCardTitleActive]}>
                  Nurse
                </Text>
                <Text style={styles.roleCardSub}>Staff / GNM</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'caregiver' && styles.roleCardActive]}
                onPress={() => setSelectedRole('caregiver')}
              >
                <Text style={styles.roleCardIcon}>🩺</Text>
                <Text style={[styles.roleCardTitle, selectedRole === 'caregiver' && styles.roleCardTitleActive]}>
                  Caregiver
                </Text>
                <Text style={styles.roleCardSub}>Bedside Aide</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.roleCard, selectedRole === 'anm' && styles.roleCardActive]}
                onPress={() => setSelectedRole('anm')}
              >
                <Text style={styles.roleCardIcon}>📋</Text>
                <Text style={[styles.roleCardTitle, selectedRole === 'anm' && styles.roleCardTitleActive]}>
                  ANM / NRA
                </Text>
                <Text style={styles.roleCardSub}>Midwife / CHW</Text>
              </TouchableOpacity>
            </View>

            {/* Basic Information Section */}
            <View style={styles.sectionDivider} />
            <Text style={styles.formSectionHeader}>1. Basic Information</Text>

            <Text style={styles.inputLabel}>Full Legal Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sister Varsha Kulkarni"
              placeholderTextColor="#94a3b8"
              value={regFullName}
              onChangeText={setRegFullName}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Registered Mobile Number *</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCodeBadge}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="98200 11004"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={regPhone}
                onChangeText={setRegPhone}
                maxLength={10}
                editable={!isLoading}
              />
            </View>

            <Text style={styles.inputLabel}>Email Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="clinician@hospital.org"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={regEmail}
              onChangeText={setRegEmail}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Create Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={regPassword}
              onChangeText={setRegPassword}
              editable={!isLoading}
            />

            {/* Professional Details Section */}
            <View style={styles.sectionDivider} />
            <Text style={styles.formSectionHeader}>2. Professional Qualifications</Text>

            <Text style={styles.inputLabel}>Highest Qualification / Degree</Text>
            <TextInput
              style={styles.input}
              placeholder={getRolePlaceholderHint()}
              placeholderTextColor="#94a3b8"
              value={highestQualification}
              onChangeText={setHighestQualification}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Institution or Awarding Organization</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Maharashtra University of Health Sciences / AIIMS"
              placeholderTextColor="#94a3b8"
              value={institution}
              onChangeText={setInstitution}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Primary Specialization</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Palliative Oncology, Geriatric Wound Care, General Bedside"
              placeholderTextColor="#94a3b8"
              value={specialization}
              onChangeText={setSpecialization}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Total Years of Experience</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 4"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Skills or Areas of Practice (Comma separated)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Vitals Monitoring, Tracheostomy, Pain Scale, Catheter Care"
              placeholderTextColor="#94a3b8"
              value={skillsInput}
              onChangeText={setSkillsInput}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Previous Experience or Employment Summary (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief summary of your bedside caregiving or clinical background..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={experienceSummary}
              onChangeText={setExperienceSummary}
              editable={!isLoading}
            />

            {/* Optional Certifications Section */}
            <View style={styles.sectionDivider} />
            <View style={styles.certHeaderRow}>
              <Text style={styles.formSectionHeader}>3. Initial Certification (Optional)</Text>
              <View style={styles.optionalBadge}>
                <Text style={styles.optionalBadgeText}>OPTIONAL</Text>
              </View>
            </View>
            <Text style={styles.optionalHelpText}>
              You can complete registration without uploading certificates. Documents will be reviewed by an authorized Admin before verification.
            </Text>

            <Text style={styles.inputLabel}>Certificate or Degree Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Basic Life Support (BLS) / GNM Nursing License"
              placeholderTextColor="#94a3b8"
              value={certTitle}
              onChangeText={setCertTitle}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Issuing Organization / Authority</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Maharashtra Nursing Council / Indian Red Cross"
              placeholderTextColor="#94a3b8"
              value={certAuthority}
              onChangeText={setCertAuthority}
              editable={!isLoading}
            />

            <Text style={styles.inputLabel}>Credential Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., State Council License / Palliative Certificate"
              placeholderTextColor="#94a3b8"
              value={certCategory}
              onChangeText={setCertCategory}
              editable={!isLoading}
            />

            {/* DPDP Compliance Notice */}
            <View style={styles.consentBox}>
              <Text style={styles.consentText}>
                ✓ By registering, you consent to the processing of your professional qualifications in accordance with the Digital Personal Data Protection (DPDP) Act 2023. Verification is performed by authorized VivoQuest clinical administrators.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Complete Registration & Launch Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Support Footer */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerNote}>
            VivoQuest Clinical Desk & Field Operations Support
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 44 : 28,
    paddingBottom: 48,
    justifyContent: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoIcon: {
    fontSize: 30,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34d399',
    marginTop: 3,
  },
  brandDescription: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#0284c7',
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  segmentBtnTextActive: {
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 17,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '600',
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  successText: {
    color: '#6ee7b7',
    fontSize: 13,
    fontWeight: '700',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleCard: {
    flexBasis: '48%',
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  roleCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  roleCardIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  roleCardTitleActive: {
    color: '#38bdf8',
  },
  roleCardSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  formSectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  certHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  optionalBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
  },
  optionalHelpText: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  phoneInputRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  countryCodeBadge: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 0,
  },
  countryCodeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 14,
    fontWeight: '500',
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  consentBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 18,
    marginTop: 4,
  },
  consentText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#475569',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  securityNotice: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  securityNoticeText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
  footerContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerNote: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
});
