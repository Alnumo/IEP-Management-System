// Phase 7: Enterprise Automation & Digital Health Platform Types
// Comprehensive TypeScript definitions for automation and remote monitoring

// =============================================
// AUTOMATION WORKFLOWS & PROCESS MANAGEMENT
// =============================================

export interface AutomationWorkflow {
  id: string
  workflowName: string
  workflowType: 'clinical' | 'administrative' | 'billing' | 'scheduling' | 'documentation'
  descriptionAr?: string
  descriptionEn?: string
  triggerConditions: Record<string, any>
  workflowSteps: WorkflowStep[]
  approvalRequirements?: Record<string, any>
  automationLevel: 'fully_automated' | 'semi_automated' | 'manual_approval'
  isActive: boolean
  priorityLevel: number
  estimatedCompletionHours?: number
  successCriteria?: Record<string, any>
  failureHandling?: Record<string, any>
  complianceRequirements?: Record<string, any>
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface WorkflowStep {
  step: number
  action: string
  automation: boolean
  assignedRole?: string
  estimatedDuration?: number
  requirements?: string[]
  approvalRequired?: boolean
}

export interface WorkflowInstance {
  id: string
  workflowId: string
  instanceName?: string
  triggeredBy: 'user' | 'system' | 'scheduled' | 'event'
  triggerUserId?: string
  triggerData?: Record<string, any>
  currentStep: number
  currentStepStatus: 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting_approval'
  overallStatus: 'active' | 'completed' | 'failed' | 'cancelled' | 'paused'
  startedAt: string
  completedAt?: string
  estimatedCompletion?: string
  actualDuration?: string
  stepHistory?: WorkflowStepExecution[]
  approvalChain?: Record<string, any>
  errorLog?: Record<string, any>
  performanceMetrics?: Record<string, any>
  relatedEntities?: Record<string, any>
  priorityOverride?: number
  complianceAuditTrail?: Record<string, any>
}

export interface WorkflowStepExecution {
  id: string
  workflowInstanceId: string
  stepNumber: number
  stepName: string
  stepType: 'action' | 'approval' | 'notification' | 'decision' | 'integration'
  assignedTo?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped' | 'waiting_approval'
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  startedAt?: string
  completedAt?: string
  duration?: string
  automationUsed: boolean
  approvalMetadata?: Record<string, any>
  errorDetails?: Record<string, any>
  retryCount: number
  maxRetries: number
  nextRetryAt?: string
  performanceScore?: number
  complianceCheckPassed: boolean
}

// =============================================
// REMOTE PATIENT MONITORING (RPM)
// =============================================

export interface ConnectedDevice {
  id: string
  deviceName: string
  deviceType: 'wearable' | 'smartphone_app' | 'tablet' | 'sensor' | 'camera' | 'voice_recorder' | 'biometric'
  manufacturer?: string
  model?: string
  deviceIdentifier: string
  sdkVersion?: string
  firmwareVersion?: string
  capabilities?: Record<string, any>
  dataTypes?: string[]
  samplingRate?: string
  batteryLifeHours?: number
  connectivity: 'bluetooth' | 'wifi' | 'cellular' | 'usb' | 'api'
  certificationStatus?: Record<string, any>
  privacyCompliance?: Record<string, any>
  isActive: boolean
  lastSync?: string
  createdAt: string
}

export interface PatientDevice {
  id: string
  studentId: string
  deviceId: string
  assignmentDate: string
  deactivationDate?: string
  deviceSettings?: Record<string, any>
  calibrationData?: Record<string, any>
  monitoringGoals?: Record<string, any>
  alertThresholds?: Record<string, any>
  dataSharingConsent?: Record<string, any>
  isActive: boolean
  assignedBy?: string
  notes?: string
}

export interface RemoteMonitoringData {
  id: string
  studentId: string
  deviceId: string
  dataType: string
  measurementTimestamp: string
  rawData?: Record<string, any>
  processedData?: Record<string, any>
  biomarkerScores?: Record<string, any>
  qualityScore?: number
  environmentalContext?: Record<string, any>
  sessionContext?: string
  baselineComparison?: Record<string, any>
  trendAnalysis?: Record<string, any>
  anomalyDetected: boolean
  anomalySeverity?: 'low' | 'moderate' | 'high' | 'critical'
  alertTriggered: boolean
  clinicianReviewed: boolean
  reviewedBy?: string
  reviewNotes?: string
  privacyLevel: 'high' | 'medium' | 'low'
  retentionPeriod?: string
  createdAt: string
}

export interface RPMAlert {
  id: string
  studentId: string
  alertType: 'health_decline' | 'progress_plateau' | 'missed_sessions' | 'device_malfunction' | 'data_anomaly' | 'medication_reminder' | 'exercise_reminder'
  severity: 'low' | 'medium' | 'high' | 'critical'
  titleAr?: string
  titleEn?: string
  descriptionAr?: string
  descriptionEn?: string
  triggerData?: Record<string, any>
  recommendedActions?: Record<string, any>
  targetRecipients?: Record<string, any>
  notificationSent: boolean
  notificationChannels?: Record<string, any>
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolvedAt?: string
  resolvedBy?: string
  resolutionNotes?: string
  falsePositive: boolean
  escalationLevel: number
  parentAlertId?: string
  createdAt: string
}

// =============================================
// DIGITAL THERAPEUTICS PLATFORM
// =============================================

export interface DigitalTherapeutic {
  id: string
  programNameAr: string
  programNameEn: string
  programCategory: 'cognitive_training' | 'speech_therapy' | 'motor_skills' | 'behavioral_intervention' | 'social_skills' | 'academic_support'
  targetConditions?: string[]
  ageRangeMin?: number
  ageRangeMax?: number
  descriptionAr?: string
  descriptionEn?: string
  clinicalEvidence?: Record<string, any>
  programModules?: TherapyModule[]
  gamificationElements?: Record<string, any>
  difficultyLevels?: Record<string, any>
  sessionDurationMinutes?: number
  recommendedFrequency?: number
  totalProgramDurationWeeks?: number
  prerequisiteSkills?: string[]
  learningObjectivesAr?: string[]
  learningObjectivesEn?: string[]
  successMetrics?: Record<string, any>
  technologyRequirements?: Record<string, any>
  accessibilityFeatures?: Record<string, any>
  multilingualSupport?: Record<string, any>
  regulatoryApproval?: Record<string, any>
  contentRating?: string
  privacyCompliance?: Record<string, any>
  isActive: boolean
  version: string
  lastUpdated: string
  createdBy?: string
}

export interface TherapyModule {
  moduleId: string
  moduleName: string
  moduleType: string
  difficulty: number
  estimatedDuration: number
  objectives: string[]
  activities: TherapyActivity[]
  assessmentCriteria: Record<string, any>
}

export interface TherapyActivity {
  activityId: string
  activityName: string
  activityType: string
  instructions: string
  expectedOutcome: string
  adaptationRules: Record<string, any>
}

export interface PatientDigitalTherapy {
  id: string
  studentId: string
  digitalTherapyId: string
  prescribedBy?: string
  prescriptionDate: string
  startDate?: string
  endDate?: string
  currentModule: number
  currentDifficultyLevel: number
  personalizationSettings?: Record<string, any>
  progressTracking?: Record<string, any>
  performanceMetrics?: Record<string, any>
  adaptiveAdjustments?: Record<string, any>
  parentInvolvementLevel: 'minimal' | 'moderate' | 'high' | 'supervised'
  homePracticeSchedule?: Record<string, any>
  complianceRate?: number
  engagementScore?: number
  effectivenessRating?: number
  sideEffectsReported?: Record<string, any>
  therapistNotes?: string
  parentFeedback?: string
  status: 'active' | 'paused' | 'completed' | 'discontinued' | 'on_hold'
  lastSessionDate?: string
  nextSessionDue?: string
  totalMinutesPracticed: number
}

export interface DigitalTherapySession {
  id: string
  patientTherapyId: string
  sessionNumber?: number
  moduleName?: string
  difficultyLevel?: number
  sessionStart?: string
  sessionEnd?: string
  durationMinutes?: number
  completionPercentage?: number
  performanceScore?: number
  accuracyRate?: number
  responseTimeAvg?: number
  engagementMetrics?: Record<string, any>
  behavioralObservations?: Record<string, any>
  achievementsUnlocked?: Record<string, any>
  difficultyAdjustments?: Record<string, any>
  technicalIssues?: Record<string, any>
  parentPresent: boolean
  parentParticipation?: Record<string, any>
  sessionNotes?: string
  dataQualityScore?: number
  aiRecommendations?: Record<string, any>
  createdAt: string
}

// =============================================
// TELEMEDICINE & OMNI-MEDICINE PLATFORM
// =============================================

export interface VirtualRoom {
  id: string
  roomName: string
  roomType: 'individual_therapy' | 'group_therapy' | 'assessment' | 'parent_training' | 'team_meeting' | 'consultation'
  maxParticipants: number
  featuresEnabled?: Record<string, any>
  securityLevel: 'standard' | 'high' | 'medical_grade'
  encryptionMethod: string
  recordingCapability: boolean
  arVrEnabled: boolean
  accessibilityFeatures?: Record<string, any>
  languageSupport?: Record<string, any>
  roomSettings?: Record<string, any>
  complianceFeatures?: Record<string, any>
  bandwidthRequirements?: Record<string, any>
  backupConnectionMethods?: Record<string, any>
  isActive: boolean
  createdAt: string
  createdBy?: string
}

export interface TelemedicineSession {
  id: string
  sessionType: 'therapy' | 'assessment' | 'consultation' | 'parent_training' | 'follow_up' | 'group_session'
  virtualRoomId?: string
  primaryTherapistId?: string
  studentId?: string
  parentParticipants?: Record<string, any>
  additionalParticipants?: Record<string, any>
  scheduledStart?: string
  scheduledEnd?: string
  actualStart?: string
  actualEnd?: string
  sessionDurationMinutes?: number
  connectionQuality?: Record<string, any>
  technicalIssues?: Record<string, any>
  recordingEnabled: boolean
  recordingFilePath?: string
  recordingConsent?: Record<string, any>
  sessionObjectives?: Record<string, any>
  therapeuticActivities?: Record<string, any>
  patientEngagementLevel?: 'low' | 'medium' | 'high' | 'excellent'
  parentParticipation?: 'none' | 'observer' | 'participant' | 'primary'
  technologyUsed?: Record<string, any>
  outcomesAchieved?: Record<string, any>
  homeworkAssigned?: Record<string, any>
  nextSessionRecommendations?: string
  sessionRating?: number
  therapistNotes?: string
  parentFeedback?: string
  billingStatus: 'pending' | 'approved' | 'billed' | 'paid' | 'denied'
  insuranceAuthorization?: string
  sessionCost?: number
  complianceChecklist?: Record<string, any>
  followUpRequired: boolean
  followUpDate?: string
  createdAt: string
}

export interface HybridCarePlan {
  id: string
  studentId: string
  planNameAr?: string
  planNameEn?: string
  createdBy?: string
  careModel: 'hybrid_balanced' | 'primarily_in_person' | 'primarily_virtual' | 'intensive_remote' | 'crisis_intervention'
  inPersonPercentage?: number
  virtualPercentage?: number
  planRationale?: string
  inPersonActivities?: Record<string, any>
  virtualActivities?: Record<string, any>
  technologyRequirements?: Record<string, any>
  parentTrainingComponent?: Record<string, any>
  monitoringFrequency?: Record<string, any>
  escalationTriggers?: Record<string, any>
  successMetrics?: Record<string, any>
  costComparison?: Record<string, any>
  insuranceCoverage?: Record<string, any>
  accessibilityConsiderations?: Record<string, any>
  languagePreferences?: Record<string, any>
  culturalConsiderations?: Record<string, any>
  emergencyProtocols?: Record<string, any>
  planDurationWeeks?: number
  reviewSchedule?: Record<string, any>
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled'
  approvedBy?: string
  approvedAt?: string
  startDate?: string
  endDate?: string
  actualOutcomes?: Record<string, any>
  costSavings?: number
  patientSatisfaction?: number
  familySatisfaction?: number
  createdAt: string
  updatedAt: string
}

// =============================================
// ENTERPRISE INTEGRATION & INTEROPERABILITY
// =============================================

export interface SystemIntegration {
  id: string
  integrationName: string
  systemType: 'emr' | 'billing' | 'insurance' | 'laboratory' | 'imaging' | 'pharmacy' | 'scheduling' | 'communication' | 'analytics'
  vendorName?: string
  apiVersion?: string
  endpointUrl?: string
  authenticationMethod: 'api_key' | 'oauth2' | 'saml' | 'certificate' | 'basic_auth'
  credentialsStored?: Record<string, any>
  dataMapping?: Record<string, any>
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'manual'
  dataTypesShared?: string[]
  complianceRequirements?: Record<string, any>
  errorHandling?: Record<string, any>
  rateLimits?: Record<string, any>
  monitoringEnabled: boolean
  lastSuccessfulSync?: string
  lastError?: Record<string, any>
  uptimePercentage?: number
  dataQualityScore?: number
  isActive: boolean
  maintenanceSchedule?: Record<string, any>
  emergencyContacts?: Record<string, any>
  costPerTransaction?: number
  monthlyCost?: number
  contractExpiry?: string
  createdAt: string
  createdBy?: string
}

export interface IntegrationTransaction {
  id: string
  integrationId: string
  transactionType: 'send' | 'receive' | 'sync' | 'query' | 'update' | 'delete'
  direction: 'inbound' | 'outbound' | 'bidirectional'
  dataType?: string
  recordId?: string
  payloadSizeBytes?: number
  transactionStart: string
  transactionEnd?: string
  durationMs?: number
  status: 'pending' | 'success' | 'failed' | 'timeout' | 'retry' | 'cancelled'
  httpStatusCode?: number
  errorMessage?: string
  errorCode?: string
  retryCount: number
  maxRetries: number
  nextRetryAt?: string
  requestData?: Record<string, any>
  responseData?: Record<string, any>
  dataTransformed?: Record<string, any>
  complianceValidated: boolean
  auditTrail?: Record<string, any>
  costIncurred?: number
  performanceMetrics?: Record<string, any>
  relatedTransactions?: Record<string, any>
}

// =============================================
// PERFORMANCE & ANALYTICS
// =============================================

export interface SystemPerformance {
  id: string
  measurementTimestamp: string
  metricType: 'response_time' | 'throughput' | 'error_rate' | 'uptime' | 'resource_usage' | 'user_satisfaction'
  component?: string
  metricValue: number
  metricUnit?: string
  baselineValue?: number
  thresholdWarning?: number
  thresholdCritical?: number
  status: 'healthy' | 'warning' | 'critical' | 'unknown'
  contextData?: Record<string, any>
  automatedResponse?: Record<string, any>
  humanInterventionRequired: boolean
  resolvedAt?: string
  rootCause?: string
  preventionMeasures?: Record<string, any>
}

// =============================================
// AUTOMATION ANALYTICS & INSIGHTS
// =============================================

export interface AutomationAnalytics {
  totalWorkflowsActive: number
  workflowsCompletedToday: number
  averageCompletionTime: number
  automationEfficiencyScore: number
  costSavingsThisMonth: number
  errorRatePercentage: number
  userSatisfactionScore: number
  topPerformingWorkflows: WorkflowPerformance[]
  bottleneckAnalysis: WorkflowBottleneck[]
  complianceScore: number
  uptimePercentage: number
}

export interface WorkflowPerformance {
  workflowId: string
  workflowName: string
  executionCount: number
  averageCompletionTime: number
  successRate: number
  costSavings: number
  userSatisfaction: number
}

export interface WorkflowBottleneck {
  workflowId: string
  stepName: string
  averageDelay: number
  frequency: number
  impactScore: number
  recommendedAction: string
}

// =============================================
// REMOTE MONITORING INSIGHTS
// =============================================

export interface RPMAnalytics {
  totalPatientsMonitored: number
  activeDevices: number
  alertsGeneratedToday: number
  alertsResolvedToday: number
  averageResponseTime: number
  patientEngagementScore: number
  dataQualityScore: number
  anomaliesDetected: number
  interventionsTriggered: number
  outcomeImprovement: number
}

export interface PatientMonitoringInsight {
  studentId: string
  studentName: string
  monitoringScore: number
  trendDirection: 'improving' | 'stable' | 'declining'
  riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  keyMetrics: Record<string, number>
  recentAlerts: number
  complianceRate: number
  recommendedActions: string[]
  lastUpdate: string
}

// =============================================
// DIGITAL THERAPEUTICS ANALYTICS
// =============================================

export interface DigitalTherapyAnalytics {
  totalActivePrograms: number
  patientsEngaged: number
  sessionsCompletedToday: number
  averageEngagementScore: number
  completionRate: number
  efficacyScore: number
  parentSatisfaction: number
  costEffectiveness: number
  topPerformingPrograms: TherapyProgramPerformance[]
  patientProgress: PatientProgressSummary[]
}

export interface TherapyProgramPerformance {
  programId: string
  programName: string
  enrolledPatients: number
  completionRate: number
  averageImprovement: number
  parentRating: number
  costPerSession: number
  efficacyScore: number
}

export interface PatientProgressSummary {
  studentId: string
  programName: string
  sessionsCompleted: number
  progressPercentage: number
  skillImprovement: Record<string, number>
  engagementTrend: 'increasing' | 'stable' | 'decreasing'
  parentInvolvement: number
  nextMilestone: string
}

// =============================================
// FILTER & SEARCH INTERFACES
// =============================================

export interface EnterpriseAutomationFilters {
  workflowType?: string
  status?: string
  dateRange?: {
    start: string
    end: string
  }
  assignedTo?: string
  priority?: number
  automationLevel?: string
  complianceRequired?: boolean
}

export interface RPMFilters {
  deviceType?: string
  dataType?: string
  anomalyLevel?: string
  alertSeverity?: string
  dateRange?: {
    start: string
    end: string
  }
  studentId?: string
  reviewStatus?: string
}

export interface DigitalTherapyFilters {
  programCategory?: string
  ageRange?: {
    min: number
    max: number
  }
  targetConditions?: string[]
  status?: string
  complianceRate?: {
    min: number
    max: number
  }
  engagementScore?: {
    min: number
    max: number
  }
}

// =============================================
// API RESPONSE INTERFACES
// =============================================

export interface AutomationDashboardResponse {
  analytics: AutomationAnalytics
  recentWorkflows: WorkflowInstance[]
  pendingApprovals: WorkflowStepExecution[]
  systemHealth: SystemPerformance[]
  alerts: RPMAlert[]
}

export interface RPMDashboardResponse {
  analytics: RPMAnalytics
  patientInsights: PatientMonitoringInsight[]
  activeAlerts: RPMAlert[]
  deviceStatus: ConnectedDevice[]
  trendAnalysis: Record<string, any>
}

export interface DigitalTherapyDashboardResponse {
  analytics: DigitalTherapyAnalytics
  programPerformance: TherapyProgramPerformance[]
  patientProgress: PatientProgressSummary[]
  upcomingSessions: DigitalTherapySession[]
  parentFeedback: Record<string, any>
}