/**
 * AI Recommendations Type Definitions
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 */

// Core AI recommendation interfaces
export interface AIRecommendation {
  id: string
  studentId: string
  sessionId?: string
  recommendationType: RecommendationType
  confidence: number // 0-1 confidence score
  clinicalRelevance: number // 0-1 clinical relevance score
  recommendations: TherapyRecommendation
  explanation: RecommendationExplanation
  status: RecommendationStatus
  createdAt: string
  updatedAt: string
}

export type RecommendationType = 'therapy_plan' | 'session_adjustment' | 'goal_modification' | 'assessment_update'

export interface TherapyRecommendation {
  sessionFrequency?: {
    current: number
    recommended: number
    unit: 'weekly' | 'biweekly' | 'monthly'
  }
  sessionDuration?: {
    current: number
    recommended: number
    unit: 'minutes'
  }
  therapeuticApproaches: {
    approach: string
    priority: number
    rationale: string
  }[]
  goalAdjustments?: {
    goalId: string
    action: 'increase' | 'decrease' | 'modify' | 'add'
    target: string
    reasoning: string
  }[]
}

export interface RecommendationExplanation {
  primaryFactors: string[]
  supportingData: {
    assessmentScores?: {
      celf?: number
      vbmapp?: number
      [key: string]: number | undefined
    }
    progressTrends?: {
      metric: string
      trend: 'improving' | 'declining' | 'stable'
      significance: number
    }[]
    demographicFactors?: string[]
  }
  clinicalEvidence: string
  textAr: string // Arabic explanation
  textEn: string // English explanation
}

export type RecommendationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'modified'

// Therapist feedback and decision tracking
export interface TherapistFeedback {
  id: string
  recommendationId: string
  therapistId: string
  decision: 'accept' | 'reject' | 'modify'
  reasoning: string
  reasoningAr: string
  reasoningEn: string
  modifications?: Partial<TherapyRecommendation>
  createdAt: string
}

// Assessment data analysis interfaces
export interface AssessmentAnalysis {
  id: string
  studentId: string
  assessmentType: 'celf' | 'vbmapp' | 'custom'
  scores: AssessmentScores
  trends: ProgressTrend[]
  correlations: OutcomeCorrelation[]
  analysisDate: string
}

export interface AssessmentScores {
  raw: { [category: string]: number }
  standardized: { [category: string]: number }
  percentiles: { [category: string]: number }
  ageEquivalent?: { [category: string]: number }
  interpretations: {
    category: string
    level: 'below_average' | 'average' | 'above_average'
    severity?: 'mild' | 'moderate' | 'severe'
    textAr: string
    textEn: string
  }[]
}

export interface ProgressTrend {
  metric: string
  timeframe: string
  direction: 'improving' | 'declining' | 'stable'
  rate: number // rate of change
  significance: number // statistical significance
  dataPoints: {
    date: string
    value: number
  }[]
}

export interface OutcomeCorrelation {
  factor: string
  correlation: number // -1 to 1
  significance: number
  description: string
}

// ML model interfaces
export interface MLModelConfig {
  id: string
  name: string
  version: string
  type: 'recommendation_engine' | 'bias_detector' | 'outcome_predictor'
  status: 'training' | 'active' | 'deprecated'
  accuracy: number
  lastTraining: string
  parameters: { [key: string]: any }
}

export interface MLTrainingData {
  studentData: {
    demographics: StudentDemographics
    assessmentHistory: AssessmentAnalysis[]
    therapyHistory: TherapySession[]
    outcomes: TherapyOutcome[]
  }[]
  isAnonymized: boolean
  privacyCompliant: boolean
  biasChecked: boolean
}

export interface StudentDemographics {
  ageGroup: string
  primaryLanguage: 'ar' | 'en' | 'bilingual'
  diagnosisCodes: string[]
  culturalBackground?: string
  socioeconomicFactors?: string[]
}

export interface TherapySession {
  id: string
  date: string
  duration: number
  goals: string[]
  progress: { [goalId: string]: number }
  notes: string
}

export interface TherapyOutcome {
  sessionId: string
  goalId: string
  achievement: number // 0-1 achievement score  
  measurementDate: string
  validated: boolean
}

// API request/response interfaces
export interface GenerateRecommendationRequest {
  studentId: string
  includeAssessmentData?: boolean
  includeProgressData?: boolean
  recommendationTypes?: RecommendationType[]
}

export interface GenerateRecommendationResponse {
  recommendations: AIRecommendation[]
  totalCount: number
  processingTime: number
  modelVersion: string
}

export interface BiasDetectionResult {
  detected: boolean
  biasType?: 'demographic' | 'cultural' | 'linguistic' | 'socioeconomic'
  severity: 'low' | 'medium' | 'high'
  affectedGroups: string[]
  mitigation: string[]
  confidence: number
}

export interface ModelPerformanceMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  biasMetrics: BiasDetectionResult[]
  clinicalValidation: {
    therapistAgreement: number
    patientOutcomes: number
    safetyScore: number
  }
  lastEvaluation: string
}

// Database table interfaces (for new tables)
export interface AIRecommendationsTable {
  id: string
  student_id: string
  session_id: string | null
  recommendation_type: RecommendationType
  confidence: number
  clinical_relevance: number
  recommendations: TherapyRecommendation
  explanation: RecommendationExplanation
  status: RecommendationStatus
  created_by: string
  created_at: string
  updated_by: string | null
  updated_at: string
}

export interface RecommendationFeedbackTable {
  id: string
  recommendation_id: string
  therapist_id: string
  decision: 'accept' | 'reject' | 'modify'
  reasoning: string
  reasoning_ar: string
  reasoning_en: string
  modifications: Partial<TherapyRecommendation> | null
  created_at: string
}

export interface MLModelVersionsTable {
  id: string
  name: string
  version: string
  type: string
  status: string
  accuracy: number
  last_training: string
  parameters: { [key: string]: any }
  performance_metrics: ModelPerformanceMetrics
  created_at: string
  updated_at: string
}

// Utility types for API calls
export type AIRecommendationCreateInput = Omit<AIRecommendation, 'id' | 'createdAt' | 'updatedAt'>
export type AIRecommendationUpdateInput = Partial<Pick<AIRecommendation, 'status' | 'explanation'>>

// Error handling
export interface AIServiceError {
  code: 'INSUFFICIENT_DATA' | 'MODEL_UNAVAILABLE' | 'BIAS_DETECTED' | 'PRIVACY_VIOLATION' | 'UNKNOWN_ERROR'
  messageEn: string
  messageAr: string
  details?: any
}

export type AIServiceResult<T> = {
  data: T
  error: null
} | {
  data: null
  error: AIServiceError
}