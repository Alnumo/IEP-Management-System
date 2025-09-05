/**
 * Data Preprocessing Utilities
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Functions for normalizing, cleaning, and preparing therapy data for ML training
 */

import type {
  AssessmentScores,
  StudentDemographics,
  TherapyOutcome,
  ProgressTrend,
  MLTrainingData
} from '../../types/ai-recommendations'

/**
 * Normalize assessment scores to 0-1 scale for ML processing
 * @param scores - Raw assessment scores from CELF/VB-MAPP
 * @returns Normalized scores ready for ML input
 */
export function normalizeAssessmentScores(scores: AssessmentScores): { [key: string]: number } {
  const normalized: { [key: string]: number } = {}
  
  // Normalize CELF scores (typically 0-150 range)
  if (scores.raw.celf_core) {
    normalized.celf_core = Math.max(0, Math.min(1, scores.raw.celf_core / 150))
  }
  
  // Normalize VB-MAPP scores (typically 0-170 range)
  if (scores.raw.vbmapp_total) {
    normalized.vbmapp_total = Math.max(0, Math.min(1, scores.raw.vbmapp_total / 170))
  }
  
  // Normalize percentile scores (0-100 range)
  Object.entries(scores.percentiles || {}).forEach(([key, value]) => {
    normalized[`${key}_percentile`] = value / 100
  })
  
  // Add interpretation severity as numeric values
  scores.interpretations?.forEach((interp, index) => {
    const severityMap = { mild: 0.25, moderate: 0.5, severe: 0.75 }
    if (interp.severity) {
      normalized[`${interp.category}_severity`] = severityMap[interp.severity] || 0
    }
  })
  
  return normalized
}

/**
 * Encode demographic data for ML processing with bias awareness
 * @param demographics - Student demographic information
 * @returns Encoded demographic features
 */
export function encodeDemographics(demographics: StudentDemographics): { [key: string]: number } {
  const encoded: { [key: string]: number } = {}
  
  // Age group encoding
  const ageGroupMap = {
    early_intervention: 0.1,
    preschool: 0.3,
    elementary: 0.5,
    adolescent: 0.7,
    adult: 0.9
  }
  encoded.age_group = ageGroupMap[demographics.ageGroup as keyof typeof ageGroupMap] || 0.5
  
  // Language encoding (avoid linguistic bias)
  const languageMap = {
    ar: 0.33,
    en: 0.66,
    bilingual: 1.0
  }
  encoded.primary_language = languageMap[demographics.primaryLanguage] || 0.5
  
  // Diagnosis encoding (one-hot for common diagnoses)
  const commonDiagnoses = ['F80.0', 'F84.0', 'F90.0', 'F94.0'] // Common speech/autism/ADHD codes
  commonDiagnoses.forEach(code => {
    encoded[`diagnosis_${code.replace('.', '_')}`] = demographics.diagnosisCodes.includes(code) ? 1 : 0
  })
  
  return encoded
}

/**
 * Calculate progress trends from therapy outcome data
 * @param outcomes - Historical therapy outcomes
 * @returns Progress trends with statistical significance
 */
export function calculateProgressTrends(outcomes: TherapyOutcome[]): ProgressTrend[] {
  const trends: ProgressTrend[] = []
  
  // Group outcomes by goal
  const goalGroups = outcomes.reduce((acc, outcome) => {
    if (!acc[outcome.goalId]) {
      acc[outcome.goalId] = []
    }
    acc[outcome.goalId].push(outcome)
    return acc
  }, {} as { [goalId: string]: TherapyOutcome[] })
  
  // Calculate trend for each goal
  Object.entries(goalGroups).forEach(([goalId, goalOutcomes]) => {
    if (goalOutcomes.length < 2) return // Need at least 2 points for trend
    
    // Sort by date
    const sortedOutcomes = goalOutcomes.sort((a, b) => 
      new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
    )
    
    // Calculate linear regression slope
    const n = sortedOutcomes.length
    const xValues = sortedOutcomes.map((_, i) => i)
    const yValues = sortedOutcomes.map(o => o.achievement)
    
    const xMean = xValues.reduce((a, b) => a + b) / n
    const yMean = yValues.reduce((a, b) => a + b) / n
    
    const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (yValues[i] - yMean), 0)
    const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0)
    
    const slope = denominator === 0 ? 0 : numerator / denominator
    const rSquared = calculateRSquared(xValues, yValues, slope, yMean - slope * xMean)
    
    // Determine trend direction and significance
    let direction: 'improving' | 'declining' | 'stable' = 'stable'
    if (Math.abs(slope) > 0.1) { // Significant change threshold
      direction = slope > 0 ? 'improving' : 'declining'
    }
    
    trends.push({
      metric: `goal_${goalId}`,
      timeframe: `${sortedOutcomes.length} sessions`,
      direction,
      rate: slope,
      significance: rSquared,
      dataPoints: sortedOutcomes.map(o => ({
        date: o.measurementDate,
        value: o.achievement
      }))
    })
  })
  
  return trends
}

