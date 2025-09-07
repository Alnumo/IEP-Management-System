// Insurance Claim Processor Tests
// Comprehensive testing for Saudi insurance integration workflow

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { insuranceClaimProcessor } from '../../services/insurance-claim-processor';
import type { ClaimSubmissionRequest, ClaimProcessingResult, BulkClaimSubmission } from '../../services/insurance-claim-processor';

// Mock Supabase
vi.mock('../../lib/supabase', () => {
  const mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn(),
    error: null,
    data: null
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock Insurance Service
vi.mock('../../services/insurance', () => {
  const mockInsuranceService = {
    getProvider: vi.fn(),
    isServiceCovered: vi.fn(),
    calculateSessionCost: vi.fn(),
    submitClaim: vi.fn(),
    getClaimStatus: vi.fn(),
    submitPreAuth: vi.fn()
  };
  
  return {
    insuranceService: mockInsuranceService
  };
});

describe('Insurance Claim Processor', () => {
  let processor = insuranceClaimProcessor;
  let mockSupabase: any;
  let mockInsuranceService: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked modules
    const { supabase } = await import('../../lib/supabase');
    const { insuranceService } = await import('../../services/insurance');
    
    mockSupabase = supabase;
    mockInsuranceService = insuranceService;
    
    // Setup default mock implementations
    mockInsuranceService.getProvider.mockReturnValue({
      code: 'BUPA',
      nameEn: 'Bupa Arabia',
      nameAr: 'بوبا العربية',
      requiresPreAuth: true,
      supportedServices: ['ABA', 'SPEECH', 'OT'],
      maxSessionsPerMonth: 20,
      copayAmount: 50
    });

    mockInsuranceService.isServiceCovered.mockReturnValue(true);

    mockInsuranceService.calculateSessionCost.mockReturnValue({
      standardRate: 300,
      insuranceRate: 300,
      copayAmount: 50,
      patientResponsibility: 50,
      insuranceResponsibility: 250
    });

    mockInsuranceService.submitClaim.mockResolvedValue({
      id: 'claim-123',
      status: 'submitted',
      claimNumber: 'BUPA-12345678',
      submittedAt: new Date().toISOString()
    });

    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'claim-record-123',
        claim_number: 'BUPA-12345678',
        status: 'submitted'
      },
      error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Single Claim Processing', () => {
    const mockClaimRequest: ClaimSubmissionRequest = {
      student_id: 'student-123',
      session_id: 'session-123',
      insurance_provider: 'bupa',
      service_type: 'ABA',
      session_date: '2025-01-22',
      session_duration: 60,
      therapist_id: 'therapist-123',
      diagnosis_codes: ['F84.0'],
      treatment_notes: 'Applied Behavior Analysis session completed successfully',
      charged_amount: 300
    };

    it('should successfully process a single insurance claim', async () => {
      const result = await processor.processSingleClaim(mockClaimRequest);
      
      expect(result).toEqual(
        expect.objectContaining({
          claim_id: expect.any(String),
          status: 'submitted',
          claim_number: expect.stringMatching(/^BUPA-\d+$/),
          approved_amount: 300,
          processing_time: expect.any(Number),
          next_action: expect.any(String)
        })
      );

      expect(mockInsuranceService.getProvider).toHaveBeenCalledWith('bupa');
      expect(mockInsuranceService.isServiceCovered).toHaveBeenCalledWith('bupa', 'ABA');
      expect(mockSupabase.from).toHaveBeenCalledWith('insurance_claims');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should throw error for invalid insurance provider', async () => {
      mockInsuranceService.getProvider.mockReturnValue(null);
      
      await expect(
        processor.processSingleClaim({ ...mockClaimRequest, insurance_provider: 'invalid' })
      ).rejects.toThrow('Insurance provider invalid not found');
    });

    it('should throw error for uncovered service type', async () => {
      mockInsuranceService.isServiceCovered.mockReturnValue(false);
      
      await expect(
        processor.processSingleClaim({ ...mockClaimRequest, service_type: 'UNCOVERED' })
      ).rejects.toThrow('Service UNCOVERED not covered by Bupa Arabia');
    });

    it('should handle database insertion errors gracefully', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });
      
      await expect(
        processor.processSingleClaim(mockClaimRequest)
      ).rejects.toThrow('Failed to create claim record: Database connection failed');
    });

    it('should process Arabic language claims correctly', async () => {
      const arabicClaimRequest = {
        ...mockClaimRequest,
        treatment_notes: 'جلسة تحليل السلوك التطبيقي تمت بنجاح'
      };
      
      const result = await processor.processSingleClaim(arabicClaimRequest);
      
      expect(result.status).toBe('submitted');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            treatment_notes: 'جلسة تحليل السلوك التطبيقي تمت بنجاح'
          })
        ])
      );
    });
  });

  describe('Bulk Claim Processing', () => {
    const mockBulkRequest: BulkClaimSubmission = {
      session_ids: ['session-1', 'session-2', 'session-3'],
      insurance_provider: 'bupa',
      submission_notes: 'Weekly batch submission'
    };

    const mockSessions = [
      {
        id: 'session-1',
        student_id: 'student-1',
        session_date: '2025-01-20',
        duration_minutes: 60,
        therapist_id: 'therapist-1',
        session_type: 'ABA',
        cost: 300,
        session_notes: 'Good progress',
        student: { medical_records: { diagnosis_codes: ['F84.0'] } }
      },
      {
        id: 'session-2',
        student_id: 'student-2',
        session_date: '2025-01-21',
        duration_minutes: 45,
        therapist_id: 'therapist-2',
        session_type: 'SPEECH',
        cost: 250,
        session_notes: 'Speech improvement noted',
        student: { medical_records: { diagnosis_codes: ['F80.9'] } }
      }
    ];

    beforeEach(() => {
      mockSupabase.in.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockSessions,
        error: null
      });
    });

    it('should successfully process bulk insurance claims', async () => {
      const results = await processor.processBulkClaims(mockBulkRequest);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(
        expect.objectContaining({
          status: 'submitted',
          claim_number: expect.any(String)
        })
      );
      expect(results[1]).toEqual(
        expect.objectContaining({
          status: 'submitted',
          claim_number: expect.any(String)
        })
      );

      expect(mockSupabase.from).toHaveBeenCalledWith('therapy_sessions');
      expect(mockSupabase.in).toHaveBeenCalledWith('id', mockBulkRequest.session_ids);
    });

    it('should handle mixed success/failure in bulk processing', async () => {
      // Make first claim succeed, second fail
      mockInsuranceService.isServiceCovered
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      
      const results = await processor.processBulkClaims(mockBulkRequest);
      
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('submitted');
      expect(results[1].status).toBe('rejected');
      expect(results[1].rejection_reason).toContain('not covered');
    });

    it('should throw error when no eligible sessions found', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null
      });
      
      await expect(
        processor.processBulkClaims(mockBulkRequest)
      ).rejects.toThrow('No eligible sessions found for bulk claim processing');
    });

    it('should handle session data fetch errors', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch sessions' }
      });
      
      await expect(
        processor.processBulkClaims(mockBulkRequest)
      ).rejects.toThrow('Failed to fetch sessions: Failed to fetch sessions');
    });
  });

  describe('Claim Status Checking', () => {
    const mockClaimId = 'claim-123';
    const mockDatabaseClaim = {
      id: mockClaimId,
      claim_number: 'BUPA-12345678',
      status: 'submitted',
      student_id: 'student-123',
      claim_amount: 300
    };

    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({
        data: mockDatabaseClaim,
        error: null
      });
    });

    it('should check and update claim status when changed', async () => {
      mockInsuranceService.getClaimStatus.mockResolvedValue({
        id: mockClaimId,
        status: 'approved',
        approvedAmount: 250,
        processedAt: '2025-01-22T14:30:00Z'
      });

      const result = await processor.checkClaimStatus(mockClaimId);
      
      expect(result).toEqual({
        current_status: 'approved',
        approved_amount: 250,
        payment_date: '2025-01-22T14:30:00Z',
        status_updated: true
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          approved_amount: 250
        })
      );
    });

    it('should return unchanged status when no update needed', async () => {
      mockInsuranceService.getClaimStatus.mockResolvedValue({
        id: mockClaimId,
        status: 'submitted' // Same as database
      });

      const result = await processor.checkClaimStatus(mockClaimId);
      
      expect(result.status_updated).toBe(false);
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it('should handle claim status check failures', async () => {
      mockInsuranceService.getClaimStatus.mockResolvedValue(null);

      const result = await processor.checkClaimStatus(mockClaimId);
      
      expect(result.status_updated).toBe(false);
      expect(result.current_status).toBe('submitted');
    });

    it('should handle database fetch errors', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Claim not found' }
      });

      await expect(
        processor.checkClaimStatus(mockClaimId)
      ).rejects.toThrow('Failed to fetch claim: Claim not found');
    });
  });

  describe('Pre-Authorization Processing', () => {
    const mockPreAuthRequest = {
      student_id: 'student-123',
      insurance_provider: 'bupa',
      requested_services: ['ABA', 'SPEECH'],
      diagnosis_codes: ['F84.0'],
      treatment_plan: 'Intensive ABA therapy with speech support',
      requested_sessions: 20,
      estimated_cost: 6000
    };

    it('should successfully submit pre-authorization request', async () => {
      mockInsuranceService.submitPreAuth.mockResolvedValue({
        id: 'preauth-123',
        status: 'approved',
        approvalNumber: 'PA-2025-001',
        approvedSessions: 20,
        validUntil: '2025-04-22T00:00:00Z',
        notes: 'Pre-authorization approved'
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'preauth-record-123' },
        error: null
      });

      const result = await processor.submitPreAuthorization(mockPreAuthRequest);
      
      expect(result).toEqual({
        pre_auth_id: 'preauth-record-123',
        approval_number: 'PA-2025-001',
        approved_sessions: 20,
        valid_until: '2025-04-22T00:00:00Z',
        status: 'approved',
        notes: 'Pre-authorization approved'
      });

      expect(mockInsuranceService.submitPreAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: mockPreAuthRequest.student_id,
          providerId: mockPreAuthRequest.insurance_provider
        })
      );
    });

    it('should handle pre-authorization rejection', async () => {
      mockInsuranceService.submitPreAuth.mockResolvedValue({
        id: 'preauth-123',
        status: 'rejected',
        notes: 'Additional documentation required'
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'preauth-record-123' },
        error: null
      });

      const result = await processor.submitPreAuthorization(mockPreAuthRequest);
      
      expect(result.status).toBe('rejected');
      expect(result.notes).toBe('Additional documentation required');
    });

    it('should continue even if database save fails', async () => {
      mockInsuranceService.submitPreAuth.mockResolvedValue({
        id: 'preauth-123',
        status: 'approved',
        approvalNumber: 'PA-2025-001'
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await processor.submitPreAuthorization(mockPreAuthRequest);
      
      expect(result.pre_auth_id).toBe('preauth-123');
      expect(result.status).toBe('approved');
    });
  });

  describe('Claims Reporting', () => {
    const mockClaimsData = [
      {
        id: 'claim-1',
        claim_number: 'BUPA-001',
        claim_amount: 300,
        approved_amount: 250,
        status: 'approved',
        service_type: 'ABA',
        submitted_date: '2025-01-20',
        insurance_provider: 'bupa',
        student: { name_en: 'Ahmad Al-Rashid' }
      },
      {
        id: 'claim-2',
        claim_number: 'BUPA-002',
        claim_amount: 250,
        approved_amount: 225,
        status: 'approved',
        service_type: 'SPEECH',
        submitted_date: '2025-01-21',
        insurance_provider: 'bupa',
        student: { name_en: 'Fatima Al-Zahra' }
      },
      {
        id: 'claim-3',
        claim_number: 'TAWUNIYA-001',
        claim_amount: 300,
        status: 'rejected',
        service_type: 'ABA',
        submitted_date: '2025-01-21',
        insurance_provider: 'tawuniya',
        student: { name_en: 'Omar Al-Hassan' }
      }
    ];

    it('should generate comprehensive claims report', async () => {
      mockSupabase.select.mockResolvedValue({
        data: mockClaimsData,
        error: null
      });

      const report = await processor.generateClaimsReport('2025-01-20', '2025-01-22');
      
      expect(report.summary).toEqual({
        total_claims: 3,
        total_submitted_amount: 850,
        total_approved_amount: 475,
        total_rejected_amount: 300,
        average_processing_time: 3.2,
        approval_rate: expect.closeTo(66.67, 1)
      });

      expect(report.by_provider).toHaveLength(2);
      expect(report.by_service_type).toHaveLength(2);
      expect(report.recent_claims).toHaveLength(3);
    });

    it('should handle empty claims data', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [],
        error: null
      });

      const report = await processor.generateClaimsReport('2025-01-20', '2025-01-22');
      
      expect(report.summary.total_claims).toBe(0);
      expect(report.by_provider).toHaveLength(0);
      expect(report.by_service_type).toHaveLength(0);
      expect(report.recent_claims).toHaveLength(0);
    });

    it('should filter by insurance provider', async () => {
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: mockClaimsData.filter(c => c.insurance_provider === 'bupa'),
        error: null
      });

      const report = await processor.generateClaimsReport('2025-01-20', '2025-01-22', 'bupa');
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('insurance_provider', 'bupa');
      expect(report.summary.total_claims).toBe(2);
    });

    it('should handle report generation errors', async () => {
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      });

      await expect(
        processor.generateClaimsReport('2025-01-20', '2025-01-22')
      ).rejects.toThrow('Failed to fetch claims: Query failed');
    });
  });

  describe('Saudi Arabia Specific Features', () => {
    it('should support Bupa Arabia integration', async () => {
      const claimRequest: ClaimSubmissionRequest = {
        student_id: 'student-123',
        session_id: 'session-123',
        insurance_provider: 'bupa',
        service_type: 'ABA',
        session_date: '2025-01-22',
        session_duration: 60,
        therapist_id: 'therapist-123',
        diagnosis_codes: ['F84.0'],
        treatment_notes: 'تحليل السلوك التطبيقي - جلسة ناجحة',
        charged_amount: 300
      };

      const result = await processor.processSingleClaim(claimRequest);
      
      expect(result.status).toBe('submitted');
      expect(mockInsuranceService.getProvider).toHaveBeenCalledWith('bupa');
    });

    it('should support Tawuniya integration', async () => {
      mockInsuranceService.getProvider.mockReturnValue({
        code: 'TAWUNIYA',
        nameEn: 'Tawuniya',
        nameAr: 'التعاونية',
        requiresPreAuth: true,
        supportedServices: ['ABA', 'SPEECH', 'OT'],
        maxSessionsPerMonth: 16,
        copayAmount: 75
      });

      const claimRequest: ClaimSubmissionRequest = {
        student_id: 'student-123',
        session_id: 'session-123',
        insurance_provider: 'tawuniya',
        service_type: 'SPEECH',
        session_date: '2025-01-22',
        session_duration: 45,
        therapist_id: 'therapist-123',
        diagnosis_codes: ['F80.9'],
        treatment_notes: 'علاج النطق واللغة - تحسن ملحوظ',
        charged_amount: 250
      };

      const result = await processor.processSingleClaim(claimRequest);
      
      expect(result.status).toBe('submitted');
      expect(mockInsuranceService.getProvider).toHaveBeenCalledWith('tawuniya');
    });

    it('should handle Arabic diagnosis codes correctly', async () => {
      const claimRequest: ClaimSubmissionRequest = {
        student_id: 'student-123',
        session_id: 'session-123',
        insurance_provider: 'bupa',
        service_type: 'ABA',
        session_date: '2025-01-22',
        session_duration: 60,
        therapist_id: 'therapist-123',
        diagnosis_codes: ['F84.0', 'F84.1'], // Multiple diagnosis codes
        treatment_notes: 'تحليل السلوك التطبيقي للأطفال المصابين بالتوحد',
        charged_amount: 300
      };

      const result = await processor.processSingleClaim(claimRequest);
      
      expect(result.status).toBe('submitted');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            diagnosis_codes: ['F84.0', 'F84.1']
          })
        ])
      );
    });
  });

  describe('Performance and Scalability', () => {
    it('should complete single claim processing within time limits', async () => {
      const startTime = Date.now();
      
      await processor.processSingleClaim({
        student_id: 'student-123',
        session_id: 'session-123',
        insurance_provider: 'bupa',
        service_type: 'ABA',
        session_date: '2025-01-22',
        session_duration: 60,
        therapist_id: 'therapist-123',
        diagnosis_codes: ['F84.0'],
        treatment_notes: 'Session completed',
        charged_amount: 300
      });
      
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large bulk claim submissions efficiently', async () => {
      const largeBulkRequest: BulkClaimSubmission = {
        session_ids: Array.from({ length: 50 }, (_, i) => `session-${i}`),
        insurance_provider: 'bupa'
      };

      const mockLargeSessions = Array.from({ length: 50 }, (_, i) => ({
        id: `session-${i}`,
        student_id: `student-${i}`,
        session_date: '2025-01-22',
        duration_minutes: 60,
        therapist_id: 'therapist-1',
        session_type: 'ABA',
        cost: 300,
        session_notes: `Session ${i} completed`,
        student: { medical_records: { diagnosis_codes: ['F84.0'] } }
      }));

      mockSupabase.select.mockResolvedValue({
        data: mockLargeSessions,
        error: null
      });

      const startTime = Date.now();
      const results = await processor.processBulkClaims(largeBulkRequest);
      const processingTime = Date.now() - startTime;

      expect(results).toHaveLength(50);
      expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds
    });
  });
});