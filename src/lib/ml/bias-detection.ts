/**
 * Bias Detection Utilities
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Functions for detecting and mitigating bias in ML recommendations
 * Ensures fairness across demographic groups and cultural backgrounds
 */

import type {
  StudentDemographics,
  BiasDetectionResult,
  TherapyOutcome,
  MLTrainingData
} from '../../types/ai-recommendations'

/**
 * Detect demographic bias in training data or model predictions
 * @param data - Training data to analyze for bias
 * @returns Bias detection results with mitigation suggestions
 */
export function detectBiasInTrainingData(data: MLTrainingData): BiasDetectionResult {
  const demographics = data.studentData.map(s => s.demographics)
  const outcomes = data.studentData.flatMap(s => s.outcomes)
  
  // Analyze representation across demographic groups
  const representationBias = analyzeRepresentationBias(demographics)
  
  // Analyze outcome disparities across groups
  const outcomeBias = analyzeOutcomeBias(demographics, data.studentData)
  
  // Determine overall bias severity
  const maxSeverity = Math.max(representationBias.severity, outcomeBias.severity)
  
  return {
    detected: maxSeverity > 0.3,
    biasType: determinePrimaryBiasType([representationBias, outcomeBias]),
    severity: maxSeverity > 0.7 ? 'high' : maxSeverity > 0.4 ? 'medium' : 'low',
    affectedGroups: [...representationBias.affectedGroups, ...outcomeBias.affectedGroups],
    mitigation: generateMitigationStrategies([representationBias, outcomeBias]),
    confidence: Math.min(representationBias.confidence, outcomeBias.confidence)
  }
}

/**
 * Detect bias in model predictions for a specific demographic
 * @param demographics - Student demographic information
 * @param predictions - Model predictions for comparison
 * @returns Bias detection specific to this demographic
 */
export function detectPredictionBias(
  demographics: StudentDemographics,
  predictions: { confidence: number; recommendation: any }[]
): BiasDetectionResult {
  // This would typically compare against historical performance across groups
  // For now, implement basic demographic fairness checks
  
  const biasIndicators: BiasIndicator[] = []
  
  // Language bias detection
  if (demographics.primaryLanguage === 'ar') {
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    if (avgConfidence < 0.6) {
      biasIndicators.push({
        type: 'linguistic',
        severity: (0.6 - avgConfidence) / 0.6,
        description: 'Lower confidence for Arabic-speaking students',
        affectedGroup: 'Arabic speakers'
      })
    }
  }
  
  // Cultural background bias
  if (demographics.culturalBackground && 
      demographics.culturalBackground !== 'saudi_arabian') {
    biasIndicators.push({
      type: 'cultural',
      severity: 0.2, // Baseline cultural consideration
      description: 'Cultural background may affect recommendation accuracy',
      affectedGroup: demographics.culturalBackground
    })
  }
  
  // Diagnosis bias detection
  const rareConditions = ['F94.0', 'F98.0'] // Example rare diagnosis codes
  const hasRareCondition = demographics.diagnosisCodes.some(code => 
    rareConditions.includes(code)
  )
  
  if (hasRareCondition) {
    const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length
    if (avgConfidence < 0.7) {
      biasIndicators.push({
        type: 'demographic',
        severity: (0.7 - avgConfidence) / 0.7,
        description: 'Lower confidence for rare diagnosis codes',
        affectedGroup: 'Rare conditions'
      })
    }
  }
  
  // Aggregate bias results
  const maxSeverity = biasIndicators.length > 0 
    ? Math.max(...biasIndicators.map(b => b.severity))
    : 0
  
  return {
    detected: maxSeverity > 0.3,
    biasType: biasIndicators.length > 0 ? biasIndicators[0].type : undefined,
    severity: maxSeverity > 0.7 ? 'high' : maxSeverity > 0.4 ? 'medium' : 'low',
    affectedGroups: biasIndicators.map(b => b.affectedGroup),
    mitigation: generateMitigationStrategies(biasIndicators),
    confidence: biasIndicators.length > 0 ? 0.8 : 0.95
  }
}

