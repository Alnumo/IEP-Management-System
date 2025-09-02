import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  EmergencyAccessService,
  EmergencyAccessRequest,
  EmergencyAccessSession,
  EmergencyContact,
  EmergencyNotification
} from '../services/emergency-access-service'
import { useAuth } from '../components/auth/AuthGuard'
import { useLanguage } from '../contexts/LanguageContext'
import { toast } from 'sonner'

export interface UseEmergencyAccessOptions {
  enabled?: boolean
  autoRefresh?: boolean
  monitorSessions?: boolean
}

export const useEmergencyAccess = (options: UseEmergencyAccessOptions = {}) => {
  const { enabled = true, autoRefresh = false, monitorSessions = true } = options
  const { user } = useAuth()
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  // Local state for UI management
  const [selectedRequest, setSelectedRequest] = useState<EmergencyAccessRequest | null>(null)
  const [currentSession, setCurrentSession] = useState<EmergencyAccessSession | null>(null)

  // Query: Get emergency requests
  const {
    data: emergencyRequests,
    isLoading: isRequestsLoading,
    error: requestsError,
    refetch: refetchRequests
  } = useQuery({
    queryKey: ['emergency-requests'],
    queryFn: () => EmergencyAccessService.getEmergencyRequests(undefined, 50),
    enabled: enabled && !!user,
    staleTime: autoRefresh ? 30 * 1000 : 2 * 60 * 1000, // 30 seconds or 2 minutes
    refetchInterval: autoRefresh ? 60 * 1000 : false, // 1 minute if auto refresh
  })

  // Query: Get user's own requests
  const {
    data: myRequests,
    isLoading: isMyRequestsLoading
  } = useQuery({
    queryKey: ['my-emergency-requests', user?.id],
    queryFn: () => EmergencyAccessService.getEmergencyRequests({ requester_id: user?.id }, 20),
    enabled: enabled && !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  })

  // Query: Get active emergency sessions
  const {
    data: activeSessions,
    isLoading: isSessionsLoading,
    refetch: refetchSessions
  } = useQuery({
    queryKey: ['active-emergency-sessions'],
    queryFn: () => EmergencyAccessService.getActiveSessions(),
    enabled: enabled && monitorSessions && !!user,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: autoRefresh ? 30 * 1000 : false, // 30 seconds if auto refresh
  })

  // Query: Get emergency statistics
  const {
    data: emergencyStats,
    isLoading: isStatsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['emergency-statistics'],
    queryFn: EmergencyAccessService.getEmergencyStatistics,
    enabled: enabled && !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  // Mutation: Create emergency request
  const createRequestMutation = useMutation({
    mutationFn: (request: Parameters<typeof EmergencyAccessService.createEmergencyRequest>[0]) =>
      EmergencyAccessService.createEmergencyRequest(request),
    onSuccess: (newRequest) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-requests'] })
      queryClient.invalidateQueries({ queryKey: ['my-emergency-requests'] })
      queryClient.invalidateQueries({ queryKey: ['emergency-statistics'] })
      
      toast.success(
        t('emergency.request.created', 'Emergency access request submitted successfully')
      )
      
      return newRequest
    },
    onError: (error: any) => {
      console.error('Error creating emergency request:', error)
      toast.error(
        error.message || t('emergency.request.create.error', 'Failed to create emergency request')
      )
    }
  })

  // Mutation: Approve emergency request
  const approveRequestMutation = useMutation({
    mutationFn: ({ 
      requestId, 
      approverId, 
      conditions 
    }: { 
      requestId: string, 
      approverId: string, 
      conditions?: Parameters<typeof EmergencyAccessService.approveEmergencyRequest>[2] 
    }) => EmergencyAccessService.approveEmergencyRequest(requestId, approverId, conditions),
    onSuccess: (approvedRequest) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-requests'] })
      queryClient.invalidateQueries({ queryKey: ['emergency-statistics'] })
      
      toast.success(
        t('emergency.request.approved', 'Emergency access request approved')
      )
      
      return approvedRequest
    },
    onError: (error: any) => {
      console.error('Error approving emergency request:', error)
      toast.error(
        error.message || t('emergency.request.approve.error', 'Failed to approve emergency request')
      )
    }
  })

  // Mutation: Deny emergency request
  const denyRequestMutation = useMutation({
    mutationFn: ({ requestId, deniedBy, reason }: { requestId: string, deniedBy: string, reason: string }) =>
      EmergencyAccessService.denyEmergencyRequest(requestId, deniedBy, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-requests'] })
      queryClient.invalidateQueries({ queryKey: ['emergency-statistics'] })
      
      toast.success(
        t('emergency.request.denied', 'Emergency access request denied')
      )
    },
    onError: (error: any) => {
      console.error('Error denying emergency request:', error)
      toast.error(
        error.message || t('emergency.request.deny.error', 'Failed to deny emergency request')
      )
    }
  })

  // Mutation: Start emergency session
  const startSessionMutation = useMutation({
    mutationFn: (requestId: string) => EmergencyAccessService.startEmergencySession(requestId),
    onSuccess: (session) => {
      setCurrentSession(session)
      queryClient.invalidateQueries({ queryKey: ['active-emergency-sessions'] })
      queryClient.invalidateQueries({ queryKey: ['emergency-requests'] })
      
      toast.success(
        t('emergency.session.started', 'Emergency access session started')
      )
      
      return session
    },
    onError: (error: any) => {
      console.error('Error starting emergency session:', error)
      toast.error(
        error.message || t('emergency.session.start.error', 'Failed to start emergency session')
      )
    }
  })

  // Mutation: Terminate emergency session
  const terminateSessionMutation = useMutation({
    mutationFn: ({ sessionId, reason, notes }: { sessionId: string, reason?: string, notes?: string }) =>
      EmergencyAccessService.terminateSession(sessionId, reason, notes),
    onSuccess: () => {
      setCurrentSession(null)
      queryClient.invalidateQueries({ queryKey: ['active-emergency-sessions'] })
      
      toast.success(
        t('emergency.session.terminated', 'Emergency session terminated')
      )
    },
    onError: (error: any) => {
      console.error('Error terminating emergency session:', error)
      toast.error(
        error.message || t('emergency.session.terminate.error', 'Failed to terminate emergency session')
      )
    }
  })

  // Helper function to check eligibility
  const checkEligibility = async (patientId: string) => {
    if (!user?.id) return { can_request: false, reason: 'User not authenticated' }
    
    try {
      return await EmergencyAccessService.canRequestEmergencyAccess(user.id, patientId)
    } catch (error) {
      console.error('Error checking eligibility:', error)
      return { can_request: false, reason: 'System error' }
    }
  }

  // Helper function to get emergency contacts
  const getEmergencyContacts = async (patientId: string): Promise<EmergencyContact[]> => {
    try {
      return await EmergencyAccessService.getEmergencyContacts(patientId)
    } catch (error) {
      console.error('Error fetching emergency contacts:', error)
      return []
    }
  }

  // Helper function to verify emergency contact
  const verifyContact = async (contactId: string, verificationCode: string): Promise<boolean> => {
    try {
      const verified = await EmergencyAccessService.verifyEmergencyContact(contactId, verificationCode)
      if (verified) {
        toast.success(t('emergency.contact.verified', 'Emergency contact verified successfully'))
      } else {
        toast.error(t('emergency.contact.verify.failed', 'Invalid verification code'))
      }
      return verified
    } catch (error) {
      console.error('Error verifying contact:', error)
      toast.error(t('emergency.contact.verify.error', 'Failed to verify contact'))
      return false
    }
  }

  // Helper function to get audit trail
  const getAuditTrail = async (patientId?: string, userId?: string) => {
    try {
      return await EmergencyAccessService.getEmergencyAuditTrail(patientId, userId)
    } catch (error) {
      console.error('Error fetching audit trail:', error)
      return []
    }
  }

  // Format emergency type for display
  const formatEmergencyType = (type: EmergencyAccessRequest['emergency_type']) => {
    const typeNames = {
      'LIFE_THREATENING': t('emergency.types.life_threatening', 'Life Threatening'),
      'URGENT_CARE': t('emergency.types.urgent_care', 'Urgent Care'),
      'MEDICATION_CRITICAL': t('emergency.types.medication_critical', 'Medication Critical'),
      'BEHAVIORAL_CRISIS': t('emergency.types.behavioral_crisis', 'Behavioral Crisis'),
      'OTHER': t('emergency.types.other', 'Other')
    }
    return typeNames[type] || type
  }

  // Format access level for display
  const formatAccessLevel = (level: EmergencyAccessRequest['access_level']) => {
    const levelNames = {
      'READ_ONLY': t('emergency.access.read_only', 'Read Only'),
      'LIMITED_EDIT': t('emergency.access.limited_edit', 'Limited Edit'),
      'FULL_ACCESS': t('emergency.access.full_access', 'Full Access')
    }
    return levelNames[level] || level
  }

  // Get status color for UI
  const getStatusColor = (status: EmergencyAccessRequest['status']) => {
    switch (status) {
      case 'PENDING': return 'yellow'
      case 'APPROVED': return 'green'
      case 'DENIED': return 'red'
      case 'EXPIRED': return 'gray'
      case 'USED': return 'blue'
      default: return 'gray'
    }
  }

  // Get priority level based on emergency type
  const getPriorityLevel = (type: EmergencyAccessRequest['emergency_type']) => {
    const priorities = {
      'LIFE_THREATENING': 'CRITICAL',
      'BEHAVIORAL_CRISIS': 'HIGH',
      'MEDICATION_CRITICAL': 'HIGH',
      'URGENT_CARE': 'MEDIUM',
      'OTHER': 'LOW'
    }
    return priorities[type] || 'LOW'
  }

  // Check if request needs immediate attention
  const needsImmediateAttention = (request: EmergencyAccessRequest) => {
    if (request.status !== 'PENDING') return false
    
    const hoursSinceCreated = (new Date().getTime() - new Date(request.created_at).getTime()) / (1000 * 60 * 60)
    const priorityLevel = getPriorityLevel(request.emergency_type)
    
    if (priorityLevel === 'CRITICAL') return hoursSinceCreated > 0.5 // 30 minutes
    if (priorityLevel === 'HIGH') return hoursSinceCreated > 1 // 1 hour
    if (priorityLevel === 'MEDIUM') return hoursSinceCreated > 2 // 2 hours
    
    return hoursSinceCreated > 4 // 4 hours for LOW priority
  }

  // Get time remaining for request/session
  const getTimeRemaining = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - new Date().getTime()
    
    if (remaining <= 0) return { expired: true, text: t('emergency.expired', 'Expired') }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return { expired: false, text: t('emergency.hours_minutes', `${hours}h ${minutes}m`) }
    } else {
      return { expired: false, text: t('emergency.minutes', `${minutes}m`) }
    }
  }

  return {
    // Data
    emergencyRequests: emergencyRequests || [],
    myRequests: myRequests || [],
    activeSessions: activeSessions || [],
    emergencyStats,
    selectedRequest,
    currentSession,

    // Loading states
    isLoading: isRequestsLoading || isSessionsLoading,
    isRequestsLoading,
    isMyRequestsLoading,
    isSessionsLoading,
    isStatsLoading,
    isCreatingRequest: createRequestMutation.isPending,
    isApprovingRequest: approveRequestMutation.isPending,
    isDenyingRequest: denyRequestMutation.isPending,
    isStartingSession: startSessionMutation.isPending,
    isTerminatingSession: terminateSessionMutation.isPending,

    // Actions
    createRequest: createRequestMutation.mutateAsync,
    approveRequest: approveRequestMutation.mutateAsync,
    denyRequest: denyRequestMutation.mutateAsync,
    startSession: startSessionMutation.mutateAsync,
    terminateSession: terminateSessionMutation.mutateAsync,
    setSelectedRequest,
    setCurrentSession,
    refetchRequests,
    refetchSessions,
    refetchStats,

    // Helper functions
    checkEligibility,
    getEmergencyContacts,
    verifyContact,
    getAuditTrail,
    formatEmergencyType,
    formatAccessLevel,
    getStatusColor,
    getPriorityLevel,
    needsImmediateAttention,
    getTimeRemaining,

    // Errors
    error: requestsError,
    requestsError,
    createError: createRequestMutation.error,
    approveError: approveRequestMutation.error,
    denyError: denyRequestMutation.error,
    sessionError: startSessionMutation.error,
    terminateError: terminateSessionMutation.error,
  }
}

export default useEmergencyAccess