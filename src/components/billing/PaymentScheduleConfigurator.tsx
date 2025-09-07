// Payment Schedule Configurator - Story 1.5 Task 5
// Flexible payment schedule configuration with custom intervals and amounts

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { useLanguage } from '../../contexts/LanguageContext';
import { InstallmentPaymentAutomation } from '../../services/installment-payment-automation';
import { 
  Calendar, 
  Plus,
  Minus,
  Clock,
  Calculator,
  Settings,
  Save,
  Trash2,
  Copy,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface PaymentScheduleItem {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  description: string;
  isCustom: boolean;
}

interface ScheduleTemplate {
  id: string;
  name_ar: string;
  name_en: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  numberOfInstallments: number;
  isDefault: boolean;
}

interface PaymentScheduleConfiguratorProps {
  totalAmount: number;
  startDate: string;
  onSave: (schedule: PaymentScheduleItem[]) => void;
  onCancel: () => void;
  existingSchedule?: PaymentScheduleItem[];
}

export const PaymentScheduleConfigurator: React.FC<PaymentScheduleConfiguratorProps> = ({
  totalAmount,
  startDate,
  onSave,
  onCancel,
  existingSchedule
}) => {
  const { language, isRTL } = useLanguage();
  const [schedule, setSchedule] = useState<PaymentScheduleItem[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMode, setCustomMode] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [automationService] = useState(() => InstallmentPaymentAutomation.getInstance());

  // Predefined templates
  const defaultTemplates: ScheduleTemplate[] = [
    {
      id: 'weekly-4',
      name_ar: 'أسبوعي - 4 أقساط',
      name_en: 'Weekly - 4 Installments',
      frequency: 'weekly',
      numberOfInstallments: 4,
      isDefault: true
    },
    {
      id: 'biweekly-6',
      name_ar: 'كل أسبوعين - 6 أقساط',
      name_en: 'Bi-weekly - 6 Installments',
      frequency: 'biweekly',
      numberOfInstallments: 6,
      isDefault: true
    },
    {
      id: 'monthly-12',
      name_ar: 'شهري - 12 قسط',
      name_en: 'Monthly - 12 Installments',
      frequency: 'monthly',
      numberOfInstallments: 12,
      isDefault: true
    }
  ];

  const labels = {
    ar: {
      title: 'تكوين جدول الدفع',
      description: 'إنشاء جدول دفع مرن ومخصص',
      templates: 'القوالب',
      selectTemplate: 'اختيار قالب',
      customSchedule: 'جدول مخصص',
      enableCustom: 'تفعيل الوضع المخصص',
      schedulePreview: 'معاينة الجدول',
      installmentNo: 'رقم القسط',
      dueDate: 'تاريخ الاستحقاق',
      amount: 'المبلغ',
      description: 'الوصف',
      actions: 'الإجراءات',
      addInstallment: 'إضافة قسط',
      removeInstallment: 'حذف القسط',
      duplicateInstallment: 'تكرار القسط',
      totalScheduled: 'إجمالي الجدول',
      remaining: 'المتبقي',
      saveTemplate: 'حفظ كقالب',
      templateName: 'اسم القالب',
      saveSchedule: 'حفظ الجدول',
      cancel: 'إلغاء',
      validation: {
        totalMismatch: 'إجمالي المبالغ لا يتطابق مع إجمالي الفاتورة',
        emptySchedule: 'يجب إضافة قسط واحد على الأقل',
        duplicateDates: 'يوجد تواريخ استحقاق مكررة',
        invalidAmounts: 'يجب أن تكون جميع المبالغ أكبر من صفر'
      }
    },
    en: {
      title: 'Payment Schedule Configuration',
      description: 'Create flexible and customized payment schedule',
      templates: 'Templates',
      selectTemplate: 'Select Template',
      customSchedule: 'Custom Schedule',
      enableCustom: 'Enable Custom Mode',
      schedulePreview: 'Schedule Preview',
      installmentNo: 'Installment #',
      dueDate: 'Due Date',
      amount: 'Amount',
      description: 'Description',
      actions: 'Actions',
      addInstallment: 'Add Installment',
      removeInstallment: 'Remove Installment',
      duplicateInstallment: 'Duplicate Installment',
      totalScheduled: 'Total Scheduled',
      remaining: 'Remaining',
      saveTemplate: 'Save as Template',
      templateName: 'Template Name',
      saveSchedule: 'Save Schedule',
      cancel: 'Cancel',
      validation: {
        totalMismatch: 'Total amounts do not match invoice total',
        emptySchedule: 'At least one installment must be added',
        duplicateDates: 'Duplicate due dates found',
        invalidAmounts: 'All amounts must be greater than zero'
      }
    }
  };

  const currentLabels = labels[language];

  // Initialize schedule from existing or template
  useEffect(() => {
    if (existingSchedule && existingSchedule.length > 0) {
      setSchedule(existingSchedule);
    } else if (selectedTemplate) {
      generateScheduleFromTemplate(selectedTemplate);
    }
  }, [selectedTemplate, existingSchedule]);

  const generateScheduleFromTemplate = (templateId: string) => {
    const template = defaultTemplates.find(t => t.id === templateId);
    if (!template) return;

    const installmentAmount = Math.round((totalAmount / template.numberOfInstallments) * 100) / 100;
    const newSchedule: PaymentScheduleItem[] = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= template.numberOfInstallments; i++) {
      const isLast = i === template.numberOfInstallments;
      let amount = installmentAmount;
      
      // Adjust last payment for rounding
      if (isLast) {
        const totalPrevious = (template.numberOfInstallments - 1) * installmentAmount;
        amount = totalAmount - totalPrevious;
      }

      newSchedule.push({
        id: `installment-${i}`,
        installmentNumber: i,
        dueDate: currentDate.toISOString().split('T')[0],
        amount,
        description: `${language === 'ar' ? 'القسط' : 'Installment'} #${i}`,
        isCustom: false
      });

      // Calculate next due date
      switch (template.frequency) {
        case 'weekly':
          currentDate = addWeeks(currentDate, 1);
          break;
        case 'biweekly':
          currentDate = addWeeks(currentDate, 2);
          break;
        case 'monthly':
          currentDate = addMonths(currentDate, 1);
          break;
      }
    }

    setSchedule(newSchedule);
  };

  const addInstallment = () => {
    const nextNumber = schedule.length + 1;
    const lastDate = schedule.length > 0 
      ? new Date(schedule[schedule.length - 1].dueDate)
      : new Date(startDate);
    
    const nextDueDate = addMonths(lastDate, 1);
    const remainingAmount = totalAmount - schedule.reduce((sum, item) => sum + item.amount, 0);

    const newInstallment: PaymentScheduleItem = {
      id: `custom-${Date.now()}`,
      installmentNumber: nextNumber,
      dueDate: nextDueDate.toISOString().split('T')[0],
      amount: Math.max(0, remainingAmount),
      description: `${language === 'ar' ? 'قسط مخصص' : 'Custom Installment'} #${nextNumber}`,
      isCustom: true
    };

    setSchedule([...schedule, newInstallment]);
  };

  const removeInstallment = (id: string) => {
    setSchedule(schedule.filter(item => item.id !== id));
  };

  const duplicateInstallment = (id: string) => {
    const itemToDuplicate = schedule.find(item => item.id === id);
    if (!itemToDuplicate) return;

    const duplicated: PaymentScheduleItem = {
      ...itemToDuplicate,
      id: `duplicate-${Date.now()}`,
      installmentNumber: schedule.length + 1,
      dueDate: addMonths(new Date(itemToDuplicate.dueDate), 1).toISOString().split('T')[0]
    };

    setSchedule([...schedule, duplicated]);
  };

  const updateInstallment = (id: string, field: keyof PaymentScheduleItem, value: any) => {
    setSchedule(schedule.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const validateSchedule = (): string[] => {
    const errors: string[] = [];

    if (schedule.length === 0) {
      errors.push(currentLabels.validation.emptySchedule);
    }

    const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
    if (Math.abs(totalScheduled - totalAmount) > 0.01) {
      errors.push(currentLabels.validation.totalMismatch);
    }

    const dates = schedule.map(item => item.dueDate);
    const uniqueDates = new Set(dates);
    if (dates.length !== uniqueDates.size) {
      errors.push(currentLabels.validation.duplicateDates);
    }

    const hasInvalidAmounts = schedule.some(item => item.amount <= 0);
    if (hasInvalidAmounts) {
      errors.push(currentLabels.validation.invalidAmounts);
    }

    return errors;
  };

  const handleSave = () => {
    const errors = validateSchedule();
    if (errors.length === 0) {
      onSave(schedule);
    }
  };

  const totalScheduled = schedule.reduce((sum, item) => sum + item.amount, 0);
  const remainingAmount = totalAmount - totalScheduled;
  const currencySymbol = language === 'ar' ? 'ريال' : 'SAR';
  const validationErrors = validateSchedule();

  return (
    <div className={`w-full max-w-6xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {currentLabels.title}
          </CardTitle>
          <CardDescription>
            {currentLabels.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Templates Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {currentLabels.templates}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {defaultTemplates.map(template => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTemplate === template.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="text-center">
                        <h3 className="font-medium">
                          {language === 'ar' ? template.name_ar : template.name_en}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {template.numberOfInstallments} {language === 'ar' ? 'أقساط' : 'installments'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Switch
                  id="custom-mode"
                  checked={customMode}
                  onCheckedChange={setCustomMode}
                />
                <Label htmlFor="custom-mode">
                  {currentLabels.enableCustom}
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {currentLabels.schedulePreview}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {currencySymbol} {totalScheduled.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLabels.totalScheduled}
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${remainingAmount === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {currencySymbol} {remainingAmount.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLabels.remaining}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {schedule.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'أقساط' : 'Installments'}
                  </div>
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Validation Errors</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Schedule Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className={`p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {currentLabels.installmentNo}
                      </th>
                      <th className={`p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {currentLabels.dueDate}
                      </th>
                      <th className={`p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {currentLabels.amount}
                      </th>
                      <th className={`p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                        {currentLabels.description}
                      </th>
                      {customMode && (
                        <th className={`p-2 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>
                          {currentLabels.actions}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item, index) => (
                      <tr key={item.id} className="border-b">
                        <td className="p-2">
                          <Badge variant="outline">#{item.installmentNumber}</Badge>
                        </td>
                        <td className="p-2">
                          {customMode ? (
                            <Input
                              type="date"
                              value={item.dueDate}
                              onChange={(e) => updateInstallment(item.id, 'dueDate', e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            format(new Date(item.dueDate), 'dd/MM/yyyy', {
                              locale: language === 'ar' ? ar : enUS
                            })
                          )}
                        </td>
                        <td className="p-2">
                          {customMode ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateInstallment(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full"
                            />
                          ) : (
                            <span className="font-medium">
                              {currencySymbol} {item.amount.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {customMode ? (
                            <Input
                              value={item.description}
                              onChange={(e) => updateInstallment(item.id, 'description', e.target.value)}
                              className="w-full"
                            />
                          ) : (
                            item.description
                          )}
                        </td>
                        {customMode && (
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateInstallment(item.id)}
                                title={currentLabels.duplicateInstallment}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeInstallment(item.id)}
                                title={currentLabels.removeInstallment}
                                disabled={schedule.length <= 1}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Installment Button */}
              {customMode && (
                <div className="mt-4 flex justify-center">
                  <Button
                    onClick={addInstallment}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4" />
                    {currentLabels.addInstallment}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Options */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {customMode && (
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Switch
                      id="save-template"
                      checked={saveAsTemplate}
                      onCheckedChange={setSaveAsTemplate}
                    />
                    <Label htmlFor="save-template">
                      {currentLabels.saveTemplate}
                    </Label>
                  </div>
                )}

                {saveAsTemplate && (
                  <div>
                    <Label htmlFor="template-name">{currentLabels.templateName}</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder={currentLabels.templateName}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2 justify-end">
                  <Button variant="outline" onClick={onCancel}>
                    {currentLabels.cancel}
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={validationErrors.length > 0}
                    className="flex items-center gap-2"
                  >
                    {validationErrors.length === 0 ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {currentLabels.saveSchedule}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentScheduleConfigurator;