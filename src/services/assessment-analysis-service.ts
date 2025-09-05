/**
 * Assessment Analysis Service
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Connects to CELF and VB-MAPP scoring algorithms for comprehensive assessment analysis
 * Provides data integration for AI/ML recommendation system
 */

import { supabase } from '../lib/supabase'
import { 
  normalizeAssessmentScores, 
  calculateProgressTrends 
} from '../lib/ml/data-preprocessing'
import type {
  AssessmentAnalysis,
  AssessmentScores,
  ProgressTrend,
  OutcomeCorrelation,
  AIServiceResult
} from '../types/ai-recommendations'

/**
 * Assessment Analysis Service
 * Integrates CELF and VB-MAPP assessment data for ML analysis
 */
export class AssessmentAnalysisService {
  private static readonly CELF_MAX_SCORE = 150
  private static readonly VBMAPP_MAX_SCORE = 170
  private static readonly SIGNIFICANT_CHANGE_THRESHOLD = 0.15

  /**
   * CELF (Clinical Evaluation of Language Fundamentals) Analysis
   * @param rawScores - Raw CELF assessment scores
   * @param age - Student age for norm comparison
   * @param language - Primary language for bilingual assessment
   * @returns Normalized and interpreted CELF scores
   */
  static analyzeCELFAssessment(
    rawScores: Record<string, number>,
    age: number,
    language: 'ar' | 'en' | 'bilingual'
  ): AssessmentScores {
    // CELF subtests mapping
    const celfSubtests = {
      'sentence_comprehension': { max: 30, weight: 0.2 },
      'linguistic_concepts': { max: 25, weight: 0.15 },
      'word_structure': { max: 35, weight: 0.2 },
      'word_classes': { max: 30, weight: 0.15 },
      'following_directions': { max: 30, weight: 0.15 },
      'formulated_sentences': { max: 30, weight: 0.15 }
    }

    // Calculate composite scores
    let coreLanguageScore = 0
    let receptiveLanguageIndex = 0
    let expressiveLanguageIndex = 0
    
    Object.entries(rawScores).forEach(([subtest, score]) => {
      if (celfSubtests[subtest]) {
        const normalizedScore = score / celfSubtests[subtest].max
        coreLanguageScore += normalizedScore * celfSubtests[subtest].weight * this.CELF_MAX_SCORE
        
        // Categorize into receptive/expressive
        if (['sentence_comprehension', 'linguistic_concepts', 'following_directions'].includes(subtest)) {
          receptiveLanguageIndex += normalizedScore * 50 // Scale to 0-50
        } else {
          expressiveLanguageIndex += normalizedScore * 50
        }
      }
    })

    // Calculate percentiles based on age norms
    const percentiles = this.calculateCELFPercentiles(
      { core: coreLanguageScore, receptive: receptiveLanguageIndex, expressive: expressiveLanguageIndex },
      age
    )

    // Generate interpretations
    const interpretations = this.interpretCELFScores(
      coreLanguageScore,
      percentiles,
      language
    )

    return {
      raw: {
        ...rawScores,
        celf_core: coreLanguageScore,
        receptive_index: receptiveLanguageIndex,
        expressive_index: expressiveLanguageIndex
      },
      standardized: {
        celf_core_standardized: coreLanguageScore / this.CELF_MAX_SCORE,
        receptive_standardized: receptiveLanguageIndex / 100,
        expressive_standardized: expressiveLanguageIndex / 100
      },
      percentiles,
      ageEquivalent: this.calculateAgeEquivalent(coreLanguageScore, 'celf'),
      interpretations
    }
  }

  /**
   * VB-MAPP (Verbal Behavior Milestones Assessment) Analysis
   * @param rawScores - Raw VB-MAPP milestone scores
   * @param age - Student age for developmental comparison
   * @returns Normalized and interpreted VB-MAPP scores
   */
  static analyzeVBMAPPAssessment(
    rawScores: Record<string, number>,
    age: number
  ): AssessmentScores {
    // VB-MAPP domains
    const vbmappDomains = {
      'mand': { max: 50, weight: 0.2, level: 'Level 1-3' },
      'tact': { max: 50, weight: 0.2, level: 'Level 1-3' },
      'listener': { max: 50, weight: 0.15, level: 'Level 1-3' },
      'visual_perceptual': { max: 30, weight: 0.1, level: 'Level 1-2' },
      'independent_play': { max: 20, weight: 0.1, level: 'Level 1-2' },
      'social': { max: 30, weight: 0.15, level: 'Level 1-3' },
      'motor_imitation': { max: 20, weight: 0.05, level: 'Level 1' },
      'echoic': { max: 20, weight: 0.05, level: 'Level 1' }
    }

    // Calculate total milestone score
    let totalMilestoneScore = 0
    const domainScores: Record<string, number> = {}
    
    Object.entries(rawScores).forEach(([domain, score]) => {
      if (vbmappDomains[domain]) {
        const normalizedScore = score / vbmappDomains[domain].max
        domainScores[domain] = normalizedScore * 100 // Convert to percentage
        totalMilestoneScore += normalizedScore * vbmappDomains[domain].weight * this.VBMAPP_MAX_SCORE
      }
    })

    // Calculate developmental level
    const developmentalLevel = this.calculateVBMAPPLevel(totalMilestoneScore)
    
    // Generate percentiles based on developmental norms
    const percentiles = this.calculateVBMAPPPercentiles(domainScores, age)

    // Generate interpretations
    const interpretations = this.interpretVBMAPPScores(
      totalMilestoneScore,
      developmentalLevel,
      domainScores
    )

    return {
      raw: {
        ...rawScores,
        vbmapp_total: totalMilestoneScore
      },
      standardized: {
        vbmapp_total_standardized: totalMilestoneScore / this.VBMAPP_MAX_SCORE,
        ...Object.fromEntries(
          Object.entries(domainScores).map(([domain, score]) => 
            [`${domain}_standardized`, score / 100]
          )
        )
      },
      percentiles,
      ageEquivalent: this.calculateAgeEquivalent(totalMilestoneScore, 'vbmapp'),
      interpretations
    }
  }

