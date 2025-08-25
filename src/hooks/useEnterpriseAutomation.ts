// Enterprise Automation Hooks - Phase 7 Implementation
// React hooks for automation workflows, RPM, and digital therapeutics

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { enterpriseAutomationService } from '@/services/enterprise-automation'
import type {
  PatientDigitalTherapy,
  VirtualRoom,
  TelemedicineSession,
  HybridCarePlan,
  EnterpriseAutomationFilters,
  RPMFilters,
  DigitalTherapyFilters
} from '@/types/enterprise-automation'

// =============================================
// AUTOMATION WORKFLOW HOOKS
// =============================================

export const useAutomationWorkflows = (filters?: EnterpriseAutomationFilters) => {
  return useQuery({
    queryKey: ['automation-workflows', filters],
    queryFn: () => enterpriseAutomationService.getAutomationWorkflows(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

export const useExecuteWorkflow = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ workflowId, triggerData, triggeredBy }: { 
      workflowId: string
      triggerData: any
      triggeredBy: string 
    }) => {
      return await enterpriseAutomationService.executeWorkflow(workflowId, triggerData, triggeredBy)
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] })
      queryClient.invalidateQueries({ queryKey: ['automation-dashboard'] })
    }
  })
}

export const useAutomationDashboard = () => {
  return useQuery({
    queryKey: ['automation-dashboard'],
    queryFn: () => enterpriseAutomationService.getAutomationDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    refetchOnWindowFocus: true
  })
}

// =============================================
// REMOTE PATIENT MONITORING HOOKS
// =============================================

export const useConnectedDevices = () => {
  return useQuery({
    queryKey: ['connected-devices'],
    queryFn: () => enterpriseAutomationService.getConnectedDevices(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  })
}

export const useRemoteMonitoringData = (
  studentId: string, 
  dateRange?: { start: string; end: string },
  filters?: RPMFilters
) => {
  return useQuery({
    queryKey: ['remote-monitoring-data', studentId, dateRange, filters],
    queryFn: () => enterpriseAutomationService.getRemoteMonitoringData(studentId, dateRange),
    enabled: !!studentId,
    staleTime: 1 * 60 * 1000, // 1 minute - real-time data
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: true
  })
}

export const useRPMAlerts = (patientId?: string) => {
  return useQuery({
    queryKey: ['rpm-alerts', patientId],
    queryFn: () => enterpriseAutomationService.generateRPMAlerts(patientId),
    staleTime: 30 * 1000, // 30 seconds - alerts are time-sensitive
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    refetchOnWindowFocus: true
  })
}

export const useAcknowledgeRPMAlert = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ alertId, userId, notes }: { 
      alertId: string
      userId: string
      notes?: string 
    }) => {
      // Mock acknowledgment - in real implementation, this would call API
      console.log(`RPM Alert ${alertId} acknowledged by ${userId}`)
      return { 
        success: true, 
        alertId, 
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: userId,
        notes 
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpm-alerts'] })
      queryClient.invalidateQueries({ queryKey: ['rpm-dashboard'] })
    }
  })
}

export const useRPMDashboard = () => {
  return useQuery({
    queryKey: ['rpm-dashboard'],
    queryFn: () => enterpriseAutomationService.getRPMDashboard(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Auto-refresh every 3 minutes
    refetchOnWindowFocus: true
  })
}

// =============================================
// DIGITAL THERAPEUTICS HOOKS
// =============================================

export const useDigitalTherapeutics = (filters?: DigitalTherapyFilters) => {
  return useQuery({
    queryKey: ['digital-therapeutics', filters],
    queryFn: () => enterpriseAutomationService.getDigitalTherapeutics(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false
  })
}

export const usePrescribeDigitalTherapy = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ studentId, therapyId, prescribedBy }: {
      studentId: string
      therapyId: string
      prescribedBy: string
    }) => {
      return await enterpriseAutomationService.prescribeDigitalTherapy(studentId, therapyId, prescribedBy)
    },
    onSuccess: (_data, variables) => {
      // Update relevant queries
      queryClient.setQueryData(['patient-digital-therapy', variables.studentId], _data)
      queryClient.invalidateQueries({ queryKey: ['digital-therapy-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['student-therapies', variables.studentId] })
    }
  })
}

export const useDigitalTherapyDashboard = () => {
  return useQuery({
    queryKey: ['digital-therapy-dashboard'],
    queryFn: () => enterpriseAutomationService.getDigitalTherapyDashboard(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    refetchOnWindowFocus: true
  })
}

export const usePatientDigitalTherapy = (studentId: string) => {
  return useQuery({
    queryKey: ['patient-digital-therapy', studentId],
    queryFn: async () => {
      // Mock patient's active digital therapy programs
      const mockTherapies: PatientDigitalTherapy[] = [
        {
          id: `pdt_${studentId}_001`,
          studentId,
          digitalTherapyId: 'dt_social_skills_001',
          prescribedBy: 'therapist_001',
          prescriptionDate: '2025-01-15T10:00:00Z',
          startDate: '2025-01-16T09:00:00Z',
          endDate: '2025-04-16T09:00:00Z',
          currentModule: 3,
          currentDifficultyLevel: 2,
          personalizationSettings: {
            learningStyle: 'visual_kinesthetic',
            preferredRewards: 'animated_stickers',
            sessionDuration: 20,
            parentInvolvement: 'moderate'
          },
          progressTracking: {
            modulesCompleted: 2,
            totalModules: 12,
            overallProgress: 0.25,
            skillsImproved: ['emotion_recognition', 'eye_contact']
          },
          performanceMetrics: {
            averageAccuracy: 0.84,
            averageEngagement: 0.91,
            improvementRate: 0.18
          },
          parentInvolvementLevel: 'moderate',
          complianceRate: 0.87,
          engagementScore: 0.91,
          effectivenessRating: 0.82,
          status: 'active',
          lastSessionDate: '2025-01-22T15:30:00Z',
          nextSessionDue: '2025-01-24T15:30:00Z',
          totalMinutesPracticed: 780
        }
      ]
      
      return mockTherapies
    },
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })
}

// =============================================
// TELEMEDICINE & VIRTUAL CARE HOOKS
// =============================================

export const useCreateVirtualRoom = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (roomConfig: Partial<VirtualRoom>) => {
      return await enterpriseAutomationService.createVirtualRoom(roomConfig)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual-rooms'] })
    }
  })
}

export const useScheduleTelemedicineSession = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (sessionData: Partial<TelemedicineSession>) => {
      return await enterpriseAutomationService.scheduleTelemedicineSession(sessionData)
    },
    onSuccess: (_data, variables) => {
      // Update sessions and calendar queries
      queryClient.invalidateQueries({ queryKey: ['telemedicine-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['sessions', variables.studentId] })
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
    }
  })
}

export const useVirtualRooms = () => {
  return useQuery({
    queryKey: ['virtual-rooms'],
    queryFn: async () => {
      // Mock virtual rooms data
      const rooms: VirtualRoom[] = [
        {
          id: 'vroom_001',
          roomName: 'Individual Therapy Room 1',
          roomType: 'individual_therapy',
          maxParticipants: 3,
          featuresEnabled: {
            screenShare: true,
            recording: false,
            arTools: true,
            interactiveWhiteboard: true
          },
          securityLevel: 'medical_grade',
          encryptionMethod: 'AES-256-GCM',
          recordingCapability: false,
          arVrEnabled: true,
          isActive: true,
          createdAt: '2025-01-10T08:00:00Z'
        },
        {
          id: 'vroom_002',
          roomName: 'Group Therapy Space',
          roomType: 'group_therapy',
          maxParticipants: 8,
          featuresEnabled: {
            breakoutRooms: true,
            collaborativeTools: true,
            games: true
          },
          securityLevel: 'medical_grade',
          encryptionMethod: 'AES-256-GCM',
          recordingCapability: false,
          arVrEnabled: false,
          isActive: true,
          createdAt: '2025-01-12T10:00:00Z'
        }
      ]
      
      return rooms
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false
  })
}

export const useTelemedicineSessions = (studentId?: string, dateRange?: { start: string; end: string }) => {
  return useQuery({
    queryKey: ['telemedicine-sessions', studentId, dateRange],
    queryFn: async () => {
      // Mock telemedicine sessions
      const sessions: TelemedicineSession[] = [
        {
          id: 'tele_001',
          sessionType: 'therapy',
          virtualRoomId: 'vroom_001',
          primaryTherapistId: 'therapist_001',
          studentId: studentId || 'student_001',
          scheduledStart: '2025-01-24T14:00:00Z',
          scheduledEnd: '2025-01-24T15:00:00Z',
          patientEngagementLevel: 'high',
          recordingEnabled: false,
          billingStatus: 'pending',
          followUpRequired: false,
          complianceChecklist: {
            parentConsent: true,
            privacyNotice: true,
            emergencyProtocol: true
          },
          createdAt: '2025-01-23T10:00:00Z'
        }
      ]
      
      // Filter by student if provided
      return studentId ? sessions.filter(s => s.studentId === studentId) : sessions
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true
  })
}

// =============================================
// HYBRID CARE PLANS HOOKS
// =============================================

export const useHybridCarePlans = (studentId?: string) => {
  return useQuery({
    queryKey: ['hybrid-care-plans', studentId],
    queryFn: async () => {
      // Mock hybrid care plans
      const plans: HybridCarePlan[] = [
        {
          id: 'hcp_001',
          studentId: studentId || 'student_001',
          planNameAr: 'خطة الرعاية المدمجة - المهارات الاجتماعية',
          planNameEn: 'Hybrid Care Plan - Social Skills',
          careModel: 'hybrid_balanced',
          inPersonPercentage: 60,
          virtualPercentage: 40,
          planRationale: 'Optimal mix of hands-on therapy and remote monitoring for social skills development',
          approvalStatus: 'approved',
          startDate: '2025-01-15T00:00:00Z',
          endDate: '2025-04-15T00:00:00Z',
          planDurationWeeks: 12,
          patientSatisfaction: 4.6,
          familySatisfaction: 4.8,
          createdAt: '2025-01-10T10:00:00Z',
          updatedAt: '2025-01-20T14:00:00Z'
        }
      ]
      
      return studentId ? plans.filter(p => p.studentId === studentId) : plans
    },
    enabled: !!studentId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false
  })
}

export const useCreateHybridCarePlan = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (planData: Partial<HybridCarePlan>) => {
      // Mock creation - in real implementation, this would call API
      const newPlan: HybridCarePlan = {
        id: `hcp_${Date.now()}`,
        studentId: planData.studentId!,
        planNameAr: planData.planNameAr || 'خطة رعاية مدمجة جديدة',
        planNameEn: planData.planNameEn || 'New Hybrid Care Plan',
        careModel: planData.careModel || 'hybrid_balanced',
        inPersonPercentage: planData.inPersonPercentage || 50,
        virtualPercentage: planData.virtualPercentage || 50,
        approvalStatus: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...planData
      }
      
      console.log('Created hybrid care plan:', newPlan.id)
      return newPlan
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['hybrid-care-plans', variables.studentId] })
      queryClient.invalidateQueries({ queryKey: ['hybrid-care-plans'] })
    }
  })
}

// =============================================
// SYSTEM MONITORING HOOKS
// =============================================

export const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => enterpriseAutomationService.systemHealthCheck(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    refetchOnWindowFocus: true
  })
}

// =============================================
// COMPREHENSIVE ENTERPRISE DASHBOARD HOOK
// =============================================

export const useEnterpriseDashboard = () => {
  const automationQuery = useAutomationDashboard()
  const rpmQuery = useRPMDashboard()
  const digitalTherapyQuery = useDigitalTherapyDashboard()
  const systemHealthQuery = useSystemHealth()

  return {
    automation: automationQuery.data,
    rpm: rpmQuery.data,
    digitalTherapy: digitalTherapyQuery.data,
    systemHealth: systemHealthQuery.data,
    isLoading: automationQuery.isLoading || rpmQuery.isLoading || 
                digitalTherapyQuery.isLoading || systemHealthQuery.isLoading,
    error: automationQuery.error || rpmQuery.error || 
           digitalTherapyQuery.error || systemHealthQuery.error,
    refetch: () => {
      automationQuery.refetch()
      rpmQuery.refetch()
      digitalTherapyQuery.refetch()
      systemHealthQuery.refetch()
    }
  }
}

// =============================================
// REAL-TIME NOTIFICATIONS HOOK
// =============================================

export const useEnterpriseNotifications = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['enterprise-notifications'],
    queryFn: async () => {
      // Mock real-time notifications for enterprise features
      return {
        timestamp: new Date().toISOString(),
        notifications: [
          {
            id: 'notif_001',
            type: 'rpm_alert',
            severity: 'medium',
            title: 'Patient monitoring alert',
            message: 'Behavioral anomaly detected for patient Ahmed',
            actionRequired: true,
            category: 'clinical'
          },
          {
            id: 'notif_002',
            type: 'workflow_completion',
            severity: 'info',
            title: 'Workflow completed',
            message: 'Patient intake workflow completed successfully',
            actionRequired: false,
            category: 'administrative'
          },
          {
            id: 'notif_003',
            type: 'system_health',
            severity: 'warning',
            title: 'Integration performance',
            message: 'EMR integration response time increased',
            actionRequired: true,
            category: 'technical'
          }
        ],
        unreadCount: 3,
        criticalCount: 0,
        warningCount: 1
      }
    },
    enabled,
    refetchInterval: 30 * 1000, // 30 seconds for real-time feel
    staleTime: 0 // Always fresh for notifications
  })
}

// =============================================
// FILTERS MANAGEMENT HOOK
// =============================================

export const useEnterpriseFilters = () => {
  const queryClient = useQueryClient()

  const applyAutomationFilters = (_filters: EnterpriseAutomationFilters) => {
    queryClient.invalidateQueries({ queryKey: ['automation-workflows'] })
    queryClient.invalidateQueries({ queryKey: ['workflow-instances'] })
  }

  const applyRPMFilters = (_filters: RPMFilters) => {
    queryClient.invalidateQueries({ queryKey: ['remote-monitoring-data'] })
    queryClient.invalidateQueries({ queryKey: ['rpm-alerts'] })
  }

  const applyDigitalTherapyFilters = (_filters: DigitalTherapyFilters) => {
    queryClient.invalidateQueries({ queryKey: ['digital-therapeutics'] })
    queryClient.invalidateQueries({ queryKey: ['patient-digital-therapy'] })
  }

  const clearAllFilters = () => {
    queryClient.invalidateQueries({ queryKey: ['automation-workflows'] })
    queryClient.invalidateQueries({ queryKey: ['remote-monitoring-data'] })
    queryClient.invalidateQueries({ queryKey: ['digital-therapeutics'] })
    queryClient.invalidateQueries({ queryKey: ['rpm-alerts'] })
  }

  return {
    applyAutomationFilters,
    applyRPMFilters,
    applyDigitalTherapyFilters,
    clearAllFilters
  }
}

// =============================================
// BULK OPERATIONS HOOK
// =============================================

export const useBulkOperations = () => {
  const queryClient = useQueryClient()

  const bulkExecuteWorkflows = useMutation({
    mutationFn: async ({ workflowIds, triggerData }: {
      workflowIds: string[]
      triggerData: any
    }) => {
      // Mock bulk workflow execution
      const results = await Promise.allSettled(
        workflowIds.map(id => 
          enterpriseAutomationService.executeWorkflow(id, triggerData, 'bulk_operation')
        )
      )
      
      return {
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] })
    }
  })

  const bulkAcknowledgeAlerts = useMutation({
    mutationFn: async ({ alertIds, userId }: {
      alertIds: string[]
      userId: string
    }) => {
      // Mock bulk alert acknowledgment
      console.log(`Bulk acknowledging ${alertIds.length} alerts by ${userId}`)
      return {
        acknowledged: alertIds.length,
        timestamp: new Date().toISOString()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rpm-alerts'] })
    }
  })

  return {
    bulkExecuteWorkflows,
    bulkAcknowledgeAlerts
  }
}

// =============================================
// EXPORT HOOK UTILITIES
// =============================================

export const enterpriseAutomationHooks = {
  // Automation
  useAutomationWorkflows,
  useExecuteWorkflow,
  useAutomationDashboard,
  
  // Remote Monitoring
  useConnectedDevices,
  useRemoteMonitoringData,
  useRPMAlerts,
  useAcknowledgeRPMAlert,
  useRPMDashboard,
  
  // Digital Therapeutics
  useDigitalTherapeutics,
  usePrescribeDigitalTherapy,
  useDigitalTherapyDashboard,
  usePatientDigitalTherapy,
  
  // Telemedicine
  useCreateVirtualRoom,
  useScheduleTelemedicineSession,
  useVirtualRooms,
  useTelemedicineSessions,
  
  // Hybrid Care
  useHybridCarePlans,
  useCreateHybridCarePlan,
  
  // System
  useSystemHealth,
  useEnterpriseDashboard,
  useEnterpriseNotifications,
  useEnterpriseFilters,
  useBulkOperations
}