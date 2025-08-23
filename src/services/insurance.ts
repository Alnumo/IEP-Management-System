// Saudi Insurance Integration Service
// Supports major Saudi insurance providers

export interface InsuranceProvider {
  code: string
  nameAr: string
  nameEn: string
  apiEndpoint?: string
  requiresPreAuth: boolean
  supportedServices: string[]
  maxSessionsPerMonth: number
  copayAmount: number
}

export interface InsuranceClaim {
  id: string
  patientId: string
  providerId: string
  serviceType: string
  serviceDate: string
  sessionDuration: number
  therapistId: string
  diagnosisCode: string
  treatmentCode: string
  chargedAmount: number
  approvedAmount: number
  copayAmount: number
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'paid'
  preAuthNumber?: string
  claimNumber?: string
  rejectionReason?: string
  submittedAt?: string
  processedAt?: string
}

export interface PreAuthRequest {
  id: string
  patientId: string
  providerId: string
  requestedServices: string[]
  diagnosisCode: string
  treatmentPlan: string
  requestedSessions: number
  estimatedCost: number
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  approvalNumber?: string
  validUntil?: string
  approvedSessions?: number
  notes?: string
}

class InsuranceService {
  private providers: Record<string, InsuranceProvider> = {
    'bupa': {
      code: 'BUPA',
      nameAr: 'بوبا العربية',
      nameEn: 'Bupa Arabia',
      apiEndpoint: import.meta.env.VITE_BUPA_API_ENDPOINT,
      requiresPreAuth: true,
      supportedServices: ['ABA', 'SPEECH', 'OT', 'PT', 'ASSESSMENT'],
      maxSessionsPerMonth: 20,
      copayAmount: 50 // SAR
    },
    'tawuniya': {
      code: 'TAWUNIYA',
      nameAr: 'التعاونية',
      nameEn: 'Tawuniya',
      apiEndpoint: import.meta.env.VITE_TAWUNIYA_API_ENDPOINT,
      requiresPreAuth: true,
      supportedServices: ['ABA', 'SPEECH', 'OT', 'ASSESSMENT'],
      maxSessionsPerMonth: 16,
      copayAmount: 75
    },
    'medgulf': {
      code: 'MEDGULF',
      nameAr: 'مدجلف',
      nameEn: 'MedGulf',
      apiEndpoint: import.meta.env.VITE_MEDGULF_API_ENDPOINT,
      requiresPreAuth: false,
      supportedServices: ['SPEECH', 'OT', 'PT', 'ASSESSMENT'],
      maxSessionsPerMonth: 12,
      copayAmount: 100
    },
    'alrajhi': {
      code: 'ALRAJHI',
      nameAr: 'الراجحي تكافل',
      nameEn: 'Al Rajhi Takaful',
      apiEndpoint: import.meta.env.VITE_ALRAJHI_API_ENDPOINT,
      requiresPreAuth: true,
      supportedServices: ['ABA', 'SPEECH', 'OT', 'ASSESSMENT'],
      maxSessionsPerMonth: 24,
      copayAmount: 25
    },
    'nphies': {
      code: 'NPHIES',
      nameAr: 'منصة نفيس',
      nameEn: 'NPHIES Platform',
      apiEndpoint: import.meta.env.VITE_NPHIES_API_ENDPOINT,
      requiresPreAuth: true,
      supportedServices: ['ABA', 'SPEECH', 'OT', 'PT', 'ASSESSMENT', 'CONSULTATION'],
      maxSessionsPerMonth: 30,
      copayAmount: 0
    }
  }

  private serviceCodes = {
    'ABA': {
      code: '90834',
      nameAr: 'تحليل السلوك التطبيقي',
      nameEn: 'Applied Behavior Analysis',
      standardRate: 300, // SAR per session
      duration: 60 // minutes
    },
    'SPEECH': {
      code: '92507',
      nameAr: 'علاج النطق واللغة',
      nameEn: 'Speech Therapy',
      standardRate: 250,
      duration: 45
    },
    'OT': {
      code: '97530',
      nameAr: 'العلاج الوظيفي',
      nameEn: 'Occupational Therapy',
      standardRate: 220,
      duration: 45
    },
    'PT': {
      code: '97110',
      nameAr: 'العلاج الطبيعي',
      nameEn: 'Physical Therapy',
      standardRate: 200,
      duration: 45
    },
    'ASSESSMENT': {
      code: '96116',
      nameAr: 'التقييم النفسي',
      nameEn: 'Psychological Assessment',
      standardRate: 500,
      duration: 120
    },
    'CONSULTATION': {
      code: '99213',
      nameAr: 'استشارة طبية',
      nameEn: 'Medical Consultation',
      standardRate: 400,
      duration: 30
    }
  }

  /**
   * Get all supported insurance providers
   */
  getProviders(): InsuranceProvider[] {
    return Object.values(this.providers)
  }

  /**
   * Get provider by code
   */
  getProvider(code: string): InsuranceProvider | null {
    return this.providers[code.toLowerCase()] || null
  }

  /**
   * Check if service is covered by provider
   */
  isServiceCovered(providerCode: string, serviceType: string): boolean {
    const provider = this.getProvider(providerCode)
    if (!provider) return false
    
    return provider.supportedServices.includes(serviceType.toUpperCase())
  }

  /**
   * Verify patient eligibility
   */
  async verifyEligibility(
    providerCode: string,
    policyNumber: string,
    patientId: string
  ): Promise<{
    eligible: boolean
    remainingSessions: number
    copayAmount: number
    deductibleMet: boolean
    coverageDetails: any
  }> {
    try {
      const provider = this.getProvider(providerCode)
      if (!provider) {
        throw new Error(`Provider ${providerCode} not found`)
      }

      // Mock implementation - in real app, this would call provider API
      const mockResponse = {
        eligible: true,
        remainingSessions: provider.maxSessionsPerMonth - Math.floor(Math.random() * 10),
        copayAmount: provider.copayAmount,
        deductibleMet: Math.random() > 0.5,
        coverageDetails: {
          planType: 'Comprehensive',
          effectiveDate: '2025-01-01',
          terminationDate: '2025-12-31',
          benefits: provider.supportedServices.map(service => ({
            serviceType: service,
            covered: true,
            maxSessions: provider.maxSessionsPerMonth,
            copayAmount: provider.copayAmount
          }))
        }
      }

      // Log eligibility check
      await this.logActivity({
        type: 'eligibility_check',
        providerCode,
        policyNumber,
        patientId,
        result: mockResponse,
        timestamp: new Date().toISOString()
      })

      return mockResponse
    } catch (error) {
      console.error('Eligibility verification failed:', error)
      throw error
    }
  }

  /**
   * Submit pre-authorization request
   */
  async submitPreAuth(request: Omit<PreAuthRequest, 'id' | 'status'>): Promise<PreAuthRequest> {
    try {
      const provider = this.getProvider(request.providerId)
      if (!provider) {
        throw new Error(`Provider ${request.providerId} not found`)
      }

      if (!provider.requiresPreAuth) {
        throw new Error(`Provider ${provider.nameEn} does not require pre-authorization`)
      }

      const preAuthRequest: PreAuthRequest = {
        id: this.generateId(),
        ...request,
        status: 'submitted'
      }

      // Mock API call to insurance provider
      const mockResponse = {
        approved: Math.random() > 0.2, // 80% approval rate
        approvalNumber: 'PA-' + Date.now(),
        approvedSessions: Math.min(request.requestedSessions, provider.maxSessionsPerMonth),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        notes: 'Pre-authorization approved for specified treatment plan'
      }

      if (mockResponse.approved) {
        preAuthRequest.status = 'approved'
        preAuthRequest.approvalNumber = mockResponse.approvalNumber
        preAuthRequest.validUntil = mockResponse.validUntil
        preAuthRequest.approvedSessions = mockResponse.approvedSessions
        preAuthRequest.notes = mockResponse.notes
      } else {
        preAuthRequest.status = 'rejected'
        preAuthRequest.notes = 'Additional documentation required'
      }

      await this.logActivity({
        type: 'preauth_submission',
        providerId: request.providerId,
        patientId: request.patientId,
        requestId: preAuthRequest.id,
        result: mockResponse,
        timestamp: new Date().toISOString()
      })

      return preAuthRequest
    } catch (error) {
      console.error('Pre-auth submission failed:', error)
      throw error
    }
  }