  /**
   * Track and analyze therapy outcomes
   * @param studentId - Student identifier
   * @param timeframe - Analysis timeframe in days
   * @returns Comprehensive outcome tracking analysis
   */
  static async trackTherapyOutcomes(
    studentId: string,
    timeframe: number = 90
  ): Promise<AIServiceResult<{
    outcomes: any[]
    trends: ProgressTrend[]
    correlations: OutcomeCorrelation[]
    summary: {
      totalSessions: number
      avgAchievement: number
      improvementRate: number
      strongestDomain: string
      weakestDomain: string
    }
  }>> {
    try {
      // Fetch therapy outcomes
      const startDate = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: sessions, error } = await supabase
        .from('therapy_sessions')
        .select(`
          id,
          session_date,
          duration,
          goals,
          goal_progress,
          therapist_id,
          session_notes
        `)
        .eq('student_id', studentId)
        .gte('session_date', startDate)
        .order('session_date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      if (!sessions || sessions.length === 0) {
        return {
          data: {
            outcomes: [],
            trends: [],
            correlations: [],
            summary: {
              totalSessions: 0,
              avgAchievement: 0,
              improvementRate: 0,
              strongestDomain: 'N/A',
              weakestDomain: 'N/A'
            }
          },
          error: null
        }
      }

      // Process outcomes from sessions
      const outcomes = sessions.flatMap(session => {
        const goalProgress = session.goal_progress || {}
        return Object.entries(goalProgress).map(([goalId, achievement]) => ({
          sessionId: session.id,
          goalId,
          achievement: Number(achievement),
          measurementDate: session.session_date,
          validated: true
        }))
      })

      // Calculate progress trends
      const trends = calculateProgressTrends(outcomes)

      // Analyze correlations
      const correlations = await this.analyzeOutcomeCorrelations(studentId, outcomes)

      // Calculate summary statistics
      const avgAchievement = outcomes.length > 0
        ? outcomes.reduce((sum, o) => sum + o.achievement, 0) / outcomes.length
        : 0

      // Calculate improvement rate
      const improvementRate = this.calculateImprovementRate(outcomes)

      // Identify strongest and weakest domains
      const domainPerformance = this.analyzeDomainPerformance(outcomes)

      return {
        data: {
          outcomes,
          trends,
          correlations: correlations.data || [],
          summary: {
            totalSessions: sessions.length,
            avgAchievement,
            improvementRate,
            strongestDomain: domainPerformance.strongest,
            weakestDomain: domainPerformance.weakest
          }
        },
        error: null
      }

    } catch (error) {
      console.error('Error tracking therapy outcomes:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error tracking outcomes: ${error.message}`,
          messageAr: `خطأ في تتبع النتائج: ${error.message}`
        }
      }
    }
  }

  /**
   * Analyze correlations between assessment scores and therapy outcomes
   * @param studentId - Student identifier
   * @param outcomes - Therapy outcome data
   * @returns Correlation analysis results
   */
  static async analyzeOutcomeCorrelations(
    studentId: string,
    outcomes: any[]
  ): Promise<AIServiceResult<OutcomeCorrelation[]>> {
    try {
      // Fetch recent assessments
      const { data: assessments, error } = await supabase
        .from('student_assessments')
        .select('assessment_type, scores, assessment_date')
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false })
        .limit(5)

      if (error || !assessments || assessments.length === 0) {
        return { data: [], error: null }
      }

      const correlations: OutcomeCorrelation[] = []

      // Analyze correlation between assessment scores and therapy outcomes
      assessments.forEach(assessment => {
        const scores = assessment.scores?.raw || {}
        
        Object.entries(scores).forEach(([scoreType, scoreValue]) => {
          if (typeof scoreValue === 'number' && outcomes.length >= 3) {
            // Calculate correlation coefficient
            const correlation = this.calculateCorrelation(
              Array(outcomes.length).fill(scoreValue), // Assessment score repeated
              outcomes.map(o => o.achievement) // Therapy achievements
            )

            if (Math.abs(correlation) > 0.3) { // Significant correlation threshold
              correlations.push({
                factor: `${assessment.assessment_type}_${scoreType}`,
                correlation,
                significance: Math.abs(correlation),
                description: `${assessment.assessment_type} ${scoreType} score correlation with therapy outcomes`
              })
            }
          }
        })
      })

      // Sort by significance
      correlations.sort((a, b) => b.significance - a.significance)

      return {
        data: correlations.slice(0, 10), // Top 10 correlations
        error: null
      }

    } catch (error) {
      console.error('Error analyzing correlations:', error)
      return {
        data: [],
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error analyzing correlations: ${error.message}`,
          messageAr: `خطأ في تحليل الارتباطات: ${error.message}`
        }
      }
    }
  }

  /**
   * Create comprehensive assessment analysis for ML training
   * @param studentId - Student identifier
   * @param includeHistory - Include historical assessments
   * @returns Complete assessment analysis for ML
   */
  static async createAssessmentAnalysis(
    studentId: string,
    includeHistory: boolean = true
  ): Promise<AIServiceResult<AssessmentAnalysis[]>> {
    try {
      let query = supabase
        .from('student_assessments')
        .select(`
          id,
          student_id,
          assessment_type,
          assessment_date,
          scores,
          interpretation,
          therapist_id,
          created_at
        `)
        .eq('student_id', studentId)
        .order('assessment_date', { ascending: false })

      if (!includeHistory) {
        query = query.limit(1)
      }

      const { data: assessments, error } = await query

      if (error) {
        throw new Error(error.message)
      }

      if (!assessments || assessments.length === 0) {
        return { data: [], error: null }
      }

      // Get student age for norm comparison
      const { data: student } = await supabase
        .from('students')
        .select('age, primary_language')
        .eq('id', studentId)
        .single()

      const age = student?.age || 10
      const language = student?.primary_language || 'ar'

      // Process each assessment
      const analyses: AssessmentAnalysis[] = await Promise.all(
        assessments.map(async assessment => {
          let processedScores: AssessmentScores

          if (assessment.assessment_type === 'CELF') {
            processedScores = this.analyzeCELFAssessment(
              assessment.scores?.raw || {},
              age,
              language as 'ar' | 'en' | 'bilingual'
            )
          } else if (assessment.assessment_type === 'VB-MAPP') {
            processedScores = this.analyzeVBMAPPAssessment(
              assessment.scores?.raw || {},
              age
            )
          } else {
            // Generic assessment processing
            processedScores = {
              raw: assessment.scores?.raw || {},
              standardized: normalizeAssessmentScores({
                raw: assessment.scores?.raw || {},
                standardized: {},
                percentiles: {},
                interpretations: []
              }),
              percentiles: assessment.scores?.percentiles || {},
              interpretations: []
            }
          }

          // Get therapy outcomes for correlation analysis
          const outcomesResult = await this.trackTherapyOutcomes(studentId, 30)
          
          return {
            id: assessment.id,
            studentId: assessment.student_id,
            assessmentType: assessment.assessment_type.toLowerCase() as 'celf' | 'vbmapp' | 'custom',
            scores: processedScores,
            trends: outcomesResult.data?.trends || [],
            correlations: outcomesResult.data?.correlations || [],
            analysisDate: assessment.assessment_date
          }
        })
      )

      return {
        data: analyses,
        error: null
      }

    } catch (error) {
      console.error('Error creating assessment analysis:', error)
      return {
        data: null,
        error: {
          code: 'UNKNOWN_ERROR',
          messageEn: `Error creating assessment analysis: ${error.message}`,
          messageAr: `خطأ في إنشاء تحليل التقييم: ${error.message}`
        }
      }
    }
  }

  // Private helper methods

  private static calculateCELFPercentiles(
    scores: { core: number; receptive: number; expressive: number },
    age: number
  ): Record<string, number> {
    // Simplified percentile calculation based on age norms
    // In production, use actual CELF normative data tables
    const ageAdjustment = Math.max(0.7, Math.min(1.3, 1 + (10 - age) * 0.03))
    
    return {
      core_percentile: Math.min(99, Math.max(1, (scores.core / this.CELF_MAX_SCORE) * 100 * ageAdjustment)),
      receptive_percentile: Math.min(99, Math.max(1, (scores.receptive / 100) * 100 * ageAdjustment)),
      expressive_percentile: Math.min(99, Math.max(1, (scores.expressive / 100) * 100 * ageAdjustment))
    }
  }

  private static calculateVBMAPPPercentiles(
    domainScores: Record<string, number>,
    age: number
  ): Record<string, number> {
    // Simplified percentile calculation based on developmental norms
    const ageAdjustment = Math.max(0.5, Math.min(1.5, 1 + (6 - age) * 0.1))
    
    const percentiles: Record<string, number> = {}
    Object.entries(domainScores).forEach(([domain, score]) => {
      percentiles[`${domain}_percentile`] = Math.min(99, Math.max(1, score * ageAdjustment))
    })
    
    return percentiles
  }

  private static interpretCELFScores(
    coreScore: number,
    percentiles: Record<string, number>,
    language: 'ar' | 'en' | 'bilingual'
  ): AssessmentScores['interpretations'] {
    const interpretations = []
    const corePercentile = percentiles.core_percentile || 50

    if (corePercentile < 10) {
      interpretations.push({
        category: 'language_ability',
        level: 'below_average',
        severity: 'severe',
        textAr: 'قدرة لغوية أقل من المتوسط بشكل كبير - يحتاج إلى تدخل مكثف',
        textEn: 'Significantly below average language ability - intensive intervention needed'
      })
    } else if (corePercentile < 25) {
      interpretations.push({
        category: 'language_ability',
        level: 'below_average',
        severity: 'moderate',
        textAr: 'قدرة لغوية أقل من المتوسط - يحتاج إلى دعم علاجي منتظم',
        textEn: 'Below average language ability - regular therapeutic support needed'
      })
    } else if (corePercentile < 75) {
      interpretations.push({
        category: 'language_ability',
        level: 'average',
        textAr: 'قدرة لغوية ضمن المعدل الطبيعي',
        textEn: 'Language ability within normal range'
      })
    } else {
      interpretations.push({
        category: 'language_ability',
        level: 'above_average',
        textAr: 'قدرة لغوية فوق المتوسط',
        textEn: 'Above average language ability'
      })
    }

    // Add specific domain interpretations
    if ((percentiles.receptive_percentile || 50) < (percentiles.expressive_percentile || 50) - 20) {
      interpretations.push({
        category: 'language_profile',
        level: 'average',
        textAr: 'اللغة التعبيرية أقوى من اللغة الاستقبالية',
        textEn: 'Expressive language stronger than receptive language'
      })
    }

    return interpretations
  }

  private static interpretVBMAPPScores(
    totalScore: number,
    level: number,
    domainScores: Record<string, number>
  ): AssessmentScores['interpretations'] {
    const interpretations = []

    // Overall developmental level interpretation
    if (level === 1) {
      interpretations.push({
        category: 'developmental_level',
        level: 'below_average',
        severity: 'severe',
        textAr: 'مستوى تطوري أولي - يحتاج إلى تدخل مكثف في المهارات الأساسية',
        textEn: 'Early developmental level - intensive intervention needed for foundational skills'
      })
    } else if (level === 2) {
      interpretations.push({
        category: 'developmental_level',
        level: 'below_average',
        severity: 'moderate',
        textAr: 'مستوى تطوري متوسط - يحتاج إلى دعم في المهارات الوسطى',
        textEn: 'Intermediate developmental level - support needed for mid-level skills'
      })
    } else {
      interpretations.push({
        category: 'developmental_level',
        level: 'average',
        textAr: 'مستوى تطوري متقدم - التركيز على المهارات المتقدمة',
        textEn: 'Advanced developmental level - focus on advanced skills'
      })
    }

    // Identify strengths and weaknesses
    const sortedDomains = Object.entries(domainScores).sort(([, a], [, b]) => b - a)
    if (sortedDomains.length > 0) {
      const [strongestDomain] = sortedDomains[0]
      const [weakestDomain] = sortedDomains[sortedDomains.length - 1]
      
      interpretations.push({
        category: 'strengths',
        level: 'above_average',
        textAr: `نقطة قوة في ${strongestDomain}`,
        textEn: `Strength in ${strongestDomain}`
      })
      
      if (domainScores[weakestDomain] < 40) {
        interpretations.push({
          category: 'needs_support',
          level: 'below_average',
          textAr: `يحتاج دعم إضافي في ${weakestDomain}`,
          textEn: `Needs additional support in ${weakestDomain}`
        })
      }
    }

    return interpretations
  }

  private static calculateVBMAPPLevel(totalScore: number): number {
    if (totalScore < 50) return 1
    if (totalScore < 100) return 2
    return 3
  }

  private static calculateAgeEquivalent(
    score: number,
    assessmentType: 'celf' | 'vbmapp'
  ): Record<string, number> {
    // Simplified age equivalent calculation
    // In production, use actual normative tables
    if (assessmentType === 'celf') {
      const ageEquivalent = Math.max(3, Math.min(18, (score / this.CELF_MAX_SCORE) * 15 + 3))
      return { language_age: Math.round(ageEquivalent * 10) / 10 }
    } else {
      const developmentalAge = Math.max(0.5, Math.min(7, (score / this.VBMAPP_MAX_SCORE) * 6 + 0.5))
      return { developmental_age: Math.round(developmentalAge * 10) / 10 }
    }
  }

  private static calculateImprovementRate(outcomes: any[]): number {
    if (outcomes.length < 2) return 0

    // Sort by date
    const sorted = outcomes.sort((a, b) => 
      new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
    )

    // Compare first third with last third
    const firstThird = sorted.slice(0, Math.floor(sorted.length / 3))
    const lastThird = sorted.slice(-Math.floor(sorted.length / 3))

    const firstAvg = firstThird.reduce((sum, o) => sum + o.achievement, 0) / firstThird.length
    const lastAvg = lastThird.reduce((sum, o) => sum + o.achievement, 0) / lastThird.length

    return Math.max(-1, Math.min(1, (lastAvg - firstAvg) / (firstAvg || 1)))
  }

  private static analyzeDomainPerformance(outcomes: any[]): { strongest: string; weakest: string } {
    const domainScores = new Map<string, number[]>()

    outcomes.forEach(outcome => {
      const domain = outcome.goalId.split('_')[0] // Extract domain from goal ID
      if (!domainScores.has(domain)) {
        domainScores.set(domain, [])
      }
      domainScores.get(domain)!.push(outcome.achievement)
    })

    let strongest = 'N/A'
    let weakest = 'N/A'
    let highestAvg = 0
    let lowestAvg = 1

    domainScores.forEach((scores, domain) => {
      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length
      if (avg > highestAvg) {
        highestAvg = avg
        strongest = domain
      }
      if (avg < lowestAvg) {
        lowestAvg = avg
        weakest = domain
      }
    })

    return { strongest, weakest }
  }

  private static calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0

    const n = x.length
    const xMean = x.reduce((sum, val) => sum + val, 0) / n
    const yMean = y.reduce((sum, val) => sum + val, 0) / n

    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (y[i] - yMean), 0)
    const xDenom = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0))
    const yDenom = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0))

    const denominator = xDenom * yDenom
    
    return denominator === 0 ? 0 : numerator / denominator
  }
}