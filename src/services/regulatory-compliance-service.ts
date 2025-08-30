import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ComplianceRequirement {
  id: string;
  authority: 'MOH' | 'MEWA' | 'SAMA' | 'ZATCA' | 'HRSD'; // Saudi regulatory authorities
  authorityNameAr: string;
  reportType: string;
  reportTypeAr: string;
  frequency: 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'on_demand';
  nextDueDate: string;
  lastSubmitted?: string;
  status: 'compliant' | 'due_soon' | 'overdue' | 'not_applicable';
  mandatoryFields: string[];
  templateUrl?: string;
  submissionMethod: 'online_portal' | 'email' | 'physical_delivery' | 'api_integration';
  penaltyForDelay?: string;
  contactInfo: {
    department: string;
    phone?: string;
    email?: string;
    website?: string;
  };
}

export interface ComplianceReport {
  id: string;
  requirementId: string;
  reportPeriod: {
    start: string;
    end: string;
  };
  generatedDate: string;
  submittedDate?: string;
  status: 'draft' | 'ready' | 'submitted' | 'accepted' | 'rejected';
  data: any;
  validationResults: ValidationResult[];
  submissionReceipt?: string;
  approvedBy?: string;
}

export interface ValidationResult {
  field: string;
  fieldAr: string;
  status: 'valid' | 'warning' | 'error';
  message: string;
  messageAr: string;
  expectedValue?: any;
  actualValue?: any;
}

export interface RegulatoryMetrics {
  totalRequirements: number;
  compliantReports: number;
  overdueReports: number;
  upcomingDeadlines: number;
  complianceRate: number;
  averageSubmissionTime: number; // days
  penaltiesIncurred: number;
  costOfCompliance: number; // SAR
}

export interface AuditTrail {
  id: string;
  action: string;
  actionAr: string;
  performedBy: string;
  performedAt: string;
  entityType: 'student' | 'therapist' | 'session' | 'report' | 'system';
  entityId: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  complianceImpact: 'none' | 'low' | 'medium' | 'high';
}

class RegulatoryComplianceService {
  private readonly saudiRequirements: ComplianceRequirement[] = [
    {
      id: 'req_moh_001',
      authority: 'MOH',
      authorityNameAr: 'وزارة الصحة',
      reportType: 'Healthcare Provider Activity Report',
      reportTypeAr: 'تقرير نشاط مقدم الخدمات الصحية',
      frequency: 'quarterly',
      nextDueDate: '2024-10-15',
      status: 'compliant',
      mandatoryFields: [
        'provider_license_number',
        'reporting_period',
        'total_patients_served',
        'services_provided',
        'staff_qualifications',
        'patient_outcomes',
        'adverse_events'
      ],
      submissionMethod: 'online_portal',
      contactInfo: {
        department: 'Healthcare Regulation Department',
        phone: '+966-11-401-0000',
        email: 'regulation@moh.gov.sa',
        website: 'https://www.moh.gov.sa'
      }
    },
    {
      id: 'req_mewa_001',
      authority: 'MEWA',
      authorityNameAr: 'وزارة البيئة والمياه والزراعة',
      reportType: 'Environmental Impact Report',
      reportTypeAr: 'تقرير الأثر البيئي',
      frequency: 'annually',
      nextDueDate: '2024-12-31',
      status: 'due_soon',
      mandatoryFields: [
        'waste_management_practices',
        'medical_waste_disposal',
        'environmental_compliance',
        'sustainability_measures'
      ],
      submissionMethod: 'online_portal',
      contactInfo: {
        department: 'Environmental Compliance Division',
        phone: '+966-11-401-6666',
        email: 'compliance@mewa.gov.sa',
        website: 'https://www.mewa.gov.sa'
      }
    },
    {
      id: 'req_zatca_001',
      authority: 'ZATCA',
      authorityNameAr: 'هيئة الزكاة والضريبة والجمارك',
      reportType: 'VAT Return',
      reportTypeAr: 'إقرار ضريبة القيمة المضافة',
      frequency: 'monthly',
      nextDueDate: '2024-09-15',
      lastSubmitted: '2024-08-14',
      status: 'compliant',
      mandatoryFields: [
        'vat_registration_number',
        'reporting_period',
        'total_sales',
        'vat_collected',
        'input_vat',
        'net_vat_payable'
      ],
      submissionMethod: 'online_portal',
      penaltyForDelay: '5% of VAT amount + 100 SAR per day',
      contactInfo: {
        department: 'VAT Department',
        phone: '+966-11-952-2222',
        email: 'vat@zatca.gov.sa',
        website: 'https://zatca.gov.sa'
      }
    },
    {
      id: 'req_hrsd_001',
      authority: 'HRSD',
      authorityNameAr: 'وزارة الموارد البشرية والتنمية الاجتماعية',
      reportType: 'Employment Report',
      reportTypeAr: 'تقرير التوظيف',
      frequency: 'monthly',
      nextDueDate: '2024-09-10',
      status: 'due_soon',
      mandatoryFields: [
        'total_employees',
        'saudi_employees',
        'non_saudi_employees',
        'saudization_percentage',
        'employee_benefits',
        'workplace_safety'
      ],
      submissionMethod: 'online_portal',
      contactInfo: {
        department: 'Labor Relations Department',
        phone: '+966-11-456-7890',
        email: 'labor@hrsd.gov.sa',
        website: 'https://hrsd.gov.sa'
      }
    }
  ];

