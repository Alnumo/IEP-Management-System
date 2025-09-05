/**
 * Bilingual Explanations Service
 * Story 5.1: AI-Powered Therapy Plan Recommendations
 * 
 * Comprehensive bilingual support for AI recommendation explanations
 * Provides culturally appropriate Arabic and English text generation
 */

import type {
  RecommendationExplanation,
  TherapyRecommendation,
  StudentDemographics,
  TherapyOutcome,
  AssessmentAnalysis
} from '../../types/ai-recommendations'

/**
 * Bilingual Explanations Service
 * Generates culturally appropriate explanations in Arabic and English
 */
export class BilingualExplanationsService {
  private static readonly THERAPY_APPROACHES_MAP = {
    'Speech Sound Production': {
      ar: 'إنتاج الأصوات الكلامية',
      description_ar: 'تحسين قدرة الطالب على إنتاج الأصوات بوضوح ودقة',
      description_en: 'Improving student\'s ability to produce speech sounds clearly and accurately'
    },
    'Language Comprehension': {
      ar: 'فهم اللغة',
      description_ar: 'تطوير قدرة الطالب على فهم واستيعاب اللغة المنطوقة والمكتوبة',
      description_en: 'Developing student\'s ability to understand and comprehend spoken and written language'
    },
    'Social Communication': {
      ar: 'التواصل الاجتماعي',
      description_ar: 'تعزيز مهارات التفاعل الاجتماعي والتواصل مع الآخرين',
      description_en: 'Enhancing social interaction skills and communication with others'
    },
    'Articulation Therapy': {
      ar: 'علاج التلفظ',
      description_ar: 'تصحيح وتحسين نطق الأصوات والكلمات',
      description_en: 'Correcting and improving pronunciation of sounds and words'
    },
    'Language Stimulation': {
      ar: 'تحفيز اللغة',
      description_ar: 'تشجيع وتطوير المهارات اللغوية من خلال أنشطة متنوعة',
      description_en: 'Encouraging and developing language skills through varied activities'
    },
    'Behavioral Intervention': {
      ar: 'التدخل السلوكي',
      description_ar: 'تعديل السلوك وتعزيز السلوكيات الإيجابية',
      description_en: 'Modifying behavior and reinforcing positive behaviors'
    }
  }

  private static readonly AGE_GROUPS_MAP = {
    'early_intervention': {
      ar: 'التدخل المبكر',
      description_ar: 'الأطفال من عمر 0-3 سنوات',
      description_en: 'Children aged 0-3 years'
    },
    'preschool': {
      ar: 'ما قبل المدرسة',
      description_ar: 'الأطفال من عمر 3-6 سنوات',
      description_en: 'Children aged 3-6 years'
    },
    'elementary': {
      ar: 'المرحلة الابتدائية',
      description_ar: 'الأطفال من عمر 6-12 سنة',
      description_en: 'Children aged 6-12 years'
    },
    'adolescent': {
      ar: 'المراهقة',
      description_ar: 'الشباب من عمر 12-18 سنة',
      description_en: 'Youth aged 12-18 years'
    },
    'adult': {
      ar: 'البالغون',
      description_ar: 'البالغون 18 سنة فأكثر',
      description_en: 'Adults 18 years and older'
    }
  }

  private static readonly CONFIDENCE_LEVELS = {
    high: {
      ar: 'ثقة عالية',
      description_ar: 'توصية مدعومة بأدلة قوية ومناسبة جداً للحالة',
      description_en: 'Recommendation supported by strong evidence and highly appropriate for the case'
    },
    medium: {
      ar: 'ثقة متوسطة',
      description_ar: 'توصية مناسبة مع وجود بعض الاعتبارات الإضافية',
      description_en: 'Appropriate recommendation with some additional considerations'
    },
    low: {
      ar: 'ثقة منخفضة',
      description_ar: 'توصية تحتاج إلى مراجعة سريرية دقيقة',
      description_en: 'Recommendation requires careful clinical review'
    }
  }

  /**
   * Generate comprehensive bilingual explanation for a therapy recommendation
   * @param recommendation - The therapy recommendation to explain
   * @param studentData - Student context data
   * @param confidence - Confidence score for the recommendation
   * @param supportingFactors - Key factors supporting the recommendation
   * @returns Complete bilingual explanation
   */
  static generateBilingualExplanation(
    recommendation: TherapyRecommendation,
    studentData: {
      demographics: StudentDemographics
      assessmentHistory?: AssessmentAnalysis[]
      outcomes?: TherapyOutcome[]
    },
    confidence: number,
    supportingFactors: string[]
  ): RecommendationExplanation {
    const confidenceLevel = this.getConfidenceLevel(confidence)
    
    return {
      primaryFactors: supportingFactors,
      supportingData: this.generateSupportingData(studentData),
      clinicalEvidence: this.generateClinicalEvidence(recommendation, studentData, 'en'),
      textEn: this.generateEnglishExplanation(recommendation, studentData, confidence, supportingFactors),
      textAr: this.generateArabicExplanation(recommendation, studentData, confidence, supportingFactors)
    }
  }

  /**
   * Generate detailed English explanation
   * @param recommendation - Therapy recommendation
   * @param studentData - Student context
   * @param confidence - Confidence score
   * @param factors - Supporting factors
   * @returns Comprehensive English explanation
   */
  static generateEnglishExplanation(
    recommendation: TherapyRecommendation,
    studentData: { demographics: StudentDemographics; assessmentHistory?: AssessmentAnalysis[]; outcomes?: TherapyOutcome[] },
    confidence: number,
    factors: string[]
  ): string {
    const parts: string[] = []
    const confidenceLevel = this.getConfidenceLevel(confidence)
    const ageGroupInfo = this.AGE_GROUPS_MAP[studentData.demographics.ageGroup as keyof typeof this.AGE_GROUPS_MAP]

    // Introduction with confidence level
    parts.push(
      `This is a ${confidenceLevel} confidence recommendation (${(confidence * 100).toFixed(1)}%) ` +
      `for a student in the ${ageGroupInfo?.description_en || studentData.demographics.ageGroup} category.`
    )

    // Session recommendations
    if (recommendation.sessionFrequency || recommendation.sessionDuration) {
      const frequency = recommendation.sessionFrequency?.recommended || 2
      const duration = recommendation.sessionDuration?.recommended || 60
      
      parts.push(
        `The recommended therapy schedule is ${frequency} sessions per ${recommendation.sessionFrequency?.unit || 'week'}, ` +
        `with each session lasting ${duration} ${recommendation.sessionDuration?.unit || 'minutes'}. ` +
        `This schedule is appropriate for the student's ${studentData.demographics.ageGroup} age group and ` +
        `supports optimal learning and engagement.`
      )
    }

    // Therapeutic approaches
    if (recommendation.therapeuticApproaches && recommendation.therapeuticApproaches.length > 0) {
      parts.push(`The recommended therapeutic approaches include:`)
      
      recommendation.therapeuticApproaches.forEach((approach, index) => {
        const approachInfo = this.THERAPY_APPROACHES_MAP[approach.approach as keyof typeof this.THERAPY_APPROACHES_MAP]
        parts.push(
          `${index + 1}. ${approach.approach}${approachInfo ? ` (${approachInfo.description_en})` : ''} ` +
          `- Priority level: ${approach.priority}/10. ${approach.rationale}`
        )
      })
    }

    // Assessment-based reasoning
    if (studentData.assessmentHistory && studentData.assessmentHistory.length > 0) {
      parts.push(
        `This recommendation is informed by ${studentData.assessmentHistory.length} assessment(s), ` +
        `including recent evaluation data that indicates specific areas for therapeutic focus.`
      )
    }

    // Progress-based adjustments
    if (studentData.outcomes && studentData.outcomes.length > 0) {
      const avgAchievement = studentData.outcomes.reduce((sum, o) => sum + o.achievement, 0) / studentData.outcomes.length
      const progressDescription = avgAchievement > 0.7 ? 'strong progress' : 
                                 avgAchievement > 0.4 ? 'steady progress' : 'developing progress'
      
      parts.push(
        `Based on ${studentData.outcomes.length} therapy sessions showing ${progressDescription} ` +
        `(${(avgAchievement * 100).toFixed(1)}% average achievement), the recommended approach ` +
        `builds upon demonstrated strengths while addressing areas for continued growth.`
      )
    }

    // Cultural and linguistic considerations
    if (studentData.demographics.primaryLanguage) {
      const languageNote = studentData.demographics.primaryLanguage === 'bilingual' ?
        'The bilingual nature of the student\'s language profile has been considered in this recommendation.' :
        studentData.demographics.primaryLanguage === 'ar' ?
        'This recommendation considers the Arabic language context and cultural factors.' :
        'This recommendation is tailored for English language learning and cultural context.'
      
      parts.push(languageNote)
    }

    // Supporting factors
    if (factors.length > 0) {
      parts.push(`Key supporting factors include: ${factors.slice(0, 3).join(', ')}.`)
    }

    // Clinical validation note
    parts.push(
      `This AI-generated recommendation should be reviewed by a qualified therapist ` +
      `who will consider individual needs, family preferences, and clinical expertise ` +
      `in the final therapy plan design.`
    )

    return parts.join(' ')
  }

