import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Smartphone, Building2, Banknote, AlertCircle, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { paymentGatewayService } from '@/services/payment-gateway-service'
import type { PaymentFormData, PaymentResult } from '@/types/billing'

const paymentFormSchema = z.object({
  paymentMethod: z.enum(['cash', 'mada', 'visa', 'mastercard', 'stc_pay', 'bank_transfer']),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Invalid email address').optional(),
  customerPhone: z.string().optional(),
  
  // Credit card fields
  cardNumber: z.string().optional(),
  expiryMonth: z.string().optional(),
  expiryYear: z.string().optional(),
  cvv: z.string().optional(),
  
  // STC Pay fields
  mobileNumber: z.string().optional(),
  
  // Bank transfer fields
  bankCode: z.string().optional(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  
  notes: z.string().optional()
})

type PaymentFormValues = z.infer<typeof paymentFormSchema>

interface PaymentFormProps {
  invoiceId: string
  amount: number
  currency?: string
  studentName: string
  onPaymentSuccess: (result: PaymentResult) => void
  onCancel: () => void
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  invoiceId,
  amount,
  currency = 'SAR',
  studentName,
  onPaymentSuccess,
  onCancel
}) => {
  const { language, isRTL } = useLanguage()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: amount,
      customerName: studentName
    }
  })

  const watchedPaymentMethod = watch('paymentMethod')

  const paymentMethods = [
    {
      id: 'cash',
      name: language === 'ar' ? 'نقدي' : 'Cash',
      description: language === 'ar' ? 'دفع نقدي فوري' : 'Immediate cash payment',
      icon: Banknote,
      enabled: true
    },
    {
      id: 'mada',
      name: language === 'ar' ? 'مدى' : 'MADA',
      description: language === 'ar' ? 'بطاقة مدى السعودية' : 'Saudi MADA card',
      icon: CreditCard,
      enabled: true
    },
    {
      id: 'visa',
      name: 'Visa',
      description: language === 'ar' ? 'بطاقة فيزا' : 'Visa card',
      icon: CreditCard,
      enabled: true
    },
    {
      id: 'mastercard',
      name: 'Mastercard',
      description: language === 'ar' ? 'بطاقة ماستركارد' : 'Mastercard',
      icon: CreditCard,
      enabled: true
    },
    {
      id: 'stc_pay',
      name: 'STC Pay',
      description: language === 'ar' ? 'دفع إس تي سي' : 'STC Pay wallet',
      icon: Smartphone,
      enabled: true
    },
    {
      id: 'bank_transfer',
      name: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer',
      description: language === 'ar' ? 'تحويل بنكي مباشر' : 'Direct bank transfer',
      icon: Building2,
      enabled: true
    }
  ]

  const handlePaymentSubmit = async (data: PaymentFormValues) => {
    setIsProcessing(true)
    setPaymentResult(null)

    try {
      // Prepare payment request
      const paymentRequest = {
        invoiceId,
        amount: data.amount,
        currency,
        paymentMethod: data.paymentMethod,
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          phone: data.customerPhone
        },
        paymentData: preparePaymentData(data),
        description: `Payment for invoice ${invoiceId}`,
        descriptionAr: `دفع للفاتورة ${invoiceId}`,
        metadata: {
          studentName,
          notes: data.notes
        }
      }

      // Process payment
      const result = await paymentGatewayService.processPayment(paymentRequest)
      setPaymentResult(result)

      if (result.success) {
        // Handle successful payment
        if (result.actionRequired) {
          // Handle cases requiring user action (3D Secure, STC Pay redirect, etc.)
          if (result.actionRequired.url) {
            window.open(result.actionRequired.url, '_blank')
          }
        } else if (result.status === 'completed') {
          // Payment completed immediately
          setTimeout(() => {
            onPaymentSuccess(result)
          }, 2000)
        }
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      setPaymentResult({
        success: false,
        status: 'failed',
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Payment processing failed',
          messageAr: 'فشل في معالجة الدفع'
        },
        timestamp: new Date().toISOString()
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const preparePaymentData = (data: PaymentFormValues) => {
    switch (data.paymentMethod) {
      case 'mada':
      case 'visa':
      case 'mastercard':
        return {
          cardNumber: data.cardNumber,
          expiryMonth: data.expiryMonth,
          expiryYear: data.expiryYear,
          cvv: data.cvv,
          customerInfo: {
            name: data.customerName,
            email: data.customerEmail,
            phone: data.customerPhone
          },
          returnUrl: `${window.location.origin}/payment-return`,
          callbackUrl: `${window.location.origin}/api/payment-callback`
        }
      
      case 'stc_pay':
        return {
          mobileNumber: data.mobileNumber,
          returnUrl: `${window.location.origin}/payment-return`,
          callbackUrl: `${window.location.origin}/api/payment-callback`
        }
      
      case 'bank_transfer':
        return {
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          iban: data.iban,
          beneficiaryName: data.customerName,
          transferType: 'same_day'
        }
      
      default:
        return {}
    }
  }

  const renderPaymentMethodFields = () => {
    switch (watchedPaymentMethod) {
      case 'mada':
      case 'visa':
      case 'mastercard':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">
                {language === 'ar' ? 'رقم البطاقة' : 'Card Number'}
              </Label>
              <Input
                id="cardNumber"
                {...register('cardNumber')}
                placeholder={language === 'ar' ? 'xxxx xxxx xxxx xxxx' : 'xxxx xxxx xxxx xxxx'}
                dir="ltr"
                className={errors.cardNumber ? 'border-red-500' : ''}
              />
              {errors.cardNumber && (
                <p className="text-sm text-red-500 mt-1">{errors.cardNumber.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expiryMonth">
                  {language === 'ar' ? 'الشهر' : 'Month'}
                </Label>
                <Select onValueChange={(value) => setValue('expiryMonth', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'MM' : 'MM'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="expiryYear">
                  {language === 'ar' ? 'السنة' : 'Year'}
                </Label>
                <Select onValueChange={(value) => setValue('expiryYear', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'YYYY' : 'YYYY'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={String(new Date().getFullYear() + i)}>
                        {new Date().getFullYear() + i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-1/2">
              <Label htmlFor="cvv">
                {language === 'ar' ? 'CVV' : 'CVV'}
              </Label>
              <Input
                id="cvv"
                {...register('cvv')}
                placeholder="123"
                maxLength={4}
                dir="ltr"
                className={errors.cvv ? 'border-red-500' : ''}
              />
              {errors.cvv && (
                <p className="text-sm text-red-500 mt-1">{errors.cvv.message}</p>
              )}
            </div>
          </div>
        )

      case 'stc_pay':
        return (
          <div>
            <Label htmlFor="mobileNumber">
              {language === 'ar' ? 'رقم الجوال' : 'Mobile Number'}
            </Label>
            <Input
              id="mobileNumber"
              {...register('mobileNumber')}
              placeholder={language === 'ar' ? '05xxxxxxxx' : '05xxxxxxxx'}
              dir="ltr"
              className={errors.mobileNumber ? 'border-red-500' : ''}
            />
            {errors.mobileNumber && (
              <p className="text-sm text-red-500 mt-1">{errors.mobileNumber.message}</p>
            )}
          </div>
        )

      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankCode">
                {language === 'ar' ? 'رمز البنك' : 'Bank Code'}
              </Label>
              <Select onValueChange={(value) => setValue('bankCode', value)}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر البنك' : 'Select Bank'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80">الراجحي - Al Rajhi Bank</SelectItem>
                  <SelectItem value="10">الأهلي - National Commercial Bank</SelectItem>
                  <SelectItem value="45">سامبا - Samba Financial Group</SelectItem>
                  <SelectItem value="15">البنك السعودي للاستثمار - SAIB</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="accountNumber">
                {language === 'ar' ? 'رقم الحساب' : 'Account Number'}
              </Label>
              <Input
                id="accountNumber"
                {...register('accountNumber')}
                placeholder={language === 'ar' ? 'رقم الحساب' : 'Account number'}
                dir="ltr"
              />
            </div>
            <div>
              <Label htmlFor="iban">
                {language === 'ar' ? 'الآيبان' : 'IBAN'}
              </Label>
              <Input
                id="iban"
                {...register('iban')}
                placeholder="SA00 0000 0000 0000 0000 0000"
                dir="ltr"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (paymentResult && paymentResult.success && paymentResult.status === 'completed') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-600">
              {language === 'ar' ? 'تم الدفع بنجاح' : 'Payment Successful'}
            </CardTitle>
          </div>
          <CardDescription>
            {language === 'ar' 
              ? `تم استلام دفعة بقيمة ${amount} ${currency} بنجاح`
              : `Payment of ${amount} ${currency} has been processed successfully`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>{language === 'ar' ? 'رقم المعاملة:' : 'Transaction ID:'}</strong> {paymentResult.transactionId}
              </p>
              <p className="text-sm text-green-800">
                <strong>{language === 'ar' ? 'التاريخ:' : 'Date:'}</strong> {new Date(paymentResult.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
            <Button onClick={() => onPaymentSuccess(paymentResult)} className="w-full">
              {language === 'ar' ? 'متابعة' : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {language === 'ar' ? 'معالجة الدفع' : 'Process Payment'}
        </CardTitle>
        <CardDescription>
          {language === 'ar' 
            ? `دفع مبلغ ${amount} ${currency} للطالب ${studentName}`
            : `Pay ${amount} ${currency} for ${studentName}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handlePaymentSubmit)} className="space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              {language === 'ar' ? 'معلومات العميل' : 'Customer Information'}
            </h3>
            <div>
              <Label htmlFor="customerName">
                {language === 'ar' ? 'اسم العميل' : 'Customer Name'}
              </Label>
              <Input
                id="customerName"
                {...register('customerName')}
                className={errors.customerName ? 'border-red-500' : ''}
              />
              {errors.customerName && (
                <p className="text-sm text-red-500 mt-1">{errors.customerName.message}</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerEmail">
                  {language === 'ar' ? 'البريد الإلكتروني (اختياري)' : 'Email (Optional)'}
                </Label>
                <Input
                  id="customerEmail"
                  type="email"
                  {...register('customerEmail')}
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">
                  {language === 'ar' ? 'رقم الهاتف (اختياري)' : 'Phone (Optional)'}
                </Label>
                <Input
                  id="customerPhone"
                  {...register('customerPhone')}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
            </h3>
            <RadioGroup
              value={selectedPaymentMethod}
              onValueChange={(value) => {
                setSelectedPaymentMethod(value)
                setValue('paymentMethod', value as any)
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value={method.id} id={method.id} />
                    <Label 
                      htmlFor={method.id} 
                      className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer flex-1 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <method.icon className="h-5 w-5" />
                      <div className="flex-1">
                        <div className="font-medium">{method.name}</div>
                        <div className="text-sm text-gray-600">{method.description}</div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Payment Method Specific Fields */}
          {watchedPaymentMethod && renderPaymentMethodFields()}

          {/* Payment Amount */}
          <div>
            <Label htmlFor="amount">
              {language === 'ar' ? 'المبلغ' : 'Amount'}
            </Label>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                {...register('amount', { valueAsNumber: true })}
                className={errors.amount ? 'border-red-500' : ''}
                dir="ltr"
              />
              <span className="text-sm text-gray-600">{currency}</span>
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">
              {language === 'ar' ? 'ملاحظات (اختيارية)' : 'Notes (Optional)'}
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              rows={3}
              placeholder={language === 'ar' ? 'أي ملاحظات إضافية...' : 'Any additional notes...'}
            />
          </div>

          {/* Payment Result Display */}
          {paymentResult && !paymentResult.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' ? paymentResult.error?.messageAr || paymentResult.error?.message : paymentResult.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {paymentResult && paymentResult.success && paymentResult.actionRequired && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {language === 'ar' 
                  ? 'يتطلب إجراء إضافي. سيتم فتح نافذة جديدة لإكمال الدفع.'
                  : 'Additional action required. A new window will open to complete payment.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 rtl:space-x-reverse">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || !watchedPaymentMethod}
              className="flex-1"
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing
                ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                : (language === 'ar' ? 'تأكيد الدفع' : 'Confirm Payment')
              }
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default PaymentForm