  /**
   * Get all compliance requirements
   */
  async getComplianceRequirements(): Promise<ComplianceRequirement[]> {
    try {
      // Update status based on current date
      const now = new Date();
      
      return this.saudiRequirements.map(req => {
        const dueDate = new Date(req.nextDueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: ComplianceRequirement['status'] = 'compliant';
        
        if (daysUntilDue < 0) {
          status = 'overdue';
        } else if (daysUntilDue <= 7) {
          status = 'due_soon';
        }
        
        return { ...req, status };
      });
    } catch (error) {
      console.error('Failed to get compliance requirements:', error);
      throw error;
    }
  }

  /**
   * Get regulatory compliance metrics
   */
  async getRegulatoryMetrics(): Promise<RegulatoryMetrics> {
    try {
      const requirements = await this.getComplianceRequirements();
      
      const totalRequirements = requirements.length;
      const compliantReports = requirements.filter(r => r.status === 'compliant').length;
      const overdueReports = requirements.filter(r => r.status === 'overdue').length;
      const upcomingDeadlines = requirements.filter(r => r.status === 'due_soon').length;
      const complianceRate = (compliantReports / totalRequirements) * 100;
      
      return {
        totalRequirements,
        compliantReports,
        overdueReports,
        upcomingDeadlines,
        complianceRate,
        averageSubmissionTime: 2.5, // Mock data
        penaltiesIncurred: 0,
        costOfCompliance: 15000 // SAR per year
      };
    } catch (error) {
      console.error('Failed to get regulatory metrics:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report for specific requirement
   */
  async generateComplianceReport(
    requirementId: string,
    reportPeriod: { start: string; end: string }
  ): Promise<ComplianceReport> {
    try {
      const requirement = this.saudiRequirements.find(r => r.id === requirementId);
      if (!requirement) {
        throw new Error('Requirement not found');
      }

      let reportData: any = {};
      let validationResults: ValidationResult[] = [];

      switch (requirement.authority) {
        case 'MOH':
          reportData = await this.generateMOHReport(reportPeriod);
          validationResults = await this.validateMOHReport(reportData);
          break;
          
        case 'ZATCA':
          reportData = await this.generateZATCAReport(reportPeriod);
          validationResults = await this.validateZATCAReport(reportData);
          break;
          
        case 'HRSD':
          reportData = await this.generateHRSDReport(reportPeriod);
          validationResults = await this.validateHRSDReport(reportData);
          break;
          
        case 'MEWA':
          reportData = await this.generateMEWAReport(reportPeriod);
          validationResults = await this.validateMEWAReport(reportData);
          break;
          
        default:
          throw new Error(`Unsupported authority: ${requirement.authority}`);
      }

      const report: ComplianceReport = {
        id: `report_${Date.now()}`,
        requirementId,
        reportPeriod,
        generatedDate: new Date().toISOString(),
        status: validationResults.some(v => v.status === 'error') ? 'draft' : 'ready',
        data: reportData,
        validationResults
      };

      // Save to database
      const { error } = await supabase
        .from('compliance_reports')
        .insert(report);

      if (error) throw error;

      return report;
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Generate MOH Healthcare Provider Activity Report
   */
  private async generateMOHReport(period: { start: string; end: string }): Promise<any> {
    // Mock data for MOH report - in real implementation would query database
    return {
      provider_info: {
        license_number: 'HP-RH-2024-001',
        facility_name: 'Arkan Growth Center',
        facility_name_ar: 'مركز أركان للنمو',
        location: 'Riyadh, Saudi Arabia',
        contact_info: {
          phone: '+966-11-234-5678',
          email: 'info@arkangrowth.com'
        }
      },
      reporting_period: {
        start: period.start,
        end: period.end
      },
      patient_statistics: {
        total_patients_served: 125,
        new_patients: 28,
        continuing_patients: 97,
        patients_by_age_group: {
          '0-5': 45,
          '6-12': 58,
          '13-18': 22
        },
        patients_by_condition: {
          'autism_spectrum_disorder': 68,
          'speech_language_disorders': 42,
          'developmental_delays': 35,
          'behavioral_disorders': 28,
          'learning_disabilities': 18
        }
      },
      services_provided: {
        aba_therapy: {
          sessions_conducted: 890,
          patients_served: 65,
          average_improvement: 74.5
        },
        speech_therapy: {
          sessions_conducted: 672,
          patients_served: 48,
          average_improvement: 68.3
        },
        occupational_therapy: {
          sessions_conducted: 558,
          patients_served: 42,
          average_improvement: 71.8
        },
        physical_therapy: {
          sessions_conducted: 334,
          patients_served: 28,
          average_improvement: 76.2
        },
        behavioral_therapy: {
          sessions_conducted: 715,
          patients_served: 55,
          average_improvement: 69.4
        }
      },
      staff_qualifications: {
        licensed_therapists: 12,
        certified_specialists: 8,
        support_staff: 15,
        continuing_education_hours: 480,
        certifications_renewed: 12
      },
      patient_outcomes: {
        goal_achievement_rate: 82.3,
        improvement_rate: 78.5,
        program_completion_rate: 87.2,
        parent_satisfaction_score: 4.5
      },
      adverse_events: {
        total_reported: 0,
        serious_incidents: 0,
        corrective_actions_taken: 0
      },
      quality_measures: {
        infection_control_compliance: 100,
        safety_protocol_adherence: 98.5,
        documentation_completeness: 96.2,
        patient_privacy_compliance: 100
      }
    };
  }

  /**
   * Generate ZATCA VAT Return
   */
  private async generateZATCAReport(period: { start: string; end: string }): Promise<any> {
    // Get financial data from billing service
    // Mock data for ZATCA VAT return
    return {
      taxpayer_info: {
        vat_registration_number: '300123456789003',
        business_name: 'Arkan Growth Center',
        business_name_ar: 'مركز أركان للنمو',
        tax_period: {
          start: period.start,
          end: period.end
        }
      },
      sales_summary: {
        standard_rated_sales: 156000, // 15% VAT
        zero_rated_sales: 0,
        exempt_sales: 0,
        total_sales: 156000
      },
      vat_on_sales: {
        standard_rate_vat: 23400, // 15% of 156000
        adjustments: 0,
        total_vat_on_sales: 23400
      },
      purchases_summary: {
        standard_rated_purchases: 28000,
        zero_rated_purchases: 0,
        exempt_purchases: 0,
        total_purchases: 28000
      },
      vat_on_purchases: {
        recoverable_vat: 4200, // 15% of 28000
        adjustments: 0,
        total_input_vat: 4200
      },
      net_vat_calculation: {
        vat_on_sales: 23400,
        input_vat: 4200,
        net_vat_payable: 19200,
        previous_period_balance: 0,
        payments_made: 0,
        final_balance: 19200
      },
      supporting_schedules: {
        digital_invoices_count: 156,
        paper_invoices_count: 0,
        credit_notes_issued: 8,
        debit_notes_issued: 2
      }
    };
  }

  /**
   * Generate HRSD Employment Report
   */
  private async generateHRSDReport(period: { start: string; end: string }): Promise<any> {
    return {
      employer_info: {
        commercial_registration: '1010123456',
        establishment_name: 'Arkan Growth Center',
        establishment_name_ar: 'مركز أركان للنمو',
        economic_activity: 'Healthcare Services',
        reporting_period: {
          start: period.start,
          end: period.end
        }
      },
      employment_statistics: {
        total_employees: 27,
        saudi_employees: 18,
        non_saudi_employees: 9,
        saudization_percentage: 66.7,
        new_hires: {
          saudi: 2,
          non_saudi: 1
        },
        terminations: {
          saudi: 0,
          non_saudi: 1
        }
      },
      employee_categories: {
        management: {
          saudi: 3,
          non_saudi: 1
        },
        professionals: {
          saudi: 12,
          non_saudi: 8
        },
        technicians: {
          saudi: 3,
          non_saudi: 0
        }
      },
      compensation: {
        average_saudi_salary: 8500,
        average_non_saudi_salary: 7200,
        total_payroll: 218400,
        benefits_provided: [
          'health_insurance',
          'end_of_service_benefits',
          'annual_leave',
          'sick_leave',
          'professional_development'
        ]
      },
      workplace_safety: {
        safety_training_hours: 108,
        workplace_incidents: 0,
        safety_compliance_score: 95
      },
      nitaqat_compliance: {
        current_band: 'Green',
        required_saudization: 60,
        actual_saudization: 66.7,
        compliance_status: 'Compliant'
      }
    };
  }

  /**
   * Generate MEWA Environmental Impact Report
   */
  private async generateMEWAReport(period: { start: string; end: string }): Promise<any> {
    return {
      facility_info: {
        environmental_permit_number: 'ENV-2024-RH-001',
        facility_name: 'Arkan Growth Center',
        facility_name_ar: 'مركز أركان للنمو',
        reporting_period: {
          start: period.start,
          end: period.end
        }
      },
      waste_management: {
        medical_waste: {
          total_generated_kg: 125.5,
          properly_disposed_kg: 125.5,
          disposal_method: 'Licensed medical waste contractor',
          contractor_license: 'MW-LIC-2024-001'
        },
        general_waste: {
          total_generated_kg: 450.2,
          recycled_kg: 135.1,
          recycling_rate: 30
        },
        hazardous_materials: {
          cleaning_chemicals_used_liters: 45.6,
          proper_storage_compliance: 100,
          disposal_records_maintained: true
        }
      },
      energy_consumption: {
        electricity_kwh: 8500,
        water_consumption_cubic_meters: 156,
        energy_efficiency_measures: [
          'LED lighting installation',
          'Energy-efficient HVAC systems',
          'Smart thermostats'
        ]
      },
      environmental_compliance: {
        air_quality_monitoring: 'Compliant',
        noise_levels: 'Within permitted limits',
        water_discharge: 'Not applicable',
        soil_contamination_risk: 'Low'
      },
      sustainability_initiatives: {
        paperless_records_percentage: 85,
        renewable_energy_usage: 0,
        green_building_features: [
          'Natural lighting optimization',
          'Water-efficient fixtures',
          'Landscaping with native plants'
        ]
      }
    };
  }

  /**
   * Validate MOH report data
   */
  private async validateMOHReport(data: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate required fields
    if (!data.provider_info?.license_number) {
      results.push({
        field: 'provider_license_number',
        fieldAr: 'رقم ترخيص مقدم الخدمة',
        status: 'error',
        message: 'Provider license number is required',
        messageAr: 'رقم ترخيص مقدم الخدمة مطلوب'
      });
    }

    if (!data.patient_statistics?.total_patients_served || data.patient_statistics.total_patients_served < 0) {
      results.push({
        field: 'total_patients_served',
        fieldAr: 'إجمالي المرضى المخدومين',
        status: 'error',
        message: 'Total patients served must be a positive number',
        messageAr: 'إجمالي المرضى المخدومين يجب أن يكون رقمًا موجبًا'
      });
    }

    // Validate data consistency
    const totalByAge = Object.values(data.patient_statistics?.patients_by_age_group || {}).reduce((sum: number, count) => sum + (count as number), 0);
    if (totalByAge !== data.patient_statistics?.total_patients_served) {
      results.push({
        field: 'patients_by_age_group',
        fieldAr: 'المرضى حسب الفئة العمرية',
        status: 'warning',
        message: 'Age group totals do not match total patients served',
        messageAr: 'مجموع الفئات العمرية لا يتطابق مع إجمالي المرضى المخدومين',
        expectedValue: data.patient_statistics?.total_patients_served,
        actualValue: totalByAge
      });
    }

    return results;
  }

  /**
   * Validate ZATCA VAT report
   */
  private async validateZATCAReport(data: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate VAT registration format
    const vatRegex = /^\d{15}$/;
    if (!data.taxpayer_info?.vat_registration_number || !vatRegex.test(data.taxpayer_info.vat_registration_number)) {
      results.push({
        field: 'vat_registration_number',
        fieldAr: 'رقم التسجيل في ضريبة القيمة المضافة',
        status: 'error',
        message: 'VAT registration number must be 15 digits',
        messageAr: 'رقم التسجيل في ضريبة القيمة المضافة يجب أن يكون 15 رقمًا'
      });
    }

    // Validate VAT calculations
    const expectedVAT = Math.round(data.sales_summary?.standard_rated_sales * 0.15);
    if (data.vat_on_sales?.standard_rate_vat !== expectedVAT) {
      results.push({
        field: 'standard_rate_vat',
        fieldAr: 'ضريبة القيمة المضافة بالمعدل القياسي',
        status: 'error',
        message: 'VAT calculation is incorrect',
        messageAr: 'حساب ضريبة القيمة المضافة غير صحيح',
        expectedValue: expectedVAT,
        actualValue: data.vat_on_sales?.standard_rate_vat
      });
    }

    return results;
  }

  /**
   * Validate HRSD employment report
   */
  private async validateHRSDReport(data: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate Saudization percentage calculation
    const totalEmployees = data.employment_statistics?.total_employees || 0;
    const saudiEmployees = data.employment_statistics?.saudi_employees || 0;
    const calculatedSaudization = totalEmployees > 0 ? (saudiEmployees / totalEmployees) * 100 : 0;
    const reportedSaudization = data.employment_statistics?.saudization_percentage || 0;

    if (Math.abs(calculatedSaudization - reportedSaudization) > 0.1) {
      results.push({
        field: 'saudization_percentage',
        fieldAr: 'نسبة السعودة',
        status: 'error',
        message: 'Saudization percentage calculation is incorrect',
        messageAr: 'حساب نسبة السعودة غير صحيح',
        expectedValue: Math.round(calculatedSaudization * 10) / 10,
        actualValue: reportedSaudization
      });
    }

    // Check Nitaqat compliance
    if (data.nitaqat_compliance?.actual_saudization < data.nitaqat_compliance?.required_saudization) {
      results.push({
        field: 'nitaqat_compliance',
        fieldAr: 'امتثال نطاقات',
        status: 'warning',
        message: 'Saudization rate is below required minimum',
        messageAr: 'معدل السعودة أقل من الحد الأدنى المطلوب'
      });
    }

    return results;
  }

  /**
   * Validate MEWA environmental report
   */
  private async validateMEWAReport(data: any): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate waste disposal compliance
    if (data.waste_management?.medical_waste?.total_generated_kg !== data.waste_management?.medical_waste?.properly_disposed_kg) {
      results.push({
        field: 'medical_waste_disposal',
        fieldAr: 'التخلص من النفايات الطبية',
        status: 'error',
        message: 'All medical waste must be properly disposed',
        messageAr: 'يجب التخلص من جميع النفايات الطبية بشكل صحيح'
      });
    }

    // Check recycling rate
    const recyclingRate = data.waste_management?.general_waste?.recycling_rate || 0;
    if (recyclingRate < 20) {
      results.push({
        field: 'recycling_rate',
        fieldAr: 'معدل إعادة التدوير',
        status: 'warning',
        message: 'Recycling rate is below recommended 20%',
        messageAr: 'معدل إعادة التدوير أقل من 20% المُوصى بها'
      });
    }

    return results;
  }

  /**
   * Export compliance report in various formats
   */
  async exportComplianceReport(
    reportId: string,
    format: 'pdf' | 'xlsx' | 'xml' | 'json'
  ): Promise<{ success: boolean; fileName?: string; error?: string }> {
    try {
      // Get report data
      const { data: report, error } = await supabase
        .from('compliance_reports')
        .select('*')
        .eq('id', reportId)
        .single();

      if (error || !report) {
        throw new Error('Report not found');
      }

      const fileName = `compliance_report_${reportId}_${new Date().toISOString().split('T')[0]}.${format}`;

      switch (format) {
        case 'xlsx':
          await this.exportToExcel(report, fileName);
          break;
        case 'json':
          await this.exportToJSON(report, fileName);
          break;
        case 'xml':
          await this.exportToXML(report, fileName);
          break;
        case 'pdf':
          await this.exportToPDF(report, fileName);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      return { success: true, fileName };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Get audit trail for compliance activities
   */
  async getAuditTrail(filters?: {
    dateRange?: { start: string; end: string };
    entityType?: string;
    userId?: string;
    complianceImpact?: string;
  }): Promise<AuditTrail[]> {
    try {
      let query = supabase.from('audit_trail').select('*');

      if (filters?.dateRange) {
        query = query
          .gte('performed_at', filters.dateRange.start)
          .lte('performed_at', filters.dateRange.end);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.userId) {
        query = query.eq('performed_by', filters.userId);
      }

      if (filters?.complianceImpact) {
        query = query.eq('compliance_impact', filters.complianceImpact);
      }

      const { data, error } = await query.order('performed_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      throw error;
    }
  }

  // Private export methods
  private async exportToExcel(report: any, fileName: string): Promise<void> {
    const workbook = XLSX.utils.book_new();
    
    // Add main report data
    const reportSheet = XLSX.utils.json_to_sheet([report.data]);
    XLSX.utils.book_append_sheet(workbook, reportSheet, 'Report Data');
    
    // Add validation results
    const validationSheet = XLSX.utils.json_to_sheet(report.validation_results || []);
    XLSX.utils.book_append_sheet(workbook, validationSheet, 'Validation Results');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    saveAs(blob, fileName);
  }

  private async exportToJSON(report: any, fileName: string): Promise<void> {
    const jsonData = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    saveAs(blob, fileName);
  }

  private async exportToXML(report: any, fileName: string): Promise<void> {
    // Simple XML generation - would use proper XML library in production
    const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<compliance_report>
  <id>${report.id}</id>
  <requirement_id>${report.requirement_id}</requirement_id>
  <generated_date>${report.generated_date}</generated_date>
  <status>${report.status}</status>
  <data>${JSON.stringify(report.data)}</data>
</compliance_report>`;
    
    const blob = new Blob([xmlData], { type: 'application/xml' });
    saveAs(blob, fileName);
  }

  private async exportToPDF(report: any, fileName: string): Promise<void> {
    // Would use PDF generation library like jsPDF in production
    const pdfContent = `Compliance Report\n\nReport ID: ${report.id}\nGenerated: ${report.generated_date}\nStatus: ${report.status}`;
    const blob = new Blob([pdfContent], { type: 'text/plain' });
    saveAs(blob, fileName.replace('.pdf', '.txt'));
  }
}

export const regulatoryComplianceService = new RegulatoryComplianceService();