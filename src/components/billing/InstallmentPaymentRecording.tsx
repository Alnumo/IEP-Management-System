// Installment Payment Recording Interface - Story 4.2
// Component for recording payments against installment payments

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useLanguage } from '../../contexts/LanguageContext';
import { InstallmentPaymentService } from '../../services/installment-payment-service';
import { 
  CreditCard, 
  AlertCircle, 
  CheckCircle, 
  Receipt,
  DollarSign,
  Loader2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { PaymentRecordingData, InstallmentPayment } from '../../types/billing';

interface InstallmentPaymentRecordingProps {
  installmentPayment: InstallmentPayment;
  onSuccess: (updatedPayment: InstallmentPayment) => Promise<void>;
  onCancel: () => void;
}

export const InstallmentPaymentRecording: React.FC<InstallmentPaymentRecordingProps> = ({
  installmentPayment,
  onSuccess,
  onCancel
}) => {
  const { language, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Form state
  const [amount, setAmount] = useState(installmentPayment.amount);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactionId, setTransactionId] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Labels for bilingual support
  const labels = {
    ar: {
      title: 'تسجيل دفعة قسط',
      description: 'سجل دفعة للقسط المحدد',
      installmentDetails: 'تفاصيل القسط',
      installmentNumber: 'رقم القسط:',
      dueDate: 'تاريخ الاستحقاق:',
      originalAmount: 'المبلغ الأصلي:',
      currentStatus: 'الحالة الحالية:',
      paymentInformation: 'معلومات الدفع',
      paymentAmount: 'مبلغ الدفع',
      paymentMethod: 'طريقة الدفع',
      paymentDate: 'تاريخ الدفع',
      transactionId: 'رقم المعاملة (اختياري)',
      receiptNumber: 'رقم الإيصال (اختياري)',
      notes: 'ملاحظات (اختيارية)',
      recordPayment: 'تسجيل الدفع',
      cancel: 'إلغاء',
      recording: 'جاري التسجيل...',
      // Payment methods
      cash: 'نقداً',
      mada: 'مدى',
      visa: 'فيزا',
      mastercard: 'ماستركارد',
      stc_pay: 'STC Pay',
      bank_transfer: 'حوالة بنكية',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
      insurance: 'تأمين',
      check: 'شيك',
      // Status
      pending: 'معلق',
      paid: 'مدفوع',
      overdue: 'متأخر',
      partial: 'جزئي',
      // Success/Error messages
      paymentRecordedSuccess: 'تم تسجيل الدفع بنجاح',
      fullPaymentRecorded: 'تم تسجيل الدفع كاملاً',
      partialPaymentRecorded: 'تم تسجيل دفع جزئي',
      validationErrors: 'أخطاء التحقق'
    },
    en: {
      title: 'Record Installment Payment',
      description: 'Record a payment for the selected installment',
      installmentDetails: 'Installment Details',
      installmentNumber: 'Installment #:',
      dueDate: 'Due Date:',
      originalAmount: 'Original Amount:',
      currentStatus: 'Current Status:',
      paymentInformation: 'Payment Information',
      paymentAmount: 'Payment Amount',
      paymentMethod: 'Payment Method',
      paymentDate: 'Payment Date',
      transactionId: 'Transaction ID (Optional)',
      receiptNumber: 'Receipt Number (Optional)',
      notes: 'Notes (Optional)',
      recordPayment: 'Record Payment',
      cancel: 'Cancel',
      recording: 'Recording...',
      // Payment methods
      cash: 'Cash',
      mada: 'MADA',
      visa: 'Visa',
      mastercard: 'Mastercard',
      stc_pay: 'STC Pay',
      bank_transfer: 'Bank Transfer',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
      insurance: 'Insurance',
      check: 'Check',
      // Status
      pending: 'Pending',
      paid: 'Paid',
      overdue: 'Overdue',
      partial: 'Partial',
      // Success/Error messages
      paymentRecordedSuccess: 'Payment recorded successfully',
      fullPaymentRecorded: 'Full payment recorded successfully',
      partialPaymentRecorded: 'Partial payment recorded successfully',
      validationErrors: 'Validation Errors'
    }
  };

  const currentLabels = labels[language];

  // Payment methods options
  const paymentMethods = [
    { value: 'cash', label: currentLabels.cash },
    { value: 'mada', label: currentLabels.mada },
    { value: 'visa', label: currentLabels.visa },
    { value: 'mastercard', label: currentLabels.mastercard },
    { value: 'stc_pay', label: currentLabels.stc_pay },
    { value: 'bank_transfer', label: currentLabels.bank_transfer },
    { value: 'apple_pay', label: currentLabels.apple_pay },
    { value: 'google_pay', label: currentLabels.google_pay },
    { value: 'insurance', label: currentLabels.insurance },
    { value: 'check', label: currentLabels.check }
  ];

  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!amount || amount <= 0) {
      errors.push(language === 'ar' 
        ? 'مبلغ الدفع يجب أن يكون أكبر من صفر'
        : 'Payment amount must be greater than zero');
    }

    if (amount > installmentPayment.amount) {
      errors.push(language === 'ar'
        ? 'مبلغ الدفع لا يمكن أن يكون أكبر من مبلغ القسط'
        : 'Payment amount cannot be greater than installment amount');
    }

    if (!paymentMethod) {
      errors.push(language === 'ar'
        ? 'يجب اختيار طريقة الدفع'
        : 'Payment method is required');
    }

    if (!paymentDate) {
      errors.push(language === 'ar'
        ? 'تاريخ الدفع مطلوب'
        : 'Payment date is required');
    }

    if (new Date(paymentDate) > new Date()) {
      errors.push(language === 'ar'
        ? 'تاريخ الدفع لا يمكن أن يكون في المستقبل'
        : 'Payment date cannot be in the future');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Prepare payment recording data
      const paymentData: PaymentRecordingData = {
        installmentPaymentId: installmentPayment.id,
        amount,
        paymentMethod,
        paymentDate,
        ...(transactionId && { transactionId }),
        ...(receiptNumber && { receiptNumber }),
        ...(notes && { notes })
      };

      // Call the enhanced service method
      const result = await InstallmentPaymentService.recordPayment(paymentData);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      if (result.data) {
        // Determine success message based on payment amount
        const isFullPayment = amount >= installmentPayment.amount;
        const successMsg = isFullPayment 
          ? currentLabels.fullPaymentRecorded
          : currentLabels.partialPaymentRecorded;
        
        setSuccessMessage(successMsg);

        // Call success callback after a brief delay
        setTimeout(async () => {
          await onSuccess(result.data);
        }, 2000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(language === 'ar' 
        ? `خطأ في تسجيل الدفع: ${errorMsg}`
        : `Error recording payment: ${errorMsg}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const symbol = language === 'ar' ? 'ريال' : 'SAR';
    return `${symbol} ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', {
      locale: language === 'ar' ? ar : enUS
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return currentLabels.paid;
      case 'overdue':
        return currentLabels.overdue;
      case 'partial':
        return currentLabels.partial;
      default:
        return currentLabels.pending;
    }
  };

  return (
    <div className={`w-full max-w-2xl mx-auto ${isRTL ? 'rtl' : 'ltr'}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {currentLabels.title}
          </CardTitle>
          <CardDescription>
            {currentLabels.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

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

          {/* Installment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {currentLabels.installmentDetails}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">{currentLabels.installmentNumber}</span>
                  <p className="text-muted-foreground">#{installmentPayment.installmentNumber}</p>
                </div>
                <div>
                  <span className="font-medium">{currentLabels.dueDate}</span>
                  <p className="text-muted-foreground">{formatDate(installmentPayment.dueDate)}</p>
                </div>
                <div>
                  <span className="font-medium">{currentLabels.originalAmount}</span>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(installmentPayment.amount)}
                  </p>
                </div>
                <div>
                  <span className="font-medium">{currentLabels.currentStatus}</span>
                  <div className="mt-1">
                    <Badge className={getStatusBadgeColor(installmentPayment.status)}>
                      {getStatusLabel(installmentPayment.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              {installmentPayment.paidAmount && installmentPayment.paidAmount > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>
                      {language === 'ar' ? 'مدفوع مسبقاً:' : 'Previously Paid:'} 
                    </strong> {formatCurrency(installmentPayment.paidAmount)}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>
                      {language === 'ar' ? 'المتبقي:' : 'Remaining:'} 
                    </strong> {formatCurrency(installmentPayment.amount - (installmentPayment.paidAmount || 0))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                {currentLabels.paymentInformation}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">{currentLabels.paymentAmount}</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0.01"
                    max={installmentPayment.amount - (installmentPayment.paidAmount || 0)}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <Label htmlFor="payment-method">{currentLabels.paymentMethod}</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        language === 'ar' ? 'اختر طريقة الدفع' : 'Select payment method'
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment-date">{currentLabels.paymentDate}</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div>
                  <Label htmlFor="transaction-id">{currentLabels.transactionId}</Label>
                  <Input
                    id="transaction-id"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={language === 'ar' ? 'رقم المعاملة' : 'Transaction ID'}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="receipt-number">{currentLabels.receiptNumber}</Label>
                <Input
                  id="receipt-number"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder={language === 'ar' ? 'رقم الإيصال' : 'Receipt number'}
                />
              </div>

              <div>
                <Label htmlFor="notes">{currentLabels.notes}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    language === 'ar' 
                      ? 'أي ملاحظات إضافية...'
                      : 'Any additional notes...'
                  }
                  rows={3}
                />
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
              disabled={isLoading || !paymentMethod || !amount}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              {isLoading ? currentLabels.recording : currentLabels.recordPayment}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallmentPaymentRecording;