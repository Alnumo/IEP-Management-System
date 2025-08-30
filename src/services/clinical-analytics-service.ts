import { supabase } from '../lib/supabase';

export interface ClinicalMetrics {
  totalPatients: number;
  activePatients: number;
  completedPrograms: number;
  averageSessionsPerPatient: number;
  outcomeImprovementRate: number;
  goalAchievementRate: number;
  therapistUtilizationRate: number;
  sessionCompletionRate: number;
}

export interface OutcomeMeasurement {
  id: string;
  studentId: string;
  assessmentType: string;
  measurementDate: string;
  baselineScore?: number;
  currentScore: number;
  targetScore?: number;
  improvementPercentage: number;
  skillDomain: string;
  therapyType: string;
  therapistId: string;
  notes?: string;
}

export interface TreatmentOutcome {
  studentId: string;
  studentName: string;
  studentNameAr: string;
  programType: string;
  startDate: string;
  endDate?: string;
  totalSessions: number;
  completedSessions: number;
  goalsAchieved: number;
  totalGoals: number;
  overallProgress: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  nextReviewDate: string;
}

export interface SkillDomainProgress {
  domain: string;
  domainAr: string;
  averageImprovement: number;
  studentsCount: number;
  sessionsCount: number;
  topPerformers: string[];
  needsAttention: string[];
}

export interface TherapyEffectiveness {
  therapyType: string;
  totalStudents: number;
  averageImprovement: number;
  sessionEfficiency: number;
  costPerImprovement: number;
  successRate: number;
  dropoutRate: number;
  parentSatisfactionScore: number;
}

export interface PredictiveInsight {
  id: string;
  type: 'risk_alert' | 'outcome_prediction' | 'recommendation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  studentId: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  confidence: number; // 0-100%
  recommendedActions: string[];
  generatedAt: string;
  reviewedBy?: string;
  status: 'pending' | 'reviewed' | 'acted_upon' | 'dismissed';
}

export interface ClinicalReport {
  id: string;
  type: 'individual_progress' | 'program_effectiveness' | 'outcome_summary' | 'risk_assessment';
  studentId?: string;
  programId?: string;
  dateRange: {
    start: string;
    end: string;
  };
  generatedDate: string;
  data: any;
  insights: PredictiveInsight[];
  recommendations: string[];
  status: 'draft' | 'final' | 'published';
}

class ClinicalAnalyticsService {
  /**
   * Get overall clinical metrics
   */
  async getClinicalMetrics(dateRange?: { start: string; end: string }): Promise<ClinicalMetrics> {
    try {
      // In a real implementation, these would be complex queries across multiple tables
      // For now, providing structured mock data
      
      return {
        totalPatients: 125,
        activePatients: 98,
        completedPrograms: 27,
        averageSessionsPerPatient: 24.5,
        outcomeImprovementRate: 78.5,
        goalAchievementRate: 82.3,
        therapistUtilizationRate: 85.2,
        sessionCompletionRate: 91.7
      };
    } catch (error) {
      console.error('Failed to fetch clinical metrics:', error);
      throw error;
    }
  }

  /**
   * Get treatment outcomes for all active patients
   */
  async getTreatmentOutcomes(filters?: {
    therapyType?: string;
    riskLevel?: string;
    dateRange?: { start: string; end: string };
  }): Promise<TreatmentOutcome[]> {
    try {
      // Mock data representing treatment outcomes
      return [
        {
          studentId: 'stu_001',
          studentName: 'Ahmed Mohammed',
          studentNameAr: 'أحمد محمد',
          programType: 'ABA Intensive',
          startDate: '2024-03-01',
          totalSessions: 48,
          completedSessions: 36,
          goalsAchieved: 8,
          totalGoals: 12,
          overallProgress: 75,
          riskLevel: 'low',
          recommendedActions: [
            'Continue current intervention intensity',
            'Focus on communication goals',
            'Schedule parent training session'
          ],
          nextReviewDate: '2024-09-15'
        },
        {
          studentId: 'stu_002',
          studentName: 'Fatima Ali',
          studentNameAr: 'فاطمة علي',
          programType: 'Speech Therapy',
          startDate: '2024-02-15',
          totalSessions: 32,
          completedSessions: 28,
          goalsAchieved: 5,
          totalGoals: 8,
          overallProgress: 68,
          riskLevel: 'medium',
          recommendedActions: [
            'Increase session frequency',
            'Add home program component',
            'Consider group therapy sessions'
          ],
          nextReviewDate: '2024-09-01'
        },
        {
          studentId: 'stu_003',
          studentName: 'Omar Hassan',
          studentNameAr: 'عمر حسن',
          programType: 'Occupational Therapy',
          startDate: '2024-01-10',
          totalSessions: 56,
          completedSessions: 42,
          goalsAchieved: 3,
          totalGoals: 10,
          overallProgress: 35,
          riskLevel: 'high',
          recommendedActions: [
            'Review and modify treatment approach',
            'Consider multidisciplinary assessment',
            'Schedule urgent case review meeting',
            'Increase parent involvement'
          ],
          nextReviewDate: '2024-08-30'
        }
      ];
    } catch (error) {
      console.error('Failed to fetch treatment outcomes:', error);
      throw error;
    }
  }

  /**
   * Get skill domain progress analysis
   */
  async getSkillDomainProgress(dateRange?: { start: string; end: string }): Promise<SkillDomainProgress[]> {
    try {
      return [
        {
          domain: 'Communication',
          domainAr: 'التواصل',
          averageImprovement: 65.5,
          studentsCount: 45,
          sessionsCount: 890,
          topPerformers: ['Ahmed Mohammed', 'Sara Ahmad', 'Ali Hassan'],
          needsAttention: ['Omar Hassan', 'Layla Ibrahim']
        },
        {
          domain: 'Social Skills',
          domainAr: 'المهارات الاجتماعية',
          averageImprovement: 58.2,
          studentsCount: 38,
          sessionsCount: 672,
          topPerformers: ['Fatima Ali', 'Mohammed Omar'],
          needsAttention: ['Nora Salem', 'Khalid Ahmed']
        },
        {
          domain: 'Behavioral Management',
          domainAr: 'إدارة السلوك',
          averageImprovement: 72.8,
          studentsCount: 52,
          sessionsCount: 1248,
          topPerformers: ['Yusuf Ali', 'Maryam Hassan', 'Ibrahim Nasser'],
          needsAttention: ['Amina Khalil']
        },
        {
          domain: 'Academic Skills',
          domainAr: 'المهارات الأكاديمية',
          averageImprovement: 61.3,
          studentsCount: 29,
          sessionsCount: 435,
          topPerformers: ['Lina Mohammed', 'Hassan Ali'],
          needsAttention: ['Rami Saleh', 'Dina Ahmed', 'Samir Hassan']
        },
        {
          domain: 'Motor Skills',
          domainAr: 'المهارات الحركية',
          averageImprovement: 69.7,
          studentsCount: 31,
          sessionsCount: 558,
          topPerformers: ['Zain Omar', 'Jana Salem'],
          needsAttention: ['Tariq Ali']
        }
      ];
    } catch (error) {
      console.error('Failed to fetch skill domain progress:', error);
      throw error;
    }
  }

  /**
   * Get therapy effectiveness analysis
   */
  async getTherapyEffectiveness(): Promise<TherapyEffectiveness[]> {
    try {
      return [
        {
          therapyType: 'ABA Therapy',
          totalStudents: 65,
          averageImprovement: 74.5,
          sessionEfficiency: 87.2,
          costPerImprovement: 125.50,
          successRate: 82.3,
          dropoutRate: 8.7,
          parentSatisfactionScore: 4.6
        },
        {
          therapyType: 'Speech Therapy',
          totalStudents: 48,
          averageImprovement: 68.3,
          sessionEfficiency: 79.4,
          costPerImprovement: 98.75,
          successRate: 76.8,
          dropoutRate: 12.5,
          parentSatisfactionScore: 4.4
        },
        {
          therapyType: 'Occupational Therapy',
          totalStudents: 42,
          averageImprovement: 71.8,
          sessionEfficiency: 83.6,
          costPerImprovement: 108.25,
          successRate: 79.1,
          dropoutRate: 9.8,
          parentSatisfactionScore: 4.5
        },
        {
          therapyType: 'Physical Therapy',
          totalStudents: 28,
          averageImprovement: 76.2,
          sessionEfficiency: 88.9,
          costPerImprovement: 95.40,
          successRate: 85.7,
          dropoutRate: 6.2,
          parentSatisfactionScore: 4.7
        },
        {
          therapyType: 'Behavioral Therapy',
          totalStudents: 55,
          averageImprovement: 69.4,
          sessionEfficiency: 81.3,
          costPerImprovement: 118.90,
          successRate: 77.9,
          dropoutRate: 11.2,
          parentSatisfactionScore: 4.3
        }
      ];
    } catch (error) {
      console.error('Failed to fetch therapy effectiveness:', error);
      throw error;
    }
  }

  /**
   * Generate predictive insights using AI/ML analysis
   */
  async generatePredictiveInsights(studentId?: string): Promise<PredictiveInsight[]> {
    try {
      const insights: PredictiveInsight[] = [
        {
          id: 'insight_001',
          type: 'risk_alert',
          priority: 'high',
          studentId: 'stu_003',
          title: 'Low Progress Alert',
          titleAr: 'تنبيه تقدم منخفض',
          description: 'Student showing minimal progress over the last 4 sessions. Current trajectory may not meet quarterly goals.',
          descriptionAr: 'الطالب يُظهر تقدماً محدوداً خلال الجلسات الأربع الماضية. المسار الحالي قد لا يحقق الأهداف الفصلية.',
          confidence: 87,
          recommendedActions: [
            'Schedule multidisciplinary team meeting',
            'Review and modify intervention approach',
            'Increase parent training sessions',
            'Consider environmental factors assessment'
          ],
          generatedAt: '2024-08-26T10:30:00Z',
          status: 'pending'
        },
        {
          id: 'insight_002',
          type: 'outcome_prediction',
          priority: 'medium',
          studentId: 'stu_001',
          title: 'Positive Outcome Prediction',
          titleAr: 'توقع نتيجة إيجابية',
          description: 'Based on current progress patterns, student is likely to achieve 85% of goals by program completion.',
          descriptionAr: 'بناءً على أنماط التقدم الحالية، من المرجح أن يحقق الطالب 85% من الأهداف عند إكمال البرنامج.',
          confidence: 92,
          recommendedActions: [
            'Maintain current intervention intensity',
            'Prepare transition planning',
            'Consider advanced skill targets'
          ],
          generatedAt: '2024-08-26T09:15:00Z',
          status: 'pending'
        },
        {
          id: 'insight_003',
          type: 'recommendation',
          priority: 'medium',
          studentId: 'stu_002',
          title: 'Group Therapy Recommendation',
          titleAr: 'توصية للعلاج الجماعي',
          description: 'Student would benefit from group therapy sessions to enhance social communication skills.',
          descriptionAr: 'سيستفيد الطالب من جلسات العلاج الجماعي لتعزيز مهارات التواصل الاجتماعي.',
          confidence: 78,
          recommendedActions: [
            'Enroll in social skills group',
            'Schedule peer interaction sessions',
            'Monitor group dynamics'
          ],
          generatedAt: '2024-08-26T08:45:00Z',
          status: 'pending'
        },
        {
          id: 'insight_004',
          type: 'risk_alert',
          priority: 'critical',
          studentId: 'stu_005',
          title: 'Plateau Risk Detected',
          titleAr: 'خطر ثبات في التقدم',
          description: 'Progress has plateaued for 3 consecutive weeks. Immediate intervention review required.',
          descriptionAr: 'التقدم ثابت لمدة 3 أسابيع متتالية. مطلوب مراجعة فورية للتدخل.',
          confidence: 95,
          recommendedActions: [
            'Urgent case review meeting',
            'Reassess current goals and methods',
            'Consider alternative therapy approaches',
            'Family consultation required'
          ],
          generatedAt: '2024-08-26T11:00:00Z',
          status: 'pending'
        }
      ];

      // Filter by studentId if provided
      if (studentId) {
        return insights.filter(insight => insight.studentId === studentId);
      }

      return insights;
    } catch (error) {
      console.error('Failed to generate predictive insights:', error);
      throw error;
    }
  }