  /**
   * Generate detailed Arabic explanation
   * @param recommendation - Therapy recommendation
   * @param studentData - Student context
   * @param confidence - Confidence score  
   * @param factors - Supporting factors
   * @returns Comprehensive Arabic explanation
   */
  static generateArabicExplanation(
    recommendation: TherapyRecommendation,
    studentData: { demographics: StudentDemographics; assessmentHistory?: AssessmentAnalysis[]; outcomes?: TherapyOutcome[] },
    confidence: number,
    factors: string[]
  ): string {
    const parts: string[] = []
    const confidenceLevel = this.getConfidenceLevel(confidence)
    const ageGroupInfo = this.AGE_GROUPS_MAP[studentData.demographics.ageGroup as keyof typeof this.AGE_GROUPS_MAP]

    // Introduction with confidence level
    parts.push(
      `هذه توصية بمستوى ${this.CONFIDENCE_LEVELS[confidenceLevel as keyof typeof this.CONFIDENCE_LEVELS]?.ar || 'متوسط'} ` +
      `(${(confidence * 100).toFixed(1)}%) لطالب في فئة ${ageGroupInfo?.ar || studentData.demographics.ageGroup}.`
    )

    // Session recommendations
    if (recommendation.sessionFrequency || recommendation.sessionDuration) {
      const frequency = recommendation.sessionFrequency?.recommended || 2
      const duration = recommendation.sessionDuration?.recommended || 60
      const unitAr = recommendation.sessionFrequency?.unit === 'weekly' ? 'أسبوعياً' : 
                    recommendation.sessionFrequency?.unit === 'biweekly' ? 'كل أسبوعين' : 'شهرياً'
      
      parts.push(
        `يُنصح بجدول علاجي يتضمن ${frequency} جلسات ${unitAr}، ` +
        `مع استمرار كل جلسة لمدة ${duration} دقيقة. ` +
        `هذا الجدول مناسب للفئة العمرية للطالب ويدعم التعلم والمشاركة الأمثل.`
      )
    }

    // Therapeutic approaches
    if (recommendation.therapeuticApproaches && recommendation.therapeuticApproaches.length > 0) {
      parts.push(`تشمل الأساليب العلاجية المُوصى بها:`)
      
      recommendation.therapeuticApproaches.forEach((approach, index) => {
        const approachInfo = this.THERAPY_APPROACHES_MAP[approach.approach as keyof typeof this.THERAPY_APPROACHES_MAP]
        const arabicName = approachInfo?.ar || approach.approach
        const description = approachInfo?.description_ar || ''
        
        parts.push(
          `${index + 1}. ${arabicName}${description ? ` (${description})` : ''} ` +
          `- مستوى الأولوية: ${approach.priority}/10. ${this.translateRationale(approach.rationale)}`
        )
      })
    }

    // Assessment-based reasoning
    if (studentData.assessmentHistory && studentData.assessmentHistory.length > 0) {
      parts.push(
        `تستند هذه التوصية إلى ${studentData.assessmentHistory.length} تقييم(ات)، ` +
        `بما في ذلك بيانات التقييم الحديثة التي تشير إلى مجالات محددة للتركيز العلاجي.`
      )
    }

    // Progress-based adjustments
    if (studentData.outcomes && studentData.outcomes.length > 0) {
      const avgAchievement = studentData.outcomes.reduce((sum, o) => sum + o.achievement, 0) / studentData.outcomes.length
      const progressDescription = avgAchievement > 0.7 ? 'تقدماً قوياً' : 
                                 avgAchievement > 0.4 ? 'تقدماً مستقراً' : 'تقدماً متنامياً'
      
      parts.push(
        `بناءً على ${studentData.outcomes.length} جلسة علاجية تُظهر ${progressDescription} ` +
        `(${(avgAchievement * 100).toFixed(1)}% متوسط الإنجاز)، يعتمد النهج المُوصى به ` +
        `على نقاط القوة المُثبتة مع معالجة المجالات التي تحتاج إلى نمو مستمر.`
      )
    }

    // Cultural and linguistic considerations
    if (studentData.demographics.primaryLanguage) {
      const languageNote = studentData.demographics.primaryLanguage === 'bilingual' ?
        'تم مراعاة الطبيعة ثنائية اللغة للملف اللغوي للطالب في هذه التوصية.' :
        studentData.demographics.primaryLanguage === 'ar' ?
        'تراعي هذه التوصية السياق اللغوي العربي والعوامل الثقافية.' :
        'هذه التوصية مصممة لسياق تعلم اللغة الإنجليزية والثقافة.'
      
      parts.push(languageNote)
    }

    // Supporting factors
    if (factors.length > 0) {
      const translatedFactors = factors.slice(0, 3).map(factor => this.translateFactor(factor))
      parts.push(`تشمل العوامل الداعمة الرئيسية: ${translatedFactors.join('، ')}.`)
    }

    // Clinical validation note
    parts.push(
      `يجب مراجعة هذه التوصية المُولدة بالذكاء الاصطناعي من قبل أخصائي علاج مؤهل ` +
      `سيأخذ في الاعتبار الاحتياجات الفردية وتفضيلات الأسرة والخبرة السريرية ` +
      `في تصميم خطة العلاج النهائية.`
    )

    return parts.join(' ')
  }

