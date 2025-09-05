/**
 * Report Export Service Tests
 * 
 * Comprehensive test suite for the report export functionality.
 * Tests individual, comparative, and program-wide report generation,
 * multiple export formats, bilingual support, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  reportExportService,
  ReportExportService,
  type ExportRequest,
  type ExportData,
  type MetricExportConfig
} from '../../../services/analytics/report-export-service';

// Mock external dependencies
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    aoa_to_sheet: vi.fn(() => ({ '!ref': 'A1:B2' })),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => Buffer.from('mock excel data'))
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    output: vi.fn(() => new ArrayBuffer(1000))
  }))
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  storage: {
    from: vi.fn(() => mockSupabaseStorage)
  },
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(),
  data: null,
  error: null
};

const mockSupabaseStorage = {
  upload: vi.fn(),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage.example.com/file.pdf' } }))
};

vi.mock('../../../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock analytics services
const mockIndividualProgressAnalyticsService = {
  calculateProgressAnalysis: vi.fn()
};

const mockComparativeAnalyticsService = {
  performComparativeAnalysis: vi.fn()
};

vi.mock('../../../services/analytics/individual-progress-analytics-service', () => ({
  individualProgressAnalyticsService: mockIndividualProgressAnalyticsService
}));

vi.mock('../../../services/analytics/comparative-analytics-service', () => ({
  comparativeAnalyticsService: mockComparativeAnalyticsService
}));

// Mock data
const mockExportConfig: MetricExportConfig = {
  format: 'pdf',
  include_visualizations: true,
  include_raw_data: true,
  include_statistical_analysis: true,
  include_interpretations: true,
  language: 'en',
  date_range: {
    start_date: '2025-08-01',
    end_date: '2025-09-04'
  },
  grouping: 'by_student',
  comparison_metrics: ['metric-1', 'metric-2']
};

const mockExportRequest: ExportRequest = {
  id: 'export-123',
  export_type: 'individual',
  format: 'pdf',
  config: mockExportConfig,
  enrollment_ids: ['enrollment-1'],
  metric_ids: ['metric-1', 'metric-2'],
  requested_by: 'user-123',
  status: 'pending',
  progress_percentage: 0,
  created_at: '2025-09-04T10:00:00Z'
};

const mockExportData: ExportData = {
  metadata: {
    export_id: 'export-123',
    generated_at: '2025-09-04T10:30:00Z',
    language: 'en',
    date_range: {
      start_date: '2025-08-01',
      end_date: '2025-09-04'
    },
    total_enrollments: 1,
    total_metrics: 2
  },
  enrollments: [
    {
      enrollment: {
        id: 'enrollment-1',
        student_id: 'student-1',
        program_template_id: 'program-1',
        individual_start_date: '2025-08-01',
        individual_end_date: '2025-12-01',
        custom_schedule: {},
        assigned_therapist_id: 'therapist-1',
        program_modifications: {},
        enrollment_status: 'active',
        created_at: '2025-08-01T00:00:00Z',
        updated_at: '2025-08-01T00:00:00Z',
        created_by: 'admin-1',
        updated_by: 'admin-1'
      },
      student_info: {
        name: 'Ahmed Ali',
        name_ar: 'أحمد علي',
        age: 8,
        diagnosis: 'Autism Spectrum Disorder',
        enrollment_date: '2025-08-01'
      },
      progress_data: {
        overall_progress_percentage: 75.5,
        trend_direction: 'improving',
        last_assessment_date: '2025-09-01'
      },
      metric_results: {}
    }
  ],
  statistical_summary: {
    mean_progress: 75.5,
    median_progress: 75.5,
    standard_deviation: 0,
    improvement_rate: 1.0,
    completion_rate: 0.0
  },
  recommendations: [
    {
      type: 'individual_focus',
      priority: 'medium',
      description_ar: 'التركيز على تحسين مهارات التواصل',
      description_en: 'Focus on improving communication skills',
      affected_enrollments: ['enrollment-1']
    }
  ]
};

const mockProgressReport = {
  success: true,
  report: {
    enrollment_info: mockExportData.enrollments[0].enrollment,
    student_info: mockExportData.enrollments[0].student_info,
    progress_summary: mockExportData.enrollments[0].progress_data,
    metric_analysis: mockExportData.enrollments[0].metric_results
  }
};

describe('ReportExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.data = null;
    mockSupabase.error = null;
    
    // Setup default mock responses
    mockIndividualProgressAnalyticsService.calculateProgressAnalysis.mockResolvedValue(mockProgressReport);
    mockComparativeAnalyticsService.performComparativeAnalysis.mockResolvedValue({
      success: true,
      metrics_comparison: [],
      overall_effectiveness: 8.5
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance when called multiple times', () => {
      const instance1 = ReportExportService.getInstance();
      const instance2 = ReportExportService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(reportExportService);
    });
  });

  describe('exportIndividualReport', () => {
    it('should create individual export request successfully', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: mockExportRequest, error: null });

      const result = await reportExportService.exportIndividualReport(
        'enrollment-1',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.export_id).toBe(mockExportRequest.id);
      expect(result.message).toBe('Export request created successfully. Processing will begin shortly.');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await reportExportService.exportIndividualReport(
        'enrollment-1',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.export_id).toBeUndefined();
      expect(result.message).toContain('Failed to create export request');
    });

    it('should handle unexpected errors', async () => {
      mockSupabase.insert.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await reportExportService.exportIndividualReport(
        'enrollment-1',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unexpected error occurred while creating export request');
    });
  });

  describe('exportComparativeReport', () => {
    it('should create comparative export request successfully', async () => {
      const comparativeRequest = {
        ...mockExportRequest,
        export_type: 'comparative' as const,
        enrollment_ids: ['enrollment-1', 'enrollment-2']
      };

      mockSupabase.single.mockResolvedValueOnce({ data: comparativeRequest, error: null });

      const result = await reportExportService.exportComparativeReport(
        ['enrollment-1', 'enrollment-2'],
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.export_id).toBe(comparativeRequest.id);
      expect(result.message).toBe('Comparative export request created successfully');
    });

    it('should reject requests with insufficient enrollments', async () => {
      const result = await reportExportService.exportComparativeReport(
        ['enrollment-1'], // Only one enrollment
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Comparative analysis requires at least 2 enrollments');
    });

    it('should handle empty enrollment array', async () => {
      const result = await reportExportService.exportComparativeReport(
        [],
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Comparative analysis requires at least 2 enrollments');
    });
  });

  describe('exportProgramReport', () => {
    it('should create program-wide export request successfully', async () => {
      const mockEnrollments = [
        { id: 'enrollment-1' },
        { id: 'enrollment-2' },
        { id: 'enrollment-3' }
      ];

      mockSupabase.data = mockEnrollments;
      mockSupabase.error = null;
      mockSupabase.single.mockResolvedValueOnce({ 
        data: { ...mockExportRequest, export_type: 'program_wide' }, 
        error: null 
      });

      const result = await reportExportService.exportProgramReport(
        'program-template-123',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.batch_result).toBeDefined();
      expect(result.batch_result?.total_requested).toBe(1);
      expect(result.message).toBe('Program-wide export request created successfully');
    });

    it('should handle programs with no enrollments', async () => {
      mockSupabase.data = [];
      mockSupabase.error = null;

      const result = await reportExportService.exportProgramReport(
        'empty-program-123',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No active enrollments found for this program');
    });

    it('should handle database query errors', async () => {
      mockSupabase.data = null;
      mockSupabase.error = { message: 'Query failed' };

      const result = await reportExportService.exportProgramReport(
        'program-template-123',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('No active enrollments found for this program');
    });
  });

  describe('processBatchExport', () => {
    it('should process multiple export requests successfully', async () => {
      const exportConfigs = [
        {
          enrollment_ids: ['enrollment-1', 'enrollment-2'],
          config: mockExportConfig
        },
        {
          enrollment_ids: ['enrollment-3', 'enrollment-4'],
          config: { ...mockExportConfig, format: 'excel' as const }
        }
      ];

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockExportRequest, id: 'export-1' }, error: null })
        .mockResolvedValueOnce({ data: { ...mockExportRequest, id: 'export-2' }, error: null });

      const result = await reportExportService.processBatchExport(exportConfigs, 'user-123');

      expect(result.total_requested).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.export_ids).toHaveLength(2);
      expect(result.failed_requests).toHaveLength(0);
    });

    it('should handle partial failures in batch processing', async () => {
      const exportConfigs = [
        {
          enrollment_ids: ['enrollment-1', 'enrollment-2'],
          config: mockExportConfig
        },
        {
          enrollment_ids: ['enrollment-3', 'enrollment-4'],
          config: { ...mockExportConfig, format: 'excel' as const }
        }
      ];

      mockSupabase.single
        .mockResolvedValueOnce({ data: { ...mockExportRequest, id: 'export-1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Database error' } });

      const result = await reportExportService.processBatchExport(exportConfigs, 'user-123');

      expect(result.total_requested).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.export_ids).toHaveLength(1);
      expect(result.failed_requests).toHaveLength(1);
    });

    it('should handle unexpected errors during batch processing', async () => {
      const exportConfigs = [
        {
          enrollment_ids: ['enrollment-1', 'enrollment-2'],
          config: mockExportConfig
        }
      ];

      mockSupabase.insert.mockImplementation(() => {
        throw new Error('Unexpected batch error');
      });

      const result = await reportExportService.processBatchExport(exportConfigs, 'user-123');

      expect(result.total_requested).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failed_requests[0].error_message).toBe('Unexpected batch error');
    });
  });

  describe('getExportStatus', () => {
    it('should retrieve export status successfully', async () => {
      const mockStatus = { ...mockExportRequest, status: 'completed', progress_percentage: 100 };
      mockSupabase.single.mockResolvedValueOnce({ data: mockStatus, error: null });

      const result = await reportExportService.getExportStatus('export-123');

      expect(result.success).toBe(true);
      expect(result.export_request).toEqual(mockStatus);
      expect(result.message).toBe('Export status retrieved successfully');
    });

    it('should handle export request not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });

      const result = await reportExportService.getExportStatus('nonexistent-export');

      expect(result.success).toBe(false);
      expect(result.export_request).toBeUndefined();
      expect(result.message).toBe('Export request not found');
    });

    it('should handle database query errors', async () => {
      mockSupabase.single.mockRejectedValueOnce(new Error('Database connection error'));

      const result = await reportExportService.getExportStatus('export-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error retrieving export status');
    });
  });

  describe('cancelExportRequest', () => {
    it('should cancel export request successfully', async () => {
      mockSupabase.error = null;

      const result = await reportExportService.cancelExportRequest('export-123', 'user-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Export request cancelled successfully');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          error_message: 'Cancelled by user'
        })
      );
    });

    it('should handle database update errors', async () => {
      mockSupabase.error = { message: 'Update failed' };

      const result = await reportExportService.cancelExportRequest('export-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to cancel export request');
    });

    it('should handle unexpected cancellation errors', async () => {
      mockSupabase.update.mockImplementation(() => {
        throw new Error('Unexpected cancellation error');
      });

      const result = await reportExportService.cancelExportRequest('export-123', 'user-123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Error cancelling export request');
    });
  });

  describe('PDF Generation', () => {
    it('should generate PDF report with correct structure', async () => {
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).generatePDFReport(mockExportData, mockExportConfig);

      expect(result.success).toBe(true);
      expect(result.file_data).toBeInstanceOf(Buffer);
      expect(result.message).toBe('PDF report generated successfully');
    });

    it('should generate PDF with Arabic language support', async () => {
      const arabicConfig = { ...mockExportConfig, language: 'ar' as const };
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).generatePDFReport(mockExportData, arabicConfig);

      expect(result.success).toBe(true);
      expect(result.file_data).toBeInstanceOf(Buffer);
    });

    it('should handle PDF generation errors', async () => {
      const mockJsPDF = vi.mocked(await import('jspdf')).jsPDF;
      mockJsPDF.mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      const service = ReportExportService.getInstance();
      const result = await (service as any).generatePDFReport(mockExportData, mockExportConfig);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate PDF report');
    });
  });

  describe('Excel Generation', () => {
    it('should generate Excel report with multiple sheets', async () => {
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).generateExcelReport(mockExportData, mockExportConfig);

      expect(result.success).toBe(true);
      expect(result.file_data).toBeInstanceOf(Buffer);
      expect(result.message).toBe('Excel report generated successfully');
    });

    it('should generate Excel with comparative analysis sheet', async () => {
      const dataWithComparison = {
        ...mockExportData,
        comparative_analysis: {
          baseline_metrics: {},
          current_metrics: {},
          comparison_results: [
            {
              metric_id: 'metric-1',
              change_value: 5.2,
              change_percentage: 10.4,
              statistical_significance: 0.05,
              trend_analysis: { direction: 'improving' as const, rate_of_change: 0.1, acceleration: 0.02 },
              clinical_significance: { is_clinically_significant: true, effect_size: 0.8, practical_importance: 'high' as const }
            }
          ],
          overall_progress_summary: {
            total_metrics: 1,
            improving_metrics: 1,
            declining_metrics: 0,
            stable_metrics: 0,
            overall_progress_rating: 8.5,
            progress_interpretation_ar: 'تحسن ممتاز',
            progress_interpretation_en: 'Excellent improvement'
          }
        }
      };

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateExcelReport(dataWithComparison, mockExportConfig);

      expect(result.success).toBe(true);
      expect(result.file_data).toBeInstanceOf(Buffer);
    });

    it('should handle Excel generation errors', async () => {
      const mockXLSX = vi.mocked(await import('xlsx'));
      mockXLSX.write.mockImplementation(() => {
        throw new Error('Excel generation failed');
      });

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateExcelReport(mockExportData, mockExportConfig);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate Excel report');
    });
  });

  describe('CSV Generation', () => {
    it('should generate CSV report with proper UTF-8 BOM', async () => {
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).generateCSVReport(mockExportData, mockExportConfig);

      expect(result.success).toBe(true);
      expect(result.file_data).toBeInstanceOf(Buffer);
      expect(result.message).toBe('CSV report generated successfully');
      
      // Check if BOM is included
      const csvContent = result.file_data!.toString('utf8');
      expect(csvContent).toMatch(/^\ufeff/); // UTF-8 BOM
    });

    it('should properly escape CSV values with quotes', async () => {
      const dataWithQuotes = {
        ...mockExportData,
        enrollments: [{
          ...mockExportData.enrollments[0],
          student_info: {
            ...mockExportData.enrollments[0].student_info,
            name: 'John "Johnny" Doe'
          }
        }]
      };

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateCSVReport(dataWithQuotes, mockExportConfig);

      expect(result.success).toBe(true);
      const csvContent = result.file_data!.toString('utf8');
      expect(csvContent).toContain('"John "Johnny" Doe"');
    });

    it('should handle CSV generation with empty data', async () => {
      const emptyData = {
        ...mockExportData,
        enrollments: []
      };

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateCSVReport(emptyData, mockExportConfig);

      expect(result.success).toBe(true);
      const csvContent = result.file_data!.toString('utf8');
      
      // Should still have headers
      expect(csvContent).toContain('Student Name');
      expect(csvContent).toContain('Age');
    });
  });

  describe('JSON Generation', () => {
    it('should generate JSON report with proper formatting', async () => {
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).generateJSONReport(mockExportData, mockExportConfig);

      expect(result.success).toBe(true);
      expect(result.file_data).toBeInstanceOf(Buffer);
      expect(result.message).toBe('JSON report generated successfully');

      const jsonContent = result.file_data!.toString('utf8');
      const parsedData = JSON.parse(jsonContent);
      expect(parsedData).toEqual(mockExportData);
    });

    it('should handle JSON generation with complex nested objects', async () => {
      const complexData = {
        ...mockExportData,
        complex_analysis: {
          nested: {
            deeply: {
              values: [1, 2, 3, { key: 'value' }]
            }
          }
        }
      };

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateJSONReport(complexData, mockExportConfig);

      expect(result.success).toBe(true);
      const jsonContent = result.file_data!.toString('utf8');
      const parsedData = JSON.parse(jsonContent);
      expect(parsedData.complex_analysis.nested.deeply.values).toEqual([1, 2, 3, { key: 'value' }]);
    });

    it('should handle JSON circular reference errors', async () => {
      const circularData = { ...mockExportData };
      (circularData as any).self = circularData; // Create circular reference

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateJSONReport(circularData, mockExportConfig);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate JSON report');
    });
  });

  describe('File Upload', () => {
    it('should upload file to storage successfully', async () => {
      mockSupabaseStorage.upload.mockResolvedValueOnce({ data: { path: 'exports/export_123.pdf' }, error: null });

      const service = ReportExportService.getInstance();
      const testBuffer = Buffer.from('test file content');
      
      const result = await (service as any).uploadExportFile('export-123', testBuffer, 'pdf');

      expect(result.success).toBe(true);
      expect(result.file_url).toBe('https://storage.example.com/file.pdf');
      expect(result.file_size).toBe(testBuffer.length);
      expect(result.message).toBe('Export file uploaded successfully');
    });

    it('should handle upload errors', async () => {
      mockSupabaseStorage.upload.mockResolvedValueOnce({ data: null, error: { message: 'Upload failed' } });

      const service = ReportExportService.getInstance();
      const testBuffer = Buffer.from('test file content');
      
      const result = await (service as any).uploadExportFile('export-123', testBuffer, 'pdf');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to upload export file');
    });

    it('should handle different file formats with correct MIME types', async () => {
      mockSupabaseStorage.upload.mockResolvedValue({ data: { path: 'exports/test' }, error: null });

      const service = ReportExportService.getInstance();
      const testBuffer = Buffer.from('test');

      const formats = ['pdf', 'excel', 'csv', 'json', 'png', 'svg'];
      
      for (const format of formats) {
        await (service as any).uploadExportFile('export-123', testBuffer, format);
        
        // Verify upload was called with correct content type
        expect(mockSupabaseStorage.upload).toHaveBeenCalledWith(
          expect.any(String),
          testBuffer,
          expect.objectContaining({
            contentType: expect.any(String)
          })
        );
      }
    });
  });

  describe('Utility Functions', () => {
    it('should calculate median correctly for odd number of values', () => {
      const service = ReportExportService.getInstance();
      const values = [1, 3, 5, 7, 9];
      
      const median = (service as any).calculateMedian(values);
      expect(median).toBe(5);
    });

    it('should calculate median correctly for even number of values', () => {
      const service = ReportExportService.getInstance();
      const values = [1, 2, 3, 4];
      
      const median = (service as any).calculateMedian(values);
      expect(median).toBe(2.5); // (2 + 3) / 2
    });

    it('should calculate standard deviation correctly', () => {
      const service = ReportExportService.getInstance();
      const values = [2, 4, 6, 8];
      
      const stdDev = (service as any).calculateStandardDeviation(values);
      expect(stdDev).toBeCloseTo(2.236, 2); // √5 ≈ 2.236
    });

    it('should calculate standard deviation for single value', () => {
      const service = ReportExportService.getInstance();
      const values = [5];
      
      const stdDev = (service as any).calculateStandardDeviation(values);
      expect(stdDev).toBe(0);
    });

    it('should return correct MIME types for formats', () => {
      const service = ReportExportService.getInstance();
      
      const mimeTypes = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
        json: 'application/json',
        png: 'image/png',
        svg: 'image/svg+xml'
      };

      Object.entries(mimeTypes).forEach(([format, expectedMimeType]) => {
        const mimeType = (service as any).getMimeType(format);
        expect(mimeType).toBe(expectedMimeType);
      });
    });

    it('should return default MIME type for unknown formats', () => {
      const service = ReportExportService.getInstance();
      const mimeType = (service as any).getMimeType('unknown');
      expect(mimeType).toBe('application/octet-stream');
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      mockIndividualProgressAnalyticsService.calculateProgressAnalysis.mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await reportExportService.exportIndividualReport(
        'enrollment-1',
        mockExportConfig,
        'user-123'
      );

      // Should still create export request, error handling happens during processing
      expect(result.success).toBe(true);
    });

    it('should handle network timeout errors', async () => {
      mockSupabase.insert.mockImplementation(() => {
        const error = new Error('Network timeout');
        error.name = 'NetworkError';
        throw error;
      });

      const result = await reportExportService.exportIndividualReport(
        'enrollment-1',
        mockExportConfig,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unexpected error occurred while creating export request');
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        ...mockExportData,
        enrollments: [
          {
            // Missing required fields
            student_info: null,
            progress_data: undefined
          }
        ]
      } as any;

      const service = ReportExportService.getInstance();
      const result = await (service as any).generateCSVReport(malformedData, mockExportConfig);

      // Should handle null/undefined values gracefully
      expect(result.success).toBe(true);
    });
  });

  describe('Data Collection', () => {
    it('should collect export data successfully', async () => {
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).collectExportData(mockExportRequest);

      expect(result.metadata.export_id).toBe(mockExportRequest.id);
      expect(result.enrollments).toHaveLength(1);
      expect(result.statistical_summary).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should handle comparative analysis when multiple enrollments', async () => {
      const multiEnrollmentRequest = {
        ...mockExportRequest,
        enrollment_ids: ['enrollment-1', 'enrollment-2']
      };

      const service = ReportExportService.getInstance();
      const result = await (service as any).collectExportData(multiEnrollmentRequest);

      expect(result.comparative_analysis).toBeDefined();
      expect(mockComparativeAnalyticsService.performComparativeAnalysis).toHaveBeenCalled();
    });

    it('should calculate statistical summary correctly', async () => {
      const service = ReportExportService.getInstance();
      
      const result = await (service as any).collectExportData(mockExportRequest);

      expect(result.statistical_summary.mean_progress).toBe(75.5);
      expect(result.statistical_summary.median_progress).toBe(75.5);
      expect(result.statistical_summary.improvement_rate).toBe(1.0);
      expect(result.statistical_summary.completion_rate).toBe(0.0);
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeEnrollmentIds = Array.from({ length: 100 }, (_, i) => `enrollment-${i}`);
      const largeRequest = {
        ...mockExportRequest,
        enrollment_ids: largeEnrollmentIds
      };

      // Mock multiple progress reports
      const mockLargeProgressReport = { ...mockProgressReport };
      mockIndividualProgressAnalyticsService.calculateProgressAnalysis
        .mockResolvedValue(mockLargeProgressReport);

      const service = ReportExportService.getInstance();
      const startTime = performance.now();
      
      const result = await (service as any).collectExportData(largeRequest);
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds for 100 enrollments)
      expect(processingTime).toBeLessThan(5000);
      expect(result.enrollments).toHaveLength(100);
    });

    it('should not make excessive API calls', async () => {
      const service = ReportExportService.getInstance();
      
      await (service as any).collectExportData(mockExportRequest);

      // Should make exactly one call per enrollment
      expect(mockIndividualProgressAnalyticsService.calculateProgressAnalysis)
        .toHaveBeenCalledTimes(mockExportRequest.enrollment_ids.length);
    });
  });
});