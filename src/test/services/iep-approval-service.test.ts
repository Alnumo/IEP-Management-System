/**
 * IEP Approval Service Tests
 * Story 1.3 Task 6 Validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { iepApprovalService, type CreateApprovalRequestData } from '@/services/iep-approval-service'

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { 
            id: 'test-id', 
            iep_id: 'iep-1',
            approval_type: 'goal_modification',
            title_ar: 'تعديل الأهداف',
            title_en: 'Goal Modification',
            request_status: 'pending_review'
          }, 
          error: null 
        }))
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}))

describe('IEPApprovalService - Story 1.3 Task 6 Validation', () => {
  describe('Create Approval Request', () => {
    it('should create approval request with correct data structure', async () => {
      const requestData: CreateApprovalRequestData = {
        iep_id: 'iep-123',
        approval_type: 'goal_modification',
        title_ar: 'تعديل أهداف التواصل',
        title_en: 'Communication Goals Modification',
        description_ar: 'تحديث الأهداف بناء على التقييم',
        description_en: 'Update goals based on assessment',
        priority: 'high',
        required_approvers: ['coordinator', 'parent_guardian'],
        optional_approvers: ['administrator'],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }

      const result = await iepApprovalService.createApprovalRequest(requestData, 'user-123')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('iep_approval_requests')
    })

    it('should handle errors gracefully', async () => {
      // Mock error response
      mockSupabase.from.mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error' }
            }))
          }))
        }))
      })

      const requestData: CreateApprovalRequestData = {
        iep_id: 'iep-123',
        approval_type: 'goal_modification', 
        title_ar: 'تعديل الأهداف',
        title_en: 'Goal Modification',
        priority: 'medium',
        required_approvers: ['coordinator']
      }

      const result = await iepApprovalService.createApprovalRequest(requestData, 'user-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Workflow Templates', () => {
    it('should return appropriate workflow template for goal modification', () => {
      const template = iepApprovalService.getWorkflowTemplate('goal_modification')

      expect(template).toHaveLength(2)
      expect(template[0]).toMatchObject({
        step_name_ar: 'مراجعة التعديل',
        step_name_en: 'Modification Review',
        required_roles: ['coordinator'],
        is_parallel: false,
        estimated_days: 1
      })
      expect(template[1]).toMatchObject({
        step_name_ar: 'موافقة متوازية',
        step_name_en: 'Parallel Approval',
        required_roles: ['parent_guardian', 'special_education_teacher'],
        is_parallel: true,
        estimated_days: 3
      })
    })

    it('should return comprehensive workflow for initial IEP', () => {
      const template = iepApprovalService.getWorkflowTemplate('initial_iep')

      expect(template).toHaveLength(3)
      expect(template[0].step_name_en).toBe('Coordinator Review')
      expect(template[1].step_name_en).toBe('Educational Team Approval')
      expect(template[2].step_name_en).toBe('Parent Approval')
    })

    it('should return thorough workflow for annual review', () => {
      const template = iepApprovalService.getWorkflowTemplate('annual_review')

      expect(template).toHaveLength(3)
      expect(template[0].step_name_en).toBe('Comprehensive Review')
      expect(template[1].step_name_en).toBe('Administrative Approval')
      expect(template[2].step_name_en).toBe('Final Signatures')
    })
  })

  describe('Digital Signature Generation', () => {
    it('should generate unique signature hash', async () => {
      const service = iepApprovalService as any // Access private methods for testing
      
      const hash1 = await service.generateSignatureHash('signature1', 'user1', '2024-01-01T10:00:00Z')
      const hash2 = await service.generateSignatureHash('signature2', 'user1', '2024-01-01T10:00:00Z')
      const hash3 = await service.generateSignatureHash('signature1', 'user1', '2024-01-01T10:00:00Z')

      expect(hash1).toBeDefined()
      expect(hash2).toBeDefined()
      expect(hash1).not.toBe(hash2) // Different signatures should produce different hashes
      expect(hash1).toBe(hash3) // Same input should produce same hash
      expect(typeof hash1).toBe('string')
      expect(hash1.length).toBe(64) // SHA-256 produces 64-character hex string
    })
  })

  describe('User Permission Validation', () => {
    beforeEach(() => {
      // Reset mocks before each test
      vi.clearAllMocks()
    })

    it('should validate user approval permissions correctly', async () => {
      // Mock database responses
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'iep_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'req-1',
                    required_approvers: ['coordinator', 'parent_guardian'],
                    optional_approvers: ['administrator']
                  },
                  error: null
                }))
              }))
            }))
          }
        } else if (table === 'iep_approval_actions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: null, // No existing approval
                  error: { message: 'No rows found' }
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await iepApprovalService.canUserApprove('req-1', 'user-1', 'coordinator')

      expect(result.canApprove).toBe(true)
      expect(result.hasApproved).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('should reject unauthorized user roles', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'iep_approval_requests') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: {
                    id: 'req-1',
                    required_approvers: ['coordinator'],
                    optional_approvers: []
                  },
                  error: null
                }))
              }))
            }))
          }
        }
        return {}
      })

      const result = await iepApprovalService.canUserApprove('req-1', 'user-1', 'student')

      expect(result.canApprove).toBe(false)
      expect(result.reason).toBe('Role not authorized')
    })
  })

  describe('Service Integration', () => {
    it('should expose all required public methods', () => {
      expect(typeof iepApprovalService.createApprovalRequest).toBe('function')
      expect(typeof iepApprovalService.getApprovalRequests).toBe('function')
      expect(typeof iepApprovalService.getUserPendingApprovals).toBe('function')
      expect(typeof iepApprovalService.submitApprovalAction).toBe('function')
      expect(typeof iepApprovalService.getApprovalActions).toBe('function')
      expect(typeof iepApprovalService.createDigitalSignature).toBe('function')
      expect(typeof iepApprovalService.verifyDigitalSignature).toBe('function')
      expect(typeof iepApprovalService.getAuditTrail).toBe('function')
      expect(typeof iepApprovalService.getWorkflowTemplate).toBe('function')
      expect(typeof iepApprovalService.canUserApprove).toBe('function')
    })

    it('should handle bilingual content appropriately', () => {
      const templates = iepApprovalService.getWorkflowTemplate('initial_iep')
      
      templates.forEach(template => {
        expect(template.step_name_ar).toBeDefined()
        expect(template.step_name_en).toBeDefined()
        expect(typeof template.step_name_ar).toBe('string')
        expect(typeof template.step_name_en).toBe('string')
        expect(template.step_name_ar.length).toBeGreaterThan(0)
        expect(template.step_name_en.length).toBeGreaterThan(0)
      })
    })

    it('should validate approval types correctly', () => {
      const validTypes = [
        'initial_iep',
        'annual_review', 
        'interim_review',
        'goal_modification',
        'service_change',
        'placement_change',
        'evaluation_consent',
        'meeting_minutes'
      ]

      validTypes.forEach(type => {
        const template = iepApprovalService.getWorkflowTemplate(type as any)
        expect(Array.isArray(template)).toBe(true)
        expect(template.length).toBeGreaterThan(0)
      })
    })
  })
})