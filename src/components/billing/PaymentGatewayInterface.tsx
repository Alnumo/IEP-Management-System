// Payment Gateway Interface Component for Story 2.3: Financial Management
// Handles MADA, STC Pay, and Bank Transfer payment processing

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { 
  CreditCardIcon, 
  SmartphoneIcon, 
  BuildingIcon, 
  WalletIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from 'lucide-react'
import { paymentGatewayService } from '../../services/payment-gateway-service'
import type { 
  PaymentRequest,
  PaymentResult,
  PaymentMethod,
  Currency,
  PaymentStatus,
  CustomerInfo
} from '../../types/financial-management'
import type { Invoice } from '../../services/billing-service'

interface PaymentGatewayInterfaceProps {
  invoice: Invoice
  customer: CustomerInfo
  onPaymentSuccess: (result: PaymentResult) => void
  onPaymentError: (error: string) => void
  onCancel: () => void
  isOpen: boolean
}

interface PaymentFormData {
  paymentMethod: PaymentMethod | ''
  // MADA/Card fields
  cardNumber?: string
  expiryMonth?: string
  expiryYear?: string
  cvv?: string
  cardholderName?: string
  // STC Pay fields
  mobileNumber?: string
  otp?: string
  // Bank Transfer fields
  bankCode?: string
  accountNumber?: string
  iban?: string
  beneficiaryName?: string
  transferType?: 'instant' | 'same_day' | 'next_day'
}

const SAUDI_BANKS = [
  { code: 'NCBKSARI', name: 'National Commercial Bank', nameAr: 'البنك الأهلي السعودي' },
  { code: 'RJHISARI', name: 'Al Rajhi Bank', nameAr: 'مصرف الراجحي' },
  { code: 'SABISARI', name: 'SABB Bank', nameAr: 'البنك السعودي البريطاني' },
  { code: 'SIBCSARI', name: 'SIBC Bank', nameAr: 'البنك السعودي للاستثمار' },
  { code: 'ARABSARI', name: 'Arab National Bank', nameAr: 'البنك العربي الوطني' },
  { code: 'RIBLSARI', name: 'Riyad Bank', nameAr: 'بنك الرياض' },
  { code: 'ALBISARI', name: 'Alawwal Bank', nameAr: 'البنك الأول' },
  { code: 'BSFRSARI', name: 'Banque Saudi Fransi', nameAr: 'البنك السعودي الفرنسي' }
]

export const PaymentGatewayInterface: React.FC<PaymentGatewayInterfaceProps> = ({
  invoice,
  customer,
  onPaymentSuccess,
  onPaymentError,
  onCancel,
  isOpen
}) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  // State management
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({ paymentMethod: '' })
  const [processing, setProcessing] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [supportedMethods, setSupportedMethods] = useState<PaymentMethod[]>([])
  const [showOTPInput, setShowOTPInput] = useState(false)
  const [show3DSecure, setShow3DSecure] = useState(false)
  const [secureUrl, setSecureUrl] = useState<string>('')

  // Load supported payment methods
  useEffect(() => {
    const methods = paymentGatewayService.getSupportedPaymentMethods()
    setSupportedMethods(methods)
  }, [])

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPaymentForm({ paymentMethod: '' })
      setValidationErrors({})
      setPaymentResult(null)
      setProcessing(false)
      setShowOTPInput(false)
      setShow3DSecure(false)
    }
  }, [isOpen])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!paymentForm.paymentMethod) {
      errors.paymentMethod = t('Please select a payment method')
    }

    // MADA/Card validation
    if (['mada', 'visa', 'mastercard'].includes(paymentForm.paymentMethod)) {
      if (!paymentForm.cardNumber) {
        errors.cardNumber = t('Card number is required')
      } else if (!/^\d{16}$/.test(paymentForm.cardNumber.replace(/\s/g, ''))) {
        errors.cardNumber = t('Card number must be 16 digits')
      }

      if (!paymentForm.expiryMonth || !paymentForm.expiryYear) {
        errors.expiry = t('Expiry date is required')
      }

      if (!paymentForm.cvv) {
        errors.cvv = t('CVV is required')
      } else if (!/^\d{3,4}$/.test(paymentForm.cvv)) {
        errors.cvv = t('CVV must be 3 or 4 digits')
      }

      if (!paymentForm.cardholderName) {
        errors.cardholderName = t('Cardholder name is required')
      }
    }

    // STC Pay validation
    if (paymentForm.paymentMethod === 'stc_pay') {
      if (!paymentForm.mobileNumber) {
        errors.mobileNumber = t('Mobile number is required')
      } else if (!/^966\d{9}$/.test(paymentForm.mobileNumber.replace(/\s/g, ''))) {
        errors.mobileNumber = t('Mobile number must be in format 966XXXXXXXXX')
      }
    }

    // Bank Transfer validation
    if (paymentForm.paymentMethod === 'bank_transfer') {
      if (!paymentForm.bankCode) {
        errors.bankCode = t('Bank selection is required')
      }
      if (!paymentForm.accountNumber && !paymentForm.iban) {
        errors.account = t('Account number or IBAN is required')
      }
      if (!paymentForm.beneficiaryName) {
        errors.beneficiaryName = t('Beneficiary name is required')
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePayment = async (): Promise<void> => {
    if (!validateForm()) return

    setProcessing(true)
    setValidationErrors({})

    try {
      let paymentData: any = {}

      // Prepare payment data based on method
      switch (paymentForm.paymentMethod) {
        case 'mada':
        case 'visa':
        case 'mastercard':
          paymentData = {
            amount: invoice.balanceAmount,
            currency: invoice.currency as Currency,
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            customerInfo: customer,
            cardNumber: paymentForm.cardNumber?.replace(/\s/g, ''),
            expiryMonth: paymentForm.expiryMonth,
            expiryYear: paymentForm.expiryYear,
            cvv: paymentForm.cvv,
            returnUrl: `${window.location.origin}/payment/return`,
            callbackUrl: `${window.location.origin}/api/payment/callback`
          }
          break

        case 'stc_pay':
          paymentData = {
            amount: invoice.balanceAmount,
            currency: invoice.currency as Currency,
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            descriptionAr: `دفع فاتورة رقم ${invoice.invoiceNumber}`,
            mobileNumber: paymentForm.mobileNumber?.replace(/\s/g, ''),
            ...(paymentForm.otp && { otp: paymentForm.otp }),
            returnUrl: `${window.location.origin}/payment/return`,
            callbackUrl: `${window.location.origin}/api/payment/callback`
          }
          break

        case 'bank_transfer':
          paymentData = {
            amount: invoice.balanceAmount,
            currency: invoice.currency as Currency,
            description: `Payment for Invoice ${invoice.invoiceNumber}`,
            descriptionAr: `دفع فاتورة رقم ${invoice.invoiceNumber}`,
            bankCode: paymentForm.bankCode,
            accountNumber: paymentForm.accountNumber,
            iban: paymentForm.iban,
            beneficiaryName: paymentForm.beneficiaryName,
            transferType: paymentForm.transferType || 'same_day'
          }
          break
      }

      const paymentRequest: PaymentRequest = {
        invoiceId: invoice.id,
        amount: invoice.balanceAmount,
        currency: invoice.currency as Currency,
        paymentMethod: paymentForm.paymentMethod as PaymentMethod,
        customer,
        paymentData,
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        descriptionAr: `دفع فاتورة رقم ${invoice.invoiceNumber}`
      }

      const result = await paymentGatewayService.processPayment(paymentRequest)
      setPaymentResult(result)

      if (result.success) {
        if (result.status === 'requires_action') {
          // Handle additional authentication
          if (result.actionRequired?.type === '3d_secure') {
            setSecureUrl(result.actionRequired.url || '')
            setShow3DSecure(true)
          } else if (result.actionRequired?.type === 'otp') {
            setShowOTPInput(true)
          }
        } else if (result.status === 'completed') {
          onPaymentSuccess(result)
        }
      } else {
        onPaymentError(result.error?.message || t('Payment failed'))
      }
    } catch (error) {
      console.error('Payment processing error:', error)
      onPaymentError(error instanceof Error ? error.message : t('Payment processing failed'))
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const getPaymentMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'mada':
      case 'visa':
      case 'mastercard':
        return <CreditCardIcon className="h-5 w-5" />
      case 'stc_pay':
        return <SmartphoneIcon className="h-5 w-5" />
      case 'bank_transfer':
        return <BuildingIcon className="h-5 w-5" />
      default:
        return <WalletIcon className="h-5 w-5" />
    }
  }

  const getPaymentMethodName = (method: PaymentMethod): string => {
    const names: Record<PaymentMethod, { en: string; ar: string }> = {
      cash: { en: 'Cash Payment', ar: 'دفع نقدي' },
      mada: { en: 'MADA Card', ar: 'بطاقة مدى' },
      visa: { en: 'Visa Card', ar: 'بطاقة فيزا' },
      mastercard: { en: 'Mastercard', ar: 'ماستركارد' },
      stc_pay: { en: 'STC Pay', ar: 'دفع إس تي سي' },
      bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
      apple_pay: { en: 'Apple Pay', ar: 'أبل باي' },
      google_pay: { en: 'Google Pay', ar: 'جوجل باي' },
      insurance: { en: 'Insurance', ar: 'تأمين' },
      check: { en: 'Check', ar: 'شيك' }
    }
    return isRTL ? names[method]?.ar : names[method]?.en
  }

  const renderPaymentForm = () => {
    if (!paymentForm.paymentMethod) return null

    switch (paymentForm.paymentMethod) {
      case 'mada':
      case 'visa':
      case 'mastercard':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="cardNumber">{t('Card Number')}</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={paymentForm.cardNumber || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
                  if (value.replace(/\s/g, '').length <= 16) {
                    setPaymentForm({ ...paymentForm, cardNumber: value })
                  }
                }}
                className={validationErrors.cardNumber ? 'border-red-500' : ''}
                maxLength={19}
              />
              {validationErrors.cardNumber && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.cardNumber}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="expiryMonth">{t('Month')}</Label>
                <Select 
                  value={paymentForm.expiryMonth || ''} 
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, expiryMonth: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="MM" />
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
                <Label htmlFor="expiryYear">{t('Year')}</Label>
                <Select 
                  value={paymentForm.expiryYear || ''} 
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, expiryYear: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="YY" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = new Date().getFullYear() + i
                      return (
                        <SelectItem key={year} value={String(year).slice(-2)}>
                          {year}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cvv">{t('CVV')}</Label>
                <Input
                  id="cvv"
                  placeholder="123"
                  value={paymentForm.cvv || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    if (value.length <= 4) {
                      setPaymentForm({ ...paymentForm, cvv: value })
                    }
                  }}
                  className={validationErrors.cvv ? 'border-red-500' : ''}
                  maxLength={4}
                />
                {validationErrors.cvv && (
                  <p className="text-sm text-red-500 mt-1">{validationErrors.cvv}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="cardholderName">{t('Cardholder Name')}</Label>
              <Input
                id="cardholderName"
                placeholder={t('Name on card')}
                value={paymentForm.cardholderName || ''}
                onChange={(e) => setPaymentForm({ ...paymentForm, cardholderName: e.target.value })}
                className={validationErrors.cardholderName ? 'border-red-500' : ''}
              />
              {validationErrors.cardholderName && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.cardholderName}</p>
              )}
            </div>

            {validationErrors.expiry && (
              <p className="text-sm text-red-500">{validationErrors.expiry}</p>
            )}
          </div>
        )

      case 'stc_pay':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="mobileNumber">{t('Mobile Number')}</Label>
              <Input
                id="mobileNumber"
                placeholder="966501234567"
                value={paymentForm.mobileNumber || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  if (value.length <= 12) {
                    setPaymentForm({ ...paymentForm, mobileNumber: value })
                  }
                }}
                className={validationErrors.mobileNumber ? 'border-red-500' : ''}
                maxLength={12}
              />
              {validationErrors.mobileNumber && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.mobileNumber}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {t('Enter your STC Pay registered mobile number')}
              </p>
            </div>

            {showOTPInput && (
              <div>
                <Label htmlFor="otp">{t('OTP Code')}</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  value={paymentForm.otp || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    if (value.length <= 6) {
                      setPaymentForm({ ...paymentForm, otp: value })
                    }
                  }}
                  maxLength={6}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('Enter the OTP code sent to your mobile')}
                </p>
              </div>
            )}
          </div>
        )

      case 'bank_transfer':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bankCode">{t('Select Bank')}</Label>
              <Select 
                value={paymentForm.bankCode || ''} 
                onValueChange={(value) => setPaymentForm({ ...paymentForm, bankCode: value })}
              >
                <SelectTrigger className={validationErrors.bankCode ? 'border-red-500' : ''}>
                  <SelectValue placeholder={t('Choose your bank')} />
                </SelectTrigger>
                <SelectContent>
                  {SAUDI_BANKS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {isRTL ? bank.nameAr : bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.bankCode && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.bankCode}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accountNumber">{t('Account Number')}</Label>
                <Input
                  id="accountNumber"
                  placeholder="1234567890"
                  value={paymentForm.accountNumber || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="iban">{t('IBAN (Optional)')}</Label>
                <Input
                  id="iban"
                  placeholder="SA1234567890123456789012"
                  value={paymentForm.iban || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, iban: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="beneficiaryName">{t('Account Holder Name')}</Label>
              <Input
                id="beneficiaryName"
                placeholder={t('Full name as registered')}
                value={paymentForm.beneficiaryName || ''}
                onChange={(e) => setPaymentForm({ ...paymentForm, beneficiaryName: e.target.value })}
                className={validationErrors.beneficiaryName ? 'border-red-500' : ''}
              />
              {validationErrors.beneficiaryName && (
                <p className="text-sm text-red-500 mt-1">{validationErrors.beneficiaryName}</p>
              )}
            </div>

            <div>
              <Label>{t('Transfer Type')}</Label>
              <RadioGroup
                value={paymentForm.transferType || 'same_day'}
                onValueChange={(value) => setPaymentForm({ 
                  ...paymentForm, 
                  transferType: value as 'instant' | 'same_day' | 'next_day' 
                })}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="instant" id="instant" />
                  <Label htmlFor="instant">{t('Instant Transfer')} (+5 SAR)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="same_day" id="same_day" />
                  <Label htmlFor="same_day">{t('Same Day Transfer')} (Free)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="next_day" id="next_day" />
                  <Label htmlFor="next_day">{t('Next Day Transfer')} (Free)</Label>
                </div>
              </RadioGroup>
            </div>

            {validationErrors.account && (
              <p className="text-sm text-red-500">{validationErrors.account}</p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'processing':
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />
      case 'requires_action':
        return <AlertTriangleIcon className="h-5 w-5 text-blue-600" />
      case 'failed':
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5" />
            {t('Secure Payment')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t('Payment Summary')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>{t('Invoice')}:</span>
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('Amount Due')}:</span>
                <span className="font-bold text-lg">{formatCurrency(invoice.balanceAmount)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('Customer')}:</span>
                <span>{customer.name}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Result Display */}
          {paymentResult && (
            <Alert className={paymentResult.success ? 'border-green-200' : 'border-red-200'}>
              <div className="flex items-center gap-2">
                {getStatusIcon(paymentResult.status)}
                <AlertDescription className="flex-1">
                  {paymentResult.success ? (
                    <div>
                      <p className="font-semibold text-green-800">
                        {paymentResult.status === 'completed' ? t('Payment Successful') : t('Payment Processing')}
                      </p>
                      {paymentResult.transactionId && (
                        <p className="text-sm text-green-700 mt-1">
                          {t('Transaction ID')}: {paymentResult.transactionId}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-red-800">{t('Payment Failed')}</p>
                      <p className="text-sm text-red-700 mt-1">
                        {paymentResult.error?.messageAr && isRTL 
                          ? paymentResult.error.messageAr 
                          : paymentResult.error?.message}
                      </p>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}

          {/* 3D Secure iframe */}
          {show3DSecure && secureUrl && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Secure Authentication Required')}</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  src={secureUrl}
                  className="w-full h-96 border rounded-lg"
                  title="3D Secure Authentication"
                />
              </CardContent>
            </Card>
          )}

          {/* Payment Method Selection */}
          {!show3DSecure && (
            <>
              <div>
                <Label className="text-base font-semibold">{t('Select Payment Method')}</Label>
                <RadioGroup
                  value={paymentForm.paymentMethod}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value as PaymentMethod })}
                  className="grid grid-cols-1 gap-2 mt-3"
                >
                  {supportedMethods.filter(method => method !== 'cash' && method !== 'insurance').map((method) => (
                    <div key={method} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value={method} id={method} />
                      <Label htmlFor={method} className="flex items-center gap-3 cursor-pointer flex-1">
                        {getPaymentMethodIcon(method)}
                        <span className="font-medium">{getPaymentMethodName(method)}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {method === 'bank_transfer' ? t('Free') : t('Instant')}
                        </Badge>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {validationErrors.paymentMethod && (
                  <p className="text-sm text-red-500 mt-2">{validationErrors.paymentMethod}</p>
                )}
              </div>

              {/* Payment Form */}
              {renderPaymentForm()}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <Button variant="outline" onClick={onCancel} disabled={processing}>
              {t('Cancel')}
            </Button>
            <Button 
              onClick={handlePayment} 
              disabled={processing || !paymentForm.paymentMethod}
              className="flex-1"
            >
              {processing ? (
                <>
                  <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                  {t('Processing...')}
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  {showOTPInput ? t('Verify OTP') : t('Pay')} {formatCurrency(invoice.balanceAmount)}
                </>
              )}
            </Button>
          </div>

          {/* Security Notice */}
          <Alert>
            <ShieldCheckIcon className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {isRTL 
                ? 'تتم معالجة جميع المدفوعات بشكل آمن وفقاً لمعايير الأمان المصرفية السعودية' 
                : 'All payments are processed securely in compliance with Saudi banking security standards'}
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PaymentGatewayInterface