  /**
   * Submit insurance claim
   */
  async submitClaim(claim: Omit<InsuranceClaim, 'id' | 'status'>): Promise<InsuranceClaim> {
    try {
      const provider = this.getProvider(claim.providerId)
      if (!provider) {
        throw new Error(`Provider ${claim.providerId} not found`)
      }

      const serviceInfo = this.serviceCodes[claim.serviceType as keyof typeof this.serviceCodes]
      if (!serviceInfo) {
        throw new Error(`Service type ${claim.serviceType} not supported`)
      }

      const insuranceClaim: InsuranceClaim = {
        id: this.generateId(),
        ...claim,
        status: 'submitted',
        claimNumber: 'CLM-' + Date.now(),
        submittedAt: new Date().toISOString()
      }

      // Mock claim processing
      const processingDelay = Math.random() * 5000 + 2000 // 2-7 seconds
      
      setTimeout(async () => {
        const approved = Math.random() > 0.1 // 90% approval rate
        
        if (approved) {
          insuranceClaim.status = 'approved'
          insuranceClaim.approvedAmount = Math.min(
            claim.chargedAmount,
            serviceInfo.standardRate
          )
          insuranceClaim.copayAmount = provider.copayAmount
        } else {
          insuranceClaim.status = 'rejected'
          insuranceClaim.rejectionReason = 'Service not covered under current plan'
        }
        
        insuranceClaim.processedAt = new Date().toISOString()

        await this.logActivity({
          type: 'claim_processing',
          providerId: claim.providerId,
          patientId: claim.patientId,
          claimId: insuranceClaim.id,
          result: {
            status: insuranceClaim.status,
            approvedAmount: insuranceClaim.approvedAmount,
            rejectionReason: insuranceClaim.rejectionReason
          },
          timestamp: new Date().toISOString()
        })
      }, processingDelay)

      return insuranceClaim
    } catch (error) {
      console.error('Claim submission failed:', error)
      throw error
    }
  }

  /**
   * Get claim status
   */
  async getClaimStatus(claimId: string): Promise<InsuranceClaim | null> {
    try {
      // In real implementation, this would query the database
      // For now, return mock data
      return {
        id: claimId,
        patientId: 'patient-123',
        providerId: 'bupa',
        serviceType: 'ABA',
        serviceDate: '2025-01-22',
        sessionDuration: 60,
        therapistId: 'therapist-123',
        diagnosisCode: 'F84.0',
        treatmentCode: '90834',
        chargedAmount: 300,
        approvedAmount: 300,
        copayAmount: 50,
        status: 'approved',
        claimNumber: 'CLM-123456',
        submittedAt: '2025-01-22T10:00:00Z',
        processedAt: '2025-01-22T14:30:00Z'
      }
    } catch (error) {
      console.error('Failed to get claim status:', error)
      return null
    }
  }

  /**
   * Calculate session cost with insurance
   */
  calculateSessionCost(
    serviceType: string,
    providerCode: string,
    sessionDuration: number = 60
  ): {
    standardRate: number
    insuranceRate: number
    copayAmount: number
    patientResponsibility: number
    insuranceResponsibility: number
  } {
    const service = this.serviceCodes[serviceType as keyof typeof this.serviceCodes]
    const provider = this.getProvider(providerCode)
    
    if (!service || !provider) {
      throw new Error('Invalid service type or provider')
    }

    // Adjust rate for session duration
    const standardRate = (service.standardRate / service.duration) * sessionDuration
    const insuranceRate = Math.min(standardRate, service.standardRate) // Insurance max rate
    const copayAmount = provider.copayAmount
    const patientResponsibility = copayAmount
    const insuranceResponsibility = Math.max(0, insuranceRate - copayAmount)

    return {
      standardRate,
      insuranceRate,
      copayAmount,
      patientResponsibility,
      insuranceResponsibility
    }
  }

  /**
   * Generate reports for insurance claims
   */
  async generateClaimsReport(
    _startDate: string,
    _endDate: string,
    _providerId?: string
  ): Promise<{
    totalClaims: number
    totalAmount: number
    approvedClaims: number
    rejectedClaims: number
    pendingClaims: number
    averageProcessingTime: number
    topServices: Array<{ service: string; count: number; amount: number }>
  }> {
    // Mock report data
    return {
      totalClaims: 145,
      totalAmount: 43500, // SAR
      approvedClaims: 132,
      rejectedClaims: 8,
      pendingClaims: 5,
      averageProcessingTime: 3.2, // days
      topServices: [
        { service: 'ABA', count: 65, amount: 19500 },
        { service: 'SPEECH', count: 45, amount: 11250 },
        { service: 'OT', count: 25, amount: 5500 },
        { service: 'ASSESSMENT', count: 10, amount: 5000 }
      ]
    }
  }

  /**
   * Get NPHIES compliance data
   */
  async getNPHIESCompliance(): Promise<{
    compliant: boolean
    version: string
    lastAudit: string
    certificationStatus: string
    requiredUpdates: string[]
  }> {
    return {
      compliant: true,
      version: '3.1.2',
      lastAudit: '2024-12-15',
      certificationStatus: 'Active',
      requiredUpdates: []
    }
  }

  /**
   * Utility functions
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private async logActivity(activity: any): Promise<void> {
    try {
      // In real implementation, save to database
      console.log('Insurance Activity Log:', activity)
      
      // Could save to Supabase:
      // await supabase.from('insurance_activities').insert(activity)
    } catch (error) {
      console.error('Failed to log insurance activity:', error)
    }
  }

  /**
   * Format Saudi Riyal currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(amount)
  }
}

// Export singleton instance
export const insuranceService = new InsuranceService()