import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase first
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }))
    }
  }
  
  return { supabase: mockSupabase }
})

import { EmergencyAccessService, EmergencyAccessRequest } from '../../services/emergency-access-service'

describe('EmergencyAccessService', () => {
  let mockSupabase: any

  beforeEach(async () => {
    vi.clearAllMocks()
    // Get the mocked supabase instance
    const supabaseModule = await import('../../lib/supabase')
    mockSupabase = supabaseModule.supabase
  })

  describe('Validation', () => {
    it('should validate emergency request correctly - valid request', () => {
      const validRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient experiencing severe allergic reaction',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'Need immediate access to medical history and medication records to treat anaphylaxis',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        emergency_contact_verified: true,
        supervisor_notified: true
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(validRequest)
      expect(errors).toEqual([])
    })

    it('should validate emergency request - missing requester', () => {
      const invalidRequest = {
        patient_id: 'patient-456',
        reason: 'Emergency access needed',
        emergency_type: 'URGENT_CARE' as const,
        access_level: 'READ_ONLY' as const,
        justification: 'Need to check patient records for emergency treatment'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(invalidRequest)
      expect(errors).toContain('Requester ID is required')
    })

    it('should validate emergency request - short reason', () => {
      const invalidRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Emergency', // Too short
        emergency_type: 'URGENT_CARE' as const,
        access_level: 'READ_ONLY' as const,
        justification: 'Need to check patient records for emergency treatment'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(invalidRequest)
      expect(errors).toContain('Emergency reason must be at least 10 characters')
    })

    it('should validate emergency request - short justification', () => {
      const invalidRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient needs emergency care',
        emergency_type: 'URGENT_CARE' as const,
        access_level: 'READ_ONLY' as const,
        justification: 'Need access' // Too short
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(invalidRequest)
      expect(errors).toContain('Justification must be at least 20 characters')
    })

    it('should validate emergency request - invalid emergency type', () => {
      const invalidRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient needs emergency care',
        emergency_type: 'INVALID_TYPE' as any,
        access_level: 'READ_ONLY' as const,
        justification: 'Need to access patient records for proper treatment'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(invalidRequest)
      expect(errors).toContain('Invalid emergency type')
    })

    it('should validate emergency request - invalid access level', () => {
      const invalidRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient needs emergency care',
        emergency_type: 'URGENT_CARE' as const,
        access_level: 'INVALID_ACCESS' as any,
        justification: 'Need to access patient records for proper treatment'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(invalidRequest)
      expect(errors).toContain('Invalid access level')
    })

    it('should validate all emergency types', () => {
      const validTypes = ['LIFE_THREATENING', 'URGENT_CARE', 'MEDICATION_CRITICAL', 'BEHAVIORAL_CRISIS', 'OTHER']
      
      for (const type of validTypes) {
        const request = {
          requester_id: 'user-123',
          patient_id: 'patient-456',
          reason: 'Patient needs emergency care',
          emergency_type: type as EmergencyAccessRequest['emergency_type'],
          access_level: 'READ_ONLY' as const,
          justification: 'Need to access patient records for proper treatment'
        }
        
        const errors = EmergencyAccessService.validateEmergencyRequest(request)
        expect(errors).not.toContain('Invalid emergency type')
      }
    })

    it('should validate all access levels', () => {
      const validLevels = ['READ_ONLY', 'LIMITED_EDIT', 'FULL_ACCESS']
      
      for (const level of validLevels) {
        const request = {
          requester_id: 'user-123',
          patient_id: 'patient-456',
          reason: 'Patient needs emergency care',
          emergency_type: 'URGENT_CARE' as const,
          access_level: level as EmergencyAccessRequest['access_level'],
          justification: 'Need to access patient records for proper treatment'
        }
        
        const errors = EmergencyAccessService.validateEmergencyRequest(request)
        expect(errors).not.toContain('Invalid access level')
      }
    })
  })

  describe('Database Operations', () => {
    it('should get emergency requests successfully', async () => {
      const mockRequests = [
        {
          id: 'req-1',
          requester_id: 'user-123',
          patient_id: 'patient-456',
          reason: 'Emergency medical access needed',
          emergency_type: 'LIFE_THREATENING',
          access_level: 'FULL_ACCESS',
          status: 'PENDING',
          created_at: '2025-09-01T10:00:00Z'
        }
      ]

      const mockQuery = mockSupabase.from('emergency_access_requests')
      mockQuery.single.mockResolvedValueOnce({ data: mockRequests, error: null })

      const result = await EmergencyAccessService.getEmergencyRequests()

      expect(mockSupabase.from).toHaveBeenCalledWith('emergency_access_requests')
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQuery.limit).toHaveBeenCalledWith(50)
      expect(result).toEqual(mockRequests)
    })

    it('should handle errors when fetching requests', async () => {
      const mockQuery = mockSupabase.from('emergency_access_requests')
      mockQuery.single.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })

      await expect(EmergencyAccessService.getEmergencyRequests()).rejects.toThrow('Failed to fetch emergency access requests')
    })

    it('should get emergency requests with filters', async () => {
      const filters = {
        status: 'PENDING' as const,
        emergency_type: 'LIFE_THREATENING' as const,
        requester_id: 'user-123'
      }

      const mockQuery = mockSupabase.from('emergency_access_requests')
      mockQuery.single.mockResolvedValueOnce({ data: [], error: null })

      await EmergencyAccessService.getEmergencyRequests(filters, 25)

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'PENDING')
      expect(mockQuery.eq).toHaveBeenCalledWith('emergency_type', 'LIFE_THREATENING')
      expect(mockQuery.eq).toHaveBeenCalledWith('requester_id', 'user-123')
      expect(mockQuery.limit).toHaveBeenCalledWith(25)
    })

    it('should get active sessions successfully', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          request_id: 'req-1',
          user_id: 'user-123',
          patient_id: 'patient-456',
          is_active: true,
          created_at: '2025-09-01T10:00:00Z'
        }
      ]

      const mockQuery = mockSupabase.from('emergency_access_sessions')
      mockQuery.single.mockResolvedValueOnce({ data: mockSessions, error: null })

      const result = await EmergencyAccessService.getActiveSessions()

      expect(mockSupabase.from).toHaveBeenCalledWith('emergency_access_sessions')
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockSessions)
    })

    it('should get active sessions for specific user', async () => {
      const mockQuery = mockSupabase.from('emergency_access_sessions')
      mockQuery.single.mockResolvedValueOnce({ data: [], error: null })

      await EmergencyAccessService.getActiveSessions('user-123')

      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123')
    })

    it('should get emergency contacts successfully', async () => {
      const mockContacts = [
        {
          id: 'contact-1',
          patient_id: 'patient-456',
          name: 'Emergency Contact',
          phone: '+1234567890',
          is_primary: true
        }
      ]

      const mockQuery = mockSupabase.from('emergency_contacts')
      mockQuery.single.mockResolvedValueOnce({ data: mockContacts, error: null })

      const result = await EmergencyAccessService.getEmergencyContacts('patient-456')

      expect(mockSupabase.from).toHaveBeenCalledWith('emergency_contacts')
      expect(mockQuery.eq).toHaveBeenCalledWith('patient_id', 'patient-456')
      expect(mockQuery.order).toHaveBeenCalledWith('is_primary', { ascending: false })
      expect(result).toEqual(mockContacts)
    })

    it('should get emergency statistics successfully', async () => {
      const mockStats = {
        total_requests_24h: 15,
        approved_requests_24h: 12,
        active_sessions: 3,
        average_response_time_minutes: 45,
        requests_by_type: {
          LIFE_THREATENING: 2,
          URGENT_CARE: 8,
          MEDICATION_CRITICAL: 3
        }
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockStats, error: null })

      const result = await EmergencyAccessService.getEmergencyStatistics()

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_emergency_access_stats')
      expect(result).toEqual(mockStats)
    })
  })

  describe('Emergency Access Functions', () => {
    it('should create emergency request with RPC', async () => {
      const newRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient experiencing severe allergic reaction',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'Need immediate access to medical history and medication records to treat anaphylaxis',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        emergency_contact_verified: true,
        supervisor_notified: true
      }

      const mockCreatedRequest = { ...newRequest, id: 'req-new', status: 'PENDING', created_at: '2025-09-01T10:00:00Z' }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockCreatedRequest, error: null })

      const result = await EmergencyAccessService.createEmergencyRequest(newRequest)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_emergency_access_request', {
        requester_user_id: 'user-123',
        patient_user_id: 'patient-456',
        emergency_reason: 'Patient experiencing severe allergic reaction',
        emergency_type: 'LIFE_THREATENING',
        requested_access_level: 'FULL_ACCESS',
        justification_text: 'Need immediate access to medical history and medication records to treat anaphylaxis',
        expires_in_hours: 24
      })
      expect(result).toEqual(mockCreatedRequest)
    })

    it('should approve emergency request with RPC', async () => {
      const mockApprovedRequest = { 
        id: 'req-1', 
        status: 'APPROVED', 
        approved_by: 'supervisor-123',
        approved_at: '2025-09-01T10:30:00Z'
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockApprovedRequest, error: null })

      const result = await EmergencyAccessService.approveEmergencyRequest(
        'req-1', 
        'supervisor-123',
        {
          access_level: 'READ_ONLY',
          expires_in_hours: 12,
          additional_notes: 'Limited access only for this emergency'
        }
      )

      expect(mockSupabase.rpc).toHaveBeenCalledWith('approve_emergency_access', {
        request_id: 'req-1',
        approver_id: 'supervisor-123',
        override_access_level: 'READ_ONLY',
        override_expiry_hours: 12,
        approval_notes: 'Limited access only for this emergency'
      })
      expect(result).toEqual(mockApprovedRequest)
    })

    it('should start emergency session with RPC', async () => {
      const mockSession = {
        id: 'session-1',
        request_id: 'req-1',
        user_id: 'user-123',
        session_token: 'secure-token-123',
        is_active: true
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockSession, error: null })

      const result = await EmergencyAccessService.startEmergencySession('req-1')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('start_emergency_session', {
        request_id: 'req-1'
      })
      expect(result).toEqual(mockSession)
    })

    it('should terminate session with RPC', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: null })

      await EmergencyAccessService.terminateSession('session-1', 'EMERGENCY_RESOLVED', 'Patient recovered')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('terminate_emergency_session', {
        session_id: 'session-1',
        termination_reason: 'EMERGENCY_RESOLVED',
        session_notes: 'Patient recovered'
      })
    })

    it('should verify emergency contact', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await EmergencyAccessService.verifyEmergencyContact('contact-1', '123456')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('verify_emergency_contact', {
        contact_id: 'contact-1',
        verification_code: '123456'
      })
      expect(result).toBe(true)
    })

    it('should check emergency access eligibility', async () => {
      const mockEligibility = {
        can_request: true,
        user_role: 'therapist'
      }

      mockSupabase.rpc.mockResolvedValueOnce({ data: mockEligibility, error: null })

      const result = await EmergencyAccessService.canRequestEmergencyAccess('user-123', 'patient-456')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('check_emergency_access_eligibility', {
        user_id: 'user-123',
        patient_id: 'patient-456'
      })
      expect(result).toEqual(mockEligibility)
    })

    it('should handle eligibility check errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } })

      const result = await EmergencyAccessService.canRequestEmergencyAccess('user-123', 'patient-456')

      expect(result).toEqual({ can_request: false, reason: 'System error' })
    })
  })

  describe('Arabic Language Support', () => {
    it('should handle Arabic text in emergency requests', () => {
      const arabicRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'المريض يعاني من حالة طوارئ طبية خطيرة',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'نحتاج إلى الوصول الفوري للملف الطبي والأدوية لعلاج الحالة الطارئة'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(arabicRequest)
      expect(errors).toEqual([])
    })

    it('should handle Arabic text in validation errors', () => {
      const shortArabicRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'طوارئ', // Too short
        emergency_type: 'URGENT_CARE' as const,
        access_level: 'READ_ONLY' as const,
        justification: 'وصول' // Too short
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(shortArabicRequest)
      expect(errors).toContain('Emergency reason must be at least 10 characters')
      expect(errors).toContain('Justification must be at least 20 characters')
    })
  })

  describe('English Language Support', () => {
    it('should handle English text in emergency requests', () => {
      const englishRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient has fallen and may have sustained serious injury requiring immediate medical attention',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'Emergency medical team needs access to patient medical history, allergies, and current medications to provide appropriate treatment'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(englishRequest)
      expect(errors).toEqual([])
    })

    it('should handle complex English medical terminology', () => {
      const medicalRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Patient experiencing anaphylactic shock following medication administration',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'Critical need for immediate access to complete allergy profile, medication history, and previous adverse reaction records to administer life-saving treatment'
      }

      const errors = EmergencyAccessService.validateEmergencyRequest(medicalRequest)
      expect(errors).toEqual([])
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network connection failed')
      })

      await expect(EmergencyAccessService.getEmergencyRequests()).rejects.toThrow('Failed to fetch emergency access requests')
    })

    it('should handle RPC errors in create request', async () => {
      const newRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Emergency medical access needed',
        emergency_type: 'URGENT_CARE' as const,
        access_level: 'READ_ONLY' as const,
        justification: 'Need access to patient records for emergency treatment',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        emergency_contact_verified: true,
        supervisor_notified: true
      }

      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'User not authorized' } 
      })

      await expect(EmergencyAccessService.createEmergencyRequest(newRequest)).rejects.toThrow('Failed to create emergency access request')
    })

    it('should handle invalid request data', async () => {
      const invalidRequest = {
        // Missing required fields
      } as any

      await expect(EmergencyAccessService.createEmergencyRequest(invalidRequest)).rejects.toThrow()
    })

    it('should handle expire old requests RPC errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Permission denied' } 
      })

      await expect(EmergencyAccessService.expireOldRequests()).rejects.toThrow('Failed to expire old requests')
    })
  })

  describe('Integration Readiness', () => {
    it('should be ready for database integration', () => {
      expect(typeof EmergencyAccessService.createEmergencyRequest).toBe('function')
      expect(typeof EmergencyAccessService.getEmergencyRequests).toBe('function')
      expect(typeof EmergencyAccessService.approveEmergencyRequest).toBe('function')
      expect(typeof EmergencyAccessService.denyEmergencyRequest).toBe('function')
      expect(typeof EmergencyAccessService.startEmergencySession).toBe('function')
      expect(typeof EmergencyAccessService.getActiveSessions).toBe('function')
      expect(typeof EmergencyAccessService.terminateSession).toBe('function')
      expect(typeof EmergencyAccessService.getEmergencyContacts).toBe('function')
      expect(typeof EmergencyAccessService.verifyEmergencyContact).toBe('function')
      expect(typeof EmergencyAccessService.getEmergencyStatistics).toBe('function')
      expect(typeof EmergencyAccessService.canRequestEmergencyAccess).toBe('function')
      expect(typeof EmergencyAccessService.validateEmergencyRequest).toBe('function')
      expect(typeof EmergencyAccessService.expireOldRequests).toBe('function')
      expect(typeof EmergencyAccessService.getEmergencyAuditTrail).toBe('function')
    })

    it('should have all required exports', () => {
      const { 
        EmergencyAccessService,
        createEmergencyRequest,
        getEmergencyRequests,
        approveEmergencyRequest,
        validateEmergencyRequest
      } = require('../../services/emergency-access-service')
      
      expect(EmergencyAccessService).toBeDefined()
      expect(createEmergencyRequest).toBeDefined()
      expect(getEmergencyRequests).toBeDefined()
      expect(approveEmergencyRequest).toBeDefined()
      expect(validateEmergencyRequest).toBeDefined()
    })

    it('should handle bilingual functionality', () => {
      // Test that the service can handle both Arabic and English content
      const arabicRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'حالة طوارئ طبية تتطلب تدخل فوري',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'نحتاج للوصول الفوري للملف الطبي لعلاج المريض'
      }

      const englishRequest = {
        requester_id: 'user-123',
        patient_id: 'patient-456',
        reason: 'Medical emergency requiring immediate intervention',
        emergency_type: 'LIFE_THREATENING' as const,
        access_level: 'FULL_ACCESS' as const,
        justification: 'Need immediate access to medical records for patient treatment'
      }

      const arabicErrors = EmergencyAccessService.validateEmergencyRequest(arabicRequest)
      const englishErrors = EmergencyAccessService.validateEmergencyRequest(englishRequest)

      expect(arabicErrors).toEqual([])
      expect(englishErrors).toEqual([])
    })
  })
})