/**
 * Apply bias mitigation techniques to training data
 * @param data - Original training data
 * @param biasResult - Detected bias information
 * @returns Bias-mitigated training data
 */
export function applyBiasMitigation(
  data: MLTrainingData,
  biasResult: BiasDetectionResult
): MLTrainingData {
  if (!biasResult.detected || biasResult.severity === 'low') {
    return { ...data, biasChecked: true }
  }
  
  let mitigatedData = { ...data }
  
  // Apply representation balancing
  if (biasResult.biasType === 'demographic' || biasResult.biasType === 'cultural') {
    mitigatedData = balanceRepresentation(mitigatedData)
  }
  
  // Apply linguistic bias mitigation
  if (biasResult.biasType === 'linguistic') {
    mitigatedData = balanceLanguageRepresentation(mitigatedData)
  }
  
  // Mark as bias-checked
  mitigatedData.biasChecked = true
  
  return mitigatedData
}

// Helper functions for bias detection

interface BiasIndicator {
  type: 'demographic' | 'cultural' | 'linguistic' | 'socioeconomic'
  severity: number // 0-1 scale
  description: string
  affectedGroup: string
  confidence?: number
}

function analyzeRepresentationBias(demographics: StudentDemographics[]): BiasIndicator {
  const groups = {
    language: {} as Record<string, number>,
    ageGroup: {} as Record<string, number>,
    cultural: {} as Record<string, number>
  }
  
  // Count representations
  demographics.forEach(demo => {
    groups.language[demo.primaryLanguage] = (groups.language[demo.primaryLanguage] || 0) + 1
    groups.ageGroup[demo.ageGroup] = (groups.ageGroup[demo.ageGroup] || 0) + 1
    if (demo.culturalBackground) {
      groups.cultural[demo.culturalBackground] = (groups.cultural[demo.culturalBackground] || 0) + 1
    }
  })
  
  // Calculate representation imbalance
  const languageImbalance = calculateImbalanceScore(Object.values(groups.language))
  const ageImbalance = calculateImbalanceScore(Object.values(groups.ageGroup))
  const culturalImbalance = calculateImbalanceScore(Object.values(groups.cultural))
  
  const maxImbalance = Math.max(languageImbalance, ageImbalance, culturalImbalance)
  
  return {
    type: 'demographic',
    severity: maxImbalance,
    description: 'Uneven representation across demographic groups',
    affectedGroup: 'Multiple demographic groups',
    confidence: 0.9
  }
}

function analyzeOutcomeBias(
  demographics: StudentDemographics[],
  studentData: MLTrainingData['studentData']
): BiasIndicator {
  const outcomesByGroup: Record<string, number[]> = {}
  
  // Group outcomes by primary language (main bias concern)
  studentData.forEach((student, index) => {
    const lang = demographics[index].primaryLanguage
    const avgOutcome = student.outcomes.length > 0
      ? student.outcomes.reduce((sum, o) => sum + o.achievement, 0) / student.outcomes.length
      : 0.5
    
    if (!outcomesByGroup[lang]) {
      outcomesByGroup[lang] = []
    }
    outcomesByGroup[lang].push(avgOutcome)
  })
  
  // Calculate outcome disparities
  const groupAverages = Object.entries(outcomesByGroup).map(([group, outcomes]) => ({
    group,
    average: outcomes.reduce((sum, o) => sum + o, 0) / outcomes.length
  }))
  
  if (groupAverages.length < 2) {
    return {
      type: 'demographic',
      severity: 0,
      description: 'Insufficient group diversity for outcome analysis',
      affectedGroup: 'N/A',
      confidence: 0.5
    }
  }
  
  const averages = groupAverages.map(g => g.average)
  const outcomeDisparity = (Math.max(...averages) - Math.min(...averages))
  
  return {
    type: 'linguistic',
    severity: Math.min(1, outcomeDisparity * 2), // Scale disparity to 0-1
    description: 'Outcome disparities across language groups',
    affectedGroup: groupAverages.find(g => g.average === Math.min(...averages))?.group || 'Unknown',
    confidence: 0.8
  }
}

function calculateImbalanceScore(counts: number[]): number {
  if (counts.length < 2) return 0
  
  const total = counts.reduce((sum, c) => sum + c, 0)
  const expectedProportion = 1 / counts.length
  
  // Calculate Gini coefficient as measure of inequality
  const proportions = counts.map(c => c / total)
  const sortedProps = proportions.sort((a, b) => a - b)
  
  let gini = 0
  for (let i = 0; i < sortedProps.length; i++) {
    gini += (2 * (i + 1) - sortedProps.length - 1) * sortedProps[i]
  }
  gini = gini / (sortedProps.length * sortedProps.reduce((sum, p) => sum + p, 0))
  
  return Math.abs(gini)
}

function determinePrimaryBiasType(indicators: BiasIndicator[]): BiasDetectionResult['biasType'] {
  const maxSeverityIndicator = indicators.reduce((max, current) => 
    current.severity > max.severity ? current : max
  )
  
  return maxSeverityIndicator.type
}

function generateMitigationStrategies(indicators: BiasIndicator[]): string[] {
  const strategies = new Set<string>()
  
  indicators.forEach(indicator => {
    switch (indicator.type) {
      case 'demographic':
        strategies.add('Balance demographic representation in training data')
        strategies.add('Use stratified sampling during data collection')
        break
      case 'linguistic':
        strategies.add('Ensure equal representation of Arabic and English cases')
        strategies.add('Apply language-specific model fine-tuning')
        break
      case 'cultural':
        strategies.add('Include cultural context in feature engineering')
        strategies.add('Validate recommendations with cultural experts')
        break
      case 'socioeconomic':
        strategies.add('Control for socioeconomic factors in model training')
        strategies.add('Monitor outcome equity across income groups')
        break
    }
  })
  
  return Array.from(strategies)
}

function balanceRepresentation(data: MLTrainingData): MLTrainingData {
  // Simple oversampling of underrepresented groups
  const languageGroups = new Map<string, typeof data.studentData>()
  
  data.studentData.forEach(student => {
    const lang = student.demographics.primaryLanguage
    if (!languageGroups.has(lang)) {
      languageGroups.set(lang, [])
    }
    languageGroups.get(lang)!.push(student)
  })
  
  // Find target size (size of largest group)
  const targetSize = Math.max(...Array.from(languageGroups.values()).map(group => group.length))
  
  const balancedData: typeof data.studentData = []
  
  languageGroups.forEach(group => {
    balancedData.push(...group)
    
    // Oversample if below target
    const needed = targetSize - group.length
    for (let i = 0; i < needed; i++) {
      const randomIndex = Math.floor(Math.random() * group.length)
      balancedData.push(group[randomIndex])
    }
  })
  
  return {
    ...data,
    studentData: balancedData
  }
}

function balanceLanguageRepresentation(data: MLTrainingData): MLTrainingData {
  // Ensure 50/50 Arabic/English representation for linguistic fairness
  const arabicStudents = data.studentData.filter(s => s.demographics.primaryLanguage === 'ar')
  const englishStudents = data.studentData.filter(s => s.demographics.primaryLanguage === 'en')
  const bilingualStudents = data.studentData.filter(s => s.demographics.primaryLanguage === 'bilingual')
  
  const targetSize = Math.min(arabicStudents.length, englishStudents.length)
  
  const balancedData = [
    ...arabicStudents.slice(0, targetSize),
    ...englishStudents.slice(0, targetSize),
    ...bilingualStudents // Keep all bilingual students
  ]
  
  return {
    ...data,
    studentData: balancedData
  }
}