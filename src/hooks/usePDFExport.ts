/**
 * React Query hooks for PDF Export System
 * Comprehensive hooks for PDF generation, template management, and analytics
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { pdfExportService } from '@/services/pdf-export-service';
import { supabase } from '@/lib/supabase';
import type {
  PDFGenerationRequest,
  PDFGenerationResult,
  PDFTemplate,
  PDFBatchSettings,
  PDFBatchProgress,
  PDFAnalytics,
  PDFQualityReport,
  PDFValidationConfig,
  DocumentLanguage,
  PDFFormat,
  CreatePDFTemplateRequest,
  UpdatePDFTemplateRequest,
  PDFExportFilters
} from '@/types/pdf-export';

// PDF Generation Hooks
export function useGeneratePDF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: PDFGenerationRequest): Promise<PDFGenerationResult> => {
      return await pdfExportService.generateIEPPDF(request);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-exports'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-analytics'] });
      
      // Cache the generated PDF result
      queryClient.setQueryData(['pdf-result', result.document_id], result);
    },
  });
}

export function useBatchPDFGeneration() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<PDFBatchProgress | null>(null);

  const mutation = useMutation({
    mutationFn: async ({
      requests,
      settings
    }: {
      requests: PDFGenerationRequest[];
      settings: PDFBatchSettings;
    }): Promise<PDFBatchProgress> => {
      // Set up progress callback
      const settingsWithCallback: PDFBatchSettings = {
        ...settings,
        progress_callback: (progress) => {
          setProgress(progress);
        }
      };

      return await pdfExportService.generateBatchPDFs(requests, settingsWithCallback);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-exports'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-analytics'] });
    },
    onError: () => {
      setProgress(null);
    }
  });

  return {
    ...mutation,
    progress,
    resetProgress: () => setProgress(null)
  };
}

export function usePDFResult(documentId: string, enabled = true) {
  return useQuery({
    queryKey: ['pdf-result', documentId],
    queryFn: async (): Promise<PDFGenerationResult | null> => {
      const { data, error } = await supabase
        .from('pdf_generation_logs')
        .select('*')
        .eq('document_id', documentId)
        .single();

      if (error || !data) return null;

      return {
        success: data.success,
        document_id: data.document_id,
        file_path: data.file_path,
        file_url: data.file_url,
        file_size: data.file_size,
        template_used: data.template_id,
        language_used: data.language,
        pages_generated: data.pages_generated,
        generation_time: data.generation_time,
        is_password_protected: data.is_password_protected || false,
        has_digital_signature: data.has_digital_signature || false,
        has_watermark: data.has_watermark || false,
        generated_at: data.created_at,
        generated_by: data.generated_by,
        expires_at: data.expires_at
      };
    },
    enabled: enabled && !!documentId,
    staleTime: 60000, // 1 minute
  });
}

// PDF Template Management Hooks
export function usePDFTemplates(filters?: {
  format?: PDFFormat;
  language?: DocumentLanguage;
  category?: string;
  is_active?: boolean;
}, enabled = true) {
  return useQuery({
    queryKey: ['pdf-templates', filters],
    queryFn: async (): Promise<PDFTemplate[]> => {
      let query = supabase
        .from('pdf_templates')
        .select('*')
        .order('name_en', { ascending: true });

      if (filters?.format) {
        query = query.eq('format', filters.format);
      }
      
      if (filters?.language) {
        query = query.eq('language', filters.language);
      }
      
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data || [];
    },
    enabled,
    staleTime: 300000, // 5 minutes
  });
}

export function usePDFTemplate(templateId: string, enabled = true) {
  return useQuery({
    queryKey: ['pdf-template', templateId],
    queryFn: async (): Promise<PDFTemplate> => {
      const { data, error } = await supabase
        .from('pdf_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: enabled && !!templateId,
    staleTime: 300000, // 5 minutes
  });
}

export function useCreatePDFTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateData: CreatePDFTemplateRequest): Promise<PDFTemplate> => {
      return await pdfExportService.createTemplate(templateData);
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.setQueryData(['pdf-template', newTemplate.id], newTemplate);
    },
  });
}

export function useUpdatePDFTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      updates
    }: {
      templateId: string;
      updates: UpdatePDFTemplateRequest;
    }): Promise<PDFTemplate> => {
      return await pdfExportService.updateTemplate(templateId, updates);
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.setQueryData(['pdf-template', updatedTemplate.id], updatedTemplate);
    },
  });
}

export function useDeletePDFTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string): Promise<void> => {
      await pdfExportService.deleteTemplate(templateId);
    },
    onSuccess: (_, templateId) => {
      queryClient.invalidateQueries({ queryKey: ['pdf-templates'] });
      queryClient.removeQueries({ queryKey: ['pdf-template', templateId] });
    },
  });
}

// PDF Export History and Management
export function usePDFExports(filters?: PDFExportFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['pdf-exports', filters],
    queryFn: async ({ pageParam = 1 }) => {
      let query = supabase
        .from('pdf_generation_logs')
        .select(`
          *,
          template:pdf_templates(name_ar, name_en),
          iep:ieps(student_name_ar, student_name_en)
        `)
        .order('created_at', { ascending: false })
        .range((pageParam - 1) * 20, pageParam * 20 - 1);

      // Apply filters
      if (filters?.template_id) {
        query = query.eq('template_id', filters.template_id);
      }
      
      if (filters?.language) {
        query = query.eq('language', filters.language);
      }
      
      if (filters?.format) {
        query = query.eq('format', filters.format);
      }
      
      if (filters?.generated_by) {
        query = query.eq('generated_by', filters.generated_by);
      }
      
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        exports: data || [],
        total: count || 0,
        page: pageParam,
        has_more: data?.length === 20
      };
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
    enabled,
    staleTime: 60000, // 1 minute
  });
}

export function useDeletePDFExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string): Promise<void> => {
      // Delete from storage
      const { data: logData } = await supabase
        .from('pdf_generation_logs')
        .select('file_path')
        .eq('document_id', documentId)
        .single();

      if (logData?.file_path) {
        await supabase.storage
          .from('documents')
          .remove([logData.file_path]);
      }

      // Delete log entry
      const { error } = await supabase
        .from('pdf_generation_logs')
        .delete()
        .eq('document_id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-exports'] });
    },
  });
}

// PDF Download and Access
export function useDownloadPDF() {
  return useMutation({
    mutationFn: async (documentId: string): Promise<string> => {
      const { data: logData } = await supabase
        .from('pdf_generation_logs')
        .select('file_path')
        .eq('document_id', documentId)
        .single();

      if (!logData?.file_path) {
        throw new Error('PDF file not found');
      }

      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(logData.file_path, 3600); // 1 hour

      if (!data?.signedUrl) {
        throw new Error('Failed to generate download URL');
      }

      return data.signedUrl;
    },
  });
}

// PDF Quality Validation
export function useValidatePDFQuality() {
  return useMutation({
    mutationFn: async ({
      documentId,
      config
    }: {
      documentId: string;
      config: PDFValidationConfig;
    }): Promise<PDFQualityReport> => {
      return await pdfExportService.validatePDFQuality(documentId, config);
    },
  });
}

// PDF Analytics
export function usePDFAnalytics(
  dateFrom: string,
  dateTo: string,
  filters?: {
    template_id?: string;
    language?: DocumentLanguage;
    generated_by?: string;
  },
  enabled = true
) {
  return useQuery({
    queryKey: ['pdf-analytics', dateFrom, dateTo, filters],
    queryFn: async (): Promise<PDFAnalytics[]> => {
      return await pdfExportService.getPDFAnalytics({
        date_from: dateFrom,
        date_to: dateTo,
        ...filters
      });
    },
    enabled: enabled && !!dateFrom && !!dateTo,
    staleTime: 300000, // 5 minutes
  });
}

export function usePDFGenerationStats(enabled = true) {
  return useQuery({
    queryKey: ['pdf-generation-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdf_generation_logs')
        .select(`
          success,
          generation_time,
          file_size,
          pages_generated,
          template_id,
          language,
          created_at
        `)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const stats = {
        total_generations: data?.length || 0,
        successful_generations: data?.filter(d => d.success).length || 0,
        failed_generations: data?.filter(d => !d.success).length || 0,
        average_generation_time: data?.length ? 
          data.reduce((sum, d) => sum + (d.generation_time || 0), 0) / data.length : 0,
        average_file_size: data?.length ?
          data.reduce((sum, d) => sum + (d.file_size || 0), 0) / data.length : 0,
        average_pages: data?.length ?
          data.reduce((sum, d) => sum + (d.pages_generated || 0), 0) / data.length : 0,
        success_rate: data?.length ?
          (data.filter(d => d.success).length / data.length) * 100 : 0,
        most_used_template: '',
        most_used_language: 'ar' as DocumentLanguage,
        daily_generation_trend: [] as Array<{ date: string; count: number }>
      };

      // Calculate most used template
      if (data?.length) {
        const templateCounts = data.reduce((acc, d) => {
          acc[d.template_id] = (acc[d.template_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        stats.most_used_template = Object.keys(templateCounts).reduce((a, b) =>
          templateCounts[a] > templateCounts[b] ? a : b
        );

        // Calculate most used language
        const languageCounts = data.reduce((acc, d) => {
          acc[d.language] = (acc[d.language] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        stats.most_used_language = Object.keys(languageCounts).reduce((a, b) =>
          languageCounts[a] > languageCounts[b] ? a : b
        ) as DocumentLanguage;
      }

      return stats;
    },
    enabled,
    staleTime: 300000, // 5 minutes
    refetchInterval: 300000, // Refetch every 5 minutes
  });
}

// Template Usage Analytics
export function useTemplateUsageStats(templateId?: string, enabled = true) {
  return useQuery({
    queryKey: ['template-usage-stats', templateId],
    queryFn: async () => {
      let query = supabase
        .from('pdf_generation_logs')
        .select('template_id, success, generation_time, file_size, created_at');

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const stats = data?.reduce((acc, log) => {
        const templateId = log.template_id;
        if (!acc[templateId]) {
          acc[templateId] = {
            total_uses: 0,
            successful_uses: 0,
            failed_uses: 0,
            average_generation_time: 0,
            average_file_size: 0,
            last_used: ''
          };
        }

        acc[templateId].total_uses++;
        if (log.success) {
          acc[templateId].successful_uses++;
        } else {
          acc[templateId].failed_uses++;
        }
        
        if (log.created_at > acc[templateId].last_used) {
          acc[templateId].last_used = log.created_at;
        }

        return acc;
      }, {} as Record<string, any>);

      return stats || {};
    },
    enabled: enabled,
    staleTime: 300000, // 5 minutes
  });
}

// Quick PDF Generation for common scenarios
export function useQuickPDFGeneration() {
  const generatePDF = useGeneratePDF();

  const generateStandardIEP = useCallback(async (iepId: string, language: DocumentLanguage = 'ar') => {
    return generatePDF.mutateAsync({
      iep_id: iepId,
      template_id: 'standard-iep-template',
      language,
      format: 'standard',
      include_sections: ['student_info', 'goals_objectives', 'services', 'team_members', 'signatures'],
      generated_by: 'current-user', // This would come from auth context
      generation_purpose: 'Standard IEP Document'
    });
  }, [generatePDF]);

  const generateParentFriendlyIEP = useCallback(async (iepId: string, language: DocumentLanguage = 'ar') => {
    return generatePDF.mutateAsync({
      iep_id: iepId,
      template_id: 'parent-friendly-template',
      language,
      format: 'parent_friendly',
      include_sections: ['student_info', 'goals_objectives', 'services'],
      generated_by: 'current-user',
      generation_purpose: 'Parent-Friendly IEP Summary'
    });
  }, [generatePDF]);

  const generateLegalIEP = useCallback(async (iepId: string, language: DocumentLanguage = 'ar') => {
    return generatePDF.mutateAsync({
      iep_id: iepId,
      template_id: 'legal-template',
      language,
      format: 'legal',
      include_sections: ['student_info', 'goals_objectives', 'services', 'team_members', 'signatures', 'appendices'],
      digital_signature: true,
      watermark: 'OFFICIAL DOCUMENT',
      generated_by: 'current-user',
      generation_purpose: 'Legal IEP Document'
    });
  }, [generatePDF]);

  return {
    generateStandardIEP,
    generateParentFriendlyIEP,
    generateLegalIEP,
    isGenerating: generatePDF.isPending
  };
}

// PDF Template Validation
export function useValidatePDFTemplate() {
  return useMutation({
    mutationFn: async (template: PDFTemplate): Promise<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
    }> => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate required fields
      if (!template.name_ar || !template.name_en) {
        errors.push('Template name is required in both languages');
      }

      if (!template.sections || template.sections.length === 0) {
        errors.push('Template must have at least one section');
      }

      // Validate sections
      template.sections?.forEach((section, index) => {
        if (!section.title_ar || !section.title_en) {
          errors.push(`Section ${index + 1} must have title in both languages`);
        }

        if (!section.content_fields || section.content_fields.length === 0) {
          warnings.push(`Section ${index + 1} has no content fields`);
        }
      });

      // Validate Arabic font settings
      if (template.language === 'ar' || template.language === 'bilingual') {
        if (!template.styling.arabic_font_settings) {
          warnings.push('Arabic font settings are recommended for Arabic templates');
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    },
  });
}