  /**
   * Generate goal-specific explanations
   * @param goalAdjustments - Recommended goal adjustments
   * @param language - Target language ('ar' | 'en')
   * @returns Goal adjustment explanations
   */
  static generateGoalExplanations(
    goalAdjustments: TherapyRecommendation['goalAdjustments'],
    language: 'ar' | 'en' = 'en'
  ): string[] {
    if (!goalAdjustments) return []

    return goalAdjustments.map(adjustment => {
      if (language === 'ar') {
        const actionAr = this.getGoalActionArabic(adjustment.action)
        return `${actionAr} الهدف: ${adjustment.target}. السبب: ${this.translateRationale(adjustment.reasoning)}`
      } else {
        return `${adjustment.action.charAt(0).toUpperCase() + adjustment.action.slice(1)} goal: ${adjustment.target}. Reason: ${adjustment.reasoning}`
      }
    })
  }

  /**
   * Generate session-specific recommendations with cultural context
   * @param sessionFreq - Session frequency recommendation
   * @param sessionDur - Session duration recommendation
   * @param ageGroup - Student age group
   * @param language - Target language
   * @returns Session-specific recommendations
   */
  static generateSessionRecommendations(
    sessionFreq?: TherapyRecommendation['sessionFrequency'],
    sessionDur?: TherapyRecommendation['sessionDuration'],
    ageGroup: string = 'elementary',
    language: 'ar' | 'en' = 'en'
  ): string {
    if (!sessionFreq && !sessionDur) return ''

    const frequency = sessionFreq?.recommended || 2
    const duration = sessionDur?.recommended || 60

    if (language === 'ar') {
      const unitAr = sessionFreq?.unit === 'weekly' ? 'أسبوعياً' : 
                    sessionFreq?.unit === 'biweekly' ? 'كل أسبوعين' : 'شهرياً'
      
      let recommendation = `يُنصح بـ ${frequency} جلسات ${unitAr} لمدة ${duration} دقيقة لكل جلسة. `
      
      // Add age-specific cultural context
      if (ageGroup === 'early_intervention') {
        recommendation += 'هذا التكرار مناسب للتدخل المبكر ويراعي قدرة الأطفال الصغار على التركيز.'
      } else if (ageGroup === 'preschool') {
        recommendation += 'يناسب هذا الجدول الأطفال في سن ما قبل المدرسة ويدعم تطورهم اللغوي.'
      } else if (ageGroup === 'elementary') {
        recommendation += 'يتماشى هذا الجدول مع الروتين المدرسي ويدعم التقدم الأكاديمي.'
      }
      
      return recommendation

    } else {
      let recommendation = `Recommended ${frequency} sessions per ${sessionFreq?.unit || 'week'} for ${duration} minutes each. `
      
      // Add age-specific context
      if (ageGroup === 'early_intervention') {
        recommendation += 'This frequency is appropriate for early intervention and considers young children\'s attention spans.'
      } else if (ageGroup === 'preschool') {
        recommendation += 'This schedule suits preschool-aged children and supports their language development.'
      } else if (ageGroup === 'elementary') {
        recommendation += 'This schedule aligns with school routines and supports academic progress.'
      }
      
      return recommendation
    }
  }

  // Private helper methods

