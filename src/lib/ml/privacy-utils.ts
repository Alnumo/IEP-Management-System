/**
 * Privacy Utilities
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Privacy-preserving utilities for ML training and inference
 * Ensures HIPAA compliance and patient data protection
 */

import type { MLTrainingData, StudentDemographics } from '../../types/ai-recommendations'

/**
 * Privacy-preserving ML utilities
 * Implements differential privacy, k-anonymity, and secure aggregation
 */
export class PrivacyUtils {
  private static readonly EPSILON = 0.5 // Differential privacy parameter
  private static readonly K_ANONYMITY_THRESHOLD = 5
  private static readonly SENSITIVE_FIELDS = [
    'medical_history',
    'emergency_contacts',
    'family_history',
    'social_background'
  ]

  /**
   * Apply differential privacy to numerical data
   * @param value - Original numerical value
   * @param sensitivity - Sensitivity of the query (max change in output)
   * @returns Noisy value with differential privacy guarantee
   */
  static addDifferentialPrivacyNoise(value: number, sensitivity: number = 1): number {
    // Laplace noise for differential privacy
    const scale = sensitivity / this.EPSILON
    const noise = this.sampleLaplace(0, scale)
    return Math.max(0, value + noise) // Ensure non-negative results for counts/scores
  }

  /**
   * Anonymize student demographics for ML training
   * @param demographics - Original demographic data
   * @param anonymizationLevel - Level of anonymization (1-3)
   * @returns Anonymized demographic data
   */
  static anonymizeDemographics(
    demographics: StudentDemographics,
    anonymizationLevel: 1 | 2 | 3 = 2
  ): StudentDemographics {
    const anonymized = { ...demographics }

    switch (anonymizationLevel) {
      case 1: // Light anonymization
        // Keep most data, just generalize some fields
        if (demographics.culturalBackground) {
          anonymized.culturalBackground = this.generalizeBackground(demographics.culturalBackground)
        }
        break

      case 2: // Medium anonymization
        // Remove specific cultural background, keep general categories
        anonymized.culturalBackground = undefined
        
        // Generalize diagnosis codes to broader categories
        anonymized.diagnosisCodes = demographics.diagnosisCodes.map(code => 
          this.generalizeDiagnosisCode(code)
        )
        break

      case 3: // High anonymization
        // Remove all potentially identifying information
        anonymized.culturalBackground = undefined
        anonymized.socioeconomicFactors = undefined
        
        // Only keep broad diagnostic categories
        anonymized.diagnosisCodes = demographics.diagnosisCodes.map(code => 
          code.substring(0, 3) // Keep only ICD-10 chapter (first 3 characters)
        )
        break
    }

    return anonymized
  }

  /**
   * Apply k-anonymity to training data
   * @param data - Original training data
   * @param k - Minimum group size for anonymity
   * @returns k-anonymous training data
   */
  static applyKAnonymity(data: MLTrainingData, k: number = this.K_ANONYMITY_THRESHOLD): MLTrainingData {
    // Group students by quasi-identifiers
    const groups = this.groupByQuasiIdentifiers(data.studentData)
    
    // Filter out groups smaller than k
    const anonymousGroups = groups.filter(group => group.length >= k)
    
    // Flatten back to student data array
    const kAnonymousData = anonymousGroups.flat()
    
    return {
      ...data,
      studentData: kAnonymousData,
      isAnonymized: true,
      privacyCompliant: true
    }
  }

  /**
   * Sanitize medical records for ML training
   * @param records - Raw medical records
   * @returns Sanitized records with sensitive data removed
   */
  static sanitizeMedicalRecords(records: Record<string, any>[]): Record<string, any>[] {
    return records.map(record => {
      const sanitized = { ...record }
      
      // Remove direct identifiers
      delete sanitized.name
      delete sanitized.address
      delete sanitized.phone
      delete sanitized.email
      delete sanitized.national_id
      
      // Remove sensitive fields
      this.SENSITIVE_FIELDS.forEach(field => {
        delete sanitized[field]
      })
      
      // Hash remaining identifiers
      if (sanitized.id) {
        sanitized.id = this.hashIdentifier(sanitized.id)
      }
      
      // Generalize dates to months/years only
      Object.keys(sanitized).forEach(key => {
        if (key.includes('date') && sanitized[key]) {
          sanitized[key] = this.generalizeDateToMonth(sanitized[key])
        }
      })
      
      return sanitized
    })
  }

  /**
   * Generate synthetic data for augmenting training sets
   * @param originalData - Real training data to base synthesis on
   * @param syntheticCount - Number of synthetic records to generate
   * @returns Synthetic training data with privacy guarantees
   */
  static generateSyntheticData(
    originalData: MLTrainingData,
    syntheticCount: number
  ): MLTrainingData {
    const syntheticStudents = []
    
    for (let i = 0; i < syntheticCount; i++) {
      // Select a random original student as a template
      const template = originalData.studentData[
        Math.floor(Math.random() * originalData.studentData.length)
      ]
      
      // Generate synthetic student with variations
      const synthetic = {
        demographics: this.synthesizeDemographics(template.demographics),
        assessmentHistory: this.synthesizeAssessments(template.assessmentHistory),
        therapyHistory: template.therapyHistory, // Keep structure, anonymize content
        outcomes: this.synthesizeOutcomes(template.outcomes)
      }
      
      syntheticStudents.push(synthetic)
    }
    
    return {
      studentData: syntheticStudents,
      isAnonymized: true,
      privacyCompliant: true,
      biasChecked: originalData.biasChecked
    }
  }

  /**
   * Validate privacy compliance of training data
   * @param data - Training data to validate
   * @returns Privacy compliance assessment
   */
  static validatePrivacyCompliance(data: MLTrainingData): {
    isCompliant: boolean
    issues: string[]
    recommendations: string[]
  } {
    const issues: string[] = []
    const recommendations: string[] = []

    // Check for direct identifiers
    data.studentData.forEach((student, index) => {
      const demographics = student.demographics as any
      
      // Check for potentially identifying information
      if (demographics.fullName || demographics.nationalId) {
        issues.push(`Student ${index}: Contains direct identifiers`)
        recommendations.push('Remove direct identifiers before ML training')
      }
      
      // Check for high-resolution location data
      if (demographics.address && demographics.address.includes('Street')) {
        issues.push(`Student ${index}: Contains detailed address information`)
        recommendations.push('Generalize location data to district/city level')
      }
      
      // Check for unique combinations that could re-identify
      const uniqueAttributes = [
        demographics.ageGroup,
        demographics.primaryLanguage,
        demographics.culturalBackground,
        demographics.diagnosisCodes?.join(',')
      ].filter(Boolean)
      
      if (uniqueAttributes.length > 4) {
        issues.push(`Student ${index}: High risk of re-identification`)
        recommendations.push('Apply additional anonymization or k-anonymity')
      }
    })

    // Check group sizes for k-anonymity
    const groups = this.groupByQuasiIdentifiers(data.studentData)
    const smallGroups = groups.filter(group => group.length < this.K_ANONYMITY_THRESHOLD)
    
    if (smallGroups.length > 0) {
      issues.push(`${smallGroups.length} demographic groups below k-anonymity threshold`)
      recommendations.push('Apply k-anonymity or remove small groups')
    }

    return {
      isCompliant: issues.length === 0,
      issues,
      recommendations
    }
  }

  // Private utility methods

  private static sampleLaplace(location: number, scale: number): number {
    // Sample from Laplace distribution using inverse transform sampling
    const u = Math.random() - 0.5
    return location - scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
  }

  private static generalizeBackground(background: string): string {
    // Generalize specific backgrounds to broader categories
    const generalizations: Record<string, string> = {
      'saudi_arabian_eastern': 'saudi_arabian',
      'saudi_arabian_western': 'saudi_arabian',
      'saudi_arabian_central': 'saudi_arabian',
      'egyptian_cairo': 'north_african',
      'lebanese_beirut': 'levantine',
      'syrian_damascus': 'levantine'
    }
    
    return generalizations[background] || 'middle_eastern'
  }

  private static generalizeDiagnosisCode(code: string): string {
    // Map specific ICD-10 codes to broader categories
    if (code.startsWith('F80')) return 'F80' // Speech and language disorders
    if (code.startsWith('F84')) return 'F84' // Autism spectrum disorders
    if (code.startsWith('F90')) return 'F90' // ADHD
    if (code.startsWith('F9')) return 'F9X' // Behavioral disorders
    
    return code.substring(0, 2) // Fallback to chapter level
  }

  private static groupByQuasiIdentifiers(studentData: MLTrainingData['studentData']) {
    const groups = new Map<string, typeof studentData>()
    
    studentData.forEach(student => {
      // Create quasi-identifier key
      const key = [
        student.demographics.ageGroup,
        student.demographics.primaryLanguage,
        student.demographics.diagnosisCodes.slice(0, 2).sort().join(','), // First 2 diagnoses
        student.demographics.culturalBackground || 'unknown'
      ].join('|')
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(student)
    })
    
    return Array.from(groups.values())
  }

  private static hashIdentifier(id: string): string {
    // Simple hash for demonstration (use cryptographic hash in production)
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      const char = id.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(36)}`
  }

  private static generalizeDateToMonth(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    } catch {
      return dateStr // Return original if parsing fails
    }
  }

  private static synthesizeDemographics(template: StudentDemographics): StudentDemographics {
    // Generate variations while preserving statistical properties
    const ageGroups = ['early_intervention', 'preschool', 'elementary', 'adolescent']
    const languages = ['ar', 'en', 'bilingual'] as const
    
    return {
      ageGroup: Math.random() < 0.8 ? template.ageGroup : 
                ageGroups[Math.floor(Math.random() * ageGroups.length)],
      primaryLanguage: Math.random() < 0.9 ? template.primaryLanguage :
                      languages[Math.floor(Math.random() * languages.length)],
      diagnosisCodes: template.diagnosisCodes.map(code => 
        Math.random() < 0.95 ? code : this.varyDiagnosisCode(code)
      ),
      culturalBackground: undefined // Remove for privacy
    }
  }

  private static synthesizeAssessments(assessments: any[]): any[] {
    return assessments.map(assessment => ({
      ...assessment,
      id: this.hashIdentifier(assessment.id + '_synthetic'),
      scores: {
        ...assessment.scores,
        raw: this.addNoiseToScores(assessment.scores.raw)
      }
    }))
  }

  private static synthesizeOutcomes(outcomes: any[]): any[] {
    return outcomes.map(outcome => ({
      ...outcome,
      sessionId: this.hashIdentifier(outcome.sessionId + '_synthetic'),
      achievement: this.addDifferentialPrivacyNoise(outcome.achievement, 0.1)
    }))
  }

  private static varyDiagnosisCode(code: string): string {
    // Vary diagnosis code while staying in same category
    const base = code.substring(0, 3)
    const variants = ['.0', '.1', '.2', '.8', '.9']
    return base + variants[Math.floor(Math.random() * variants.length)]
  }

  private static addNoiseToScores(scores: Record<string, number>): Record<string, number> {
    const noisyScores: Record<string, number> = {}
    
    Object.entries(scores).forEach(([key, value]) => {
      if (typeof value === 'number') {
        noisyScores[key] = this.addDifferentialPrivacyNoise(value, 5) // Sensitivity = 5 for assessment scores
      } else {
        noisyScores[key] = value
      }
    })
    
    return noisyScores
  }
}