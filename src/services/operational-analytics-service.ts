import { supabase } from '../lib/supabase';

export interface OperationalMetrics {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  sessionUtilizationRate: number;
  averageSessionDuration: number;
  therapistUtilizationRate: number;
  facilityUtilizationRate: number;
  revenuePerSession: number;
}

export interface SessionUtilization {
  date: string;
  totalSlots: number;
  bookedSlots: number;
  completedSlots: number;
  utilisationRate: number;
  revenue: number;
  therapistHours: number;
  facilityHours: number;
}

export interface TherapistPerformance {
  therapistId: string;
  therapistName: string;
  therapistNameAr: string;
  specialization: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  noShowRate: number;
  utilizationRate: number;
  averageSessionRating: number;
  patientsServed: number;
  revenueGenerated: number;
  efficiencyScore: number;
  lastWeekPerformance: {
    sessionsCompleted: number;
    utilizationRate: number;
    patientSatisfaction: number;
  };
}

export interface FacilityUtilization {
  roomId: string;
  roomName: string;
  roomType: string;
  capacity: number;
  totalHours: number;
  usedHours: number;
  utilizationRate: number;
  maintenanceHours: number;
  revenuePerHour: number;
  equipmentUtilization: Record<string, number>;
}

export interface ResourceOptimization {
  resourceType: 'therapist' | 'room' | 'equipment';
  resourceId: string;
  resourceName: string;
  currentUtilization: number;
  optimalUtilization: number;
  improvementPotential: number;
  recommendedActions: string[];
  costImpact: number;
  timeToImplement: number; // days
}

export interface OperationalInsight {
  id: string;
  type: 'efficiency' | 'utilization' | 'resource_optimization' | 'cost_reduction';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  impact: 'low' | 'medium' | 'high';
  implementation: 'easy' | 'moderate' | 'complex';
  potentialSavings: number; // SAR per month
  potentialRevenueIncrease: number; // SAR per month
  recommendedActions: string[];
  kpis: string[];
  generatedAt: string;
  status: 'pending' | 'in_progress' | 'implemented' | 'dismissed';
}

export interface NoShowPrediction {
  appointmentId: string;
  studentId: string;
  studentName: string;
  appointmentDate: string;
  appointmentTime: string;
  therapistId: string;
  noShowProbability: number; // 0-100%
  riskFactors: string[];
  preventiveActions: string[];
  lastMinuteRebookingOptions: string[];
}

export interface WaitTimeAnalysis {
  location: string;
  averageWaitTime: number; // minutes
  peakWaitTimes: { hour: number; waitTime: number }[];
  waitTimeByTherapyType: Record<string, number>;
  patientSatisfactionImpact: number;
  recommendedImprovements: string[];
}

class OperationalAnalyticsService {
  /**
   * Get overall operational metrics
   */
  async getOperationalMetrics(dateRange?: { start: string; end: string }): Promise<OperationalMetrics> {
    try {
      // In real implementation, would query actual database
      // Mock data for comprehensive operational metrics
      
      return {
        totalSessions: 2847,
        completedSessions: 2614,
        cancelledSessions: 158,
        noShowSessions: 75,
        sessionUtilizationRate: 91.8,
        averageSessionDuration: 52.3, // minutes
        therapistUtilizationRate: 87.4,
        facilityUtilizationRate: 82.1,
        revenuePerSession: 187.50
      };
    } catch (error) {
      console.error('Failed to fetch operational metrics:', error);
      throw error;
    }
  }

  /**
   * Get session utilization data over time
   */
  async getSessionUtilizationData(dateRange?: { start: string; end: string }): Promise<SessionUtilization[]> {
    try {
      // Mock weekly utilization data
      return [
        {
          date: '2024-08-01',
          totalSlots: 240,
          bookedSlots: 228,
          completedSlots: 210,
          utilisationRate: 87.5,
          revenue: 39375,
          therapistHours: 105,
          facilityHours: 8.5
        },
        {
          date: '2024-08-08',
          totalSlots: 240,
          bookedSlots: 235,
          completedSlots: 218,
          utilisationRate: 90.8,
          revenue: 40875,
          therapistHours: 109,
          facilityHours: 8.5
        },
        {
          date: '2024-08-15',
          totalSlots: 240,
          bookedSlots: 232,
          completedSlots: 215,
          utilisationRate: 89.6,
          revenue: 40312,
          therapistHours: 107.5,
          facilityHours: 8.5
        },
        {
          date: '2024-08-22',
          totalSlots: 240,
          bookedSlots: 240,
          completedSlots: 225,
          utilisationRate: 93.8,
          revenue: 42187,
          therapistHours: 112.5,
          facilityHours: 8.5
        }
      ];
    } catch (error) {
      console.error('Failed to fetch session utilization data:', error);
      throw error;
    }
  }

  /**
   * Get therapist performance analytics
   */
  async getTherapistPerformance(dateRange?: { start: string; end: string }): Promise<TherapistPerformance[]> {
    try {
      return [
        {
          therapistId: 'ther_001',
          therapistName: 'Dr. Sarah Ahmed',
          therapistNameAr: 'د. سارة أحمد',
          specialization: 'ABA Therapy',
          totalSessions: 156,
          completedSessions: 148,
          cancelledSessions: 6,
          noShowRate: 1.3,
          utilizationRate: 94.9,
          averageSessionRating: 4.8,
          patientsServed: 18,
          revenueGenerated: 36600,
          efficiencyScore: 92.5,
          lastWeekPerformance: {
            sessionsCompleted: 12,
            utilizationRate: 96.0,
            patientSatisfaction: 4.9
          }
        },
        {
          therapistId: 'ther_002',
          therapistName: 'Ahmed Mohammed',
          therapistNameAr: 'أحمد محمد',
          specialization: 'Speech Therapy',
          totalSessions: 134,
          completedSessions: 124,
          cancelledSessions: 8,
          noShowRate: 1.5,
          utilizationRate: 92.5,
          averageSessionRating: 4.6,
          patientsServed: 22,
          revenueGenerated: 26800,
          efficiencyScore: 89.2,
          lastWeekPerformance: {
            sessionsCompleted: 10,
            utilizationRate: 90.9,
            patientSatisfaction: 4.7
          }
        },
        {
          therapistId: 'ther_003',
          therapistName: 'Fatima Ali',
          therapistNameAr: 'فاطمة علي',
          specialization: 'Occupational Therapy',
          totalSessions: 128,
          completedSessions: 116,
          cancelledSessions: 10,
          noShowRate: 1.6,
          utilizationRate: 90.6,
          averageSessionRating: 4.5,
          patientsServed: 20,
          revenueGenerated: 23040,
          efficiencyScore: 87.8,
          lastWeekPerformance: {
            sessionsCompleted: 9,
            utilizationRate: 88.2,
            patientSatisfaction: 4.4
          }
        },
        {
          therapistId: 'ther_004',
          therapistName: 'Omar Hassan',
          therapistNameAr: 'عمر حسن',
          specialization: 'Physical Therapy',
          totalSessions: 112,
          completedSessions: 108,
          cancelledSessions: 3,
          noShowRate: 0.9,
          utilizationRate: 96.4,
          averageSessionRating: 4.9,
          patientsServed: 16,
          revenueGenerated: 20160,
          efficiencyScore: 95.1,
          lastWeekPerformance: {
            sessionsCompleted: 8,
            utilizationRate: 100.0,
            patientSatisfaction: 5.0
          }
        },
        {
          therapistId: 'ther_005',
          therapistName: 'Layla Ibrahim',
          therapistNameAr: 'ليلى إبراهيم',
          specialization: 'Behavioral Therapy',
          totalSessions: 145,
          completedSessions: 132,
          cancelledSessions: 11,
          noShowRate: 1.4,
          utilizationRate: 91.0,
          averageSessionRating: 4.3,
          patientsServed: 25,
          revenueGenerated: 31680,
          efficiencyScore: 85.6,
          lastWeekPerformance: {
            sessionsCompleted: 11,
            utilizationRate: 91.7,
            patientSatisfaction: 4.2
          }
        }
      ];
    } catch (error) {
      console.error('Failed to fetch therapist performance:', error);
      throw error;
    }
  }

  /**
   * Get facility utilization analytics
   */
  async getFacilityUtilization(dateRange?: { start: string; end: string }): Promise<FacilityUtilization[]> {
    try {
      return [
        {
          roomId: 'room_001',
          roomName: 'ABA Room 1',
          roomType: 'Individual Therapy',
          capacity: 2,
          totalHours: 240, // 8 hours x 30 days
          usedHours: 198,
          utilizationRate: 82.5,
          maintenanceHours: 4,
          revenuePerHour: 250,
          equipmentUtilization: {
            'sensory_table': 85,
            'therapy_swing': 72,
            'communication_device': 90
          }
        },
        {
          roomId: 'room_002',
          roomName: 'Speech Therapy Room',
          roomType: 'Individual Therapy',
          capacity: 2,
          totalHours: 240,
          usedHours: 206,
          utilizationRate: 85.8,
          maintenanceHours: 2,
          revenuePerHour: 200,
          equipmentUtilization: {
            'speech_mirror': 95,
            'recording_equipment': 78,
            'articulation_tools': 88
          }
        },
        {
          roomId: 'room_003',
          roomName: 'OT Room',
          roomType: 'Individual Therapy',
          capacity: 2,
          totalHours: 240,
          usedHours: 188,
          utilizationRate: 78.3,
          maintenanceHours: 6,
          revenuePerHour: 180,
          equipmentUtilization: {
            'fine_motor_tools': 82,
            'sensory_equipment': 75,
            'adaptive_technology': 68
          }
        },
        {
          roomId: 'room_004',
          roomName: 'Group Activity Room',
          roomType: 'Group Therapy',
          capacity: 8,
          totalHours: 120, // 4 hours x 30 days
          usedHours: 96,
          utilizationRate: 80.0,
          maintenanceHours: 3,
          revenuePerHour: 600, // Higher rate for group sessions
          equipmentUtilization: {
            'interactive_board': 90,
            'group_seating': 95,
            'audio_system': 88
          }
        },
        {
          roomId: 'room_005',
          roomName: 'Physical Therapy Gym',
          roomType: 'Physical Therapy',
          capacity: 4,
          totalHours: 240,
          usedHours: 210,
          utilizationRate: 87.5,
          maintenanceHours: 8,
          revenuePerHour: 180,
          equipmentUtilization: {
            'exercise_equipment': 85,
            'balance_tools': 78,
            'mobility_aids': 70
          }
        }
      ];
    } catch (error) {
      console.error('Failed to fetch facility utilization:', error);
      throw error;
    }
  }

  /**
   * Generate operational insights and recommendations
   */
  async generateOperationalInsights(): Promise<OperationalInsight[]> {
    try {
      return [
        {
          id: 'insight_op_001',
          type: 'utilization',
          priority: 'high',
          title: 'Underutilized OT Room',
          titleAr: 'غرفة العلاج الوظيفي غير مستغلة بالكامل',
          description: 'OT Room utilization is 78.3%, significantly below the 85% target. This represents lost revenue opportunity.',
          descriptionAr: 'استخدام غرفة العلاج الوظيفي هو 78.3%، أقل بكثير من الهدف 85%. هذا يمثل فرصة ضائعة للإيرادات.',
          impact: 'high',
          implementation: 'moderate',
          potentialSavings: 0,
          potentialRevenueIncrease: 3240, // SAR per month
          recommendedActions: [
            'Schedule additional OT sessions during low-utilization hours',
            'Cross-train therapists to provide OT services',
            'Market OT services more aggressively to increase demand',
            'Consider offering group OT sessions'
          ],
          kpis: ['Room Utilization Rate', 'Revenue per Hour', 'Therapist Efficiency'],
          generatedAt: '2024-08-26T10:30:00Z',
          status: 'pending'
        },
        {
          id: 'insight_op_002',
          type: 'efficiency',
          priority: 'medium',
          title: 'High No-Show Rate Pattern',
          titleAr: 'نمط عالي لعدم الحضور',
          description: 'Monday morning sessions have a 12% no-show rate, compared to 3% average. This affects therapist productivity.',
          descriptionAr: 'جلسات صباح الاثنين لديها معدل عدم حضور 12%، مقارنة بمتوسط 3%. هذا يؤثر على إنتاجية المعالج.',
          impact: 'medium',
          implementation: 'easy',
          potentialSavings: 1800, // Cost of wasted therapist time
          potentialRevenueIncrease: 2400,
          recommendedActions: [
            'Implement reminder calls for Monday appointments',
            'Offer incentives for consistent attendance',
            'Reschedule chronic no-show patients',
            'Create waiting list for last-minute bookings'
          ],
          kpis: ['No-Show Rate', 'Session Completion Rate', 'Revenue per Slot'],
          generatedAt: '2024-08-26T09:15:00Z',
          status: 'pending'
        },
        {
          id: 'insight_op_003',
          type: 'resource_optimization',
          priority: 'high',
          title: 'Therapist Workload Imbalance',
          titleAr: 'عدم توازن في عبء العمل للمعالجين',
          description: 'Dr. Omar has 96% utilization while others average 92%. Better load balancing could improve service quality.',
          descriptionAr: 'د. عمر لديه استخدام 96% بينما الآخرون متوسطهم 92%. توزيع أفضل للحمل يمكن أن يحسن جودة الخدمة.',
          impact: 'high',
          implementation: 'moderate',
          potentialSavings: 2100, // Reduced overtime costs
          potentialRevenueIncrease: 1500,
          recommendedActions: [
            'Redistribute high-demand patients more evenly',
            'Train additional therapists in physical therapy',
            'Implement dynamic scheduling system',
            'Monitor therapist satisfaction and burnout indicators'
          ],
          kpis: ['Therapist Utilization Rate', 'Patient Satisfaction', 'Staff Retention'],
          generatedAt: '2024-08-26T08:45:00Z',
          status: 'pending'
        },
        {
          id: 'insight_op_004',
          type: 'cost_reduction',
          priority: 'medium',
          title: 'Maintenance Schedule Optimization',
          titleAr: 'تحسين جدول الصيانة',
          description: 'Equipment maintenance during peak hours reduces utilization. Rescheduling could increase available slots.',
          descriptionAr: 'صيانة المعدات خلال ساعات الذروة تقلل من الاستخدام. إعادة الجدولة يمكن أن تزيد الفتحات المتاحة.',
          impact: 'medium',
          implementation: 'easy',
          potentialSavings: 1200, // Reduced maintenance costs
          potentialRevenueIncrease: 2800,
          recommendedActions: [
            'Move routine maintenance to off-peak hours',
            'Implement predictive maintenance schedules',
            'Cross-train staff on basic equipment maintenance',
            'Negotiate better maintenance contracts'
          ],
          kpis: ['Equipment Uptime', 'Maintenance Costs', 'Room Utilization'],
          generatedAt: '2024-08-26T07:30:00Z',
          status: 'pending'
        }
      ];
    } catch (error) {
      console.error('Failed to generate operational insights:', error);
      throw error;
    }
  }

  /**
   * Predict no-show appointments using ML patterns
   */
  async predictNoShows(dateRange?: { start: string; end: string }): Promise<NoShowPrediction[]> {
    try {
      // Mock no-show predictions based on historical patterns
      return [
        {
          appointmentId: 'apt_001',
          studentId: 'stu_005',
          studentName: 'Khalid Ahmed',
          appointmentDate: '2024-08-27',
          appointmentTime: '09:00',
          therapistId: 'ther_002',
          noShowProbability: 78,
          riskFactors: [
            'Previous no-show history (2 in last month)',
            'Monday morning appointment',
            'No confirmation response',
            'Weather forecast: rainy'
          ],
          preventiveActions: [
            'Call patient 2 hours before appointment',
            'Send SMS reminder with directions',
            'Offer rescheduling option',
            'Have backup patient on standby'
          ],
          lastMinuteRebookingOptions: [
            'stu_012 - requested earlier slot',
            'stu_018 - flexible schedule',
            'stu_023 - on waiting list'
          ]
        },
        {
          appointmentId: 'apt_002',
          studentId: 'stu_014',
          studentName: 'Nora Salem',
          appointmentDate: '2024-08-27',
          appointmentTime: '14:30',
          therapistId: 'ther_003',
          noShowProbability: 65,
          riskFactors: [
            'First appointment with new patient',
            'Long travel distance (>30km)',
            'Late afternoon slot',
            'No previous therapy experience'
          ],
          preventiveActions: [
            'Send detailed arrival instructions',
            'Schedule orientation call',
            'Provide parking information',
            'Confirm transportation arrangement'
          ],
          lastMinuteRebookingOptions: [
            'stu_007 - local patient',
            'stu_015 - regular patient'
          ]
        },
        {
          appointmentId: 'apt_003',
          studentId: 'stu_021',
          studentName: 'Amina Khalil',
          appointmentDate: '2024-08-28',
          appointmentTime: '11:00',
          therapistId: 'ther_001',
          noShowProbability: 42,
          riskFactors: [
            'Recent cancellation (1 week ago)',
            'Mid-morning slot (moderate risk)',
            'Parent works variable shifts'
          ],
          preventiveActions: [
            'Confirm availability day before',
            'Text reminder morning of appointment',
            'Offer alternative scheduling'
          ],
          lastMinuteRebookingOptions: [
            'stu_003 - standby list',
            'stu_019 - flexible schedule'
          ]
        }
      ];
    } catch (error) {
      console.error('Failed to predict no-shows:', error);
      throw error;
    }
  }

  /**
   * Analyze wait times and patient flow
   */
  async getWaitTimeAnalysis(dateRange?: { start: string; end: string }): Promise<WaitTimeAnalysis[]> {
    try {
      return [
        {
          location: 'Reception Area',
          averageWaitTime: 12.5,
          peakWaitTimes: [
            { hour: 9, waitTime: 18.2 },
            { hour: 14, waitTime: 15.8 },
            { hour: 16, waitTime: 21.3 }
          ],
          waitTimeByTherapyType: {
            'ABA Therapy': 8.5,
            'Speech Therapy': 11.2,
            'Occupational Therapy': 14.8,
            'Physical Therapy': 9.1,
            'Behavioral Therapy': 16.2
          },
          patientSatisfactionImpact: -0.3, // Negative impact on satisfaction
          recommendedImprovements: [
            'Stagger appointment start times',
            'Implement check-in kiosks',
            'Add more seating in reception',
            'Provide entertainment for waiting children'
          ]
        },
        {
          location: 'Therapy Wing A',
          averageWaitTime: 8.7,
          peakWaitTimes: [
            { hour: 10, waitTime: 12.4 },
            { hour: 15, waitTime: 14.1 }
          ],
          waitTimeByTherapyType: {
            'ABA Therapy': 6.8,
            'Speech Therapy': 9.2,
            'Occupational Therapy': 11.5
          },
          patientSatisfactionImpact: -0.1,
          recommendedImprovements: [
            'Better coordination between therapists',
            'Reduce transition time between sessions',
            'Add visual schedule displays'
          ]
        }
      ];
    } catch (error) {
      console.error('Failed to analyze wait times:', error);
      throw error;
    }
  }

  /**
   * Get resource optimization recommendations
   */
  async getResourceOptimizationRecommendations(): Promise<ResourceOptimization[]> {
    try {
      return [
        {
          resourceType: 'therapist',
          resourceId: 'ther_005',
          resourceName: 'Layla Ibrahim (Behavioral Therapy)',
          currentUtilization: 91.0,
          optimalUtilization: 85.0,
          improvementPotential: -6.0, // Over-utilized
          recommendedActions: [
            'Redistribute 2-3 patients to other behavioral therapists',
            'Add additional behavioral therapist to team',
            'Implement group therapy sessions',
            'Provide stress management support'
          ],
          costImpact: 2100, // Cost of overtime/burnout
          timeToImplement: 14
        },
        {
          resourceType: 'room',
          resourceId: 'room_003',
          resourceName: 'OT Room',
          currentUtilization: 78.3,
          optimalUtilization: 85.0,
          improvementPotential: 6.7,
          recommendedActions: [
            'Add evening OT sessions',
            'Promote group OT activities',
            'Cross-train therapists for OT support',
            'Market specialized OT programs'
          ],
          costImpact: -3240, // Negative = revenue opportunity
          timeToImplement: 21
        },
        {
          resourceType: 'equipment',
          resourceId: 'eq_015',
          resourceName: 'Adaptive Technology (OT Room)',
          currentUtilization: 68.0,
          optimalUtilization: 80.0,
          improvementPotential: 12.0,
          recommendedActions: [
            'Train more therapists on equipment use',
            'Schedule dedicated equipment sessions',
            'Promote technology-assisted therapy',
            'Upgrade to newer, more versatile equipment'
          ],
          costImpact: -1800, // Revenue opportunity
          timeToImplement: 7
        }
      ];
    } catch (error) {
      console.error('Failed to get resource optimization recommendations:', error);
      throw error;
    }
  }

  /**
   * Calculate operational efficiency scores
   */
  async calculateEfficiencyScores(dateRange?: { start: string; end: string }): Promise<{
    overallEfficiency: number;
    therapistEfficiency: number;
    facilityEfficiency: number;
    resourceEfficiency: number;
    costEfficiency: number;
    benchmarkComparison: {
      metric: string;
      current: number;
      benchmark: number;
      variance: number;
    }[];
  }> {
    try {
      return {
        overallEfficiency: 87.3,
        therapistEfficiency: 89.1,
        facilityEfficiency: 82.4,
        resourceEfficiency: 85.7,
        costEfficiency: 91.2,
        benchmarkComparison: [
          {
            metric: 'Session Utilization Rate',
            current: 91.8,
            benchmark: 88.0,
            variance: +3.8
          },
          {
            metric: 'Therapist Utilization Rate',
            current: 87.4,
            benchmark: 85.0,
            variance: +2.4
          },
          {
            metric: 'No-Show Rate',
            current: 2.6,
            benchmark: 5.0,
            variance: -2.4 // Better than benchmark
          },
          {
            metric: 'Revenue per Session',
            current: 187.50,
            benchmark: 165.00,
            variance: +22.50
          },
          {
            metric: 'Average Wait Time',
            current: 12.5,
            benchmark: 15.0,
            variance: -2.5 // Better than benchmark
          }
        ]
      };
    } catch (error) {
      console.error('Failed to calculate efficiency scores:', error);
      throw error;
    }
  }
}

export const operationalAnalyticsService = new OperationalAnalyticsService();