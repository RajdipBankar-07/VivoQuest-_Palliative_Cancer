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
import { patientApi, normalizeMobilePhone } from '../services/apiClient';
import { UserSession } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    const cleanPhone = normalizeMobilePhone(phone);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
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
      const { user } = await patientApi.login(cleanPhone, password);
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
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanPhone = normalizeMobilePhone(phone);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Please create a secure password (at least 6 characters).');
      return;
    }

    if (!consentAccepted) {
      setErrorMessage('DPDP Act data processing consent is required to register.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { user } = await patientApi.register({
        fullName: fullName.trim(),
        phone: cleanPhone,
        password,
        email: email.trim() || undefined,
        city: 'Pune',
        pincode: '411001',
        consentAccepted: true,
      });
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Registration failed. Please check your details and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isNoAccountError =
    errorMessage &&
    (errorMessage.toLowerCase().includes('no account found') ||
      errorMessage.toLowerCase().includes('register first'));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🩺</Text>
          </View>
          <Text style={styles.brandTitle}>VivoQuest Patient</Text>
          <Text style={styles.brandTagline}>Care at the Kitchen Table</Text>
          <Text style={styles.brandDescription}>
            Sign in to access your assigned bedside care team, active nursing packages, and daily clinical reports.
          </Text>
        </View>

        {/* Auth Mode Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, authMode === 'login' && styles.tabButtonActive]}
            onPress={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            disabled={isLoading}
          >
            <Text style={[styles.tabText, authMode === 'login' && styles.tabTextActive]}>
              Sign In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, authMode === 'register' && styles.tabButtonActive]}
            onPress={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            disabled={isLoading}
          >
            <Text style={[styles.tabText, authMode === 'register' && styles.tabTextActive]}>
              New Patient
            </Text>
          </TouchableOpacity>
        </View>

        {/* Auth Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {authMode === 'login' ? 'Patient Sign In' : 'Register New Patient'}
          </Text>
          <Text style={styles.cardSubtitle}>
            {authMode === 'login'
              ? 'Enter your registered mobile number and password.'
              : 'Create your secure account for verified bedside healthcare.'}
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              {isNoAccountError && authMode === 'login' && (
                <TouchableOpacity
                  style={styles.errorActionButton}
                  onPress={() => {
                    setAuthMode('register');
                    setErrorMessage(null);
                  }}
                >
                  <Text style={styles.errorActionText}>👉 Tap here to register as a new patient</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Full Name Input (Register mode only) */}
          {authMode === 'register' && (
            <>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Kulkarni"
                placeholderTextColor="#94a3b8"
                value={fullName}
                onChangeText={(val) => {
                  setFullName(val);
                  setErrorMessage(null);
                }}
                editable={!isLoading}
                autoCapitalize="words"
              />
            </>
          )}

          {/* Phone Input */}
          <Text style={styles.inputLabel}>Mobile Phone Number</Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.countryCodeBadge}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="98200 12345"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(val) => {
                setPhone(val);
                setErrorMessage(null);
              }}
              editable={!isLoading}
            />
          </View>

          {/* Email Input (Register mode only) */}
          {authMode === 'register' && (
            <>
              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="name@example.com"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  setErrorMessage(null);
                }}
                editable={!isLoading}
              />
            </>
          )}

          {/* Password Input */}
          <Text style={styles.inputLabel}>
            {authMode === 'login' ? 'Password' : 'Create Password (min 6 characters)'}
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder={authMode === 'login' ? 'Enter your password' : 'Create password'}
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              setErrorMessage(null);
            }}
            editable={!isLoading}
          />

          {/* DPDP Consent Box (Register mode only) */}
          {authMode === 'register' && (
            <TouchableOpacity
              style={styles.consentRow}
              onPress={() => setConsentAccepted(!consentAccepted)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, consentAccepted && styles.checkboxChecked]}>
                {consentAccepted && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                I accept the DPDP Act 2023 terms and authorize VivoQuest to process clinical records for bedside care.
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={authMode === 'login' ? handleLogin : handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>
                {authMode === 'login' ? 'Sign In with Mobile' : 'Create Patient Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle Link */}
          <TouchableOpacity
            style={styles.switchModeContainer}
            onPress={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setErrorMessage(null);
            }}
            disabled={isLoading}
          >
            <Text style={styles.switchModeText}>
              {authMode === 'login'
                ? "Don't have an account? Create Patient Account"
                : 'Already have an account? Sign In'}
            </Text>
          </TouchableOpacity>

          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>Secure Clinical Access:</Text>
            <Text style={styles.helpText}>
              {authMode === 'login'
                ? 'Enter your registered 10-digit mobile number and password to access active bedside subscriptions and verified reports.'
                : 'New patient registrations are encrypted and protected under India DPDP Act compliance standards.'}
            </Text>
            <Text style={styles.helpSubtext}>
              Hardware-backed encrypted session via VivoQuest Healthcare API.
            </Text>
          </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 30,
  },
  brandTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38bdf8',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  brandDescription: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    maxWidth: 320,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#0284c7',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 16,
  },
  errorBanner: {
    backgroundColor: '#451a1a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 17,
  },
  errorActionButton: {
    marginTop: 8,
    backgroundColor: '#7f1d1d',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  errorActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phoneInputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  countryCodeBadge: {
    backgroundColor: '#334155',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#475569',
  },
  countryCodeText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#334155',
  },
  textInput: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#0f172a',
  },
  checkboxChecked: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  checkboxCheck: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
  loginButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchModeContainer: {
    marginTop: 14,
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchModeText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  helpBox: {
    marginTop: 18,
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  helpTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  helpText: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
  },
  helpSubtext: {
    color: '#0284c7',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});
