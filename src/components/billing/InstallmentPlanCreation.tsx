// Installment Plan Creation Interface - Story 4.2 Enhanced
// Component for creating and managing installment payment plans with new backend integration

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useLanguage } from '../../contexts/LanguageContext';
import { InstallmentPaymentService } from '../../services/installment-payment-service';
import { InstallmentPaymentAutomation } from '../../services/installment-payment-automation';
import { 
  Calendar, 
  CreditCard, 
  Calculator, 
  AlertCircle, 
  CheckCircle, 
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { InstallmentPlan, InstallmentPlanFormData } from '../../types/billing';

// Simple interface for invoice and student data (Story 4.2)
interface InvoiceData {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  studentId: string;
}

interface StudentData {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface InstallmentPlanCreationProps {
  invoice: InvoiceData;
  student: StudentData;
  onSuccess: (plan: InstallmentPlan) => Promise<void>;
  onCancel: () => void;
  existingPlan?: InstallmentPlan;
}

interface InstallmentPlanPreview {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  description_ar: string;
  description_en: string;
  isFirstPayment: boolean;
  accumulatedAmount: number;
  remainingBalance: number;
}

export const InstallmentPlanCreation: React.FC<InstallmentPlanCreationProps> = ({
  invoice,
  student,
  onSuccess,
  onCancel,
  existingPlan
}) => {
  const { language, isRTL } = useLanguage();
  const [isLoading, setLoading] = useState(false);
  const [planPreview, setPlanPreview] = useState<InstallmentPlanPreview[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Form state aligned with Story 4.2 InstallmentPlanFormData
  const [numberOfInstallments, setNumberOfInstallments] = useState(existingPlan?.numberOfInstallments || 3);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>(
    existingPlan?.frequency || 'monthly'
  );
  const [startDate, setStartDate] = useState(
    existingPlan?.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd')
  );
  const [firstPaymentAmount, setFirstPaymentAmount] = useState(
    existingPlan?.firstPaymentAmount || 0
  );
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Automation settings
  const [autoCollectEnabled, setAutoCollectEnabled] = useState(false);
  const [whatsappReminders, setWhatsappReminders] = useState(true);
  const [emailReminders, setEmailReminders] = useState(true);
  const [reminderDaysBefore, setReminderDaysBefore] = useState([3, 1]);
  const [reminderDaysAfter, setReminderDaysAfter] = useState([1, 3, 7]);
  const [lateFeeEnabled, setLateFeeEnabled] = useState(true);
  const [lateFeeAmount, setLateFeeAmount] = useState(25);
  const [gracePeriodDays, setGracePeriodDays] = useState(3);

  // Labels for bilingual support
  const labels = {
    ar: {
      title: 'إنشاء خطة دفع بالأقساط',
      description: 'قم بإعداد خطة دفع مرنة للطالب',
      invoiceDetails: 'تفاصيل الفاتورة',
      invoiceNumber: 'رقم الفاتورة:',
      totalAmount: 'المبلغ الإجمالي:',
      studentName: 'اسم الطالب:',
      installmentSettings: 'إعدادات الأقساط',
      numberOfInstallments: 'عدد الأقساط',
      frequency: 'تكرار الدفع',
      startDate: 'تاريخ البداية',
      firstPaymentAmount: 'مبلغ الدفعة الأولى (اختياري)',
      lateFeeSettings: 'إعدادات الرسوم المتأخرة',
      applyLateFees: 'تطبيق رسوم التأخير',
      lateFeeAmount: 'مبلغ رسوم التأخير',
      gracePeriod: 'فترة السماح (أيام)',
      automationSettings: 'إعدادات الأتمتة',
      autoCollection: 'التحصيل التلقائي',
      autoCollectionDesc: 'تفعيل الدفع التلقائي من بطاقة العميل المحفوظة',
      reminderSettings: 'إعدادات التذكير',
      whatsappReminders: 'تذكير واتساب',
      emailReminders: 'تذكير بريد إلكتروني',
      remindersBefore: 'أيام التذكير قبل الاستحقاق',
      remindersAfter: 'أيام التذكير بعد الاستحقاق',
      gracePeriodDesc: 'عدد الأيام قبل تطبيق رسوم التأخير',
      installmentPreview: 'معاينة الأقساط',
      paymentSchedule: 'جدولة المدفوعات',
      installmentNo: 'رقم القسط',
      dueDate: 'تاريخ الاستحقاق',
      amount: 'المبلغ',
      remaining: 'المتبقي',
      termsAndConditions: 'الشروط والأحكام',
      termsText: 'أوافق على شروط وأحكام خطة الدفع بالأقساط',
      createPlan: 'إنشاء خطة الدفع',
      cancel: 'إلغاء',
      saving: 'جاري الحفظ...',
      weekly: 'أسبوعي',
      biweekly: 'كل أسبوعين',
      monthly: 'شهري',
      paymentDue: 'دفعة مستحقة',
      firstPayment: 'الدفعة الأولى',
      regularPayment: 'دفعة اعتيادية',
      finalPayment: 'الدفعة الأخيرة',
      totalPayments: 'إجمالي المدفوعات:',
      effectiveRate: 'المعدل الفعلي:',
      planSummary: 'ملخص الخطة',
      validationErrors: 'أخطاء التحقق'
    },
    en: {
      title: 'Create Installment Payment Plan',
      description: 'Set up a flexible payment plan for the student',
      invoiceDetails: 'Invoice Details',
      invoiceNumber: 'Invoice Number:',
      totalAmount: 'Total Amount:',
      studentName: 'Student Name:',
      installmentSettings: 'Installment Settings',
      numberOfInstallments: 'Number of Installments',
      frequency: 'Payment Frequency',
      startDate: 'Start Date',
      firstPaymentAmount: 'First Payment Amount (Optional)',
      lateFeeSettings: 'Late Fee Settings',
      applyLateFees: 'Apply Late Fees',
      lateFeeAmount: 'Late Fee Amount',
      gracePeriod: 'Grace Period (Days)',
      automationSettings: 'Automation Settings',
      autoCollection: 'Auto Collection',
      autoCollectionDesc: 'Enable automatic payment collection from saved customer card',
      reminderSettings: 'Reminder Settings',
      whatsappReminders: 'WhatsApp Reminders',
      emailReminders: 'Email Reminders',
      remindersBefore: 'Days to remind before due',
      remindersAfter: 'Days to remind after due',
      gracePeriodDesc: 'Number of days before applying late fees',
      installmentPreview: 'Installment Preview',
      paymentSchedule: 'Payment Schedule',
      installmentNo: 'Installment #',
      dueDate: 'Due Date',
      amount: 'Amount',
      remaining: 'Remaining',
      termsAndConditions: 'Terms and Conditions',
      termsText: 'I agree to the terms and conditions of the installment payment plan',
      createPlan: 'Create Payment Plan',
      cancel: 'Cancel',
      saving: 'Saving...',
      weekly: 'Weekly',
      biweekly: 'Bi-weekly',
      monthly: 'Monthly',
      paymentDue: 'Payment Due',
      firstPayment: 'First Payment',
      regularPayment: 'Regular Payment',
      finalPayment: 'Final Payment',
      totalPayments: 'Total Payments:',
      effectiveRate: 'Effective Rate:',
      planSummary: 'Plan Summary',
      validationErrors: 'Validation Errors'
    }
  };

  const currentLabels = labels[language];

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate installment plan preview
  useEffect(() => {
    calculateInstallmentPreview();
  }, [numberOfInstallments, frequency, startDate, firstPaymentAmount, invoice.totalAmount]);

  const calculateInstallmentPreview = () => {
    if (!invoice.totalAmount || numberOfInstallments < 1) {
      setPlanPreview([]);
      return;
    }

    const totalAmount = invoice.totalAmount;
    const firstPayment = firstPaymentAmount || 0;
    const remainingAmount = totalAmount - firstPayment;
    const regularPaymentAmount = Math.round((remainingAmount / (numberOfInstallments - (firstPayment > 0 ? 1 : 0))) * 100) / 100;
    
    const preview: InstallmentPlanPreview[] = [];
    let currentDate = new Date(startDate);
    let accumulatedAmount = 0;

    // First payment (if specified)
    if (firstPayment > 0) {
      preview.push({
        installmentNumber: 1,
        dueDate: format(currentDate, 'yyyy-MM-dd'),
        amount: firstPayment,
        description_ar: 'الدفعة الأولى',
        description_en: 'First Payment',
        isFirstPayment: true,
        accumulatedAmount: firstPayment,
        remainingBalance: totalAmount - firstPayment
      });
      accumulatedAmount = firstPayment;
      
      // Move to next payment date
      currentDate = getNextPaymentDate(currentDate, frequency);
    }

    // Regular payments
    const startInstallment = firstPayment > 0 ? 2 : 1;
    const remainingInstallments = numberOfInstallments - (firstPayment > 0 ? 1 : 0);

    for (let i = 0; i < remainingInstallments; i++) {
      const isLastPayment = i === remainingInstallments - 1;
      let paymentAmount = regularPaymentAmount;

      // Adjust final payment for rounding differences
      if (isLastPayment) {
        paymentAmount = totalAmount - accumulatedAmount;
      }

      const installmentNumber = startInstallment + i;
      accumulatedAmount += paymentAmount;

      preview.push({
        installmentNumber,
        dueDate: format(currentDate, 'yyyy-MM-dd'),
        amount: paymentAmount,
        description_ar: isLastPayment ? 'الدفعة الأخيرة' : `القسط رقم ${installmentNumber}`,
        description_en: isLastPayment ? 'Final Payment' : `Installment #${installmentNumber}`,
        isFirstPayment: false,
        accumulatedAmount,
        remainingBalance: totalAmount - accumulatedAmount
      });

      if (!isLastPayment) {
        currentDate = getNextPaymentDate(currentDate, frequency);
      }
    }

    setPlanPreview(preview);
  };

  const getNextPaymentDate = (currentDate: Date, freq: string): Date => {
    switch (freq) {
      case 'weekly':
        return addWeeks(currentDate, 1);
      case 'biweekly':
        return addWeeks(currentDate, 2);
      case 'monthly':
        return addMonths(currentDate, 1);
      default:
        return addMonths(currentDate, 1);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (numberOfInstallments < 2 || numberOfInstallments > 12) {
      errors.push(language === 'ar' 
        ? 'يجب أن يكون عدد الأقساط بين 2 و 12'
        : 'Number of installments must be between 2 and 12');
    }

    if (firstPaymentAmount && (firstPaymentAmount < 0 || firstPaymentAmount >= invoice.totalAmount)) {
      errors.push(language === 'ar'
        ? 'مبلغ الدفعة الأولى يجب أن يكون أقل من إجمالي الفاتورة'
        : 'First payment amount must be less than total invoice amount');
    }

    if (new Date(startDate) <= new Date()) {
      errors.push(language === 'ar'
        ? 'تاريخ البداية يجب أن يكون في المستقبل'
        : 'Start date must be in the future');
    }

    if (!termsAccepted) {
      errors.push(language === 'ar'
        ? 'يجب الموافقة على الشروط والأحكام'
        : 'You must accept the terms and conditions');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrorMessage('');
    
    try {
      // Use the automation service for comprehensive installment plan creation
      const automationService = InstallmentPaymentAutomation.getInstance();
      
      const result = await automationService.createAutomatedPaymentPlan({
        student_id: student.id,
        invoice_id: invoice.id,
        total_amount: invoice.totalAmount,
        number_of_installments: numberOfInstallments,
        frequency: frequency,
        first_payment_date: startDate,
        auto_collect: autoCollectEnabled,
        reminder_preferences: {
          whatsapp_enabled: whatsappReminders,
          email_enabled: emailReminders,
          days_before: reminderDaysBefore,
          days_after: reminderDaysAfter
        },
        late_fee_settings: {
          enabled: lateFeeEnabled,
          amount: lateFeeAmount,
          grace_period_days: gracePeriodDays
        }
      });
      
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to create automated payment plan');
        return;
      }

      // Fallback to legacy service for onSuccess callback compatibility
      const legacyPlan: InstallmentPlan = {
        id: result.payment_plan_id!,
        invoiceId: invoice.id,
        totalAmount: invoice.totalAmount,
        numberOfInstallments,
        frequency,
        startDate,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await onSuccess(legacyPlan);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(language === 'ar' 
        ? `خطأ في إنشاء خطة الدفع: ${errorMsg}`
        : `Error creating installment plan: ${errorMsg}`
      );
    } finally {
      setLoading(false);
    }
  };

  const studentName = language === 'ar' ? student.nameAr : student.nameEn;
  const currencySymbol = language === 'ar' ? 'ريال' : 'SAR';

  return (
    <div className={`w-full max-w-4xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {currentLabels.title}
          </CardTitle>
          <CardDescription>
            {currentLabels.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">{currentLabels.validationErrors}:</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Service Error Messages */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Invoice Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {currentLabels.invoiceDetails}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">{currentLabels.invoiceNumber}</span>
                  <p className="text-muted-foreground">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <span className="font-medium">{currentLabels.studentName}</span>
                  <p className="text-muted-foreground">{studentName}</p>
                </div>
                <div>
                  <span className="font-medium">{currentLabels.totalAmount}</span>
                  <p className="text-lg font-semibold text-primary">
                    {currencySymbol} {invoice.totalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installment Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {currentLabels.installmentSettings}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="installments">{currentLabels.numberOfInstallments}</Label>
                  <Select
                    value={numberOfInstallments.toString()}
                    onValueChange={(value) => setNumberOfInstallments(parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => i + 2).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {language === 'ar' ? 'أقساط' : 'installments'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="frequency">{currentLabels.frequency}</Label>
                  <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">{currentLabels.weekly}</SelectItem>
                      <SelectItem value="biweekly">{currentLabels.biweekly}</SelectItem>
                      <SelectItem value="monthly">{currentLabels.monthly}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="start-date">{currentLabels.startDate}</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                  />
                </div>

                <div>
                  <Label htmlFor="first-payment">{currentLabels.firstPaymentAmount}</Label>
                  <Input
                    id="first-payment"
                    type="number"
                    min="0"
                    max={invoice.totalAmount - 1}
                    value={firstPaymentAmount}
                    onChange={(e) => setFirstPaymentAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Automation Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {currentLabels.automationSettings}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              {/* Auto Collection */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <Switch
                    id="auto-collect"
                    checked={autoCollectEnabled}
                    onCheckedChange={setAutoCollectEnabled}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="auto-collect" className="font-medium">
                      {currentLabels.autoCollection}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {currentLabels.autoCollectionDesc}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Reminder Settings */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{currentLabels.reminderSettings}</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Switch
                      id="whatsapp-reminders"
                      checked={whatsappReminders}
                      onCheckedChange={setWhatsappReminders}
                    />
                    <Label htmlFor="whatsapp-reminders">
                      {currentLabels.whatsappReminders}
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Switch
                      id="email-reminders"
                      checked={emailReminders}
                      onCheckedChange={setEmailReminders}
                    />
                    <Label htmlFor="email-reminders">
                      {currentLabels.emailReminders}
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">{currentLabels.remindersBefore}</Label>
                    <div className="flex gap-2 mt-1">
                      {[1, 3, 7].map((days) => (
                        <Badge
                          key={`before-${days}`}
                          variant={reminderDaysBefore.includes(days) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (reminderDaysBefore.includes(days)) {
                              setReminderDaysBefore(reminderDaysBefore.filter(d => d !== days));
                            } else {
                              setReminderDaysBefore([...reminderDaysBefore, days]);
                            }
                          }}
                        >
                          {days} {language === 'ar' ? 'أيام' : 'days'}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">{currentLabels.remindersAfter}</Label>
                    <div className="flex gap-2 mt-1">
                      {[1, 3, 7, 14].map((days) => (
                        <Badge
                          key={`after-${days}`}
                          variant={reminderDaysAfter.includes(days) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            if (reminderDaysAfter.includes(days)) {
                              setReminderDaysAfter(reminderDaysAfter.filter(d => d !== days));
                            } else {
                              setReminderDaysAfter([...reminderDaysAfter, days]);
                            }
                          }}
                        >
                          {days} {language === 'ar' ? 'أيام' : 'days'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Late Fee Settings */}
              <div className="space-y-3">
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <Switch
                    id="late-fees"
                    checked={lateFeeEnabled}
                    onCheckedChange={setLateFeeEnabled}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="late-fees" className="font-medium">
                      {currentLabels.applyLateFees}
                    </Label>
                  </div>
                </div>

                {lateFeeEnabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6 rtl:mr-6">
                    <div>
                      <Label htmlFor="late-fee-amount">{currentLabels.lateFeeAmount}</Label>
                      <Input
                        id="late-fee-amount"
                        type="number"
                        min="0"
                        value={lateFeeAmount}
                        onChange={(e) => setLateFeeAmount(parseFloat(e.target.value) || 0)}
                        placeholder="25"
                      />
                    </div>

                    <div>
                      <Label htmlFor="grace-period">{currentLabels.gracePeriod}</Label>
                      <Input
                        id="grace-period"
                        type="number"
                        min="0"
                        max="30"
                        value={gracePeriodDays}
                        onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
                        placeholder="3"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentLabels.gracePeriodDesc}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Installment Preview */}
          {planPreview.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {currentLabels.installmentPreview}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Summary Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {numberOfInstallments}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'أقساط' : 'Installments'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {currencySymbol} {invoice.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currentLabels.totalPayments}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {((invoice.totalAmount / numberOfInstallments) / invoice.totalAmount * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {currentLabels.effectiveRate}
                      </div>
                    </div>
                  </div>

                  {/* Payment Schedule Table */}
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
                            {currentLabels.remaining}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {planPreview.map((installment, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={installment.isFirstPayment ? 'default' : 'secondary'}>
                                  #{installment.installmentNumber}
                                </Badge>
                                {installment.isFirstPayment && (
                                  <Badge variant="outline" className="text-xs">
                                    {language === 'ar' ? 'أولى' : 'First'}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2">
                              {format(new Date(installment.dueDate), 'dd/MM/yyyy', {
                                locale: language === 'ar' ? ar : enUS
                              })}
                            </td>
                            <td className="p-2 font-medium">
                              {currencySymbol} {installment.amount.toFixed(2)}
                            </td>
                            <td className="p-2 text-muted-foreground">
                              {currencySymbol} {installment.remainingBalance.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Terms and Conditions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {currentLabels.termsAndConditions}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-start space-x-2 rtl:space-x-reverse">
                <Switch
                  id="terms-accepted"
                  checked={termsAccepted}
                  onCheckedChange={setTermsAccepted}
                />
                <div className="space-y-1 leading-none">
                  <Label
                    htmlFor="terms-accepted"
                    className="text-sm font-normal cursor-pointer"
                  >
                    {currentLabels.termsText}
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} disabled={isLoading}>
              {currentLabels.cancel}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading || !termsAccepted}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              {isLoading ? currentLabels.saving : currentLabels.createPlan}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallmentPlanCreation;