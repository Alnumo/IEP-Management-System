// Phase 8: Multi-Center Deployment & Franchise Management Types
// Comprehensive TypeScript interfaces for enterprise multi-tenant operations

// =============================================
// ORGANIZATION HIERARCHY & MULTI-TENANCY
// =============================================

export interface Organization {
  id: string
  organizationName: string
  organizationType: 'corporate' | 'regional' | 'franchise' | 'clinic' | 'mobile_unit'
  parentOrganizationId?: string
  organizationCode: string // ARK-RIYADH-001
  brandNameAr?: string
  brandNameEn?: string
  legalEntityName: string
  taxNumber?: string
  commercialRegistration?: string
  mohLicenseNumber?: string
  sfdaRegistration?: string
  organizationLevel: number // 1=Corporate, 2=Regional, 3=Local
  franchiseStatus?: 'franchiser' | 'franchisee' | 'company_owned' | 'joint_venture'
  franchiseAgreementId?: string
  operationalStatus: 'planning' | 'construction' | 'pre_opening' | 'operational' | 'suspended' | 'closed'
  openingDate?: string
  closingDate?: string
  
  // Contact Information
  primaryContactName?: string
  primaryContactEmail?: string
  primaryContactPhone?: string
  emergencyContact?: string
  
  // Address Information
  addressLine1?: string
  addressLine2?: string
  city?: string
  province?: string
  postalCode?: string
  country: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  serviceAreaRadius?: number // kilometers
  
  // Business Configuration
  businessHours?: Record<string, any>
  servicesOffered?: string[]
  capacityLimits?: {
    maxPatients: number
    maxTherapists: number
    maxRooms: number
  }
  technologyCapabilities?: {
    telemedicine: boolean
    arVr: boolean
    digitalTherapeutics: boolean
    automation: boolean
  }
  languageSupport?: string[]
  culturalAdaptations?: Record<string, any>
  
  // Financial Information
  investmentAmount?: number
  monthlyOperationalCost?: number
  revenueSharingPercentage?: number
  royaltyFeePercentage: number // Default 6%
  marketingFeePercentage: number // Default 2%
  
  // Performance Metrics
  targetMonthlyRevenue?: number
  targetPatientCapacity?: number
  targetTherapistCount?: number
  qualityScore?: number
  patientSatisfactionScore?: number
  complianceScore?: number
  
  // Data Governance & Privacy
  dataResidencyRegion: string
  pdplComplianceLevel: 'basic' | 'enhanced' | 'maximum'
  dataSharingAgreements?: Record<string, any>
  auditRequirements?: Record<string, any>
  