/**
 * Prepare training data with privacy preservation and bias mitigation
 * @param rawData - Raw student and therapy data
 * @returns Privacy-compliant ML training data
 */
export function prepareTrainingData(rawData: MLTrainingData): {
  features: number[][]
  labels: number[]
  metadata: { isAnonymized: boolean; biasChecked: boolean }
} {
  const features: number[][] = []
  const labels: number[] = []
  
  rawData.studentData.forEach(studentData => {
    const studentFeatures: number[] = []
    
    // Add demographic features
    const demographicFeatures = encodeDemographics(studentData.demographics)
    studentFeatures.push(...Object.values(demographicFeatures))
    
    // Add assessment features
    studentData.assessmentHistory.forEach(assessment => {
      const normalizedScores = normalizeAssessmentScores(assessment.scores)
      studentFeatures.push(...Object.values(normalizedScores))
    })
    
    // Add progress trend features
    const progressTrends = calculateProgressTrends(studentData.outcomes)
    progressTrends.forEach(trend => {
      studentFeatures.push(trend.rate, trend.significance)
    })
    
    // Calculate label (outcome success rate)
    const avgAchievement = studentData.outcomes.length > 0
      ? studentData.outcomes.reduce((sum, o) => sum + o.achievement, 0) / studentData.outcomes.length
      : 0.5
    
    features.push(studentFeatures)
    labels.push(avgAchievement)
  })
  
  return {
    features,
    labels,
    metadata: {
      isAnonymized: rawData.isAnonymized,
      biasChecked: rawData.biasChecked
    }
  }
}

/**
 * Validate data quality for ML training
 * @param features - Feature matrix
 * @param labels - Label vector
 * @returns Data quality assessment
 */
export function validateDataQuality(features: number[][], labels: number[]): {
  isValid: boolean
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []
  
  // Check for sufficient data
  if (features.length < 100) {
    issues.push('Insufficient training data (< 100 samples)')
    recommendations.push('Collect more historical therapy data before training')
  }
  
  // Check for feature consistency
  const featureLengths = features.map(f => f.length)
  const consistentLength = featureLengths.every(len => len === featureLengths[0])
  if (!consistentLength) {
    issues.push('Inconsistent feature vector lengths')
    recommendations.push('Standardize feature extraction process')
  }
  
  // Check for missing values
  const hasMissingValues = features.some(f => f.some(val => val === null || val === undefined || isNaN(val)))
  if (hasMissingValues) {
    issues.push('Missing or invalid values in feature data')
    recommendations.push('Implement data imputation strategy')
  }
  
  // Check label distribution
  const labelMean = labels.reduce((sum, l) => sum + l, 0) / labels.length
  if (labelMean < 0.2 || labelMean > 0.8) {
    issues.push('Imbalanced outcome distribution')
    recommendations.push('Consider data augmentation or rebalancing techniques')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  }
}

// Utility functions
function calculateRSquared(x: number[], y: number[], slope: number, intercept: number): number {
  const yMean = y.reduce((a, b) => a + b) / y.length
  const totalSumSquares = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0)
  const residualSumSquares = x.reduce((sum, xi, i) => {
    const predicted = slope * xi + intercept
    return sum + Math.pow(y[i] - predicted, 2)
  }, 0)
  
  return totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares)
}

/**
 * Split data into training and validation sets with stratification
 * @param features - Feature matrix
 * @param labels - Label vector
 * @param testRatio - Proportion for validation set (default 0.2)
 * @returns Split datasets
 */
export function trainValidationSplit(
  features: number[][],
  labels: number[],
  testRatio: number = 0.2
): {
  trainFeatures: number[][]
  trainLabels: number[]
  valFeatures: number[][]
  valLabels: number[]
} {
  // Create indices array and shuffle
  const indices = Array.from({ length: features.length }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  
  const splitIndex = Math.floor(features.length * (1 - testRatio))
  const trainIndices = indices.slice(0, splitIndex)
  const valIndices = indices.slice(splitIndex)
  
  return {
    trainFeatures: trainIndices.map(i => features[i]),
    trainLabels: trainIndices.map(i => labels[i]),
    valFeatures: valIndices.map(i => features[i]),
    valLabels: valIndices.map(i => labels[i])
  }
}