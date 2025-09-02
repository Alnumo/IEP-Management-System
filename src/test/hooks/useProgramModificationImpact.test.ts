import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { 
  useModificationImpactAnalysis,
  useModificationScenarios,
  useModificationImplementation,
  useBulkModificationImpact,
  useModificationNotifications,
  useModificationImpactMonitoring
} from '@/hooks/useProgramModificationImpact'
import type { ReactNode } from 'react'

// Mock the service functions
vi.mock('@/services/program-modification-impact-service', () => ({
  analyzeModificationImpact: vi.fn(),
  validateModificationRequest: vi.fn()
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProgramModificationImpact Hooks', () => {
  let mockAnalyzeImpact: any
  let mockValidateRequest: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockAnalyzeImpact = vi.fn()
    mockValidateRequest = vi.fn()
    
    const serviceMock = require('@/services/program-modification-impact-service')
    serviceMock.analyzeModificationImpact = mockAnalyzeImpact
    serviceMock.validateModificationRequest = mockValidateRequest
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('useModificationImpactAnalysis', () => {
    it('should analyze modification impact successfully', async () => {
      const mockResult = {
        success: true,
        data: {
          impact_analysis: {
            modification_id: 'mod-123',
            enrollment_id: 'enroll-123',
            modification_types: ['frequency_change'],
            overall_severity: 'medium',
            affected_session_count: 5,
            affected_therapist_count: 1,
            schedule_disruption_percentage: 0.25,
            estimated_adjustment_time: 3,
            stakeholder_notifications_required: ['student_parent', 'therapist']
          },
          affected_sessions: [],
          therapist_impacts: [],
          resource_reallocations: [],
          schedule_adjustments: [],
          cost_implications: {
            additional_costs: 200,
            cost_savings: 0,
            net_impact: 200
          },
          timeline_impact: {
            immediate: {} as any
          },
          recommendations: {
            priority: 'medium' as const,
            actions: ['إشعار الأطراف المعنية'],
            alternatives: [],
            risks: []
          }
        }
      }

      mockAnalyzeImpact.mockResolvedValue(mockResult)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      const modificationRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'] as const,
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        },
        analysis_scope: 'immediate' as const,
        include_alternatives: true
      }

      result.current.analyzeImpact(modificationRequest)

      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      })

      expect(mockAnalyzeImpact).toHaveBeenCalledWith(modificationRequest)
      expect(result.current.analysisResult).toEqual(mockResult)
      expect(toast.success).toHaveBeenCalledWith('تم تحليل تأثير التعديل بنجاح / Impact analysis completed successfully')
    })

    it('should handle analysis errors', async () => {
      const mockError = {
        success: false,
        error: 'Analysis failed'
      }

      mockAnalyzeImpact.mockResolvedValue(mockError)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      result.current.analyzeImpact({
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'],
        proposed_changes: { effective_date: '2025-10-01' },
        analysis_scope: 'immediate',
        include_alternatives: true
      })

      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      })

      expect(toast.error).toHaveBeenCalledWith('Analysis failed')
    })

    it('should validate modification requests successfully', async () => {
      const mockValidationResult = {
        valid: true,
        errors: []
      }

      mockValidateRequest.mockResolvedValue(mockValidationResult)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      const validRequest = {
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'],
        proposed_changes: {
          new_frequency: 3,
          effective_date: '2025-10-01'
        }
      }

      result.current.validateRequest(validRequest)

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false)
      })

      expect(mockValidateRequest).toHaveBeenCalledWith(validRequest)
      expect(result.current.validationResult).toEqual(mockValidationResult)
      expect(toast.success).toHaveBeenCalledWith('طلب التعديل صالح / Modification request is valid')
    })

    it('should handle validation errors', async () => {
      const mockValidationResult = {
        valid: false,
        errors: ['رقم التسجيل مطلوب / Enrollment ID is required']
      }

      mockValidateRequest.mockResolvedValue(mockValidationResult)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      const invalidRequest = {
        enrollment_id: '',
        modification_type: ['frequency_change'],
        proposed_changes: { effective_date: '2025-10-01' }
      }

      result.current.validateRequest(invalidRequest)

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false)
      })

      expect(toast.error).toHaveBeenCalledWith('أخطاء في الطلب / Request errors: رقم التسجيل مطلوب / Enrollment ID is required')
    })

    it('should reset analysis and validation states', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      result.current.resetAnalysis()
      result.current.resetValidation()

      expect(result.current.analysisResult).toBeUndefined()
      expect(result.current.validationResult).toBeUndefined()
      expect(result.current.analysisError).toBeNull()
      expect(result.current.validationError).toBeNull()
    })
  })

  describe('useModificationScenarios', () => {
    it('should create modification scenarios successfully', async () => {
      const mockScenarios = [
        {
          scenario_name: 'تغيير التكرار',
          scenario_name_en: 'Frequency Change',
          success: true,
          data: {
            impact_analysis: {
              modification_id: 'mod-123',
              overall_severity: 'low',
              affected_session_count: 3
            }
          }
        }
      ]

      mockAnalyzeImpact.mockResolvedValue({
        success: true,
        data: { impact_analysis: { overall_severity: 'low', affected_session_count: 3 } }
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationScenarios(), { wrapper })

      const scenarioParams = {
        enrollment_id: 'enroll-123',
        scenarios: [
          {
            name_ar: 'تغيير التكرار',
            name_en: 'Frequency Change',
            modification_types: ['frequency_change'] as const,
            proposed_changes: { new_frequency: 3 }
          }
        ]
      }

      result.current.createScenarios(scenarioParams)

      await waitFor(() => {
        expect(result.current.isCreatingScenarios).toBe(false)
      })

      expect(result.current.scenariosResult).toBeDefined()
      expect(toast.success).toHaveBeenCalledWith('تم إنشاء سيناريوهات التأثير بنجاح / Impact scenarios created successfully')
    })

    it('should compare scenarios successfully', async () => {
      const mockScenarios = [
        {
          scenario_name: 'سيناريو 1',
          data: {
            impact_analysis: {
              overall_severity: 'low',
              affected_session_count: 3,
              affected_therapist_count: 1,
              schedule_disruption_percentage: 0.1
            },
            cost_implications: { net_impact: 100 }
          }
        },
        {
          scenario_name: 'سيناريو 2',
          data: {
            impact_analysis: {
              overall_severity: 'medium',
              affected_session_count: 8,
              affected_therapist_count: 2,
              schedule_disruption_percentage: 0.3
            },
            cost_implications: { net_impact: 300 }
          }
        }
      ]

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationScenarios(), { wrapper })

      result.current.compareScenarios(mockScenarios)

      await waitFor(() => {
        expect(result.current.isComparingScenarios).toBe(false)
      })

      expect(result.current.comparisonResult).toBeDefined()
      expect(result.current.comparisonResult?.recommended_scenario).toBeDefined()
      expect(toast.success).toHaveBeenCalledWith('تم مقارنة السيناريوهات بنجاح / Scenarios compared successfully')
    })
  })

  describe('useModificationImplementation', () => {
    it('should implement modification successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImplementation(), { wrapper })

      const implementationParams = {
        modification_analysis: {
          modification_id: 'mod-123',
          enrollment_id: 'enroll-123',
          stakeholder_notifications_required: ['student_parent']
        } as any,
        schedule_adjustments: [],
        approval_status: 'approved' as const,
        implementation_notes: 'Test implementation'
      }

      result.current.implementModification(implementationParams)

      await waitFor(() => {
        expect(result.current.isImplementing).toBe(false)
      })

      expect(result.current.implementationResult).toBeDefined()
      expect(result.current.implementationResult?.success).toBe(true)
      expect(toast.success).toHaveBeenCalledWith('تم تنفيذ التعديل بنجاح / Modification implemented successfully')
    })

    it('should rollback modification successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImplementation(), { wrapper })

      result.current.rollbackModification('mod-123')

      await waitFor(() => {
        expect(result.current.isRollingBack).toBe(false)
      })

      expect(result.current.rollbackResult).toBeDefined()
      expect(result.current.rollbackResult?.success).toBe(true)
      expect(toast.success).toHaveBeenCalledWith('تم التراجع عن التعديل بنجاح / Modification rolled back successfully')
    })
  })

  describe('useBulkModificationImpact', () => {
    it('should analyze bulk modifications successfully', async () => {
      mockAnalyzeImpact.mockResolvedValue({
        success: true,
        data: {
          impact_analysis: {
            affected_session_count: 5,
            overall_severity: 'medium'
          },
          therapist_impacts: [],
          cost_implications: { net_impact: 200 }
        }
      })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useBulkModificationImpact(), { wrapper })

      const bulkParams = {
        enrollment_ids: ['enroll-1', 'enroll-2', 'enroll-3'],
        bulk_modification: {
          modification_type: ['frequency_change'] as const,
          proposed_changes: { new_frequency: 3 },
          effective_date: '2025-10-01'
        }
      }

      result.current.analyzeBulkImpact(bulkParams)

      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      })

      expect(result.current.bulkAnalysisResult).toBeDefined()
      expect(result.current.bulkAnalysisResult?.aggregate_impact.total_enrollments).toBe(3)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('تم تحليل 3 من 3 تسجيل')
      )
    })

    it('should handle partial failures in bulk analysis', async () => {
      mockAnalyzeImpact
        .mockResolvedValueOnce({ success: true, data: { impact_analysis: { affected_session_count: 5 }, therapist_impacts: [], cost_implications: { net_impact: 100 } } })
        .mockResolvedValueOnce({ success: false, error: 'Analysis failed' })
        .mockResolvedValueOnce({ success: true, data: { impact_analysis: { affected_session_count: 3 }, therapist_impacts: [], cost_implications: { net_impact: 150 } } })

      const wrapper = createWrapper()
      const { result } = renderHook(() => useBulkModificationImpact(), { wrapper })

      const bulkParams = {
        enrollment_ids: ['enroll-1', 'enroll-2', 'enroll-3'],
        bulk_modification: {
          modification_type: ['frequency_change'] as const,
          proposed_changes: { new_frequency: 3 },
          effective_date: '2025-10-01'
        }
      }

      result.current.analyzeBulkImpact(bulkParams)

      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      })

      expect(result.current.bulkAnalysisResult?.aggregate_impact.successful_analyses).toBe(2)
      expect(result.current.bulkAnalysisResult?.aggregate_impact.failed_analyses).toBe(1)
    })
  })

  describe('useModificationNotifications', () => {
    it('should send notifications successfully', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationNotifications(), { wrapper })

      const notificationParams = {
        impact_analysis: {
          modification_id: 'mod-123',
          stakeholder_notifications_required: ['student_parent', 'therapist']
        } as any,
        notification_preferences: {
          include_arabic: true,
          include_english: true,
          channels: ['email', 'whatsapp'] as const,
          immediate_notification: true
        }
      }

      result.current.sendNotifications(notificationParams)

      await waitFor(() => {
        expect(result.current.isSendingNotifications).toBe(false)
      })

      expect(result.current.notificationResult).toBeDefined()
      expect(result.current.notificationResult?.success).toBe(true)
      expect(result.current.notificationResult?.notifications_sent).toBeGreaterThan(0)
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('تم إرسال')
      )
    })
  })

  describe('useModificationImpactMonitoring', () => {
    it('should monitor modification implementation', async () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactMonitoring('mod-123'), { wrapper })

      await waitFor(() => {
        expect(result.current.data).toBeDefined()
      })

      expect(result.current.data?.modification_id).toBe('mod-123')
      expect(result.current.data?.current_status).toBeDefined()
      expect(result.current.data?.completion_percentage).toBeDefined()
    })

    it('should not fetch data when modificationId is not provided', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactMonitoring(), { wrapper })

      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors in analysis', async () => {
      mockAnalyzeImpact.mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      result.current.analyzeImpact({
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'],
        proposed_changes: { effective_date: '2025-10-01' },
        analysis_scope: 'immediate',
        include_alternatives: true
      })

      await waitFor(() => {
        expect(result.current.isAnalyzing).toBe(false)
      })

      expect(result.current.analysisError).toBeDefined()
      expect(toast.error).toHaveBeenCalledWith('حدث خطأ أثناء تحليل التأثير / Error occurred during impact analysis')
    })

    it('should handle validation request errors', async () => {
      mockValidateRequest.mockRejectedValue(new Error('Validation service unavailable'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationImpactAnalysis(), { wrapper })

      result.current.validateRequest({
        enrollment_id: 'enroll-123',
        modification_type: ['frequency_change'],
        proposed_changes: { effective_date: '2025-10-01' }
      })

      await waitFor(() => {
        expect(result.current.isValidating).toBe(false)
      })

      expect(result.current.validationError).toBeDefined()
      expect(toast.error).toHaveBeenCalledWith('فشل في التحقق من صحة الطلب / Request validation failed')
    })

    it('should handle scenario creation errors', async () => {
      mockAnalyzeImpact.mockRejectedValue(new Error('Scenario analysis failed'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useModificationScenarios(), { wrapper })

      result.current.createScenarios({
        enrollment_id: 'enroll-123',
        scenarios: [{
          name_ar: 'سيناريو الاختبار',
          name_en: 'Test Scenario',
          modification_types: ['frequency_change'],
          proposed_changes: { new_frequency: 3 }
        }]
      })

      await waitFor(() => {
        expect(result.current.isCreatingScenarios).toBe(false)
      })

      expect(result.current.scenariosError).toBeDefined()
      expect(toast.error).toHaveBeenCalledWith('فشل في إنشاء السيناريوهات / Failed to create scenarios')
    })
  })
})