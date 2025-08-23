import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, User, Mail, Phone, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parentPortalService } from '@/services/parent-portal'
import type { ParentUser } from '@/types/parent-portal'

export default function ParentRegisterPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    relationship: '',
    preferredLanguage: 'ar' as 'ar' | 'en',
    agreeToTerms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const navigate = useNavigate()

  const validateStep1 = () => {
    const { firstName, lastName, email, phoneNumber } = formData
    return firstName && lastName && email && phoneNumber && 
           email.includes('@') && phoneNumber.length >= 10
  }

  const validateStep2 = () => {
    const { password, confirmPassword, relationship, agreeToTerms } = formData
    return password && confirmPassword && relationship && agreeToTerms &&
           password.length >= 8 && password === confirmPassword
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) {
      if (validateStep1()) {
        setStep(2)
      } else {
        setError('يرجى ملء جميع الحقول المطلوبة بشكل صحيح')
      }
      return
    }

    if (!validateStep2()) {
      setError('يرجى التحقق من صحة جميع البيانات وكلمة المرور')
      return
    }

    setLoading(true)
    setError('')

    try {
      const parentData: Partial<ParentUser> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        relationship: formData.relationship as any,
        preferredLanguage: formData.preferredLanguage,
        timezone: 'Asia/Riyadh',
        notificationPreferences: {
          sessionReminders: true,
          progressUpdates: true,
          homeProgramUpdates: true,
          appointmentChanges: true,
          emergencyAlerts: true,
          weeklyReports: true,
          communicationMethod: 'email',
          reminderTiming: 2
        }
      }

      const result = await parentPortalService.registerParent(parentData, formData.password)

      if (result.error) {
        setError(result.error)
        return
      }

      // Registration successful
      navigate('/parent-login?registered=true')
    } catch (error) {
      setError('حدث خطأ في إنشاء الحساب. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            إنشاء حساب ولي أمر
          </h1>
          <p className="text-gray-600">
            انضم لمتابعة تقدم طفلك والتواصل مع الفريق العلاجي
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
          </div>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {step === 1 ? 'البيانات الشخصية' : 'إعداد الحساب'}
            </h2>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <>
                  {/* First Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      الاسم الأول *
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="أدخل الاسم الأول"
                        className="pr-10 text-right"
                        required
                        dir="rtl"
                      />
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>

                  {/* Last Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      اسم العائلة *
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="أدخل اسم العائلة"
                        className="pr-10 text-right"
                        required
                        dir="rtl"
                      />
                      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      البريد الإلكتروني *
                    </label>
                    <div className="relative">
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="example@email.com"
                        className="pr-10 text-left"
                        required
                      />
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      رقم الجوال *
                    </label>
                    <div className="relative">
                      <Input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="05xxxxxxxx"
                        className="pr-10 text-left"
                        required
                      />
                      <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Relationship */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      صلة القرابة *
                    </label>
                    <Select value={formData.relationship} onValueChange={(value) => handleSelectChange('relationship', value)}>
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="اختر صلة القرابة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="father">أب</SelectItem>
                        <SelectItem value="mother">أم</SelectItem>
                        <SelectItem value="guardian">وصي</SelectItem>
                        <SelectItem value="caregiver">مقدم رعاية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      كلمة المرور *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="أدخل كلمة مرور قوية"
                        className="pr-10 pl-10 text-right"
                        required
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-right">
                      يجب أن تحتوي على 8 أحرف على الأقل
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 text-right block">
                      تأكيد كلمة المرور *
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="أعد إدخال كلمة المرور"
                        className="pr-10 pl-10 text-right"
                        required
                        dir="rtl"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      className="mt-1"
                      required
                    />
                    <label className="text-sm text-gray-700 text-right">
                      أوافق على{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700">
                        شروط الخدمة
                      </Link>{' '}
                      و{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                        سياسة الخصوصية
                      </Link>
                    </label>
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 space-x-reverse">
                {step === 2 && (
                  <Button
                    type="button"
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1"
                  >
                    السابق
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={loading || (step === 1 ? !validateStep1() : !validateStep2())}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                      جار الإنشاء...
                    </div>
                  ) : step === 1 ? (
                    'التالي'
                  ) : (
                    'إنشاء الحساب'
                  )}
                </Button>
              </div>

              {/* Login Link */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-sm mb-2">
                  لديك حساب بالفعل؟
                </p>
                <Link
                  to="/parent-login"
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  تسجيل الدخول
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}