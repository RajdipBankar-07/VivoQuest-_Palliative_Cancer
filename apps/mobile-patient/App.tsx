import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  Image,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { patientApi, setOnUnauthorizedListener, SessionExpiredError, getMobileApiBaseUrl } from './src/services/apiClient';
import { authStorage } from './src/services/authStorage';
import { LoginView } from './src/components/LoginView';
import {
  UserSession,
  PatientSubscription,
  DailyCareReport,
  SubscriptionPlan,
  AssignedCaregiverDetails,
  PatientVisit,
  PatientVisitsSchedule,
  VisitRescheduleRequest,
} from './src/types';

const STANDARD_TIME_SLOTS = [
  '08:00 AM - 10:00 AM',
  '10:00 AM - 12:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM',
];

export default function PatientApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'caregiver' | 'visits' | 'reports' | 'plans' | 'profile'>('home');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Live Backend Data States
  const [subscriptions, setSubscriptions] = useState<PatientSubscription[]>([]);
  const [careReports, setCareReports] = useState<DailyCareReport[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [assignedCaregiver, setAssignedCaregiver] = useState<AssignedCaregiverDetails | null>(null);
  const [visitsSchedule, setVisitsSchedule] = useState<PatientVisitsSchedule | null>(null);

  // UI Flow States
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyCareReport | null>(null);
  const [subscribingPlan, setSubscribingPlan] = useState<SubscriptionPlan | null>(null);
  const [visitsFilter, setVisitsFilter] = useState<'upcoming' | 'past'>('upcoming');

  // Phase 1: Test-Mode Subscription Activation States
  const [isActivatingSubscription, setIsActivatingSubscription] = useState<boolean>(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string>('');
  const [subscriptionNotes, setSubscriptionNotes] = useState<string>('');
  const [emergencyName, setEmergencyName] = useState<string>('');
  const [emergencyPhone, setEmergencyPhone] = useState<string>('');
  const [emergencyRelation, setEmergencyRelation] = useState<string>('Family');

  // Phase 2: Rescheduling States
  const [reschedulingVisit, setReschedulingVisit] = useState<PatientVisit | null>(null);
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [requestedTimeSlot, setRequestedTimeSlot] = useState<string>('09:00 AM - 11:00 AM');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState<boolean>(false);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [rescheduleSuccessMsg, setRescheduleSuccessMsg] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 1. Session Bootstrap & 401 Listener Setup
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Listen for unauthorized/expired token events from API layer
    setOnUnauthorizedListener(() => {
      setUserSession(null);
      setSubscriptions([]);
      setCareReports([]);
      setAvailablePlans([]);
      setAssignedCaregiver(null);
      setVisitsSchedule(null);
      Alert.alert('Session Expired', 'Your secure session has expired. Please sign in again.');
    });

    const bootstrapSession = async () => {
      try {
        const token = await authStorage.getToken();
        const savedUser = await authStorage.getUser();

        if (token && savedUser) {
          setUserSession(savedUser);
          await loadPatientDashboardData();
        }
      } catch (err) {
        console.warn('[PatientApp] Session bootstrap failed:', err);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrapSession();

    return () => {
      setOnUnauthorizedListener(null);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Load Real Patient Data from Backend APIs
  // ---------------------------------------------------------------------------
  const loadPatientDashboardData = async () => {
    setIsLoadingData(true);
    setApiError(null);

    try {
      const [subsResult, reportsResult, plansResult, caregiverResult, visitsResult] = await Promise.allSettled([
        patientApi.getSubscriptions(),
        patientApi.getCareReports(),
        patientApi.getCaregiverPlans(),
        patientApi.getAssignedCaregiver(),
        patientApi.getVisits(),
      ]);

      if (subsResult.status === 'fulfilled') {
        setSubscriptions(subsResult.value);
      } else {
        console.warn('[PatientApp] Subscriptions fetch error:', subsResult.reason);
      }

      if (reportsResult.status === 'fulfilled') {
        setCareReports(reportsResult.value);
      } else {
        console.warn('[PatientApp] Care reports fetch error:', reportsResult.reason);
      }

      if (plansResult.status === 'fulfilled') {
        setAvailablePlans(plansResult.value);
      } else {
        console.warn('[PatientApp] Caregiver plans fetch error:', plansResult.reason);
      }

      if (caregiverResult.status === 'fulfilled') {
        setAssignedCaregiver(caregiverResult.value);
      } else {
        console.warn('[PatientApp] Assigned caregiver fetch error:', caregiverResult.reason);
      }

      if (visitsResult.status === 'fulfilled') {
        setVisitsSchedule(visitsResult.value);
      } else {
        console.warn('[PatientApp] Visits schedule fetch error:', visitsResult.reason);
      }

      // Check if all primary calls failed
      if (
        subsResult.status === 'rejected' &&
        reportsResult.status === 'rejected' &&
        plansResult.status === 'rejected' &&
        caregiverResult.status === 'rejected' &&
        visitsResult.status === 'rejected'
      ) {
        setApiError('Unable to connect to VivoQuest servers. Please verify backend is running on port 4000.');
      }
    } catch (err: any) {
      if (err instanceof SessionExpiredError) return;
      setApiError(err.message || 'An unexpected network error occurred while loading patient records.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. Pull-to-Refresh Handler
  // ---------------------------------------------------------------------------
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadPatientDashboardData();
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 4. Action Handlers
  // ---------------------------------------------------------------------------
  const handleLoginSuccess = async (user: UserSession) => {
    setUserSession(user);
    await loadPatientDashboardData();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to end your secure patient session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await patientApi.logout();
            setUserSession(null);
            setSubscriptions([]);
            setCareReports([]);
            setAvailablePlans([]);
            setAssignedCaregiver(null);
            setVisitsSchedule(null);
            setActiveTab('home');
          },
        },
      ]
    );
  };

  const handleCallCaregiver = (phone?: string, caregiverName?: string) => {
    if (!phone) {
      Alert.alert(
        'Phone Unavailable',
        'Direct contact number is not available for this caregiver. Please reach out via VivoQuest 24/7 Care Coordination Desk.'
      );
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const targetName = caregiverName || 'Assigned Caregiver';

    Alert.alert(
      'Contact Assigned Caregiver',
      `Dial ${targetName} at +91 ${cleanPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call Now',
          onPress: () => {
            Linking.openURL(`tel:+91${cleanPhone}`).catch(() => {
              Alert.alert('Phone Call', `Please dial +91 ${cleanPhone} directly on your phone.`);
            });
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // Phase 1: Test-Mode Subscription Activation Handler
  // ---------------------------------------------------------------------------
  const handleConfirmTestModeSubscription = async () => {
    if (isActivatingSubscription || !subscribingPlan) return;
    setIsActivatingSubscription(true);
    setActivationError(null);
    try {
      const activeSub = subscriptions.find((s) => s.status === 'active');
      if (activeSub && activeSub.planId !== subscribingPlan.id) {
        Alert.alert(
          'Active Subscription Already Exists',
          `You already have an active subscription (${activeSub.subscriptionNumber} — ${activeSub.planTitle}). You can only have one active care subscription at a time. Please cancel or complete your current plan before activating another.`
        );
        setIsActivatingSubscription(false);
        return;
      }

      const keyToSend = checkoutIdempotencyKey || `act-${subscribingPlan.id}-${userSession?.id || 'pat'}`;
      const result = await patientApi.activateSubscription(subscribingPlan.id, {
        carePlanNotes: subscriptionNotes.trim() || undefined,
        emergencyContact: emergencyName.trim()
          ? {
              name: emergencyName.trim(),
              phone: emergencyPhone.trim() || userSession?.phone || '',
              relation: emergencyRelation.trim() || 'Family',
            }
          : undefined,
        idempotencyKey: keyToSend,
      });

      setSubscribingPlan(null);
      setSubscriptionNotes('');
      setEmergencyName('');
      setEmergencyPhone('');
      setCheckoutIdempotencyKey('');

      Alert.alert(
        'Subscription Activated (TEST MODE)',
        `Your care plan "${result.planTitle}" is now ACTIVE (TEST MODE) under Subscription #${result.subscriptionNumber}.\n\nCare coordinators have been notified to review your subscription and schedule your ${result.totalVisitsIncluded} care visits.`,
        [
          {
            text: 'View Visits',
            onPress: () => {
              setActiveTab('visits');
            },
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ]
      );

      await loadPatientDashboardData();
    } catch (err: any) {
      setActivationError(err.message || 'Subscription activation failed. Please try again.');
    } finally {
      setIsActivatingSubscription(false);
    }
  };

  const handleDownloadPatientReport = async (reportId: string) => {
    try {
      const token = await authStorage.getToken();
      const downloadUrl = `${getMobileApiBaseUrl()}/visits/${reportId}/report/download?format=pdf${
        token ? `&token=${encodeURIComponent(token)}` : ''
      }`;
      Linking.openURL(downloadUrl).catch(() => {
        Alert.alert('Report Download', `Please open the download link in your browser:\n${downloadUrl}`);
      });
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Unable to download report.');
    }
  };

  // ---------------------------------------------------------------------------
  // Phase 2: Rescheduling Helpers & Actions
  // ---------------------------------------------------------------------------
  const getFutureDateStr = (daysAhead: number = 1): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  };

  const handleOpenReschedule = (visit: PatientVisit) => {
    setReschedulingVisit(visit);
    setRequestedDate(getFutureDateStr(1));
    setRequestedTimeSlot(visit.timeSlot || STANDARD_TIME_SLOTS[0]);
    setRescheduleReason('');
    setRescheduleError(null);
    setRescheduleSuccessMsg(null);
  };

  const handleQuickDatePreset = (days: number) => {
    setRequestedDate(getFutureDateStr(days));
  };

  const handleCancelRescheduleRequest = (requestId: string, visitNumber: string) => {
    Alert.alert(
      'Cancel Rescheduling Request',
      `Are you sure you want to cancel your rescheduling request for Visit #${visitNumber}?`,
      [
        { text: 'No, Keep Request', style: 'cancel' },
        {
          text: 'Yes, Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setCancellingRequestId(requestId);
            try {
              await patientApi.cancelRescheduleRequest(requestId);
              Alert.alert('Request Cancelled', 'Your rescheduling request has been cancelled.');
              await loadPatientDashboardData();
            } catch (err: any) {
              Alert.alert('Cancellation Failed', err.message || 'Unable to cancel request. Please try again.');
            } finally {
              setCancellingRequestId(null);
            }
          },
        },
      ]
    );
  };

  const handleSubmitReschedule = () => {
    if (!reschedulingVisit) return;

    const trimmedDate = requestedDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      setRescheduleError('Please enter a valid date in YYYY-MM-DD format');
      return;
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (trimmedDate < todayStr) {
      setRescheduleError('Requested date must be in the future (today or later)');
      return;
    }

    if (!requestedTimeSlot.trim()) {
      setRescheduleError('Please select a preferred time slot');
      return;
    }

    const trimmedReason = rescheduleReason.trim();
    if (trimmedReason.length < 3) {
      setRescheduleError('Please provide a reason for rescheduling (at least 3 characters)');
      return;
    }

    setRescheduleError(null);

    Alert.alert(
      'Confirm Reschedule Request',
      `Submit rescheduling request for Visit #${reschedulingVisit.visitNumber}?\n\nOriginal: ${reschedulingVisit.scheduledDate} (${reschedulingVisit.timeSlot})\nRequested: ${trimmedDate} (${requestedTimeSlot.trim()})`,
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Submit Request',
          onPress: async () => {
            setIsSubmittingReschedule(true);
            try {
              await patientApi.requestVisitReschedule(
                reschedulingVisit.id,
                trimmedDate,
                requestedTimeSlot.trim(),
                trimmedReason
              );
              setRescheduleSuccessMsg('Reschedule request submitted successfully! Your caregiver/coordinator will review it.');
              setTimeout(async () => {
                setReschedulingVisit(null);
                setRescheduleSuccessMsg(null);
                await loadPatientDashboardData();
              }, 1200);
            } catch (err: any) {
              setRescheduleError(err.message || 'Failed to submit rescheduling request.');
            } finally {
              setIsSubmittingReschedule(false);
            }
          },
        },
      ]
    );
  };

  // ---------------------------------------------------------------------------
  // Bootstrapping / Initial Splash
  // ---------------------------------------------------------------------------
  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.splashText}>Restoring secure clinical session...</Text>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Unauthenticated: Render Login View
  // ---------------------------------------------------------------------------
  if (!userSession) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  // Derived Active Data
  const activeSub = subscriptions.find((s) => s.status === 'active') || subscriptions[0];
  const nextVisit = visitsSchedule?.upcoming && visitsSchedule.upcoming.length > 0 ? visitsSchedule.upcoming[0] : null;
  const latestReport =
    careReports.find(
      (r) =>
        r.vitals &&
        (r.vitals.bloodPressure ||
          r.vitals.pulseRate ||
          r.vitals.oxygenSaturation ||
          r.vitals.temperature)
    ) || careReports[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBrand}>VivoQuest</Text>
          <Text style={styles.headerSubtitle}>Patient Care Portal</Text>
        </View>
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() =>
            Alert.alert(
              'Emergency Medical Coordination',
              'Connecting to 24/7 VivoQuest Emergency Response Team (Toll-Free: 1800-890-8486 or Dial 112).'
            )
          }
        >
          <Text style={styles.sosText}>SOS HELP</Text>
        </TouchableOpacity>
      </View>

      {/* Network / API Error Banner */}
      {apiError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {apiError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadPatientDashboardData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content Scroll Area */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#1976D2"
            colors={['#1976D2', '#2E9E6F']}
          />
        }
      >
        {/* Loading Indicator for Data Fetching */}
        {isLoadingData && !isRefreshing && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#1976D2" />
            <Text style={styles.loadingText}>Synchronizing care team & visit schedule...</Text>
          </View>
        )}

        {/* ================= TAB 1: HOME OVERVIEW ================= */}
        {activeTab === 'home' && (
          <View>
            {/* Patient Greeting Card */}
            <View style={styles.cardHighlight}>
              <View style={styles.cardRowBetween}>
                <View>
                  <Text style={styles.greetingText}>Welcome, {userSession.fullName}</Text>
                  <Text style={styles.patientIdText}>Mobile: +91 {userSession.phone}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>● Verified Patient</Text>
                </View>
              </View>
            </View>

            {/* Quick Summary 1: My Caregiver Widget */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>My Caregiver</Text>
              <TouchableOpacity onPress={() => setActiveTab('caregiver')}>
                <Text style={styles.sectionLinkText}>View Full Profile →</Text>
              </TouchableOpacity>
            </View>

            {assignedCaregiver ? (
              <View style={styles.card}>
                <View style={styles.caregiverRow}>
                  <View style={styles.caregiverAvatarCircle}>
                    {assignedCaregiver.profilePhotoUrl ? (
                      <Image
                        source={{ uri: assignedCaregiver.profilePhotoUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>
                        {assignedCaregiver.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.caregiverName}>{assignedCaregiver.name}</Text>
                    <View style={styles.roleBadgeContainer}>
                      <Text style={styles.roleBadgeText}>{assignedCaregiver.role}</Text>
                    </View>
                    <Text style={styles.caregiverPhoneText}>
                      {assignedCaregiver.phone ? `+91 ${assignedCaregiver.phone}` : 'Contact available via desk'}
                    </Text>
                  </View>

                  {assignedCaregiver.phone ? (
                    <TouchableOpacity
                      style={styles.callActionButton}
                      onPress={() => handleCallCaregiver(assignedCaregiver.phone, assignedCaregiver.name)}
                    >
                      <Text style={styles.callActionButtonText}>📞 Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {assignedCaregiver.serviceInfo?.planTitle ? (
                  <View style={styles.caregiverServiceSnippet}>
                    <Text style={styles.snippetLabel}>Current Service:</Text>
                    <Text style={styles.snippetValue}>{assignedCaregiver.serviceInfo.planTitle}</Text>
                    {assignedCaregiver.serviceInfo.shiftInfo ? (
                      <Text style={styles.snippetSub}>{assignedCaregiver.serviceInfo.shiftInfo}</Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>🩺</Text>
                <Text style={styles.emptyCardTitle}>No caregiver assigned yet.</Text>
                <Text style={styles.emptyCardText}>
                  Our clinical care coordinator is reviewing your care plan and will allocate a dedicated nurse or caregiver.
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveTab('caregiver')}
                >
                  <Text style={styles.secondaryButtonText}>Check Assignment Status</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Summary 2: Upcoming Visits Widget */}
            <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
              <Text style={styles.sectionTitle}>Upcoming Visits</Text>
              <TouchableOpacity onPress={() => setActiveTab('visits')}>
                <Text style={styles.sectionLinkText}>
                  {visitsSchedule?.upcomingCount ? `View All (${visitsSchedule.upcomingCount}) →` : 'View Schedule →'}
                </Text>
              </TouchableOpacity>
            </View>

            {nextVisit ? (
              <View style={styles.card}>
                <View style={styles.cardRowBetween}>
                  <View style={styles.statusBadgePrimary}>
                    <Text style={styles.statusBadgePrimaryText}>NEXT SCHEDULED VISIT</Text>
                  </View>
                  <Text style={styles.timeSlotText}>🕒 {nextVisit.timeSlot}</Text>
                </View>

                <Text style={styles.visitDateLarge}>
                  {new Date(nextVisit.scheduledDate).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>

                <Text style={styles.visitServiceTitle}>{nextVisit.serviceName}</Text>

                <View style={styles.divider} />

                <View style={styles.cardRowBetween}>
                  <View>
                    <Text style={styles.visitCaregiverLabel}>Assigned Caregiver:</Text>
                    <Text style={styles.visitCaregiverName}>
                      {nextVisit.assignedCaregiver?.name || 'Care Team Clinician'}
                    </Text>
                  </View>
                  <View style={styles.visitStatusPill}>
                    <Text style={styles.visitStatusPillText}>{nextVisit.statusLabel}</Text>
                  </View>
                </View>

                {nextVisit.instructions ? (
                  <View style={styles.instructionsSnippet}>
                    <Text style={styles.instructionsLabel}>Instructions for Patient:</Text>
                    <Text style={styles.instructionsText}>"{nextVisit.instructions}"</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardIcon}>📅</Text>
                <Text style={styles.emptyCardTitle}>No upcoming visits scheduled</Text>
                <Text style={styles.emptyCardText}>
                  You have no pending home visits scheduled at this time.
                </Text>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setActiveTab('visits')}
                >
                  <Text style={styles.secondaryButtonText}>Open Visit Schedule</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick Summary 3: Latest Bedside Vitals */}
            <Text style={[styles.sectionTitle, { marginTop: 14 }]}>Latest Bedside Vitals</Text>
            {latestReport && latestReport.vitals ? (
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                  <Text style={styles.vitalValue}>{latestReport.vitals.bloodPressure || '—'}</Text>
                  <Text style={styles.vitalStatus}>Recorded {new Date(latestReport.date).toLocaleDateString('en-IN')}</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Pulse Rate</Text>
                  <Text style={styles.vitalValue}>
                    {latestReport.vitals.pulseRate ? `${latestReport.vitals.pulseRate} bpm` : '—'}
                  </Text>
                  <Text style={styles.vitalStatus}>Resting</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Oxygen (SpO2)</Text>
                  <Text style={[styles.vitalValue, { color: '#1976D2' }]}>
                    {latestReport.vitals.oxygenSaturation ? `${latestReport.vitals.oxygenSaturation}%` : '—'}
                  </Text>
                  <Text style={styles.vitalStatus}>Pulse Oximeter</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Body Temp</Text>
                  <Text style={styles.vitalValue}>
                    {latestReport.vitals.temperature
                      ? String(latestReport.vitals.temperature).includes('F') ||
                        String(latestReport.vitals.temperature).includes('C')
                        ? latestReport.vitals.temperature
                        : `${latestReport.vitals.temperature} °F`
                      : '—'}
                  </Text>
                  <Text style={styles.vitalStatus}>Digital Oral</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Clinical Vitals Recorded Yet</Text>
                <Text style={styles.emptyCardText}>
                  Your assigned caregiver will record and verify vitals during your home visits.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: MY CAREGIVER SCREEN ================= */}
        {activeTab === 'caregiver' && (
          <View>
            <Text style={styles.sectionTitle}>My Caregiver</Text>
            <Text style={styles.sectionSubtitle}>
              Available server-backed information for your assigned clinical caregiver
            </Text>

            {assignedCaregiver ? (
              <View>
                {/* Main Caregiver Profile Card */}
                <View style={styles.card}>
                  <View style={styles.caregiverHeaderBlock}>
                    <View style={styles.caregiverLargeAvatarCircle}>
                      {assignedCaregiver.profilePhotoUrl ? (
                        <Image
                          source={{ uri: assignedCaregiver.profilePhotoUrl }}
                          style={styles.avatarLargeImage}
                        />
                      ) : (
                        <Text style={styles.avatarLargeText}>
                          {assignedCaregiver.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase()}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.caregiverDetailName}>{assignedCaregiver.name}</Text>

                    <View style={styles.badgeRowCenter}>
                      <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>{assignedCaregiver.role}</Text>
                      </View>
                      <View style={styles.verifiedCaregiverBadge}>
                        <Text style={styles.verifiedCaregiverText}>● Verified Healthcare Specialist</Text>
                      </View>
                    </View>

                    <View style={styles.assignmentStatusBox}>
                      <Text style={styles.assignmentStatusText}>
                        Status: {assignedCaregiver.assignmentStatus === 'active' ? 'Active Assignment' : 'Caregiver Assigned'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  {/* Contact Number & Call Action */}
                  <View style={styles.infoSection}>
                    <Text style={styles.infoSectionHeading}>Verified Contact Number</Text>
                    <View style={styles.cardRowBetween}>
                      <View>
                        <Text style={styles.contactNumberText}>
                          {assignedCaregiver.phone ? `+91 ${assignedCaregiver.phone}` : 'Not Available on File'}
                        </Text>
                        <Text style={styles.contactVerificationSubtext}>
                          {assignedCaregiver.isPhoneVerified ? '✓ Identity & Phone Number Verified' : 'Registered with VivoQuest Clinical Desk'}
                        </Text>
                      </View>

                      {assignedCaregiver.phone ? (
                        <TouchableOpacity
                          style={styles.callActionButtonLarge}
                          onPress={() => handleCallCaregiver(assignedCaregiver.phone, assignedCaregiver.name)}
                        >
                          <Text style={styles.callActionButtonLargeText}>📞 Call Caregiver</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.disabledCallBox}>
                          <Text style={styles.disabledCallText}>Direct Call Unavailable</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Care Service & Shift Information */}
                  {assignedCaregiver.serviceInfo && (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.infoSectionHeading}>Care Service & Shift Details</Text>
                      <View style={styles.serviceDetailCard}>
                        {assignedCaregiver.serviceInfo.planTitle ? (
                          <View style={styles.serviceDetailRow}>
                            <Text style={styles.serviceDetailLabel}>Package / Plan:</Text>
                            <Text style={styles.serviceDetailValue}>{assignedCaregiver.serviceInfo.planTitle}</Text>
                          </View>
                        ) : null}

                        {assignedCaregiver.serviceInfo.shiftInfo ? (
                          <View style={styles.serviceDetailRow}>
                            <Text style={styles.serviceDetailLabel}>Shift / Duration:</Text>
                            <Text style={styles.serviceDetailValue}>{assignedCaregiver.serviceInfo.shiftInfo}</Text>
                          </View>
                        ) : null}

                        {assignedCaregiver.serviceInfo.visitsRemaining !== undefined ? (
                          <View style={styles.serviceDetailRow}>
                            <Text style={styles.serviceDetailLabel}>Visit Balance:</Text>
                            <Text style={styles.serviceDetailValue}>
                              {assignedCaregiver.serviceInfo.visitsRemaining} of {assignedCaregiver.serviceInfo.totalVisitsIncluded} visits remaining
                            </Text>
                          </View>
                        ) : null}

                        {assignedCaregiver.serviceInfo.validThrough ? (
                          <View style={styles.serviceDetailRow}>
                            <Text style={styles.serviceDetailLabel}>Coverage Valid Through:</Text>
                            <Text style={styles.serviceDetailValue}>
                              {new Date(assignedCaregiver.serviceInfo.validThrough).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Text>
                          </View>
                        ) : null}

                        {assignedCaregiver.serviceInfo.scheduledDate ? (
                          <View style={styles.serviceDetailRow}>
                            <Text style={styles.serviceDetailLabel}>Next Consultation:</Text>
                            <Text style={styles.serviceDetailValue}>
                              {assignedCaregiver.serviceInfo.scheduledDate} ({assignedCaregiver.serviceInfo.timeSlot})
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  )}

                  {/* Specializations & Qualifications (if available) */}
                  {assignedCaregiver.specializations && assignedCaregiver.specializations.length > 0 ? (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.infoSectionHeading}>Clinical Competencies & Specializations</Text>
                      <View style={styles.specializationsRow}>
                        {assignedCaregiver.specializations.map((spec, idx) => (
                          <View key={idx} style={styles.specializationChip}>
                            <Text style={styles.specializationChipText}>✓ {spec}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {/* Clinical Bio (if available) */}
                  {assignedCaregiver.bio ? (
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.infoSectionHeading}>Professional Bio</Text>
                      <Text style={styles.bioText}>"{assignedCaregiver.bio}"</Text>
                    </View>
                  ) : null}
                </View>

                {/* 24/7 Helpline Support Box */}
                <View style={styles.supportHelplineBox}>
                  <Text style={styles.supportHelplineTitle}>24/7 Clinical Care Coordination Desk</Text>
                  <Text style={styles.supportHelplineText}>
                    If your caregiver is unreachable or you require immediate nurse rescheduling, our clinical team is available round-the-clock.
                  </Text>
                  <TouchableOpacity
                    style={styles.helplineButton}
                    onPress={() => Linking.openURL('tel:18008908486')}
                  >
                    <Text style={styles.helplineButtonText}>📞 Call Helpline: 1800-890-8486</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCardLarge}>
                <Text style={styles.emptyCardIconLarge}>🩺</Text>
                <Text style={styles.emptyCardTitle}>No caregiver assigned yet.</Text>
                <Text style={styles.emptyCardTextLarge}>
                  You do not currently have a nurse, ANM, or caregiver actively assigned to your patient account.
                </Text>
                <Text style={styles.emptyCardSubtext}>
                  Caregivers are assigned automatically once you subscribe to a palliative home care plan or when a hospital dispatch is confirmed.
                </Text>
                <TouchableOpacity
                  style={styles.primaryActionButton}
                  onPress={() => setActiveTab('plans')}
                >
                  <Text style={styles.primaryActionButtonText}>Explore Caregiver Plans</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 3: UPCOMING VISITS SCREEN ================= */}
        {activeTab === 'visits' && (
          <View>
            <Text style={styles.sectionTitle}>Upcoming Visits</Text>
            <Text style={styles.sectionSubtitle}>
              Chronological schedule of confirmed home visits and clinical procedures
            </Text>

            {/* Segmented Filter Control: Upcoming vs Past */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[styles.segmentTab, visitsFilter === 'upcoming' && styles.segmentTabActive]}
                onPress={() => setVisitsFilter('upcoming')}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    visitsFilter === 'upcoming' && styles.segmentTabTextActive,
                  ]}
                >
                  Upcoming Visits ({visitsSchedule?.upcomingCount || 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentTab, visitsFilter === 'past' && styles.segmentTabActive]}
                onPress={() => setVisitsFilter('past')}
              >
                <Text
                  style={[
                    styles.segmentTabText,
                    visitsFilter === 'past' && styles.segmentTabTextActive,
                  ]}
                >
                  Past & Completed ({visitsSchedule?.pastCount || 0})
                </Text>
              </TouchableOpacity>
            </View>

            {/* UPCOMING VISITS LIST */}
            {visitsFilter === 'upcoming' && (
              <View>
                {visitsSchedule?.upcoming && visitsSchedule.upcoming.length > 0 ? (
                  visitsSchedule.upcoming.map((visit) => (
                    <View key={visit.id} style={styles.card}>
                      {/* Top Header of Visit Card */}
                      <View style={styles.cardRowBetween}>
                        <View style={styles.timeSlotPill}>
                          <Text style={styles.timeSlotPillText}>🕒 {visit.timeSlot}</Text>
                        </View>
                        <View
                          style={[
                            styles.visitStatusBadge,
                            visit.status === 'in_progress' && styles.badgeStatusInProgress,
                            visit.status === 'en_route' && styles.badgeStatusEnRoute,
                          ]}
                        >
                          <Text style={styles.visitStatusBadgeText}>{visit.statusLabel}</Text>
                        </View>
                      </View>

                      {/* Scheduled Date */}
                      <Text style={styles.visitScheduledDate}>
                        {new Date(visit.scheduledDate).toLocaleDateString('en-IN', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>

                      {/* Visit Type / Service Name */}
                      <Text style={styles.visitServiceName}>{visit.serviceName}</Text>
                      <Text style={styles.visitNumberSub}>Visit ID: {visit.visitNumber}</Text>

                      <View style={styles.divider} />

                      {/* Assigned Caregiver Section */}
                      <View style={styles.cardRowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.visitCaregiverLabel}>Assigned Caregiver:</Text>
                          <Text style={styles.visitCaregiverNameBold}>
                            {visit.assignedCaregiver?.name || 'Assigned Nurse'}
                          </Text>
                          <Text style={styles.visitCaregiverRoleSub}>
                            {visit.assignedCaregiver?.role || 'Clinical Healthcare Provider'}
                          </Text>
                        </View>

                        {visit.assignedCaregiver?.phone ? (
                          <TouchableOpacity
                            style={styles.callActionButtonSmall}
                            onPress={() =>
                              handleCallCaregiver(
                                visit.assignedCaregiver!.phone,
                                visit.assignedCaregiver!.name
                              )
                            }
                          >
                            <Text style={styles.callActionButtonSmallText}>📞 Call</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {/* Authorized Instructions or Notes for the Patient */}
                      {visit.instructions ? (
                        <View style={styles.visitInstructionsBox}>
                          <Text style={styles.instructionsHeading}>📋 Patient Instructions:</Text>
                          <Text style={styles.instructionsContent}>"{visit.instructions}"</Text>
                        </View>
                      ) : null}

                      {/* Phase 2: Reschedule Request Status or Action */}
                      {visit.rescheduleRequest?.status === 'pending' ? (
                        <View style={styles.reschedulePendingBox}>
                          <View style={styles.rescheduleHeaderRow}>
                            <Text style={styles.reschedulePendingBadge}>⏳ Reschedule Requested</Text>
                            <TouchableOpacity
                              style={styles.cancelRequestButtonSmall}
                              onPress={() =>
                                handleCancelRescheduleRequest(
                                  visit.rescheduleRequest!.id,
                                  visit.visitNumber
                                )
                              }
                              disabled={cancellingRequestId === visit.rescheduleRequest.id}
                            >
                              {cancellingRequestId === visit.rescheduleRequest.id ? (
                                <ActivityIndicator size="small" color="#C62828" />
                              ) : (
                                <Text style={styles.cancelRequestButtonText}>Cancel Request</Text>
                              )}
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.reschedulePendingDetails}>
                            Requested: <Text style={{ fontWeight: '700' }}>{visit.rescheduleRequest.requestedDate}</Text> ({visit.rescheduleRequest.requestedTimeSlot})
                          </Text>
                          <Text style={styles.rescheduleReasonText}>
                            Reason: "{visit.rescheduleRequest.reason}"
                          </Text>
                          <Text style={styles.reschedulePendingNote}>
                            Awaiting care coordinator / caregiver review. Your original schedule ({visit.scheduledDate}, {visit.timeSlot}) remains active until approved.
                          </Text>
                        </View>
                      ) : visit.rescheduleRequest?.status === 'rejected' ? (
                        <View style={styles.rescheduleRejectedBox}>
                          <View style={styles.rescheduleHeaderRow}>
                            <Text style={styles.rescheduleRejectedBadge}>❌ Reschedule Request Rejected</Text>
                            {['assigned', 'accepted'].includes(visit.status) ? (
                              <TouchableOpacity
                                style={styles.requestRescheduleButtonSmall}
                                onPress={() => handleOpenReschedule(visit)}
                              >
                                <Text style={styles.requestRescheduleButtonSmallText}>Try Another Slot</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                          {visit.rescheduleRequest.rejectionReason ? (
                            <Text style={styles.rescheduleRejectionReasonText}>
                              Reason: "{visit.rescheduleRequest.rejectionReason}"
                            </Text>
                          ) : null}
                          <Text style={styles.rescheduleRejectedNote}>
                            Your original schedule remains unchanged. You may submit a request for a different date or time.
                          </Text>
                        </View>
                      ) : (
                        ['assigned', 'accepted'].includes(visit.status) && (
                          <View style={styles.rescheduleActionRow}>
                            <TouchableOpacity
                              style={styles.rescheduleButtonOutline}
                              onPress={() => handleOpenReschedule(visit)}
                            >
                              <Text style={styles.rescheduleButtonOutlineText}>📅 Request Reschedule</Text>
                            </TouchableOpacity>
                          </View>
                        )
                      )}
                    </View>
                  ))
                ) : (
                  (() => {
                    const activeSub = subscriptions.find((s) => s.status === 'active');
                    if (activeSub) {
                      return (
                        <View style={styles.emptyCardLarge}>
                          <Text style={styles.emptyCardIconLarge}>📋</Text>
                          <View style={styles.testModeBadgeActive}>
                            <Text style={styles.testModeBadgeText}>TEST MODE ACTIVE</Text>
                          </View>
                          <Text style={styles.emptyCardTitle}>Care Plan Active — Awaiting Scheduling</Text>
                          <Text style={styles.activeSubPlanTitle}>{activeSub.planTitle}</Text>
                          <Text style={styles.activeSubNumber}>Subscription #{activeSub.subscriptionNumber}</Text>
                          <Text style={styles.emptyCardTextLarge}>
                            Your care plan is active in TEST MODE with {activeSub.visitsRemaining} of {activeSub.totalVisitsIncluded} visits remaining.
                          </Text>
                          <Text style={styles.emptyCardSubtext}>
                            Our clinical care coordinators will review your plan and assign a qualified nurse or caregiver to schedule your first visit shortly.
                          </Text>
                          <TouchableOpacity
                            style={styles.primaryActionButton}
                            onPress={loadPatientDashboardData}
                          >
                            <Text style={styles.primaryActionButtonText}>Refresh Schedule</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }
                    return (
                      <View style={styles.emptyCardLarge}>
                        <Text style={styles.emptyCardIconLarge}>📅</Text>
                        <Text style={styles.emptyCardTitle}>No upcoming visits scheduled</Text>
                        <Text style={styles.emptyCardTextLarge}>
                          You do not have any pending clinical visits scheduled at this time.
                        </Text>
                        <Text style={styles.emptyCardSubtext}>
                          New home visits will appear here automatically when assigned by your doctor or care coordinator.
                        </Text>
                        <TouchableOpacity
                          style={styles.primaryActionButton}
                          onPress={loadPatientDashboardData}
                        >
                          <Text style={styles.primaryActionButtonText}>Refresh Schedule</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()
                )}
              </View>
            )}

            {/* PAST & COMPLETED VISITS LIST */}
            {visitsFilter === 'past' && (
              <View>
                {visitsSchedule?.past && visitsSchedule.past.length > 0 ? (
                  visitsSchedule.past.map((visit) => (
                    <View key={visit.id} style={styles.cardMuted}>
                      <View style={styles.cardRowBetween}>
                        <Text style={styles.pastDateText}>
                          {new Date(visit.scheduledDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                        <View
                          style={[
                            styles.pastStatusPill,
                            visit.status === 'completed' && styles.pastStatusCompleted,
                            visit.status === 'cancelled' && styles.pastStatusCancelled,
                          ]}
                        >
                          <Text style={styles.pastStatusPillText}>{visit.statusLabel}</Text>
                        </View>
                      </View>

                      <Text style={styles.pastServiceName}>{visit.serviceName}</Text>
                      <Text style={styles.pastVisitNumber}>ID: {visit.visitNumber}</Text>

                      {visit.assignedCaregiver && (
                        <Text style={styles.pastCaregiverText}>
                          Attended by: {visit.assignedCaregiver.name} ({visit.assignedCaregiver.role})
                        </Text>
                      )}

                      {visit.recommendations ? (
                        <View style={styles.pastRecommendationsBox}>
                          <Text style={styles.pastRecHeading}>Care Recommendations:</Text>
                          <Text style={styles.pastRecText}>"{visit.recommendations}"</Text>
                        </View>
                      ) : null}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyCardTitle}>No Past Visits on Record</Text>
                    <Text style={styles.emptyCardText}>
                      Summaries of attended consultations and completed bedside procedures will be archived here.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 4: CARE REPORTS ================= */}
        {activeTab === 'reports' && (
          <View>
            <Text style={styles.sectionTitle}>Verified Bedside Care Reports</Text>
            <Text style={styles.sectionSubtitle}>
              Signed by attending clinicians after every home consultation
            </Text>

            {careReports.length > 0 ? (
              careReports.map((report) => (
                <TouchableOpacity
                  key={report.id}
                  style={styles.reportCard}
                  onPress={() => setSelectedReport(report)}
                  activeOpacity={0.8}
                >
                  <View style={styles.cardRowBetween}>
                    <Text style={styles.reportDate}>
                      {new Date(report.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={styles.reportStatusBadge}>
                      {report.sourceType === 'field_visit' ? 'Bedside Visit' : 'Health Log'}
                    </Text>
                  </View>

                  <Text style={styles.reportCaregiver}>
                    Recorded by: {report.providerOrSubmitterName} ({report.providerRoleOrRelation})
                  </Text>

                  {report.vitals && (
                    <View style={styles.reportVitalsRow}>
                      {report.vitals.bloodPressure && (
                        <Text style={styles.vitalChip}>BP: {report.vitals.bloodPressure}</Text>
                      )}
                      {report.vitals.pulseRate && (
                        <Text style={styles.vitalChip}>Pulse: {report.vitals.pulseRate} bpm</Text>
                      )}
                      {report.vitals.oxygenSaturation && (
                        <Text style={styles.vitalChip}>SpO2: {report.vitals.oxygenSaturation}%</Text>
                      )}
                    </View>
                  )}

                  {report.clinicalNotes ? (
                    <Text style={styles.reportNotes} numberOfLines={2}>
                      "{report.clinicalNotes}"
                    </Text>
                  ) : null}

                  <Text style={styles.viewDetailsText}>Tap to view complete clinical notes →</Text>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Reports Available</Text>
                <Text style={styles.emptyCardText}>
                  Completed visit summaries and bedside logs will appear here in chronological order.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 5: CARE PLANS ================= */}
        {activeTab === 'plans' && (
          <View>
            {/* Patient Enrolled Subscriptions Section */}
            {subscriptions.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.sectionTitle}>My Subscriptions</Text>
                <Text style={styles.sectionSubtitle}>
                  Your active and past enrolled home care plans
                </Text>
                {subscriptions.map((sub) => (
                  <View key={sub.id} style={styles.enrolledSubCard}>
                    <View style={styles.cardRowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.enrolledSubPlanTitle}>{sub.planTitle}</Text>
                        <Text style={styles.enrolledSubNumber}>#{sub.subscriptionNumber}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View
                          style={[
                            styles.enrolledSubStatusPill,
                            sub.status === 'active' && styles.enrolledSubStatusActive,
                            sub.status === 'suspended' && styles.enrolledSubStatusSuspended,
                            sub.status === 'completed' && styles.enrolledSubStatusCompleted,
                          ]}
                        >
                          <Text
                            style={[
                              styles.enrolledSubStatusText,
                              sub.status === 'active' && styles.enrolledSubStatusTextActive,
                            ]}
                          >
                            {sub.status.toUpperCase()}
                          </Text>
                        </View>
                        {sub.pricing?.paymentStatus === 'test_mode' && (
                          <View style={styles.testModeBadgeSmall}>
                            <Text style={styles.testModeBadgeSmallText}>TEST MODE</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.enrolledSubMetricsRow}>
                      <View style={styles.enrolledSubMetric}>
                        <Text style={styles.enrolledSubMetricLabel}>Visits Balance</Text>
                        <Text style={styles.enrolledSubMetricValue}>
                          {sub.visitsRemaining} / {sub.totalVisitsIncluded} left
                        </Text>
                      </View>
                      <View style={styles.enrolledSubMetric}>
                        <Text style={styles.enrolledSubMetricLabel}>Validity</Text>
                        <Text style={styles.enrolledSubMetricValue}>
                          {new Date(sub.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} -{' '}
                          {new Date(sub.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                    </View>

                    {sub.assignedCaregiver?.name && (
                      <View style={styles.enrolledCaregiverSnippet}>
                        <Text style={styles.enrolledCaregiverText}>
                          Assigned Staff: <Text style={{ fontWeight: '700' }}>{sub.assignedCaregiver.name}</Text>
                        </Text>
                      </View>
                    )}

                    {sub.status === 'active' && (
                      <TouchableOpacity
                        style={styles.viewVisitsSubButton}
                        onPress={() => setActiveTab('visits')}
                      >
                        <Text style={styles.viewVisitsSubButtonText}>View Visit Schedule →</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.sectionTitle}>Palliative Home Nursing Packages</Text>
            <Text style={styles.sectionSubtitle}>
              Monthly subscriptions and scheduled bedside assistance
            </Text>

            {availablePlans.length > 0 ? (
              availablePlans.map((plan) => (
                <View key={plan.id} style={styles.planCard}>
                  {plan.isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularText}>★ MOST POPULAR</Text>
                    </View>
                  )}

                  <Text style={styles.planName}>{plan.title}</Text>
                  <Text style={styles.planCategoryPill}>{plan.category.toUpperCase()}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.priceText}>₹{plan.customerPrice.toLocaleString('en-IN')}</Text>
                    <Text style={styles.priceDuration}>/ {plan.durationDays} Days</Text>
                  </View>

                  <Text style={styles.planVisitsCount}>
                    Includes {plan.totalVisitsIncluded} Scheduled Visits ({plan.hoursPerVisit} hrs/visit)
                  </Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>

                  <View style={styles.divider} />

                  <Text style={styles.featuresHeading}>Included Services:</Text>
                  {plan.features.map((feat, idx) => (
                    <Text key={idx} style={styles.featureItem}>
                      ✓ {feat}
                    </Text>
                  ))}

                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => {
                      const activeSub = subscriptions.find((s) => s.status === 'active');
                      if (activeSub) {
                        Alert.alert(
                          'Active Subscription Exists',
                          `You already have an active subscription (${activeSub.subscriptionNumber} — ${activeSub.planTitle}). You can only have one active care plan at a time. Please cancel or complete your current plan before activating another.`
                        );
                        return;
                      }
                      setCheckoutIdempotencyKey(`act-${plan.id}-${userSession?.id || 'pat'}-${Date.now()}`);
                      setSubscribingPlan(plan);
                    }}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe to Plan</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>Loading Available Plans...</Text>
                <ActivityIndicator color="#1976D2" style={{ marginTop: 12 }} />
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 6: PROFILE ================= */}
        {activeTab === 'profile' && (
          <View>
            <Text style={styles.sectionTitle}>Patient Account Profile</Text>

            <View style={styles.card}>
              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Full Name</Text>
                <Text style={styles.profileValue}>{userSession.fullName}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Mobile Number</Text>
                <Text style={styles.profileValue}>+91 {userSession.phone}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Email</Text>
                <Text style={styles.profileValue}>{userSession.email || 'Not Provided'}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Account Role</Text>
                <Text style={styles.profileValue}>{userSession.role.toUpperCase()}</Text>
              </View>
              <View style={styles.divider} />

              <View style={styles.profileRow}>
                <Text style={styles.profileLabel}>Account ID</Text>
                <Text style={styles.profileValueCode}>{userSession.id}</Text>
              </View>
            </View>

            <View style={styles.securityBox}>
              <Text style={styles.securityTitle}>🔒 Security & Privacy Notice</Text>
              <Text style={styles.securityText}>
                Protected under the Digital Personal Data Protection (DPDP) Act 2023. Authentication tokens are secured in hardware Keychain / Keystore.
              </Text>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Sign Out of Patient Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('caregiver')}
        >
          <Text style={[styles.navIcon, activeTab === 'caregiver' && styles.navIconActive]}>🩺</Text>
          <Text style={[styles.navLabel, activeTab === 'caregiver' && styles.navLabelActive]}>Caregiver</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('visits')}
        >
          <Text style={[styles.navIcon, activeTab === 'visits' && styles.navIconActive]}>📅</Text>
          <Text style={[styles.navLabel, activeTab === 'visits' && styles.navLabelActive]}>Visits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.navIcon, activeTab === 'reports' && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navLabel, activeTab === 'reports' && styles.navLabelActive]}>Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('plans')}
        >
          <Text style={[styles.navIcon, activeTab === 'plans' && styles.navIconActive]}>🛡️</Text>
          <Text style={[styles.navLabel, activeTab === 'plans' && styles.navLabelActive]}>Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Report Detail Modal */}
      <Modal visible={!!selectedReport} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clinical Report Details</Text>
              <TouchableOpacity onPress={() => setSelectedReport(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.modalSubtitle}>
                  Recorded by {selectedReport.providerOrSubmitterName} on{' '}
                  {new Date(selectedReport.date).toLocaleString('en-IN')}
                </Text>

                {selectedReport.vitals && (
                  <View style={styles.modalVitalsBox}>
                    <Text style={styles.modalSectionHeading}>Recorded Vitals:</Text>
                    <Text style={styles.modalVitalItem}>
                      • Blood Pressure: {selectedReport.vitals.bloodPressure || 'N/A'}
                    </Text>
                    <Text style={styles.modalVitalItem}>
                      • Pulse Rate: {selectedReport.vitals.pulseRate ? `${selectedReport.vitals.pulseRate} bpm` : 'N/A'}
                    </Text>
                    <Text style={styles.modalVitalItem}>
                      • Oxygen Saturation: {selectedReport.vitals.oxygenSaturation ? `${selectedReport.vitals.oxygenSaturation}%` : 'N/A'}
                    </Text>
                    <Text style={styles.modalVitalItem}>
                      • Temperature: {selectedReport.vitals.temperature ? `${selectedReport.vitals.temperature} °F` : 'N/A'}
                    </Text>
                  </View>
                )}

                {selectedReport.proceduresDone.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.modalSectionHeading}>Procedures Completed:</Text>
                    {selectedReport.proceduresDone.map((p, idx) => (
                      <Text key={idx} style={styles.modalProcedureText}>
                        ✓ {p}
                      </Text>
                    ))}
                  </View>
                )}

                {selectedReport.clinicalNotes && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.modalSectionHeading}>Attending Clinician Observations:</Text>
                    <Text style={styles.modalNotesText}>"{selectedReport.clinicalNotes}"</Text>
                  </View>
                )}

                {selectedReport.recommendations && (
                  <View style={{ marginTop: 14 }}>
                    <Text style={styles.modalSectionHeading}>Next Steps & Recommendations:</Text>
                    <Text style={styles.modalNotesText}>{selectedReport.recommendations}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            {selectedReport && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.modalCloseButton, { flex: 1, backgroundColor: '#0284c7' }]}
                  onPress={() => handleDownloadPatientReport(selectedReport.id)}
                >
                  <Text style={[styles.modalCloseButtonText, { color: '#FFFFFF' }]}>📥 Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCloseButton, { flex: 1 }]}
                  onPress={() => setSelectedReport(null)}
                >
                  <Text style={styles.modalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Subscription Intent Modal */}
      <Modal visible={!!subscribingPlan} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Confirm Care Plan</Text>
                <Text style={styles.modalSubtitle}>TEST MODE Subscription Activation</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSubscribingPlan(null);
                  setActivationError(null);
                }}
                disabled={isActivatingSubscription}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {subscribingPlan && (
              <ScrollView style={{ maxHeight: 460 }}>
                {/* Test Mode Prominent Banner */}
                <View style={styles.testModeBanner}>
                  <Text style={styles.testModeBannerTitle}>🧪 TEST MODE ACTIVATION</Text>
                  <Text style={styles.testModeBannerText}>
                    This subscription operates in Verified Test Mode. No real payment gateway will be charged, and no financial card details are collected.
                  </Text>
                </View>

                {/* Plan Details Card */}
                <View style={styles.planConfirmBox}>
                  <Text style={styles.planConfirmName}>{subscribingPlan.title}</Text>
                  <Text style={styles.planConfirmCategory}>Category: {subscribingPlan.category.toUpperCase()}</Text>

                  <View style={styles.planConfirmRow}>
                    <Text style={styles.planConfirmLabel}>Package Price:</Text>
                    <Text style={styles.planConfirmPrice}>₹{subscribingPlan.customerPrice.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.planConfirmRow}>
                    <Text style={styles.planConfirmLabel}>Duration:</Text>
                    <Text style={styles.planConfirmValue}>{subscribingPlan.durationDays} Days</Text>
                  </View>
                  <View style={styles.planConfirmRow}>
                    <Text style={styles.planConfirmLabel}>Included Visits:</Text>
                    <Text style={styles.planConfirmValueBold}>{subscribingPlan.totalVisitsIncluded} Scheduled Visits ({subscribingPlan.hoursPerVisit}h each)</Text>
                  </View>
                  <Text style={styles.planConfirmDescription}>{subscribingPlan.description}</Text>
                </View>

                {activationError && (
                  <View style={styles.rescheduleErrorBox}>
                    <Text style={styles.rescheduleErrorText}>⚠️ {activationError}</Text>
                  </View>
                )}

                {/* Optional Care Notes */}
                <Text style={styles.formSectionLabel}>Care Plan Instructions / Special Requests (Optional)</Text>
                <TextInput
                  style={[styles.modalTextInput, { height: 60, textAlignVertical: 'top' }]}
                  value={subscriptionNotes}
                  onChangeText={setSubscriptionNotes}
                  placeholder="E.g., Preferred morning timing, dietary restrictions, bedridden patient..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={2}
                />

                {/* Optional Emergency Contact */}
                <Text style={styles.formSectionLabel}>Emergency Contact Name (Optional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={emergencyName}
                  onChangeText={setEmergencyName}
                  placeholder="Contact person name"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.formSectionLabel}>Emergency Contact Phone (Optional)</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder="10-digit mobile number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.modalDismissButton}
                    onPress={() => {
                      setSubscribingPlan(null);
                      setActivationError(null);
                    }}
                    disabled={isActivatingSubscription}
                  >
                    <Text style={styles.modalDismissButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalConfirmButton, isActivatingSubscription && { opacity: 0.6 }]}
                    onPress={handleConfirmTestModeSubscription}
                    disabled={isActivatingSubscription}
                  >
                    {isActivatingSubscription ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmButtonText}>Confirm &amp; Activate (TEST MODE)</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      {/* Phase 2: Reschedule Request Modal */}
      <Modal
        visible={!!reschedulingVisit}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReschedulingVisit(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Request Reschedule</Text>
                <Text style={styles.modalSubtitle}>Visit #{reschedulingVisit?.visitNumber}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setReschedulingVisit(null)}
                disabled={isSubmittingReschedule}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }}>
              {/* Current Schedule Snapshot (Read-Only) */}
              <View style={styles.readOnlyScheduleBox}>
                <Text style={styles.readOnlyScheduleTitle}>Current Schedule (Active)</Text>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Scheduled Date:</Text>
                  <Text style={styles.readOnlyValueBold}>{reschedulingVisit?.scheduledDate}</Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Time Slot:</Text>
                  <Text style={styles.readOnlyValueBold}>{reschedulingVisit?.timeSlot}</Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Assigned Caregiver:</Text>
                  <Text style={styles.readOnlyValue}>{reschedulingVisit?.assignedCaregiver?.name || 'Assigned Nurse'}</Text>
                </View>
                <View style={styles.readOnlyRow}>
                  <Text style={styles.readOnlyLabel}>Service Type:</Text>
                  <Text style={styles.readOnlyValue}>{reschedulingVisit?.serviceName}</Text>
                </View>
              </View>

              {/* Error / Success Feedback */}
              {rescheduleError && (
                <View style={styles.rescheduleErrorBox}>
                  <Text style={styles.rescheduleErrorText}>⚠️ {rescheduleError}</Text>
                </View>
              )}
              {rescheduleSuccessMsg && (
                <View style={styles.rescheduleSuccessBox}>
                  <Text style={styles.rescheduleSuccessText}>✓ {rescheduleSuccessMsg}</Text>
                </View>
              )}

              {/* Form Input: Requested Date */}
              <Text style={styles.formSectionLabel}>Requested New Date (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.modalTextInput}
                value={requestedDate}
                onChangeText={setRequestedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />

              {/* Quick Preset Buttons */}
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDatePreset(1)}
                >
                  <Text style={styles.quickDateChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDatePreset(2)}
                >
                  <Text style={styles.quickDateChipText}>+2 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDatePreset(3)}
                >
                  <Text style={styles.quickDateChipText}>+3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDatePreset(7)}
                >
                  <Text style={styles.quickDateChipText}>+1 Week</Text>
                </TouchableOpacity>
              </View>

              {/* Form Input: Requested Time Slot */}
              <Text style={styles.formSectionLabel}>Requested Time Slot *</Text>
              <View style={styles.slotChipsContainer}>
                {STANDARD_TIME_SLOTS.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotChip,
                      requestedTimeSlot === slot && styles.slotChipActive,
                    ]}
                    onPress={() => setRequestedTimeSlot(slot)}
                  >
                    <Text
                      style={[
                        styles.slotChipText,
                        requestedTimeSlot === slot && styles.slotChipTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Form Input: Reason */}
              <Text style={styles.formSectionLabel}>Reason for Rescheduling *</Text>
              <TextInput
                style={[styles.modalTextInput, styles.modalTextArea]}
                value={rescheduleReason}
                onChangeText={setRescheduleReason}
                placeholder="Please state why you need to reschedule this visit (at least 3 characters)..."
                placeholderTextColor="#94A3B8"
                multiline={true}
                numberOfLines={3}
              />

              <View style={styles.modalNoticeBox}>
                <Text style={styles.modalNoticeText}>
                  ℹ Note: Rescheduling requests are subject to caregiver availability. Your original visit time remains active until your request is approved.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalDismissButton}
                  onPress={() => setReschedulingVisit(null)}
                  disabled={isSubmittingReschedule}
                >
                  <Text style={styles.modalDismissButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleSubmitReschedule}
                  disabled={isSubmittingReschedule}
                >
                  {isSubmittingReschedule ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmButtonText}>Submit Request</Text>
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
    backgroundColor: '#F4F9FC', // VivoQuest Brand light background
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#17324D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    color: '#94a3b8',
    marginTop: 14,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#17324D', // VivoQuest Navy
    borderBottomWidth: 1,
    borderBottomColor: '#24476B',
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sosButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sosText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 12,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#EBF5FF',
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#1976D2',
    fontSize: 12,
    marginLeft: 8,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  cardHighlight: {
    backgroundColor: '#17324D', // Navy Accent
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  patientIdText: {
    fontSize: 12,
    color: '#93C5FD',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17324D', // Navy
    marginTop: 6,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -4,
    marginBottom: 14,
  },
  sectionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1976D2',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardMuted: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCardLarge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyCardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyCardIconLarge: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyCardTitle: {
    color: '#17324D',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyCardText: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyCardTextLarge: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },
  emptyCardSubtext: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  primaryActionButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  primaryActionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  caregiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caregiverAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  caregiverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17324D',
  },
  roleBadgeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1976D2',
  },
  caregiverPhoneText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  callActionButton: {
    backgroundColor: '#2E9E6F', // VivoQuest Green
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  caregiverServiceSnippet: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
  },
  snippetLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  snippetValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17324D',
    marginTop: 1,
  },
  snippetSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadgePrimary: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePrimaryText: {
    color: '#1976D2',
    fontSize: 10,
    fontWeight: '800',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  visitDateLarge: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17324D',
    marginTop: 6,
  },
  visitServiceTitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  visitCaregiverLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  visitCaregiverName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17324D',
  },
  visitStatusPill: {
    backgroundColor: '#E6F7F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  visitStatusPillText: {
    color: '#2E9E6F',
    fontSize: 11,
    fontWeight: '700',
  },
  instructionsSnippet: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  instructionsText: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
    fontStyle: 'italic',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vitalCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  vitalLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vitalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17324D',
    marginTop: 4,
  },
  vitalStatus: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  caregiverHeaderBlock: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  caregiverLargeAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarLargeImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  caregiverDetailName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17324D',
    textAlign: 'center',
  },
  badgeRowCenter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  rolePill: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  rolePillText: {
    color: '#1976D2',
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedCaregiverBadge: {
    backgroundColor: '#E6F7F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedCaregiverText: {
    color: '#2E9E6F',
    fontSize: 11,
    fontWeight: '700',
  },
  assignmentStatusBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  assignmentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2E9E6F',
  },
  infoSection: {
    marginTop: 6,
  },
  infoSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contactNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#17324D',
  },
  contactVerificationSubtext: {
    fontSize: 11,
    color: '#2E9E6F',
    marginTop: 2,
  },
  callActionButtonLarge: {
    backgroundColor: '#2E9E6F',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callActionButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  disabledCallBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disabledCallText: {
    color: '#94A3B8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  serviceDetailCard: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  serviceDetailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  serviceDetailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17324D',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },
  specializationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specializationChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specializationChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  bioText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  supportHelplineBox: {
    backgroundColor: '#EBF5FF',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 20,
  },
  supportHelplineTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1976D2',
    marginBottom: 4,
  },
  supportHelplineText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 8,
  },
  helplineButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  helplineButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  segmentTabTextActive: {
    color: '#1976D2',
    fontWeight: '800',
  },
  timeSlotPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeSlotPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  visitStatusBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeStatusInProgress: {
    backgroundColor: '#E6F7F0',
  },
  badgeStatusEnRoute: {
    backgroundColor: '#FEF3C7',
  },
  visitStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1976D2',
  },
  visitScheduledDate: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17324D',
    marginTop: 6,
  },
  visitServiceName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 2,
  },
  visitNumberSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  visitCaregiverNameBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17324D',
    marginTop: 1,
  },
  visitCaregiverRoleSub: {
    fontSize: 11,
    color: '#64748B',
  },
  callActionButtonSmall: {
    backgroundColor: '#2E9E6F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  callActionButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  visitInstructionsBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
  },
  instructionsHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  instructionsContent: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 2,
    lineHeight: 16,
  },
  pastDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17324D',
  },
  pastStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  pastStatusCompleted: {
    backgroundColor: '#E6F7F0',
  },
  pastStatusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  pastStatusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  pastServiceName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
  },
  pastVisitNumber: {
    fontSize: 10,
    color: '#94A3B8',
  },
  pastCaregiverText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  pastRecommendationsBox: {
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  pastRecHeading: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  pastRecText: {
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  reportDate: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '700',
  },
  reportStatusBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  reportCaregiver: {
    color: '#17324D',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  reportVitalsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  vitalChip: {
    backgroundColor: '#F1F5F9',
    color: '#1976D2',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportNotes: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 17,
  },
  viewDetailsText: {
    color: '#1976D2',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  popularBadge: {
    backgroundColor: '#D97706',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  popularText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#17324D',
  },
  planCategoryPill: {
    color: '#1976D2',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2E9E6F',
  },
  priceDuration: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  planVisitsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17324D',
    marginTop: 4,
  },
  planDescription: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  featuresHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  featureItem: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17324D',
  },
  profileValueCode: {
    fontSize: 11,
    color: '#1976D2',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  securityBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  securityTitle: {
    color: '#17324D',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  securityText: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 18,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#1976D2',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#17324D',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#1976D2',
    marginBottom: 10,
  },
  modalVitalsBox: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17324D',
    marginBottom: 4,
  },
  modalVitalItem: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 20,
  },
  modalProcedureText: {
    color: '#2E9E6F',
    fontSize: 12,
    lineHeight: 19,
  },
  modalNotesText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: '#17324D',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  subscribeConfirmButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  subscribeConfirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  // Phase 2: Rescheduling Styles
  reschedulePendingBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  rescheduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reschedulePendingBadge: {
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cancelRequestButtonSmall: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelRequestButtonText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  reschedulePendingDetails: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  rescheduleReasonText: {
    color: '#78350F',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  reschedulePendingNote: {
    color: '#B45309',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  rescheduleRejectedBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  rescheduleRejectedBadge: {
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  requestRescheduleButtonSmall: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  requestRescheduleButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  rescheduleRejectionReasonText: {
    color: '#991B1B',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  rescheduleRejectedNote: {
    color: '#B91C1C',
    fontSize: 10,
    marginTop: 6,
    lineHeight: 14,
  },
  rescheduleActionRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  rescheduleButtonOutline: {
    borderWidth: 1,
    borderColor: '#1976D2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F4F9FC',
  },
  rescheduleButtonOutlineText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '700',
  },
  modalContentLarge: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  readOnlyScheduleBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 14,
  },
  readOnlyScheduleTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  readOnlyValue: {
    fontSize: 12,
    color: '#17324D',
    fontWeight: '500',
  },
  readOnlyValueBold: {
    fontSize: 12,
    color: '#17324D',
    fontWeight: '800',
  },
  rescheduleErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  rescheduleErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  rescheduleSuccessBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  rescheduleSuccessText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },
  formSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17324D',
    marginBottom: 6,
    marginTop: 8,
  },
  modalTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  modalTextArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 6,
  },
  quickDateChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickDateChipText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
  },
  slotChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  slotChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  slotChipActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  slotChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  slotChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  modalNoticeText: {
    color: '#1E40AF',
    fontSize: 11,
    lineHeight: 15,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  modalDismissButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  modalDismissButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 13,
  },
  modalConfirmButton: {
    flex: 2,
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  // Phase 1 Additional Styles
  testModeBadgeActive: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  testModeBadgeText: {
    color: '#7E22CE',
    fontSize: 11,
    fontWeight: '800',
  },
  testModeBadgeSmall: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  testModeBadgeSmallText: {
    color: '#7E22CE',
    fontSize: 9,
    fontWeight: '800',
  },
  activeSubPlanTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  activeSubNumber: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#1976D2',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  enrolledSubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  enrolledSubPlanTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#17324D',
  },
  enrolledSubNumber: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#64748B',
    marginTop: 1,
  },
  enrolledSubStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  enrolledSubStatusActive: {
    backgroundColor: '#DCFCE7',
  },
  enrolledSubStatusSuspended: {
    backgroundColor: '#FEF3C7',
  },
  enrolledSubStatusCompleted: {
    backgroundColor: '#DBEAFE',
  },
  enrolledSubStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  enrolledSubStatusTextActive: {
    color: '#15803D',
  },
  enrolledSubMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  enrolledSubMetric: {
    flex: 1,
  },
  enrolledSubMetricLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  enrolledSubMetricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#17324D',
    marginTop: 2,
  },
  enrolledCaregiverSnippet: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  enrolledCaregiverText: {
    fontSize: 11,
    color: '#475569',
  },
  viewVisitsSubButton: {
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewVisitsSubButtonText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '700',
  },
  testModeBanner: {
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 12,
  },
  testModeBannerTitle: {
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  testModeBannerText: {
    color: '#6B21A8',
    fontSize: 11,
    lineHeight: 16,
  },
  planConfirmBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  planConfirmName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  planConfirmCategory: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },
  planConfirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  planConfirmLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  planConfirmValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  planConfirmValueBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  planConfirmPrice: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '800',
  },
  planConfirmDescription: {
    fontSize: 11,
    color: '#475569',
    marginTop: 6,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
});