  private static generateSupportingData(studentData: {
    demographics: StudentDemographics
    assessmentHistory?: AssessmentAnalysis[]
    outcomes?: TherapyOutcome[]
  }): RecommendationExplanation['supportingData'] {
    const supportingData: RecommendationExplanation['supportingData'] = {
      demographicFactors: [
        `Age group: ${studentData.demographics.ageGroup}`,
        `Primary language: ${studentData.demographics.primaryLanguage}`,
        `Diagnosis codes: ${studentData.demographics.diagnosisCodes.slice(0, 3).join(', ')}`
      ]
    }

    // Add assessment data if available
    if (studentData.assessmentHistory && studentData.assessmentHistory.length > 0) {
      const latest = studentData.assessmentHistory[0]
      supportingData.assessmentScores = latest.scores.raw
    }

    // Add progress trends if available
    if (studentData.outcomes && studentData.outcomes.length >= 3) {
      const recent = studentData.outcomes.slice(0, 5)
      const recentAvg = recent.reduce((sum, o) => sum + o.achievement, 0) / recent.length
      const older = studentData.outcomes.slice(-5)
      const olderAvg = older.reduce((sum, o) => sum + o.achievement, 0) / older.length

      supportingData.progressTrends = [{
        metric: 'Overall Achievement',
        trend: recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable',
        significance: Math.abs(recentAvg - olderAvg)
      }]
    }

    return supportingData
  }

  private static generateClinicalEvidence(
    recommendation: TherapyRecommendation,
    studentData: { demographics: StudentDemographics },
    language: 'ar' | 'en' = 'en'
  ): string {
    const evidence: string[] = []
    const ageGroup = studentData.demographics.ageGroup

    if (language === 'ar') {
      if (ageGroup === 'early_intervention') {
        evidence.push('تدعم الأبحاث في التدخل المبكر الجلسات المكثفة قصيرة المدة')
      } else if (ageGroup === 'elementary') {
        evidence.push('يستفيد الأطفال في سن المدرسة من جلسات العلاج المنظمة والموجهة نحو الأهداف')
      }

      // Add diagnosis-specific evidence
      const diagnoses = studentData.demographics.diagnosisCodes
      if (diagnoses.includes('F80.0')) {
        evidence.push('تستجيب اضطرابات الأصوات الكلامية بشكل جيد للتدخل الصوتي المستهدف')
      }
      if (diagnoses.includes('F84.0')) {
        evidence.push('يستفيد الأطفال في طيف التوحد من العلاج المنظم والمتسق')
      }

    } else {
      if (ageGroup === 'early_intervention') {
        evidence.push('Early intervention research supports intensive, short-duration sessions')
      } else if (ageGroup === 'elementary') {
        evidence.push('School-age children benefit from structured, goal-oriented therapy sessions')
      }

      // Add diagnosis-specific evidence
      const diagnoses = studentData.demographics.diagnosisCodes
      if (diagnoses.includes('F80.0')) {
        evidence.push('Speech sound disorders respond well to targeted phonological intervention')
      }
      if (diagnoses.includes('F84.0')) {
        evidence.push('Children with autism spectrum disorders benefit from structured, consistent therapy')
      }
    }

    return evidence.join('. ') + '.'
  }

  private static getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 0.8) return 'high'
    if (confidence >= 0.6) return 'medium'
    return 'low'
  }

  private static translateRationale(rationale: string): string {
    // Simple translation mapping - in production would use proper translation service
    const translations: Record<string, string> = {
      'Model confidence: high based on assessment data': 'ثقة النموذج: عالية بناءً على بيانات التقييم',
      'Strong therapy progress': 'تقدم علاجي قوي',
      'Similar students showed good outcomes': 'أظهر الطلاب المشابهون نتائج جيدة',
      'Age-appropriate intervention approach': 'نهج تدخل مناسب للعمر',
      'Evidence-based practice': 'ممارسة قائمة على الأدلة'
    }

    return translations[rationale] || rationale
  }

  private static translateFactor(factor: string): string {
    const translations: Record<string, string> = {
      'Recent assessment results': 'نتائج التقييم الحديثة',
      'Strong therapy progress': 'تقدم علاجي قوي',
      'Slower therapy progress': 'تقدم علاجي أبطأ',
      'Bilingual language profile': 'ملف لغوي ثنائي',
      'Assessment data quality': 'جودة بيانات التقييم',
      'Historical therapy outcomes': 'نتائج العلاج التاريخية'
    }

    return translations[factor] || factor
  }

  private static getGoalActionArabic(action: string): string {
    const actionMap: Record<string, string> = {
      'increase': 'زيادة',
      'decrease': 'تقليل',
      'modify': 'تعديل',
      'add': 'إضافة'
    }

    return actionMap[action] || action
  }
}