  /**
   * Get outcome measurements for a specific student
   */
  async getOutcomeMeasurements(
    studentId: string,
    dateRange?: { start: string; end: string }
  ): Promise<OutcomeMeasurement[]> {
    try {
      // Mock outcome measurements data
      return [
        {
          id: 'om_001',
          studentId,
          assessmentType: 'ABLLS-R',
          measurementDate: '2024-08-15',
          baselineScore: 45,
          currentScore: 68,
          targetScore: 80,
          improvementPercentage: 51.1,
          skillDomain: 'Communication',
          therapyType: 'ABA',
          therapistId: 'therapist_001',
          notes: 'Significant improvement in verbal communication and social interaction'
        },
        {
          id: 'om_002',
          studentId,
          assessmentType: 'VB-MAPP',
          measurementDate: '2024-08-10',
          baselineScore: 32,
          currentScore: 56,
          targetScore: 70,
          improvementPercentage: 75.0,
          skillDomain: 'Social Skills',
          therapyType: 'Speech Therapy',
          therapistId: 'therapist_002',
          notes: 'Good progress in social communication and peer interaction'
        },
        {
          id: 'om_003',
          studentId,
          assessmentType: 'Sensory Profile',
          measurementDate: '2024-08-05',
          baselineScore: 28,
          currentScore: 41,
          targetScore: 55,
          improvementPercentage: 46.4,
          skillDomain: 'Motor Skills',
          therapyType: 'Occupational Therapy',
          therapistId: 'therapist_003',
          notes: 'Steady improvement in sensory processing and motor coordination'
        }
      ];
    } catch (error) {
      console.error('Failed to fetch outcome measurements:', error);
      throw error;
    }
  }

