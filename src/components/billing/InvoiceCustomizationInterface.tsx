// Invoice Customization Interface - Story 2.3 Task 3
// Administrator interface for customizing invoice templates

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Eye, Download, Save, RefreshCw, Palette, FileText, Settings2 } from 'lucide-react';

interface InvoiceTemplate {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  template_data: {
    // Company branding
    logo_position: 'top-left' | 'top-center' | 'top-right';
    color_scheme: 'default' | 'blue' | 'green' | 'purple' | 'custom';
    primary_color: string;
    secondary_color: string;
    
    // Layout settings
    font_family_ar: string;
    font_family_en: string;
    font_size: number;
    line_spacing: number;
    page_margins: {
      top: number;
      bottom: number;
      left: number;
      right: number;
    };
    
    // Header settings
    show_company_logo: boolean;
    show_company_address: boolean;
    show_invoice_date: boolean;
    show_due_date: boolean;
    
    // Content settings
    show_student_photo: boolean;
    show_therapy_program_details: boolean;
    show_session_summary: boolean;
    show_payment_terms: boolean;
    
    // Footer settings
    footer_text_ar: string;
    footer_text_en: string;
    show_watermark: boolean;
    watermark_text_ar: string;
    watermark_text_en: string;
    
    // Calculations
    show_subtotal: boolean;
    show_tax: boolean;
    show_discount: boolean;
    tax_rate: number;
    
