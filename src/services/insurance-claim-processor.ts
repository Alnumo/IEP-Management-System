// Insurance Claim Processing Service
// Comprehensive workflow for Bupa Arabia, Tawuniya, and other Saudi insurance providers

import { supabase } from '../lib/supabase';
import { insuranceService } from './insurance';
import type { InsuranceClaim, PreAuthRequest, InsuranceProvider } from './insurance';

interface ClaimSubmissionRequest {
  student_id: string;
  session_id: string;
  insurance_provider: string;
  service_type: string;
  session_date: string;
  session_duration: number;
  therapist_id: string;
  diagnosis_codes: string[];
  treatment_notes: string;
  charged_amount: number;
  pre_auth_number?: string;
}

interface ClaimProcessingResult {
  claim_id: string;
  status: 'submitted' | 'approved' | 'rejected' | 'pending_review';
  claim_number: string;
  approved_amount?: number;
  rejection_reason?: string;
  processing_time: number;
  next_action?: string;
}

interface BulkClaimSubmission {
  session_ids: string[];
  insurance_provider: string;
  submission_notes?: string;
}

export class InsuranceClaimProcessor {
  private static instance: InsuranceClaimProcessor;

  public static getInstance(): InsuranceClaimProcessor {
    if (!InsuranceClaimProcessor.instance) {
      InsuranceClaimProcessor.instance = new InsuranceClaimProcessor();
    }
    return InsuranceClaimProcessor.instance;
  }

  private constructor() {}

  /**
   * Process individual insurance claim from therapy session
   */
  async processSingleClaim(request: ClaimSubmissionRequest): Promise<ClaimProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Validate provider
      const provider = insuranceService.getProvider(request.insurance_provider);
      if (!provider) {
        throw new Error(`Insurance provider ${request.insurance_provider} not found`);
      }

      // Verify service is covered
      if (!insuranceService.isServiceCovered(request.insurance_provider, request.service_type)) {
        throw new Error(`Service ${request.service_type} not covered by ${provider.nameEn}`);
      }

      // Generate claim number
      const claimNumber = this.generateClaimNumber(request.insurance_provider);

      // Calculate amounts
      const costCalculation = insuranceService.calculateSessionCost(
        request.service_type,
        request.insurance_provider,
        request.session_duration
      );

      // Create claim record in database
      const { data: claimRecord, error: claimError } = await supabase
        .from('insurance_claims')
        .insert([
          {
            student_id: request.student_id,
            claim_number: claimNumber,
            claim_amount: request.charged_amount,
            submitted_date: new Date().toISOString().split('T')[0],
            status: 'submitted',
            service_type: request.service_type,
            session_date: request.session_date,
            diagnosis_codes: request.diagnosis_codes,
            treatment_notes: request.treatment_notes,
            therapist_id: request.therapist_id,
            pre_auth_number: request.pre_auth_number,
            expected_amount: costCalculation.insuranceResponsibility,
            processing_notes: 'Claim submitted via automated workflow'
          }
        ])
        .select()
        .single();

      if (claimError) {
        throw new Error(`Failed to create claim record: ${claimError.message}`);
      }

      // Submit to insurance provider via service
      const insuranceClaim = await insuranceService.submitClaim({
        patientId: request.student_id,
        providerId: request.insurance_provider,
        serviceType: request.service_type,
        serviceDate: request.session_date,
        sessionDuration: request.session_duration,
        therapistId: request.therapist_id,
        diagnosisCode: request.diagnosis_codes.join(','),
        treatmentCode: this.getServiceCode(request.service_type),
        chargedAmount: request.charged_amount,
        approvedAmount: costCalculation.insuranceRate,
        copayAmount: costCalculation.copayAmount,
        preAuthNumber: request.pre_auth_number
      });

      // Log the submission activity
      await this.logClaimActivity({
        claim_id: claimRecord.id,
        activity_type: 'claim_submitted',
        activity_data: {
          provider: request.insurance_provider,
          service_type: request.service_type,
          amount: request.charged_amount,
          claim_number: claimNumber
        },
        created_at: new Date().toISOString()
      });

      const processingTime = Date.now() - startTime;

      return {
        claim_id: claimRecord.id,
        status: 'submitted',
        claim_number: claimNumber,
        approved_amount: costCalculation.insuranceRate,
        processing_time: processingTime,
        next_action: provider.requiresPreAuth && !request.pre_auth_number 
          ? 'Pre-authorization may be required for future claims' 
          : 'Claim submitted successfully'
      };

    } catch (error) {
      console.error('Claim processing failed:', error);
      
      // Log the error
      await this.logClaimActivity({
        claim_id: 'error',
        activity_type: 'claim_error',
        activity_data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          request: request
        },
        created_at: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Process bulk insurance claims for multiple sessions
   */
  async processBulkClaims(request: BulkClaimSubmission): Promise<ClaimProcessingResult[]> {
    const results: ClaimProcessingResult[] = [];
    
    try {
      // Fetch session data for all session IDs
      const { data: sessions, error: sessionError } = await supabase
        .from('therapy_sessions')
        .select(`
          *,
          student:students(*),
          therapist:therapists(*)
        `)
        .in('id', request.session_ids)
        .eq('payment_status', 'completed');

      if (sessionError) {
        throw new Error(`Failed to fetch sessions: ${sessionError.message}`);
      }

      if (!sessions || sessions.length === 0) {
        throw new Error('No eligible sessions found for bulk claim processing');
      }

      // Process each session claim
      for (const session of sessions) {
        try {
          const claimRequest: ClaimSubmissionRequest = {
            student_id: session.student_id,
            session_id: session.id,
            insurance_provider: request.insurance_provider,
            service_type: session.session_type || 'ABA',
            session_date: session.session_date,
            session_duration: session.duration_minutes || 60,
            therapist_id: session.therapist_id,
            diagnosis_codes: session.student.medical_records?.diagnosis_codes || ['F84.0'],
            treatment_notes: session.session_notes || 'Therapy session completed',
            charged_amount: session.cost || 300
          };

          const result = await this.processSingleClaim(claimRequest);
          results.push(result);

        } catch (error) {
          console.error(`Failed to process claim for session ${session.id}:`, error);
          
          // Add error result
          results.push({
            claim_id: `error-${session.id}`,
            status: 'rejected',
            claim_number: 'N/A',
            rejection_reason: error instanceof Error ? error.message : 'Processing failed',
            processing_time: 0,
            next_action: 'Review session data and resubmit'
          });
        }
      }

      // Log bulk submission summary
      await this.logClaimActivity({
        claim_id: 'bulk_submission',
        activity_type: 'bulk_claim_submitted',
        activity_data: {
          session_count: request.session_ids.length,
          successful_claims: results.filter(r => r.status === 'submitted').length,
          failed_claims: results.filter(r => r.status === 'rejected').length,
          total_amount: results.reduce((sum, r) => sum + (r.approved_amount || 0), 0),
          provider: request.insurance_provider
        },
        created_at: new Date().toISOString()
      });

      return results;

    } catch (error) {
      console.error('Bulk claim processing failed:', error);
      throw error;
    }
  }

  /**
   * Check claim status and update database
   */
  async checkClaimStatus(claimId: string): Promise<{
    current_status: string;
    approved_amount?: number;
    rejection_reason?: string;
    payment_date?: string;
    status_updated: boolean;
  }> {
    try {
      // Get current claim from database
      const { data: claim, error: claimError } = await supabase
        .from('insurance_claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (claimError) {
        throw new Error(`Failed to fetch claim: ${claimError.message}`);
      }

      // Check with insurance service
      const insuranceStatus = await insuranceService.getClaimStatus(claim.claim_number);
      
      if (!insuranceStatus) {
        return {
          current_status: claim.status,
          status_updated: false
        };
      }

      let statusUpdated = false;
      const updateData: any = {};

      // Check if status changed
      if (insuranceStatus.status !== claim.status) {
        updateData.status = insuranceStatus.status;
        statusUpdated = true;

        if (insuranceStatus.status === 'approved') {
          updateData.approved_amount = insuranceStatus.approvedAmount;
          updateData.processing_notes = 'Claim approved by insurance provider';
        } else if (insuranceStatus.status === 'rejected') {
          updateData.rejection_reason = insuranceStatus.rejectionReason;
          updateData.processing_notes = `Claim rejected: ${insuranceStatus.rejectionReason}`;
        } else if (insuranceStatus.status === 'paid') {
          updateData.paid_date = insuranceStatus.processedAt;
          updateData.processing_notes = 'Payment received from insurance provider';
        }
      }

      // Update database if status changed
      if (statusUpdated) {
        const { error: updateError } = await supabase
          .from('insurance_claims')
          .update(updateData)
          .eq('id', claimId);

        if (updateError) {
          throw new Error(`Failed to update claim status: ${updateError.message}`);
        }

        // Log status change
        await this.logClaimActivity({
          claim_id: claimId,
          activity_type: 'status_update',
          activity_data: {
            old_status: claim.status,
            new_status: insuranceStatus.status,
            approved_amount: insuranceStatus.approvedAmount,
            rejection_reason: insuranceStatus.rejectionReason
          },
          created_at: new Date().toISOString()
        });
      }

      return {
        current_status: insuranceStatus.status,
        approved_amount: insuranceStatus.approvedAmount,
        rejection_reason: insuranceStatus.rejectionReason,
        payment_date: insuranceStatus.processedAt,
        status_updated: statusUpdated
      };

    } catch (error) {
      console.error('Failed to check claim status:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive claims report
   */
  async generateClaimsReport(
    startDate: string,
    endDate: string,
    insuranceProvider?: string
  ): Promise<{
    summary: {
      total_claims: number;
      total_submitted_amount: number;
      total_approved_amount: number;
      total_rejected_amount: number;
      average_processing_time: number;
      approval_rate: number;
    };
    by_provider: Array<{
      provider: string;
      claims_count: number;
      submitted_amount: number;
      approved_amount: number;
      approval_rate: number;
    }>;
    by_service_type: Array<{
      service_type: string;
      claims_count: number;
      average_amount: number;
      approval_rate: number;
    }>;
    recent_claims: Array<{
      claim_number: string;
      student_name: string;
      service_type: string;
      submitted_date: string;
      status: string;
      amount: number;
    }>;
  }> {
    try {
      let query = supabase
        .from('insurance_claims')
        .select(`
          *,
          student:students(*),
          insurance_provider:insurance_providers(*)
        `)
        .gte('submitted_date', startDate)
        .lte('submitted_date', endDate);

      if (insuranceProvider) {
        query = query.eq('insurance_provider', insuranceProvider);
      }

      const { data: claims, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch claims: ${error.message}`);
      }

      if (!claims || claims.length === 0) {
        return {
          summary: {
            total_claims: 0,
            total_submitted_amount: 0,
            total_approved_amount: 0,
            total_rejected_amount: 0,
            average_processing_time: 0,
            approval_rate: 0
          },
          by_provider: [],
          by_service_type: [],
          recent_claims: []
        };
      }

      // Calculate summary statistics
      const totalClaims = claims.length;
      const approvedClaims = claims.filter(c => c.status === 'approved');
      const rejectedClaims = claims.filter(c => c.status === 'rejected');
      
      const totalSubmittedAmount = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
      const totalApprovedAmount = approvedClaims.reduce((sum, c) => sum + (c.approved_amount || 0), 0);
      const totalRejectedAmount = rejectedClaims.reduce((sum, c) => sum + (c.claim_amount || 0), 0);
      
      const approvalRate = totalClaims > 0 ? (approvedClaims.length / totalClaims) * 100 : 0;

      // Calculate average processing time (mock for now)
      const averageProcessingTime = 3.2; // days

      // Group by provider
      const providerStats = new Map();
      claims.forEach(claim => {
        const provider = claim.insurance_provider || 'unknown';
        if (!providerStats.has(provider)) {
          providerStats.set(provider, {
            claims: [],
            submitted_amount: 0,
            approved_amount: 0
          });
        }
        const stats = providerStats.get(provider);
        stats.claims.push(claim);
        stats.submitted_amount += claim.claim_amount || 0;
        if (claim.status === 'approved') {
          stats.approved_amount += claim.approved_amount || 0;
        }
      });

      const byProvider = Array.from(providerStats.entries()).map(([provider, stats]) => ({
        provider,
        claims_count: stats.claims.length,
        submitted_amount: stats.submitted_amount,
        approved_amount: stats.approved_amount,
        approval_rate: (stats.claims.filter(c => c.status === 'approved').length / stats.claims.length) * 100
      }));

      // Group by service type
      const serviceStats = new Map();
      claims.forEach(claim => {
        const service = claim.service_type || 'unknown';
        if (!serviceStats.has(service)) {
          serviceStats.set(service, {
            claims: [],
            total_amount: 0
          });
        }
        const stats = serviceStats.get(service);
        stats.claims.push(claim);
        stats.total_amount += claim.claim_amount || 0;
      });

      const byServiceType = Array.from(serviceStats.entries()).map(([service, stats]) => ({
        service_type: service,
        claims_count: stats.claims.length,
        average_amount: stats.total_amount / stats.claims.length,
        approval_rate: (stats.claims.filter(c => c.status === 'approved').length / stats.claims.length) * 100
      }));

      // Recent claims
      const recentClaims = claims
        .sort((a, b) => new Date(b.submitted_date).getTime() - new Date(a.submitted_date).getTime())
        .slice(0, 10)
        .map(claim => ({
          claim_number: claim.claim_number,
          student_name: claim.student?.name_en || 'Unknown',
          service_type: claim.service_type || 'Unknown',
          submitted_date: claim.submitted_date,
          status: claim.status,
          amount: claim.claim_amount || 0
        }));

      return {
        summary: {
          total_claims: totalClaims,
          total_submitted_amount: totalSubmittedAmount,
          total_approved_amount: totalApprovedAmount,
          total_rejected_amount: totalRejectedAmount,
          average_processing_time: averageProcessingTime,
          approval_rate: approvalRate
        },
        by_provider: byProvider,
        by_service_type: byServiceType,
        recent_claims: recentClaims
      };

    } catch (error) {
      console.error('Failed to generate claims report:', error);
      throw error;
    }
  }

  /**
   * Handle pre-authorization workflow
   */
  async submitPreAuthorization(request: {
    student_id: string;
    insurance_provider: string;
    requested_services: string[];
    diagnosis_codes: string[];
    treatment_plan: string;
    requested_sessions: number;
    estimated_cost: number;
  }): Promise<{
    pre_auth_id: string;
    approval_number?: string;
    approved_sessions?: number;
    valid_until?: string;
    status: string;
    notes?: string;
  }> {
    try {
      // Submit pre-authorization request
      const preAuthRequest = await insuranceService.submitPreAuth({
        patientId: request.student_id,
        providerId: request.insurance_provider,
        requestedServices: request.requested_services,
        diagnosisCode: request.diagnosis_codes.join(','),
        treatmentPlan: request.treatment_plan,
        requestedSessions: request.requested_sessions,
        estimatedCost: request.estimated_cost
      });

      // Save to database
      const { data: preAuthRecord, error } = await supabase
        .from('insurance_pre_authorizations')
        .insert([
          {
            student_id: request.student_id,
            insurance_provider: request.insurance_provider,
            approval_number: preAuthRequest.approvalNumber,
            approved_sessions: preAuthRequest.approvedSessions,
            valid_until: preAuthRequest.validUntil,
            status: preAuthRequest.status,
            requested_services: request.requested_services,
            diagnosis_codes: request.diagnosis_codes,
            treatment_plan: request.treatment_plan,
            notes: preAuthRequest.notes
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Failed to save pre-authorization:', error);
        // Continue even if database save fails
      }

      return {
        pre_auth_id: preAuthRecord?.id || preAuthRequest.id,
        approval_number: preAuthRequest.approvalNumber,
        approved_sessions: preAuthRequest.approvedSessions,
        valid_until: preAuthRequest.validUntil,
        status: preAuthRequest.status,
        notes: preAuthRequest.notes
      };

    } catch (error) {
      console.error('Pre-authorization submission failed:', error);
      throw error;
    }
  }

  /**
   * Utility methods
   */
  private generateClaimNumber(provider: string): string {
    const timestamp = Date.now().toString();
    const providerCode = provider.toUpperCase().substring(0, 3);
    return `${providerCode}-${timestamp.substring(-8)}`;
  }

  private getServiceCode(serviceType: string): string {
    const serviceCodes: Record<string, string> = {
      'ABA': '90834',
      'SPEECH': '92507',
      'OT': '97530',
      'PT': '97110',
      'ASSESSMENT': '96116',
      'CONSULTATION': '99213'
    };
    return serviceCodes[serviceType.toUpperCase()] || '90834';
  }

  private async logClaimActivity(activity: {
    claim_id: string;
    activity_type: string;
    activity_data: any;
    created_at: string;
  }): Promise<void> {
    try {
      await supabase.from('insurance_claim_activities').insert([activity]);
    } catch (error) {
      console.error('Failed to log claim activity:', error);
      // Don't throw error for logging failures
    }
  }
}

// Export singleton instance
export const insuranceClaimProcessor = InsuranceClaimProcessor.getInstance();

// Export types for use in other components
export type {
  ClaimSubmissionRequest,
  ClaimProcessingResult,
  BulkClaimSubmission
};