  // Multi-tenant Configuration
  tenantIsolationLevel: 'shared' | 'isolated' | 'dedicated'
  databaseSchemaName?: string
  customBranding?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
    theme?: string
  }
  featurePermissions?: Record<string, boolean>
  integrationEndpoints?: Record<string, any>
  
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface OrganizationRelationship {
  id: string
  parentOrgId: string
  childOrgId: string
  relationshipType: 'subsidiary' | 'franchise' | 'partnership' | 'service_agreement' | 'data_sharing'
  relationshipStatus: 'active' | 'pending' | 'suspended' | 'terminated'
  startDate: string
  endDate?: string
  termsAndConditions?: Record<string, any>
  revenueSharingRules?: Record<string, any>
  dataSharingRules?: Record<string, any>
  serviceLevelAgreements?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// =============================================
// FRANCHISE MANAGEMENT SYSTEM
// =============================================

export interface FranchiseAgreement {
  id: string
  agreementNumber: string // FA-2025-001
  franchisorOrgId: string
  franchiseeOrgId: string
  agreementType: 'master_franchise' | 'unit_franchise' | 'area_development' | 'conversion'
  
  // Financial Terms
  initialFranchiseFee: number
  ongoingRoyaltyRate: number // 6.0%
  marketingFeeRate: number // 2.0%
  territoryDevelopmentFee?: number
  minimumInvestment: number
  maximumInvestment: number
  
  // Territory Rights
  exclusiveTerritory?: Record<string, any>
  territoryPopulation?: number
  marketDemographics?: Record<string, any>
  competitionAnalysis?: Record<string, any>
  expansionRights?: Record<string, any>
  
  // Operational Requirements
  minimumFacilitySize?: number // square meters
  requiredCertifications?: string[]
  staffRequirements?: Record<string, any>
  trainingRequirements?: Record<string, any>
  qualityStandards?: Record<string, any>
  reportingRequirements?: Record<string, any>
  
  // Technology & Brand Standards
  requiredTechnologyStack?: Record<string, any>
  brandingGuidelines?: Record<string, any>
  approvedSuppliers?: Record<string, any>
  marketingCoOpContribution?: number
  
  // Performance Metrics & KPIs
  minimumRevenueTargets?: Record<string, any>
  patientSatisfactionTargets?: number
  qualityBenchmarks?: Record<string, any>
  complianceRequirements?: Record<string, any>
  
  // Agreement Terms
  agreementStartDate: string
  agreementEndDate: string
  renewalTerms?: Record<string, any>
  terminationConditions?: Record<string, any>
  nonCompetePeriod?: number // months
  
  // Support Services
  trainingProgramIncluded: boolean
  marketingSupportLevel: 'basic' | 'standard' | 'premium'
  operationalSupportLevel: 'basic' | 'standard' | 'premium'
  technologySupportIncluded: boolean
  
  // Legal & Compliance
  governingLaw: string
  disputeResolutionMethod: 'arbitration' | 'mediation' | 'court'
  regulatoryComplianceResponsibility?: string
  insuranceRequirements?: Record<string, any>
  
  agreementStatus: 'draft' | 'pending_approval' | 'active' | 'suspended' | 'terminated' | 'expired'
  signedDate?: string
  signedByFranchisor?: string
  signedByFranchisee?: string
  
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface FranchisePerformance {
  id: string
  organizationId: string
  reportingPeriodStart: string
  reportingPeriodEnd: string
  reportingFrequency: 'weekly' | 'monthly' | 'quarterly' | 'annually'
  
  // Financial Performance
  grossRevenue?: number
  netRevenue?: number
  royaltyFeesDue?: number
  marketingFeesDue?: number
  royaltyFeesPaid?: number
  marketingFeesPaid?: number
  outstandingFees?: number
  profitMargin?: number
  
  // Operational Performance
  totalPatientsServed?: number
  newPatientAcquisitions?: number
  patientRetentionRate?: number
  averageRevenuePerPatient?: number
  therapistUtilizationRate?: number
  sessionCompletionRate?: number
  
  // Quality Metrics
  patientSatisfactionScore?: number
  clinicalQualityScore?: number
  safetyIncidentCount: number
  complianceScore?: number
  auditResults?: Record<string, any>
  
  // Staff Performance
  totalStaffCount?: number
  therapistCount?: number
  supportStaffCount?: number
  staffTurnoverRate?: number
  trainingCompletionRate?: number
  
  // Technology & Innovation
  digitalTherapyUtilization?: number
  telemedicineSessionPercentage?: number
  automationEfficiencyScore?: number
  systemUptime?: number
  
  // Market Performance
  marketShare?: number
  competitivePositioning?: Record<string, any>
  brandRecognitionScore?: number
  referralRate?: number
  
  // Compliance & Risk
  regulatoryViolations: number
  correctiveActionsTaken?: Record<string, any>
  riskAssessmentScore?: number
  insuranceClaims: number
  
  // Comments & Notes
  franchisorComments?: string
  franchiseeComments?: string
  improvementRecommendations?: Record<string, any>
  nextReviewDate?: string
  
  performanceStatus: 'exceeds_expectations' | 'meets_expectations' | 'needs_improvement' | 'below_standards' | 'critical'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  approvedAt?: string
  approvedBy?: string
}

// =============================================
// CENTRALIZED OPERATIONS MANAGEMENT
// =============================================

export interface ResourcePool {
  id: string
  poolName: string
  poolType: 'therapist_network' | 'equipment_fleet' | 'training_materials' | 'technology_licenses' | 'marketing_assets'
  managingOrganizationId: string
  descriptionAr?: string
  descriptionEn?: string
  
  // Resource Specifications
  totalCapacity?: number
  availableCapacity?: number
  reservedCapacity?: number
  maintenanceCapacity?: number
  
  // Allocation Rules
  allocationMethod: 'first_come_first_served' | 'priority_based' | 'performance_based' | 'geographic_proximity'
  sharingRules?: Record<string, any>
  costSharingModel?: Record<string, any>
  utilizationRequirements?: Record<string, any>
  
  // Geographic Coverage
  serviceRegions?: string[]
  deploymentStrategy?: Record<string, any>
  logisticsCoordination?: Record<string, any>
  
  // Performance Tracking
  utilizationRate?: number
  efficiencyScore?: number
  satisfactionScore?: number
  costPerUtilization?: number
  
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ResourceAllocation {
  id: string
  resourcePoolId: string
  requestingOrganizationId: string
  allocationType: 'temporary' | 'permanent' | 'emergency' | 'scheduled'
  
  // Allocation Details
  resourceQuantity: number
  allocationStartDate: string
  allocationEndDate?: string
  actualReturnDate?: string
  
  // Resource Specifications
  resourceSpecifications?: Record<string, any>
  performanceRequirements?: Record<string, any>
  complianceRequirements?: Record<string, any>
  
  // Cost & Billing
  hourlyRate?: number
  dailyRate?: number
  totalCost?: number
  billingMethod: 'hourly' | 'daily' | 'monthly' | 'per_use' | 'fixed_fee'
  paymentTerms?: string
  
  // Utilization Tracking
  plannedUtilization?: number
  actualUtilization?: number
  utilizationVariance?: number
  performanceRating?: number
  
  // Status & Workflow
  allocationStatus: 'requested' | 'approved' | 'deployed' | 'active' | 'completed' | 'cancelled'
  approvalWorkflow?: Record<string, any>
  deploymentNotes?: string
  completionNotes?: string
  
  requestedBy?: string
  approvedBy?: string
  deployedBy?: string
  createdAt: string
  updatedAt: string
}

// =============================================
// CROSS-CENTER ANALYTICS & REPORTING
// =============================================

export interface MultiCenterKPI {
  id: string
  kpiName: string
  kpiCategory: 'financial' | 'operational' | 'clinical' | 'patient_satisfaction' | 'staff_performance' | 'compliance' | 'growth'
  descriptionAr?: string
  descriptionEn?: string
  
  // KPI Configuration
  measurementUnit?: string // percentage, currency, count, ratio
  calculationFormula?: string
  dataSources?: Record<string, any>
  aggregationMethod: 'sum' | 'average' | 'median' | 'min' | 'max' | 'count' | 'percentage'
  
  // Benchmarking
  industryBenchmark?: number
  internalBenchmark?: number
  targetValue?: number
  minimumAcceptable?: number
  maximumAchievable?: number
  
  // Reporting Configuration
  reportingFrequency: 'real_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
  autoCalculation: boolean
  alertThresholds?: Record<string, any>
  stakeholderVisibility?: Record<string, any>
  
  // Organizational Scope
  applicableOrgTypes?: string[]
  mandatoryReporting: boolean
  complianceRelated: boolean
  
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy?: string
}

export interface AnalyticsFactTable {
  id: string
  organizationId: string
  kpiId: string
  
  // Time Dimensions
  measurementDate: string
  measurementHour?: number
  dayOfWeek?: number
  weekOfYear?: number
  monthOfYear?: number
  quarter?: number
  year?: number
  
  // Geographic Dimensions
  city?: string
  province?: string
  region?: string
  country: string
  
  // Organizational Dimensions
  organizationLevel?: number
  franchiseStatus?: string
  organizationType?: string
  
  // Measurement Values
  measuredValue: number
  targetValue?: number
  benchmarkValue?: number
  varianceFromTarget?: number
  varianceFromBenchmark?: number
  
  // Performance Context
  performanceBand?: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'poor'
  trendDirection?: 'improving' | 'stable' | 'declining'
  seasonalityFactor?: number
  
  // Data Quality
  dataQualityScore?: number
  dataSource?: string
  calculationMethod?: string
  confidenceLevel?: number
  
  // Contextual Information
  contributingFactors?: Record<string, any>
  externalFactors?: Record<string, any>
  correctiveActions?: Record<string, any>
  
  createdAt: string
  updatedAt: string
}

export interface CenterComparisonReport {
  id: string
  reportName: string
  reportType: 'peer_comparison' | 'best_practices' | 'performance_ranking' | 'trend_analysis' | 'benchmark_analysis'
  
  // Report Configuration
  comparisonOrganizations: string[] // Array of org IDs
  comparisonPeriodStart: string
  comparisonPeriodEnd: string
  kpisIncluded: string[] // Array of KPI IDs
  
  // Analysis Parameters
  statisticalMethod: 'descriptive' | 'correlation' | 'regression' | 'clustering' | 'forecasting'
  confidenceLevel: number
  significanceThreshold: number
  
  // Report Results
  executiveSummary?: string
  keyFindings?: Record<string, any>
  performanceRankings?: Record<string, any>
  bestPracticesIdentified?: Record<string, any>
  improvementOpportunities?: Record<string, any>
  statisticalInsights?: Record<string, any>
  
  // Visualization Configuration
  chartsConfig?: Record<string, any>
  dashboardLayout?: Record<string, any>
  exportFormats?: string[]
  
  // Access Control
  visibilityLevel: 'public' | 'franchise_network' | 'regional' | 'confidential'
  authorizedUsers?: string[]
  
  reportStatus: 'generating' | 'completed' | 'error' | 'archived'
  generatedAt?: string
  generatedBy?: string
  lastUpdated: string
  nextUpdateScheduled?: string
  autoRefresh: boolean
}

// =============================================
// DISTRIBUTED INFRASTRUCTURE MANAGEMENT
// =============================================

export interface InfrastructureAsset {
  id: string
  organizationId: string
  assetName: string
  assetType: 'server' | 'database' | 'networking' | 'security' | 'backup' | 'monitoring' | 'application' | 'license'
  
  // Asset Specifications
  manufacturer?: string
  model?: string
  serialNumber?: string
  purchaseDate?: string
  warrantyExpiry?: string
  assetValue?: number
  depreciationRate?: number
  
  // Technical Specifications
  technicalSpecs?: Record<string, any>
  softwareVersions?: Record<string, any>
  configurationDetails?: Record<string, any>
  capacityLimits?: Record<string, any>
  
  // Performance & Monitoring
  currentUtilization?: number
  performanceMetrics?: Record<string, any>
  healthStatus: 'excellent' | 'good' | 'warning' | 'critical' | 'offline'
  lastHealthCheck?: string
  
  // Maintenance & Support
  maintenanceSchedule?: Record<string, any>
  supportContract?: string
  supportExpiry?: string
  lastMaintenance?: string
  nextMaintenanceDue?: string
  
  // Security & Compliance
  securityClassification: 'public' | 'internal' | 'confidential' | 'restricted'
  complianceRequirements?: Record<string, any>
  encryptionStatus: boolean
  backupFrequency?: string
  disasterRecoveryTier?: string
  
  // Cost Management
  monthlyCost?: number
  annualCost?: number
  costAllocation?: Record<string, any>
  budgetCategory?: string
  
  assetStatus: 'active' | 'inactive' | 'maintenance' | 'retired' | 'disposed'
  location?: string
  responsiblePerson?: string
  
  createdAt: string
  updatedAt: string
}

export interface InterCenterCommunication {
  id: string
  senderOrganizationId: string
  recipientOrganizationId: string
  communicationType: 'announcement' | 'alert' | 'request' | 'report' | 'training' | 'compliance' | 'emergency'
  
  // Message Content
  subject: string
  messageBody: string
  priorityLevel: 'low' | 'normal' | 'high' | 'urgent' | 'emergency'
  
  // Categorization
  category?: 'operational' | 'clinical' | 'administrative' | 'technical' | 'regulatory' | 'marketing' | 'financial'
  tags?: string[]
  
  // Delivery & Response
  deliveryMethod: 'system_notification' | 'email' | 'sms' | 'mobile_push' | 'dashboard_alert'
  requiresResponse: boolean
  responseDeadline?: string
  
  // Tracking
  sentAt: string
  deliveredAt?: string
  readAt?: string
  respondedAt?: string
  responseText?: string
  
  // Escalation
  escalationRules?: Record<string, any>
  escalatedAt?: string
  escalatedTo?: string
  
  communicationStatus: 'draft' | 'sent' | 'delivered' | 'read' | 'responded' | 'expired' | 'escalated'
  
  sentBy?: string
  createdAt: string
}

// =============================================
// MULTI-CENTER DASHBOARD & ANALYTICS
// =============================================

export interface MultiCenterDashboard {
  // Organizational Overview
  totalOrganizations: number
  corporateHQCount: number
  regionalCentersCount: number
  franchiseLocationsCount: number
  companyOwnedCount: number
  
  // Performance Metrics
  networkRevenue: number
  averagePatientSatisfaction: number
  overallComplianceScore: number
  systemUptime: number
  
  // Geographic Distribution
  citiesCovered: number
  provincesCovered: number
  totalServiceArea: number // sq km
  populationServed: number
  
  // Operational Status
  operationalCenters: number
  preOpeningCenters: number
  plannedCenters: number
  suspendedCenters: number
  
  // Financial Summary
  totalInvestment: number
  monthlyRoyalties: number
  outstandingFees: number
  profitMargin: number
  
  // Quality Indicators
  topPerformingCenters: OrganizationPerformanceSummary[]
  underperformingCenters: OrganizationPerformanceSummary[]
  complianceIssues: number
  auditResults: Record<string, any>
  
  // Growth Metrics
  newCentersThisQuarter: number
  pipelineLocations: number
  expansionOpportunities: string[]
  marketPenetration: number
  
  lastUpdated: string
}

export interface OrganizationPerformanceSummary {
  organizationId: string
  organizationName: string
  organizationType: string
  city: string
  province: string
  
  // Key Metrics
  monthlyRevenue: number
  patientCount: number
  patientSatisfaction: number
  therapistCount: number
  utilizationRate: number
  complianceScore: number
  
  // Performance Indicators
  revenueGrowth: number
  performanceRank: number
  performanceStatus: 'excellent' | 'good' | 'average' | 'needs_improvement' | 'critical'
  
  // Trends
  revenueVsPreviousMonth: number
  patientGrowthRate: number
  qualityTrend: 'improving' | 'stable' | 'declining'
  
  lastUpdated: string
}

export interface FranchiseNetworkAnalytics {
  // Network Overview
  totalFranchisees: number
  activeFranchises: number
  masterFranchises: number
  multiUnitOperators: number
  
  // Financial Performance
  systemwideRevenue: number
  averageUnitVolume: number
  royaltyCollection: number
  royaltyCollectionRate: number
  
  // Growth Metrics
  newUnitsOpened: number
  unitsInDevelopment: number
  territoryDevelopmentAgreements: number
  franchiseeRetentionRate: number
  
  // Support & Training
  trainingProgramsCompleted: number
  operationalVisitsCompleted: number
  supportTicketsResolved: number
  franchiseeSatisfactionScore: number
  
  // Quality & Compliance
  averageQualityScore: number
  complianceAuditsPassed: number
  brandStandardsAdherence: number
  customerSatisfactionScore: number
  
  // Market Analysis
  marketPenetration: Record<string, number> // by region
  competitivePosition: Record<string, any>
  growthOpportunities: string[]
  riskFactors: string[]
  
  lastUpdated: string
}

// =============================================
// SEARCH & FILTER INTERFACES
// =============================================

export interface MultiCenterFilters {
  organizationType?: string[]
  operationalStatus?: string[]
  franchiseStatus?: string[]
  cities?: string[]
  provinces?: string[]
  performanceStatus?: string[]
  dateRange?: {
    start: string
    end: string
  }
  revenueRange?: {
    min: number
    max: number
  }
  patientCapacityRange?: {
    min: number
    max: number
  }
  complianceScoreRange?: {
    min: number
    max: number
  }
}

export interface FranchiseAnalyticsFilters {
  reportingPeriod?: string[]
  performanceStatus?: string[]
  regionFilter?: string[]
  franchiseType?: string[]
  revenuePerformance?: 'above_target' | 'meets_target' | 'below_target'
  complianceLevel?: 'excellent' | 'good' | 'needs_improvement'
}

export interface ResourceAllocationFilters {
  poolType?: string[]
  allocationStatus?: string[]
  organizationType?: string[]
  dateRange?: {
    start: string
    end: string
  }
  utilizationRange?: {
    min: number
    max: number
  }
  costRange?: {
    min: number
    max: number
  }
}

// =============================================
// API RESPONSE INTERFACES
// =============================================

export interface MultiCenterDashboardResponse {
  dashboard: MultiCenterDashboard
  organizationPerformance: OrganizationPerformanceSummary[]
  franchiseAnalytics: FranchiseNetworkAnalytics
  resourceUtilization: ResourceAllocation[]
  recentCommunications: InterCenterCommunication[]
  systemHealth: InfrastructureAsset[]
  kpiSummary: AnalyticsFactTable[]
}

export interface FranchiseManagementResponse {
  agreements: FranchiseAgreement[]
  performance: FranchisePerformance[]
  organizations: Organization[]
  analytics: FranchiseNetworkAnalytics
  comparisonReports: CenterComparisonReport[]
}

export interface ResourceManagementResponse {
  resourcePools: ResourcePool[]
  allocations: ResourceAllocation[]
  utilization: Record<string, number>
  costs: Record<string, number>
  performance: Record<string, any>
}

// =============================================
// FRANCHISE OPERATIONS INTERFACES
// =============================================

export interface FranchiseOperationalMetrics {
  // Franchise Development
  inquiriesReceived: number
  qualifiedLeads: number
  franchisesAwarded: number
  conversionRate: number
  
  // Training & Support
  initialTrainingCompleted: number
  ongoingTrainingHours: number
  supportCallsHandled: number
  averageResponseTime: number
  
  // Field Operations
  operationalVisits: number
  qualityAssessments: number
  marketingSupport: number
  technologySupport: number
  
  // Financial Management
  royaltyCompliance: number
  feeCollection: number
  financialReporting: number
  auditCompliance: number
  
  lastUpdated: string
}

export interface TerritoryAnalysis {
  territoryId: string
  territoryName: string
  population: number
  demographics: Record<string, any>
  competitionLevel: 'low' | 'medium' | 'high'
  marketPotential: number
  estimatedRevenue: number
  investmentRequired: number
  roi: number
  developmentTimeline: number // months
  riskFactors: string[]
  opportunities: string[]
  recommendedFranchiseModel: string
}

export interface BrandStandardsCompliance {
  organizationId: string
  assessmentDate: string
  overallScore: number
  
  // Compliance Areas
  facilityStandards: number
  staffUniforms: number
  serviceProcedures: number
  technologyUsage: number
  marketingMaterials: number
  customerExperience: number
  
  // Violations and Issues
  violations: Array<{
    category: string
    description: string
    severity: 'minor' | 'major' | 'critical'
    correctiveAction: string
    deadline: string
    status: 'open' | 'in_progress' | 'resolved'
  }>
  
  // Improvement Plan
  improvementPlan: Array<{
    action: string
    timeline: string
    responsible: string
    budget: number
  }>
  
  nextAssessment: string
  assessedBy: string
}