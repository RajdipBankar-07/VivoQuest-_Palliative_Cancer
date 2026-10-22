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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { patientApi, setOnUnauthorizedListener, SessionExpiredError } from './src/services/apiClient';
import { authStorage } from './src/services/authStorage';
import { LoginView } from './src/components/LoginView';
import {
  UserSession,
  PatientSubscription,
  DailyCareReport,
  SubscriptionPlan,
} from './src/types';

export default function PatientApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'reports' | 'plans' | 'profile'>('home');
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Live Backend Data States
  const [subscriptions, setSubscriptions] = useState<PatientSubscription[]>([]);
  const [careReports, setCareReports] = useState<DailyCareReport[]>([]);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);

  // UI Flow States
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<DailyCareReport | null>(null);
  const [subscribingPlan, setSubscribingPlan] = useState<SubscriptionPlan | null>(null);

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
      const [subsResult, reportsResult, plansResult] = await Promise.allSettled([
        patientApi.getSubscriptions(),
        patientApi.getCareReports(),
        patientApi.getCaregiverPlans(),
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

      // Check if all failed (indicating network disconnection)
      if (
        subsResult.status === 'rejected' &&
        reportsResult.status === 'rejected' &&
        plansResult.status === 'rejected'
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
  // 4. Authentication Action Handlers
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
            setActiveTab('home');
          },
        },
      ]
    );
  };

  const handleCallCaregiver = (phone: string, caregiverName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    Alert.alert(
      'Contact Assigned Caregiver',
      `Dial ${caregiverName} at +91 ${cleanPhone}?`,
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
  // Bootstrapping / Initial Splash
  // ---------------------------------------------------------------------------
  if (isBootstrapping) {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#0284c7" />
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

  // Active subscription (if any)
  const activeSub = subscriptions.find((s) => s.status === 'active') || subscriptions[0];
  const latestReport = careReports[0];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBrand}>VivoQuest Patient</Text>
          <Text style={styles.headerSubtitle}>Care at the Kitchen Table</Text>
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

      {/* Main Content Area */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
            colors={['#0284c7']}
          />
        }
      >
        {/* Loading Indicator for Data Fetching */}
        {isLoadingData && !isRefreshing && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.loadingText}>Synchronizing clinical records & subscriptions...</Text>
          </View>
        )}

        {/* ================= TAB 1: HOME / CARE TEAM ================= */}
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

            {/* Active Subscription & Caregiver Card */}
            <Text style={styles.sectionTitle}>Your Assigned Care Team</Text>
            {activeSub ? (
              <View style={styles.card}>
                <View style={styles.cardRowBetween}>
                  <Text
                    style={[
                      styles.badgeSuccess,
                      activeSub.status !== 'active' && styles.badgeWarning,
                    ]}
                  >
                    {activeSub.status.toUpperCase()} SUBSCRIPTION
                  </Text>
                  <Text style={styles.visitsCounter}>
                    {activeSub.visitsRemaining} / {activeSub.totalVisitsIncluded} visits left
                  </Text>
                </View>

                <Text style={styles.planTitle}>{activeSub.planTitle}</Text>
                <Text style={styles.subNumberText}>ID: {activeSub.subscriptionNumber}</Text>
                <Text style={styles.nextVisitText}>
                  Valid Through: {new Date(activeSub.endDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>

                <View style={styles.divider} />

                {activeSub.assignedCaregiver ? (
                  <View style={styles.caregiverRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {activeSub.assignedCaregiver.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.caregiverName}>{activeSub.assignedCaregiver.name}</Text>
                      <Text style={styles.caregiverPhone}>+91 {activeSub.assignedCaregiver.phone}</Text>
                      <Text style={styles.caregiverSubtext}>Assigned Palliative Nurse</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() =>
                        handleCallCaregiver(
                          activeSub.assignedCaregiver!.phone,
                          activeSub.assignedCaregiver!.name
                        )
                      }
                    >
                      <Text style={styles.callButtonText}>Call</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.unassignedBox}>
                    <Text style={styles.unassignedTitle}>Caregiver Assignment in Progress</Text>
                    <Text style={styles.unassignedText}>
                      Our clinical dispatch desk is allocating a licensed nurse for your region.
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Active Home Care Subscription</Text>
                <Text style={styles.emptyCardText}>
                  You do not currently have an active palliative nursing package. Browse our daily visits and hospice plans.
                </Text>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => setActiveTab('plans')}
                >
                  <Text style={styles.actionButtonText}>Explore Caregiver Plans</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Latest Bedside Vitals Summary Card */}
            <Text style={styles.sectionTitle}>Latest Bedside Vitals</Text>
            {latestReport && latestReport.vitals ? (
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                  <Text style={styles.vitalValue}>{latestReport.vitals.bloodPressure || '—'}</Text>
                  <Text style={styles.vitalStatus}>Recorded {new Date(latestReport.date).toLocaleDateString()}</Text>
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
                  <Text style={[styles.vitalValue, { color: '#38bdf8' }]}>
                    {latestReport.vitals.oxygenSaturation ? `${latestReport.vitals.oxygenSaturation}%` : '—'}
                  </Text>
                  <Text style={styles.vitalStatus}>Pulse Oximeter</Text>
                </View>
                <View style={styles.vitalCard}>
                  <Text style={styles.vitalLabel}>Body Temp</Text>
                  <Text style={styles.vitalValue}>
                    {latestReport.vitals.temperature ? `${latestReport.vitals.temperature} °F` : '—'}
                  </Text>
                  <Text style={styles.vitalStatus}>Digital Oral</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Clinical Vitals Recorded Yet</Text>
                <Text style={styles.emptyCardText}>
                  Your assigned caregiver will log blood pressure, SpO2, and pulse during your upcoming visit.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: REPORTS ================= */}
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

        {/* ================= TAB 3: CARE PLANS ================= */}
        {activeTab === 'plans' && (
          <View>
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
                    onPress={() => setSubscribingPlan(plan)}
                  >
                    <Text style={styles.subscribeButtonText}>Subscribe to Plan</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>Loading Available Plans...</Text>
                <ActivityIndicator color="#0284c7" style={{ marginTop: 12 }} />
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 4: PROFILE & SETTINGS ================= */}
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
                  {new Date(selectedReport.date).toLocaleString()}
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

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSelectedReport(null)}
            >
              <Text style={styles.modalCloseButtonText}>Close Report</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Subscription Intent Modal */}
      <Modal visible={!!subscribingPlan} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Subscribe to Care Plan</Text>
              <TouchableOpacity onPress={() => setSubscribingPlan(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {subscribingPlan && (
              <View>
                <Text style={styles.planTitle}>{subscribingPlan.title}</Text>
                <Text style={styles.priceText}>
                  ₹{subscribingPlan.customerPrice.toLocaleString('en-IN')} for {subscribingPlan.durationDays} Days
                </Text>
                <Text style={styles.modalNotesText}>
                  This package includes {subscribingPlan.totalVisitsIncluded} dedicated visits. In accordance with test governance, payments are running in Verified Sandbox Mode.
                </Text>

                <TouchableOpacity
                  style={styles.subscribeConfirmButton}
                  onPress={() => {
                    setSubscribingPlan(null);
                    Alert.alert(
                      'Subscription Request Initiated',
                      'Your care plan inquiry has been transmitted to VivoQuest Care Coordinators. A care manager will contact you within 2 business hours to schedule nurse onboarding.'
                    );
                  }}
                >
                  <Text style={styles.subscribeConfirmText}>Confirm & Book Nurse Onboarding</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
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
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
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
    backgroundColor: '#7f1d1d',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#fecaca',
    fontSize: 12,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#b91c1c',
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
    backgroundColor: '#1e293b',
    borderRadius: 8,
    marginBottom: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  cardHighlight: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 16,
  },
  cardRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  patientIdText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: -6,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyCardTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyCardText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  badgeSuccess: {
    backgroundColor: '#064e3b',
    color: '#34d399',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 10,
    fontWeight: '800',
  },
  badgeWarning: {
    backgroundColor: '#78350f',
    color: '#fbbf24',
  },
  visitsCounter: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
  },
  subNumberText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  nextVisitText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 12,
  },
  caregiverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  caregiverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  caregiverPhone: {
    fontSize: 12,
    color: '#38bdf8',
    marginTop: 1,
  },
  caregiverSubtext: {
    fontSize: 11,
    color: '#94a3b8',
  },
  callButton: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  unassignedBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
  },
  unassignedTitle: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
  },
  unassignedText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  vitalCard: {
    width: '48%',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  vitalLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  vitalStatus: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  reportCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  reportDate: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  reportStatusBadge: {
    backgroundColor: '#334155',
    color: '#cbd5e1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: '600',
  },
  reportCaregiver: {
    color: '#ffffff',
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
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reportNotes: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 17,
  },
  viewDetailsText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  planCard: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  popularBadge: {
    backgroundColor: '#d97706',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  planCategoryPill: {
    color: '#38bdf8',
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
    color: '#34d399',
  },
  priceDuration: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  planVisitsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 4,
  },
  planDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  featuresHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  featureItem: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  subscribeButtonText: {
    color: '#ffffff',
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
    color: '#94a3b8',
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileValueCode: {
    fontSize: 11,
    color: '#38bdf8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  securityBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  securityTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  securityText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingVertical: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  navLabelActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
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
    color: '#ffffff',
  },
  modalCloseText: {
    fontSize: 18,
    color: '#94a3b8',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#38bdf8',
    marginBottom: 10,
  },
  modalVitalsBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  modalSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  modalVitalItem: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 20,
  },
  modalProcedureText: {
    color: '#34d399',
    fontSize: 12,
    lineHeight: 19,
  },
  modalNotesText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  subscribeConfirmButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  subscribeConfirmText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