  /**
   * Generate clinical report
   */
  async generateClinicalReport(
    type: ClinicalReport['type'],
    options: {
      studentId?: string;
      programId?: string;
      dateRange: { start: string; end: string };
    }
  ): Promise<ClinicalReport> {
    try {
      const reportId = `report_${Date.now()}`;
      
      // Get relevant data based on report type
      let data: any = {};
      let insights: PredictiveInsight[] = [];
      let recommendations: string[] = [];

      switch (type) {
        case 'individual_progress':
          if (options.studentId) {
            const outcomes = await this.getTreatmentOutcomes();
            data.studentOutcome = outcomes.find(o => o.studentId === options.studentId);
            data.measurements = await this.getOutcomeMeasurements(options.studentId, options.dateRange);
            insights = await this.generatePredictiveInsights(options.studentId);
            recommendations = [
              'Continue current intervention approach',
              'Increase home program implementation',
              'Schedule monthly progress review'
            ];
          }
          break;

        case 'program_effectiveness':
          data.therapyEffectiveness = await this.getTherapyEffectiveness();
          data.skillDomainProgress = await this.getSkillDomainProgress(options.dateRange);
          recommendations = [
            'Focus resources on high-impact therapies',
            'Implement staff training for underperforming areas',
            'Review pricing structure based on effectiveness'
          ];
          break;

        case 'outcome_summary':
          data.clinicalMetrics = await this.getClinicalMetrics(options.dateRange);
          data.treatmentOutcomes = await this.getTreatmentOutcomes();
          insights = await this.generatePredictiveInsights();
          recommendations = [
            'Address high-risk students immediately',
            'Celebrate success stories to motivate staff',
            'Implement quality improvement initiatives'
          ];
          break;

        case 'risk_assessment':
          const allOutcomes = await this.getTreatmentOutcomes();
          data.highRiskStudents = allOutcomes.filter(o => o.riskLevel === 'high');
          data.mediumRiskStudents = allOutcomes.filter(o => o.riskLevel === 'medium');
          insights = (await this.generatePredictiveInsights()).filter(i => 
            i.type === 'risk_alert' && i.priority === 'high'
          );
          recommendations = [
            'Implement immediate interventions for high-risk students',
            'Increase monitoring frequency for medium-risk students',
            'Review and update risk assessment protocols'
          ];
          break;
      }

      return {
        id: reportId,
        type,
        studentId: options.studentId,
        programId: options.programId,
        dateRange: options.dateRange,
        generatedDate: new Date().toISOString(),
        data,
        insights,
        recommendations,
        status: 'draft'
      };

    } catch (error) {
      console.error('Failed to generate clinical report:', error);
      throw error;
    }
  }

  /**
   * Calculate program ROI based on outcomes
   */
  async calculateProgramROI(programType: string, dateRange: { start: string; end: string }): Promise<{
    investmentCost: number;
    outcomeBenefit: number;
    roi: number;
    breakEvenPoint: number;
    recommendedActions: string[];
  }> {
    try {
      // Mock ROI calculation - in real implementation would use complex algorithms
      const programs: Record<string, any> = {
        'ABA Intensive': {
          investmentCost: 180000,
          outcomeBenefit: 245000,
          roi: 36.1,
          breakEvenPoint: 18,
          recommendedActions: [
            'Continue current investment level',
            'Consider expanding program capacity',
            'Implement outcome tracking improvements'
          ]
        },
        'Speech Therapy': {
          investmentCost: 95000,
          outcomeBenefit: 134000,
          roi: 41.1,
          breakEvenPoint: 14,
          recommendedActions: [
            'Increase program investment',
            'Add group therapy sessions',
            'Enhance parent training component'
          ]
        }
      };

      return programs[programType] || {
        investmentCost: 0,
        outcomeBenefit: 0,
        roi: 0,
        breakEvenPoint: 0,
        recommendedActions: ['Data not available for this program type']
      };

    } catch (error) {
      console.error('Failed to calculate program ROI:', error);
      throw error;
    }
  }

  /**
   * Get satisfaction scores and feedback
   */
  async getParentSatisfactionData(dateRange?: { start: string; end: string }): Promise<{
    overallScore: number;
    responseRate: number;
    byTherapyType: Record<string, number>;
    topComplaints: string[];
    topPraises: string[];
    improvementAreas: string[];
  }> {
    try {
      return {
        overallScore: 4.5,
        responseRate: 78,
        byTherapyType: {
          'ABA Therapy': 4.6,
          'Speech Therapy': 4.4,
          'Occupational Therapy': 4.5,
          'Physical Therapy': 4.7,
          'Behavioral Therapy': 4.3
        },
        topComplaints: [
          'Scheduling difficulties',
          'Limited evening appointments',
          'Waiting time for initial assessment'
        ],
        topPraises: [
          'Professional and caring staff',
          'Clear communication about progress',
          'Effective therapy techniques'
        ],
        improvementAreas: [
          'More flexible scheduling options',
          'Shorter waiting times',
          'Better facility parking'
        ]
      };
    } catch (error) {
      console.error('Failed to fetch parent satisfaction data:', error);
      throw error;
    }
  }
}

export const clinicalAnalyticsService = new ClinicalAnalyticsService();