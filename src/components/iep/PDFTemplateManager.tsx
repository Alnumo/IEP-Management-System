/**
 * PDF Template Manager Component
 * Comprehensive template management system for PDF generation with Arabic support
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  FileText,
  Plus,
  Edit,
  Copy,
  Trash2,
  Download,
  Upload,
  Eye,
  Settings,
  Search,
  Filter,
  MoreVertical,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Layout,
  Palette,
  Type,
  Image,
  Lock,
  Unlock,
  Star,
  Users,
  Calendar,
  BarChart3
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
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

import {
  usePDFTemplates,
  usePDFTemplate,
  useCreatePDFTemplate,
  useUpdatePDFTemplate,
  useDeletePDFTemplate,
  useValidatePDFTemplate,
  useTemplateUsageStats
} from '@/hooks/usePDFExport';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

import type {
  PDFTemplate,
  PDFFormat,
  DocumentLanguage,
  PDFPageSize,
  PDFOrientation,
  PDFSection,
  PDFSectionType,
  CreatePDFTemplateRequest
} from '@/types/pdf-export';

interface PDFTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
}

const PDFTemplateManager: React.FC<PDFTemplateManagerProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const { isRTL } = useLanguage();
  const { toast } = useToast();

  const [selectedTab, setSelectedTab] = useState<'templates' | 'editor' | 'analytics'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<PDFFormat | 'all'>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<DocumentLanguage | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [templateForm, setTemplateForm] = useState<Partial<CreatePDFTemplateRequest>>({});

  // Template data hooks
  const { data: templates, isLoading, refetch } = usePDFTemplates({
    format: selectedFormat !== 'all' ? selectedFormat : undefined,
    language: selectedLanguage !== 'all' ? selectedLanguage : undefined,
    is_active: true
  });

  const { data: templateDetails } = usePDFTemplate(
    selectedTemplate?.id || '',
    !!selectedTemplate?.id
  );

  const { data: usageStats } = useTemplateUsageStats();

  // Template mutations
  const createTemplate = useCreatePDFTemplate();
  const updateTemplate = useUpdatePDFTemplate();
  const deleteTemplate = useDeletePDFTemplate();
  const validateTemplate = useValidatePDFTemplate();

  // Filtered templates
  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    
    let filtered = templates;
    
    if (searchQuery) {
      filtered = filtered.filter(template =>
        (language === 'ar' ? template.name_ar : template.name_en)
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (language === 'ar' ? template.description_ar : template.description_en)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [templates, searchQuery, language]);

  // Template form handlers
  const handleCreateTemplate = () => {
    setIsCreateMode(true);
    setSelectedTemplate(null);
    setTemplateForm({
      format: 'standard',
      page_size: 'A4',
      orientation: 'portrait',
      language: 'bilingual',
      is_active: true,
      is_default: false,
      version: 1,
      sections: getDefaultSections(),
      styling: getDefaultStyling(),
      header_config: getDefaultHeaderConfig(),
      footer_config: getDefaultFooterConfig()
    });
    setSelectedTab('editor');
  };

  const handleEditTemplate = (template: PDFTemplate) => {
    setIsCreateMode(false);
    setSelectedTemplate(template);
    setTemplateForm(template);
    setSelectedTab('editor');
  };

  const handleSaveTemplate = async () => {
    try {
      // Validate template first
      if (templateForm as PDFTemplate) {
        const validation = await validateTemplate.mutateAsync(templateForm as PDFTemplate);
        
        if (!validation.isValid) {
          toast({
            title: language === 'ar' ? 'خطأ في التحقق' : 'Validation Error',
            description: validation.errors.join(', '),
            variant: 'destructive',
          });
          return;
        }

        if (validation.warnings.length > 0) {
          toast({
            title: language === 'ar' ? 'تحذيرات التحقق' : 'Validation Warnings',
            description: validation.warnings.join(', '),
          });
        }
      }

      if (isCreateMode) {
        await createTemplate.mutateAsync(templateForm as CreatePDFTemplateRequest);
        toast({
          title: language === 'ar' ? 'تم الإنشاء' : 'Created',
          description: language === 'ar' ? 'تم إنشاء القالب بنجاح' : 'Template created successfully',
        });
      } else if (selectedTemplate) {
        await updateTemplate.mutateAsync({
          templateId: selectedTemplate.id,
          updates: templateForm
        });
        toast({
          title: language === 'ar' ? 'تم التحديث' : 'Updated',
          description: language === 'ar' ? 'تم تحديث القالب بنجاح' : 'Template updated successfully',
        });
      }

      setSelectedTab('templates');
      setSelectedTemplate(null);
      setTemplateForm({});
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حفظ القالب' : 'Failed to save template',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTemplate = async (template: PDFTemplate) => {
    try {
      await deleteTemplate.mutateAsync(template.id);
      toast({
        title: language === 'ar' ? 'تم الحذف' : 'Deleted',
        description: language === 'ar' ? 'تم حذف القالب بنجاح' : 'Template deleted successfully',
      });
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حذف القالب' : 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateTemplate = (template: PDFTemplate) => {
    const duplicatedTemplate = {
      ...template,
      name_ar: `${template.name_ar} - نسخة`,
      name_en: `${template.name_en} - Copy`,
      is_default: false
    };
    delete (duplicatedTemplate as any).id;
    delete (duplicatedTemplate as any).created_at;
    delete (duplicatedTemplate as any).updated_at;
    
    setIsCreateMode(true);
    setSelectedTemplate(null);
    setTemplateForm(duplicatedTemplate);
    setSelectedTab('editor');
  };

  // Default configurations
  const getDefaultSections = (): PDFSection[] => [
    {
      id: '1',
      type: 'student_info',
      title_ar: 'معلومات الطالب',
      title_en: 'Student Information',
      order_index: 1,
      is_required: true,
      is_visible: true,
      content_fields: [],
      layout: { columns: 1, column_gap: 10, break_before: false, break_after: false, keep_together: true },
      styling: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, margin: { top: 0, right: 0, bottom: 20, left: 0 } }
    },
    {
      id: '2',
      type: 'goals_objectives',
      title_ar: 'الأهداف والغايات',
      title_en: 'Goals and Objectives',
      order_index: 2,
      is_required: true,
      is_visible: true,
      content_fields: [],
      layout: { columns: 1, column_gap: 10, break_before: false, break_after: false, keep_together: false },
      styling: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, margin: { top: 0, right: 0, bottom: 20, left: 0 } }
    },
    {
      id: '3',
      type: 'services',
      title_ar: 'الخدمات المطلوبة',
      title_en: 'Required Services',
      order_index: 3,
      is_required: true,
      is_visible: true,
      content_fields: [],
      layout: { columns: 1, column_gap: 10, break_before: false, break_after: false, keep_together: true },
      styling: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, margin: { top: 0, right: 0, bottom: 20, left: 0 } }
    },
    {
      id: '4',
      type: 'signatures',
      title_ar: 'التوقيعات',
      title_en: 'Signatures',
      order_index: 4,
      is_required: true,
      is_visible: true,
      content_fields: [],
      layout: { columns: 1, column_gap: 10, break_before: true, break_after: false, keep_together: true },
      styling: { padding: { top: 10, right: 10, bottom: 10, left: 10 }, margin: { top: 20, right: 0, bottom: 0, left: 0 } }
    }
  ];

  const getDefaultStyling = () => ({
    primary_font_ar: 'Tajawal',
    primary_font_en: 'Arial',
    secondary_font_ar: 'Cairo',
    secondary_font_en: 'Helvetica',
    primary_color: '#1f2937',
    secondary_color: '#6b7280',
    accent_color: '#3b82f6',
    text_color: '#111827',
    background_color: '#ffffff',
    margins: { top: 72, right: 72, bottom: 72, left: 72 },
    spacing: { paragraph: 12, section: 24, subsection: 16, line: 1.5 },
    line_height: 1.6,
    arabic_font_settings: {
      font_family: 'Tajawal',
      font_size_adjustment: 2,
      line_height_adjustment: 0.2,
      character_spacing: 0,
      word_spacing: 0,
      text_shaping: true,
      ligatures: true,
      kashida_justification: false
    },
    rtl_layout_adjustments: {
      text_direction: 'rtl' as const,
      number_direction: 'ltr' as const,
      table_direction: 'rtl' as const,
      margin_adjustments: {
        swap_left_right: true,
        header_alignment: 'right' as const,
        footer_alignment: 'right' as const
      }
    }
  });

  const getDefaultHeaderConfig = () => ({
    enabled: true,
    height: 60,
    content_ar: 'البرنامج التعليمي الفردي',
    content_en: 'Individual Education Program',
    styling: {
      font_family: 'Arial',
      font_size: 14,
      font_weight: 'bold' as const,
      text_align: 'center' as const,
      text_color: '#1f2937',
      padding: { top: 10, right: 10, bottom: 10, left: 10 },
      margin: { top: 0, right: 0, bottom: 10, left: 0 }
    },
    show_logo: true,
    show_page_numbers: true,
    show_date: true
  });

  const getDefaultFooterConfig = () => ({
    enabled: true,
    height: 40,
    content_ar: 'مركز أركان للنمو',
    content_en: 'Arkan Growth Center',
    styling: {
      font_family: 'Arial',
      font_size: 10,
      font_weight: 'normal' as const,
      text_align: 'center' as const,
      text_color: '#6b7280',
      padding: { top: 5, right: 10, bottom: 5, left: 10 },
      margin: { top: 10, right: 0, bottom: 0, left: 0 }
    },
    show_page_numbers: true,
    show_generated_timestamp: false,
    show_document_id: false
  });

  // Render template card
  const renderTemplateCard = (template: PDFTemplate) => {
    const usage = usageStats?.[template.id];
    
    return (
      <Card key={template.id} className="h-full hover:shadow-lg transition-all duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-semibold line-clamp-2">
                {language === 'ar' ? template.name_ar : template.name_en}
              </CardTitle>
              <CardDescription className="text-sm mt-1 line-clamp-2">
                {language === 'ar' ? template.description_ar : template.description_en}
              </CardDescription>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                  <Copy className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'نسخ' : 'Duplicate'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteTemplate(template)}
                  className="text-red-600"
                  disabled={template.is_default}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            <Badge variant="outline" className="text-xs">
              {template.format}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {template.language}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {template.page_size}
            </Badge>
            {template.is_default && (
              <Badge className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                {language === 'ar' ? 'افتراضي' : 'Default'}
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {language === 'ar' ? 'الأقسام:' : 'Sections:'}
              </span>
              <span className="font-medium">
                {template.sections?.length || 0}
              </span>
            </div>
            
            {usage && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {language === 'ar' ? 'مرات الاستخدام:' : 'Usage:'}
                </span>
                <span className="font-medium">
                  {usage.total_uses || 0}
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'}
              </span>
              <span className="text-xs text-gray-500">
                {format(new Date(template.updated_at), 'MMM dd, yyyy', {
                  locale: language === 'ar' ? ar : enUS
                })}
              </span>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleEditTemplate(template)}
            >
              <Edit className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'تعديل' : 'Edit'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'معاينة' : 'Preview'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render template editor
  const renderTemplateEditor = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'اسم القالب (عربي)' : 'Template Name (Arabic)'}</Label>
              <Input
                value={templateForm.name_ar || ''}
                onChange={(e) => setTemplateForm({ ...templateForm, name_ar: e.target.value })}
                placeholder={language === 'ar' ? 'أدخل اسم القالب بالعربي' : 'Enter Arabic template name'}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'اسم القالب (إنجليزي)' : 'Template Name (English)'}</Label>
              <Input
                value={templateForm.name_en || ''}
                onChange={(e) => setTemplateForm({ ...templateForm, name_en: e.target.value })}
                placeholder={language === 'ar' ? 'أدخل اسم القالب بالإنجليزي' : 'Enter English template name'}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
              <Textarea
                value={templateForm.description_ar || ''}
                onChange={(e) => setTemplateForm({ ...templateForm, description_ar: e.target.value })}
                placeholder={language === 'ar' ? 'وصف القالب بالعربي' : 'Arabic template description'}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
              <Textarea
                value={templateForm.description_en || ''}
                onChange={(e) => setTemplateForm({ ...templateForm, description_en: e.target.value })}
                placeholder={language === 'ar' ? 'وصف القالب بالإنجليزي' : 'English template description'}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'التنسيق' : 'Format'}</Label>
              <Select
                value={templateForm.format}
                onValueChange={(value: PDFFormat) => setTemplateForm({ ...templateForm, format: value })}
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
              <Label>{language === 'ar' ? 'حجم الصفحة' : 'Page Size'}</Label>
              <Select
                value={templateForm.page_size}
                onValueChange={(value: PDFPageSize) => setTemplateForm({ ...templateForm, page_size: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4</SelectItem>
                  <SelectItem value="Letter">Letter</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="A3">A3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{language === 'ar' ? 'الاتجاه' : 'Orientation'}</Label>
              <Select
                value={templateForm.orientation}
                onValueChange={(value: PDFOrientation) => setTemplateForm({ ...templateForm, orientation: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">{language === 'ar' ? 'عمودي' : 'Portrait'}</SelectItem>
                  <SelectItem value="landscape">{language === 'ar' ? 'أفقي' : 'Landscape'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={templateForm.is_active}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_active: checked })}
              />
              <Label htmlFor="is_active">{language === 'ar' ? 'نشط' : 'Active'}</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={templateForm.is_default}
                onCheckedChange={(checked) => setTemplateForm({ ...templateForm, is_default: checked })}
              />
              <Label htmlFor="is_default">{language === 'ar' ? 'افتراضي' : 'Default'}</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save/Cancel Actions */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setSelectedTab('templates');
            setSelectedTemplate(null);
            setTemplateForm({});
          }}
        >
          <X className="h-4 w-4 mr-1" />
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button onClick={handleSaveTemplate} disabled={createTemplate.isPending || updateTemplate.isPending}>
          <Save className="h-4 w-4 mr-1" />
          {createTemplate.isPending || updateTemplate.isPending
            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
            : (language === 'ar' ? 'حفظ' : 'Save')
          }
        </Button>
      </div>
    </div>
  );

  // Render analytics tab
  const renderAnalytics = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {language === 'ar' ? 'إحصائيات القوالب' : 'Template Statistics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredTemplates.length}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'إجمالي القوالب' : 'Total Templates'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredTemplates.filter(t => t.is_active).length}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'قوالب نشطة' : 'Active Templates'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(usageStats || {}).reduce((sum, usage: any) => sum + (usage.total_uses || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'إجمالي الاستخدام' : 'Total Usage'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredTemplates.filter(t => t.is_default).length}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'قوالب افتراضية' : 'Default Templates'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`max-w-7xl h-[90vh] ${isRTL ? 'font-arabic' : ''}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <FileText className="h-6 w-6" />
            {language === 'ar' ? 'إدارة قوالب PDF' : 'PDF Template Manager'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(value: any) => setSelectedTab(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">
              {language === 'ar' ? 'القوالب' : 'Templates'}
            </TabsTrigger>
            <TabsTrigger value="editor">
              {language === 'ar' ? 'محرر القوالب' : 'Template Editor'}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              {language === 'ar' ? 'التحليلات' : 'Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6 space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={language === 'ar' ? 'البحث في القوالب...' : 'Search templates...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                
                <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع التنسيقات' : 'All Formats'}</SelectItem>
                    <SelectItem value="standard">{language === 'ar' ? 'قياسي' : 'Standard'}</SelectItem>
                    <SelectItem value="compact">{language === 'ar' ? 'مضغوط' : 'Compact'}</SelectItem>
                    <SelectItem value="detailed">{language === 'ar' ? 'مفصل' : 'Detailed'}</SelectItem>
                    <SelectItem value="legal">{language === 'ar' ? 'قانوني' : 'Legal'}</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedLanguage} onValueChange={(value: any) => setSelectedLanguage(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{language === 'ar' ? 'جميع اللغات' : 'All Languages'}</SelectItem>
                    <SelectItem value="ar">{language === 'ar' ? 'عربي' : 'Arabic'}</SelectItem>
                    <SelectItem value="en">{language === 'ar' ? 'إنجليزي' : 'English'}</SelectItem>
                    <SelectItem value="bilingual">{language === 'ar' ? 'ثنائي اللغة' : 'Bilingual'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'ar' ? 'قالب جديد' : 'New Template'}
              </Button>
            </div>

            {/* Templates Grid */}
            <ScrollArea className="h-[600px]">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : filteredTemplates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map(renderTemplateCard)}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {language === 'ar' ? 'لا توجد قوالب' : 'No templates found'}
                  </h3>
                  <p className="text-gray-500">
                    {language === 'ar' 
                      ? 'قم بإنشاء قالب جديد للبدء'
                      : 'Create a new template to get started'
                    }
                  </p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="editor">
            <ScrollArea className="h-[600px]">
              {renderTemplateEditor()}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="analytics">
            <ScrollArea className="h-[600px]">
              {renderAnalytics()}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PDFTemplateManager;