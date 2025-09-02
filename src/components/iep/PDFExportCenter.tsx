/**
 * PDF Export Center Component
 * Comprehensive PDF generation interface with batch processing, security, and Arabic support
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  FileText,
  Download,
  Settings,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileDown,
  Printer,
  Share2,
  Copy,
  Trash2,
  MoreVertical,
  Filter,
  Search,
  Zap,
  Shield,
  Image,
  Type,
  Layout
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

import {
  useGeneratePDF,
  useBatchPDFGeneration,
  usePDFExports,
  useDownloadPDF,
  useDeletePDFExport,
  usePDFTemplates,
  useQuickPDFGeneration,
  usePDFGenerationStats
} from '@/hooks/usePDFExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

import type {
  PDFGenerationRequest,
  PDFGenerationResult,
  PDFTemplate,
  DocumentLanguage,
  PDFFormat,
  SecurityLevel,
  PDFExportFilters
} from '@/types/pdf-export';

interface PDFExportCenterProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
  selectedIEPs?: string[];
}

const PDFExportCenter: React.FC<PDFExportCenterProps> = ({
  isOpen,
  onClose,
  language,
  selectedIEPs = []
}) => {
  const { isRTL } = useLanguage();
  const { toast } = useToast();

  const [selectedTab, setSelectedTab] = useState<'export' | 'history' | 'batch'>('export');
  const [exportForm, setExportForm] = useState<Partial<PDFGenerationRequest>>({
    language: 'ar',
    format: 'standard',
    include_sections: ['student_info', 'goals_objectives', 'services', 'signatures'],
    generated_by: 'current-user',
    generation_purpose: 'Standard IEP Export'
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [securityEnabled, setSecurityEnabled] = useState(false);
  const [passwordProtection, setPasswordProtection] = useState('');
  const [watermarkText, setWatermarkText] = useState('');
  const [digitalSignature, setDigitalSignature] = useState(false);
  const [selectedExports, setSelectedExports] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exportFilters, setExportFilters] = useState<PDFExportFilters>({});

  // Hooks
  const generatePDF = useGeneratePDF();
  const batchGeneration = useBatchPDFGeneration();
  const downloadPDF = useDownloadPDF();
  const deleteExport = useDeletePDFExport();
  const { generateStandardIEP, generateParentFriendlyIEP, generateLegalIEP } = useQuickPDFGeneration();
  
  const { data: templates } = usePDFTemplates({ is_active: true });
  const { data: exportHistory } = usePDFExports(exportFilters);
  const { data: generationStats } = usePDFGenerationStats();

  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplate(defaultTemplate.id);
      setExportForm(prev => ({ ...prev, template_id: defaultTemplate.id }));
    }
  }, [templates, selectedTemplate]);

  // Handle single IEP export
  const handleSingleExport = async () => {
    if (!exportForm.iep_id || !selectedTemplate) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار IEP والقالب' : 'Please select IEP and template',
        variant: 'destructive',
      });
      return;
    }

    try {
      const request: PDFGenerationRequest = {
        ...exportForm,
        template_id: selectedTemplate,
        password_protection: securityEnabled ? passwordProtection : undefined,
        watermark: watermarkText || undefined,
        digital_signature: digitalSignature,
      } as PDFGenerationRequest;

      const result = await generatePDF.mutateAsync(request);
      
      if (result.success) {
        toast({
          title: language === 'ar' ? 'تم إنشاء PDF' : 'PDF Generated',
          description: language === 'ar' ? 'تم إنشاء ملف PDF بنجاح' : 'PDF file generated successfully',
        });
        
        // Auto-download if requested
        if (result.file_url) {
          window.open(result.file_url, '_blank');
        }
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ في الإنشاء' : 'Generation Error',
        description: language === 'ar' ? 'فشل في إنشاء ملف PDF' : 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  // Handle batch export
  const handleBatchExport = async () => {
    if (selectedIEPs.length === 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار IEPs للتصدير المجمع' : 'Please select IEPs for batch export',
        variant: 'destructive',
      });
      return;
    }

    try {
      const requests: PDFGenerationRequest[] = selectedIEPs.map(iepId => ({
        ...exportForm,
        iep_id: iepId,
        template_id: selectedTemplate,
        password_protection: securityEnabled ? passwordProtection : undefined,
        watermark: watermarkText || undefined,
        digital_signature: digitalSignature,
        is_batch_generation: true
      } as PDFGenerationRequest));

      const settings = {
        iep_ids: selectedIEPs,
        combine_into_single_pdf: false,
        individual_passwords: securityEnabled,
        zip_output: true,
        naming_convention: {
          pattern: 'iep_{student_name}_{date}',
          include_student_name: true,
          include_iep_date: true,
          include_timestamp: false,
          include_template_name: false,
          date_format: 'YYYY-MM-DD',
          case_style: 'lowercase' as const
        }
      };

      await batchGeneration.mutateAsync({ requests, settings });
      
      toast({
        title: language === 'ar' ? 'تم البدء في التصدير المجمع' : 'Batch Export Started',
        description: language === 'ar' ? 'سيتم إشعارك عند اكتمال العملية' : 'You will be notified when the process is complete',
      });
      
      setSelectedTab('batch');
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ في التصدير المجمع' : 'Batch Export Error',
        description: language === 'ar' ? 'فشل في بدء التصدير المجمع' : 'Failed to start batch export',
        variant: 'destructive',
      });
    }
  };

  // Quick export functions
  const handleQuickExport = async (type: 'standard' | 'parent_friendly' | 'legal', iepId: string) => {
    try {
      let result;
      switch (type) {
        case 'standard':
          result = await generateStandardIEP(iepId, exportForm.language as DocumentLanguage);
          break;
        case 'parent_friendly':
          result = await generateParentFriendlyIEP(iepId, exportForm.language as DocumentLanguage);
          break;
        case 'legal':
          result = await generateLegalIEP(iepId, exportForm.language as DocumentLanguage);
          break;
      }

      if (result.success) {
        toast({
          title: language === 'ar' ? 'تم إنشاء PDF' : 'PDF Generated',
          description: language === 'ar' ? 'تم إنشاء ملف PDF بنجاح' : 'PDF file generated successfully',
        });
        
        if (result.file_url) {
          window.open(result.file_url, '_blank');
        }
      }
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في إنشاء PDF' : 'Failed to generate PDF',
        variant: 'destructive',
      });
    }
  };

  // Handle download
  const handleDownload = async (documentId: string) => {
    try {
      const downloadUrl = await downloadPDF.mutateAsync(documentId);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ في التحميل' : 'Download Error',
        description: language === 'ar' ? 'فشل في تحميل الملف' : 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  // Handle delete export
  const handleDeleteExport = async (documentId: string) => {
    try {
      await deleteExport.mutateAsync(documentId);
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف الملف بنجاح' : 'File deleted successfully',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ في الحذف' : 'Delete Error',
        description: language === 'ar' ? 'فشل في حذف الملف' : 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  // Render export form
  const renderExportForm = () => (
    <div className="space-y-6">
      {/* IEP Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ar' ? 'اختيار البرنامج التعليمي' : 'IEP Selection'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'البرنامج التعليمي' : 'Select IEP'}</Label>
              <Select
                value={exportForm.iep_id}
                onValueChange={(value) => setExportForm({ ...exportForm, iep_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر البرنامج التعليمي' : 'Select IEP'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iep-1">Ahmed Mohammed - Grade 5</SelectItem>
                  <SelectItem value="iep-2">Sara Ali - Grade 3</SelectItem>
                  <SelectItem value="iep-3">Omar Hassan - Grade 7</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quick Export Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportForm.iep_id && handleQuickExport('standard', exportForm.iep_id)}
                disabled={!exportForm.iep_id}
              >
                <Zap className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'تصدير قياسي' : 'Quick Standard'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportForm.iep_id && handleQuickExport('parent_friendly', exportForm.iep_id)}
                disabled={!exportForm.iep_id}
              >
                <Users className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'للوالدين' : 'Parent Friendly'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportForm.iep_id && handleQuickExport('legal', exportForm.iep_id)}
                disabled={!exportForm.iep_id}
              >
                <Shield className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'قانوني' : 'Legal'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Template and Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ar' ? 'إعدادات التصدير' : 'Export Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'القالب' : 'Template'}</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {language === 'ar' ? template.name_ar : template.name_en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'التنسيق' : 'Format'}</Label>
              <Select
                value={exportForm.format}
                onValueChange={(value: PDFFormat) => setExportForm({ ...exportForm, format: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{language === 'ar' ? 'قياسي' : 'Standard'}</SelectItem>
                  <SelectItem value="compact">{language === 'ar' ? 'مضغوط' : 'Compact'}</SelectItem>
                  <SelectItem value="detailed">{language === 'ar' ? 'مفصل' : 'Detailed'}</SelectItem>
                  <SelectItem value="summary">{language === 'ar' ? 'ملخص' : 'Summary'}</SelectItem>
                  <SelectItem value="legal">{language === 'ar' ? 'قانوني' : 'Legal'}</SelectItem>
                  <SelectItem value="parent_friendly">{language === 'ar' ? 'مناسب للوالدين' : 'Parent Friendly'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'اللغة' : 'Language'}</Label>
              <Select
                value={exportForm.language}
                onValueChange={(value: DocumentLanguage) => setExportForm({ ...exportForm, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">{language === 'ar' ? 'عربي' : 'Arabic'}</SelectItem>
                  <SelectItem value="en">{language === 'ar' ? 'إنجليزي' : 'English'}</SelectItem>
                  <SelectItem value="bilingual">{language === 'ar' ? 'ثنائي اللغة' : 'Bilingual'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'الغرض' : 'Purpose'}</Label>
              <Input
                value={exportForm.generation_purpose}
                onChange={(e) => setExportForm({ ...exportForm, generation_purpose: e.target.value })}
                placeholder={language === 'ar' ? 'غرض الإنشاء' : 'Generation purpose'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="security"
                checked={securityEnabled}
                onCheckedChange={setSecurityEnabled}
              />
              <Label htmlFor="security">
                {language === 'ar' ? 'تفعيل الحماية بكلمة مرور' : 'Enable password protection'}
              </Label>
            </div>

            {securityEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{language === 'ar' ? 'كلمة المرور' : 'Password'}</Label>
                  <Input
                    type="password"
                    value={passwordProtection}
                    onChange={(e) => setPasswordProtection(e.target.value)}
                    placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>{language === 'ar' ? 'العلامة المائية' : 'Watermark'}</Label>
              <Input
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder={language === 'ar' ? 'نص العلامة المائية (اختياري)' : 'Watermark text (optional)'}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="digital-signature"
                checked={digitalSignature}
                onCheckedChange={setDigitalSignature}
              />
              <Label htmlFor="digital-signature">
                {language === 'ar' ? 'التوقيع الرقمي' : 'Digital signature'}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Actions */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSingleExport}
          disabled={generatePDF.isPending || !exportForm.iep_id}
          className="min-w-32"
        >
          {generatePDF.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {language === 'ar' ? 'جاري الإنشاء...' : 'Generating...'}
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'إنشاء PDF' : 'Generate PDF'}
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Render batch export tab
  const renderBatchExport = () => (
    <div className="space-y-6">
      {batchGeneration.progress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {language === 'ar' ? 'التصدير المجمع قيد التقدم' : 'Batch Export in Progress'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{language === 'ar' ? 'التقدم:' : 'Progress:'}</span>
                <span>
                  {batchGeneration.progress.completed_documents} / {batchGeneration.progress.total_documents}
                </span>
              </div>
              
              <Progress value={batchGeneration.progress.progress_percentage} className="w-full" />
              
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'المستند الحالي:' : 'Current document:'} {batchGeneration.progress.current_document}
              </div>
              
              {batchGeneration.progress.estimated_time_remaining > 0 && (
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'الوقت المتبقي المقدر:' : 'Estimated time remaining:'} {Math.round(batchGeneration.progress.estimated_time_remaining / 1000)}s
                </div>
              )}

              {batchGeneration.progress.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {batchGeneration.progress.errors.length} {language === 'ar' ? 'أخطاء حدثت أثناء المعالجة' : 'errors occurred during processing'}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ar' ? 'إعدادات التصدير المجمع' : 'Batch Export Settings'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>{language === 'ar' ? 'البرامج المحددة للتصدير' : 'Selected IEPs for Export'}</Label>
              <div className="text-sm text-gray-600">
                {selectedIEPs.length} {language === 'ar' ? 'برنامج محدد' : 'IEPs selected'}
              </div>
            </div>

            <Button
              onClick={handleBatchExport}
              disabled={batchGeneration.isPending || selectedIEPs.length === 0}
              className="w-full"
            >
              {batchGeneration.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'بدء التصدير المجمع' : 'Start Batch Export'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render export history
  const renderExportHistory = () => (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={language === 'ar' ? 'البحث في السجل...' : 'Search history...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Export History List */}
      <ScrollArea className="h-[500px]">
        {exportHistory?.pages[0]?.exports?.length ? (
          <div className="space-y-2">
            {exportHistory.pages[0].exports.map((exportItem: any) => (
              <Card key={exportItem.document_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">
                          {exportItem.iep?.student_name_ar || exportItem.iep?.student_name_en || 'Unknown IEP'}
                        </span>
                        <Badge 
                          variant={exportItem.success ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {exportItem.success ? (language === 'ar' ? 'نجح' : 'Success') : (language === 'ar' ? 'فشل' : 'Failed')}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-x-4 space-x-reverse">
                        <span>
                          {exportItem.template?.name_ar || exportItem.template?.name_en || 'Unknown Template'}
                        </span>
                        <span>•</span>
                        <span>{exportItem.language}</span>
                        <span>•</span>
                        <span>{exportItem.format}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(exportItem.created_at), 'MMM dd, yyyy HH:mm', {
                            locale: language === 'ar' ? ar : enUS
                          })}
                        </span>
                      </div>
                      
                      {exportItem.file_size && (
                        <div className="text-xs text-gray-500 mt-1">
                          {(exportItem.file_size / 1024).toFixed(1)} KB • {exportItem.pages_generated} pages
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {exportItem.success && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(exportItem.document_id)}
                            disabled={downloadPDF.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                              <DropdownMenuItem onClick={() => handleDownload(exportItem.document_id)}>
                                <Download className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'تحميل' : 'Download'}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Share2 className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'مشاركة' : 'Share'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDeleteExport(exportItem.document_id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {language === 'ar' ? 'حذف' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {language === 'ar' ? 'لا يوجد سجل تصدير' : 'No export history'}
            </h3>
            <p className="text-gray-500">
              {language === 'ar' 
                ? 'ستظهر ملفات PDF المصدرة هنا'
                : 'Your exported PDF files will appear here'
              }
            </p>
          </div>
        )}
      </ScrollArea>

      {/* Statistics */}
      {generationStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'ar' ? 'إحصائيات التصدير' : 'Export Statistics'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {generationStats.total_generations}
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'إجمالي التصديرات' : 'Total Exports'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {generationStats.success_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'معدل النجاح' : 'Success Rate'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {generationStats.average_generation_time.toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'متوسط الوقت' : 'Avg Time'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(generationStats.average_file_size / 1024).toFixed(0)} KB
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'متوسط الحجم' : 'Avg Size'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-6xl h-[90vh] ${isRTL ? 'font-arabic' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FileText className="h-6 w-6" />
            {language === 'ar' ? 'مركز تصدير PDF' : 'PDF Export Center'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">
              {language === 'ar' ? 'تصدير فردي' : 'Single Export'}
            </TabsTrigger>
            <TabsTrigger value="batch">
              {language === 'ar' ? 'تصدير مجمع' : 'Batch Export'}
            </TabsTrigger>
            <TabsTrigger value="history">
              {language === 'ar' ? 'السجل' : 'History'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="mt-6">
            <ScrollArea className="h-[600px]">
              {renderExportForm()}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="batch" className="mt-6">
            <ScrollArea className="h-[600px]">
              {renderBatchExport()}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {renderExportHistory()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PDFExportCenter;