    // Localization
    currency_symbol_ar: string;
    currency_symbol_en: string;
    date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  };
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

interface InvoiceCustomizationInterfaceProps {
  onSave: (template: InvoiceTemplate) => Promise<void>;
  onPreview: (template: InvoiceTemplate) => Promise<void>;
  templates: InvoiceTemplate[];
  selectedTemplateId?: string;
}

export const InvoiceCustomizationInterface: React.FC<InvoiceCustomizationInterfaceProps> = ({
  onSave,
  onPreview,
  templates,
  selectedTemplateId
}) => {
  const { language, isRTL } = useLanguage();
  const [currentTemplate, setCurrentTemplate] = useState<InvoiceTemplate | null>(null);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isPreviewing, setPreviewing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Labels for bilingual support
  const labels = {
    ar: {
      title: 'تخصيص نماذج الفواتير',
      description: 'قم بتخصيص شكل وتصميم الفواتير',
      general: 'عام',
      layout: 'التخطيط',
      branding: 'الهوية التجارية',
      content: 'المحتوى',
      calculations: 'الحسابات',
      templateName: 'اسم النموذج',
      templateDescription: 'وصف النموذج',
      companyLogo: 'شعار الشركة',
      logoPosition: 'موضع الشعار',
      colorScheme: 'نظام الألوان',
      primaryColor: 'اللون الأساسي',
      secondaryColor: 'اللون الثانوي',
      fontSettings: 'إعدادات الخط',
      fontSize: 'حجم الخط',
      lineSpacing: 'تباعد الأسطر',
      pageMargins: 'هوامش الصفحة',
      showCompanyLogo: 'عرض شعار الشركة',
      showCompanyAddress: 'عرض عنوان الشركة',
      showInvoiceDate: 'عرض تاريخ الفاتورة',
      showDueDate: 'عرض تاريخ الاستحقاق',
      showStudentPhoto: 'عرض صورة الطالب',
      showTherapyDetails: 'عرض تفاصيل البرنامج العلاجي',
      showSessionSummary: 'عرض ملخص الجلسات',
      showPaymentTerms: 'عرض شروط الدفع',
      footerText: 'نص التذييل',
      showWatermark: 'عرض العلامة المائية',
      watermarkText: 'نص العلامة المائية',
      showSubtotal: 'عرض المجموع الفرعي',
      showTax: 'عرض الضريبة',
      showDiscount: 'عرض الخصم',
      taxRate: 'معدل الضريبة',
      currencySymbol: 'رمز العملة',
      dateFormat: 'تنسيق التاريخ',
      save: 'حفظ',
      preview: 'معاينة',
      reset: 'إعادة تعيين',
      upload: 'رفع',
      download: 'تحميل',
      defaultTemplate: 'النموذج الافتراضي',
      activeTemplate: 'نموذج نشط',
      unsavedChanges: 'تغييرات غير محفوظة'
    },
    en: {
      title: 'Invoice Template Customization',
      description: 'Customize the appearance and layout of invoices',
      general: 'General',
      layout: 'Layout',
      branding: 'Branding',
      content: 'Content',
      calculations: 'Calculations',
      templateName: 'Template Name',
      templateDescription: 'Template Description',
      companyLogo: 'Company Logo',
      logoPosition: 'Logo Position',
      colorScheme: 'Color Scheme',
      primaryColor: 'Primary Color',
      secondaryColor: 'Secondary Color',
      fontSettings: 'Font Settings',
      fontSize: 'Font Size',
      lineSpacing: 'Line Spacing',
      pageMargins: 'Page Margins',
      showCompanyLogo: 'Show Company Logo',
      showCompanyAddress: 'Show Company Address',
      showInvoiceDate: 'Show Invoice Date',
      showDueDate: 'Show Due Date',
      showStudentPhoto: 'Show Student Photo',
      showTherapyDetails: 'Show Therapy Program Details',
      showSessionSummary: 'Show Session Summary',
      showPaymentTerms: 'Show Payment Terms',
      footerText: 'Footer Text',
      showWatermark: 'Show Watermark',
      watermarkText: 'Watermark Text',
      showSubtotal: 'Show Subtotal',
      showTax: 'Show Tax',
      showDiscount: 'Show Discount',
      taxRate: 'Tax Rate',
      currencySymbol: 'Currency Symbol',
      dateFormat: 'Date Format',
      save: 'Save',
      preview: 'Preview',
      reset: 'Reset',
      upload: 'Upload',
      download: 'Download',
      defaultTemplate: 'Default Template',
      activeTemplate: 'Active Template',
      unsavedChanges: 'Unsaved Changes'
    }
  };

  const currentLabels = labels[language];

  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setCurrentTemplate(template);
        setIsModified(false);
      }
    } else if (templates.length > 0) {
      setCurrentTemplate(templates[0]);
      setIsModified(false);
    }
  }, [selectedTemplateId, templates]);

  const handleTemplateChange = (field: string, value: any) => {
    if (!currentTemplate) return;

    const updatedTemplate = {
      ...currentTemplate,
      template_data: {
        ...currentTemplate.template_data,
        [field]: value
      }
    };

    setCurrentTemplate(updatedTemplate);
    setIsModified(true);
  };

  const handleBasicInfoChange = (field: string, value: string) => {
    if (!currentTemplate) return;

    const updatedTemplate = {
      ...currentTemplate,
      [field]: value
    };

    setCurrentTemplate(updatedTemplate);
    setIsModified(true);
  };

  const handleSave = async () => {
    if (!currentTemplate || !isModified) return;

    setSaving(true);
    try {
      await onSave(currentTemplate);
      setIsModified(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!currentTemplate) return;

    setPreviewing(true);
    try {
      await onPreview(currentTemplate);
    } finally {
      setPreviewing(false);
    }
  };

  const handleReset = () => {
    if (selectedTemplateId) {
      const originalTemplate = templates.find(t => t.id === selectedTemplateId);
      if (originalTemplate) {
        setCurrentTemplate(originalTemplate);
        setIsModified(false);
      }
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      // In a real implementation, you would upload the file and get a URL
      // For now, we'll just track that a logo was uploaded
      setIsModified(true);
    }
  };

  if (!currentTemplate) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {currentLabels.title}
              </CardTitle>
              <CardDescription>
                {currentLabels.description}
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {isModified && (
                <Badge variant="outline" className="text-orange-600">
                  {currentLabels.unsavedChanges}
                </Badge>
              )}
              
              {currentTemplate.is_default && (
                <Badge variant="default">
                  {currentLabels.defaultTemplate}
                </Badge>
              )}
              
              {currentTemplate.is_active && (
                <Badge variant="secondary">
                  {currentLabels.activeTemplate}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center gap-2 mb-6">
            <Button 
              onClick={handleSave}
              disabled={!isModified || isSaving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : currentLabels.save}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handlePreview}
              disabled={isPreviewing}
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {isPreviewing ? 'Generating...' : currentLabels.preview}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReset}
              disabled={!isModified}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {currentLabels.reset}
            </Button>
          </div>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">{currentLabels.general}</TabsTrigger>
              <TabsTrigger value="branding">{currentLabels.branding}</TabsTrigger>
              <TabsTrigger value="layout">{currentLabels.layout}</TabsTrigger>
              <TabsTrigger value="content">{currentLabels.content}</TabsTrigger>
              <TabsTrigger value="calculations">{currentLabels.calculations}</TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="template-name">
                    {currentLabels.templateName}
                  </Label>
                  <Input
                    id="template-name"
                    value={language === 'ar' ? currentTemplate.name_ar : currentTemplate.name_en}
                    onChange={(e) => handleBasicInfoChange(
                      language === 'ar' ? 'name_ar' : 'name_en', 
                      e.target.value
                    )}
                  />
                </div>

                <div>
                  <Label htmlFor="template-description">
                    {currentLabels.templateDescription}
                  </Label>
                  <Textarea
                    id="template-description"
                    value={language === 'ar' ? currentTemplate.description_ar : currentTemplate.description_en}
                    onChange={(e) => handleBasicInfoChange(
                      language === 'ar' ? 'description_ar' : 'description_en', 
                      e.target.value
                    )}
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Branding Settings */}
            <TabsContent value="branding" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>{currentLabels.companyLogo}</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {currentLabels.upload}
                    </Button>
                    {logoFile && (
                      <span className="text-sm text-muted-foreground">
                        {logoFile.name}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <Label>{currentLabels.logoPosition}</Label>
                  <Select
                    value={currentTemplate.template_data.logo_position}
                    onValueChange={(value) => handleTemplateChange('logo_position', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{currentLabels.colorScheme}</Label>
                  <Select
                    value={currentTemplate.template_data.color_scheme}
                    onValueChange={(value) => handleTemplateChange('color_scheme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="blue">Blue</SelectItem>
                      <SelectItem value="green">Green</SelectItem>
                      <SelectItem value="purple">Purple</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {currentTemplate.template_data.color_scheme === 'custom' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{currentLabels.primaryColor}</Label>
                      <Input
                        type="color"
                        value={currentTemplate.template_data.primary_color}
                        onChange={(e) => handleTemplateChange('primary_color', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{currentLabels.secondaryColor}</Label>
                      <Input
                        type="color"
                        value={currentTemplate.template_data.secondary_color}
                        onChange={(e) => handleTemplateChange('secondary_color', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Layout Settings */}
            <TabsContent value="layout" className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <Label>{currentLabels.fontSize}</Label>
                  <Input
                    type="number"
                    min="8"
                    max="16"
                    value={currentTemplate.template_data.font_size}
                    onChange={(e) => handleTemplateChange('font_size', parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label>{currentLabels.lineSpacing}</Label>
                  <Input
                    type="number"
                    min="1.0"
                    max="2.0"
                    step="0.1"
                    value={currentTemplate.template_data.line_spacing}
                    onChange={(e) => handleTemplateChange('line_spacing', parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <Label>{currentLabels.pageMargins}</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Input
                      type="number"
                      placeholder="Top"
                      value={currentTemplate.template_data.page_margins.top}
                      onChange={(e) => handleTemplateChange('page_margins', {
                        ...currentTemplate.template_data.page_margins,
                        top: parseInt(e.target.value)
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Bottom"
                      value={currentTemplate.template_data.page_margins.bottom}
                      onChange={(e) => handleTemplateChange('page_margins', {
                        ...currentTemplate.template_data.page_margins,
                        bottom: parseInt(e.target.value)
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Left"
                      value={currentTemplate.template_data.page_margins.left}
                      onChange={(e) => handleTemplateChange('page_margins', {
                        ...currentTemplate.template_data.page_margins,
                        left: parseInt(e.target.value)
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Right"
                      value={currentTemplate.template_data.page_margins.right}
                      onChange={(e) => handleTemplateChange('page_margins', {
                        ...currentTemplate.template_data.page_margins,
                        right: parseInt(e.target.value)
                      })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Content Settings */}
            <TabsContent value="content" className="space-y-4">
              <div className="grid gap-4">
                {Object.entries({
                  show_company_logo: currentLabels.showCompanyLogo,
                  show_company_address: currentLabels.showCompanyAddress,
                  show_invoice_date: currentLabels.showInvoiceDate,
                  show_due_date: currentLabels.showDueDate,
                  show_student_photo: currentLabels.showStudentPhoto,
                  show_therapy_program_details: currentLabels.showTherapyDetails,
                  show_session_summary: currentLabels.showSessionSummary,
                  show_payment_terms: currentLabels.showPaymentTerms,
                  show_watermark: currentLabels.showWatermark
                }).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={currentTemplate.template_data[field as keyof typeof currentTemplate.template_data] as boolean}
                      onCheckedChange={(checked) => handleTemplateChange(field, checked)}
                    />
                  </div>
                ))}

                <Separator />

                <div>
                  <Label>{currentLabels.footerText}</Label>
                  <Textarea
                    value={language === 'ar' 
                      ? currentTemplate.template_data.footer_text_ar 
                      : currentTemplate.template_data.footer_text_en}
                    onChange={(e) => handleTemplateChange(
                      language === 'ar' ? 'footer_text_ar' : 'footer_text_en',
                      e.target.value
                    )}
                    rows={2}
                  />
                </div>

                {currentTemplate.template_data.show_watermark && (
                  <div>
                    <Label>{currentLabels.watermarkText}</Label>
                    <Input
                      value={language === 'ar' 
                        ? currentTemplate.template_data.watermark_text_ar 
                        : currentTemplate.template_data.watermark_text_en}
                      onChange={(e) => handleTemplateChange(
                        language === 'ar' ? 'watermark_text_ar' : 'watermark_text_en',
                        e.target.value
                      )}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Calculations Settings */}
            <TabsContent value="calculations" className="space-y-4">
              <div className="grid gap-4">
                {Object.entries({
                  show_subtotal: currentLabels.showSubtotal,
                  show_tax: currentLabels.showTax,
                  show_discount: currentLabels.showDiscount
                }).map(([field, label]) => (
                  <div key={field} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={currentTemplate.template_data[field as keyof typeof currentTemplate.template_data] as boolean}
                      onCheckedChange={(checked) => handleTemplateChange(field, checked)}
                    />
                  </div>
                ))}

                {currentTemplate.template_data.show_tax && (
                  <div>
                    <Label>{currentLabels.taxRate} (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={currentTemplate.template_data.tax_rate}
                      onChange={(e) => handleTemplateChange('tax_rate', parseFloat(e.target.value))}
                    />
                  </div>
                )}

                <Separator />

                <div>
                  <Label>{currentLabels.currencySymbol}</Label>
                  <Input
                    value={language === 'ar' 
                      ? currentTemplate.template_data.currency_symbol_ar 
                      : currentTemplate.template_data.currency_symbol_en}
                    onChange={(e) => handleTemplateChange(
                      language === 'ar' ? 'currency_symbol_ar' : 'currency_symbol_en',
                      e.target.value
                    )}
                  />
                </div>

                <div>
                  <Label>{currentLabels.dateFormat}</Label>
                  <Select
                    value={currentTemplate.template_data.date_format}
                    onValueChange={(value) => handleTemplateChange('date_format', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceCustomizationInterface;