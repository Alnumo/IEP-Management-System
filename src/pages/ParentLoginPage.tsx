import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Phone, Lock, User, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { parentPortalService } from '@/services/parent-portal'

export default function ParentLoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await parentPortalService.authenticateParent(
        formData.email,
        formData.password
      )

      if (result.error) {
        setError(result.error)
        return
      }

      // Store parent data in localStorage
      localStorage.setItem('parentUser', JSON.stringify(result.user))
      localStorage.setItem('parentSession', JSON.stringify(result.session))

      // Navigate to parent dashboard
      navigate('/parent-dashboard')
    } catch (error) {
      setError('حدث خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
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
            بوابة أولياء الأمور
          </h1>
          <p className="text-gray-600">
            تابع تقدم طفلك وتواصل مع المعالجين
          </p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              تسجيل الدخول
            </h2>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 text-right block">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="أدخل بريدك الإلكتروني"
                    className="pr-10 text-right"
                    required
                    dir="rtl"
                  />
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 text-right block">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="أدخل كلمة المرور"
                    className="pr-10 pl-10 text-right"
                    required
                    dir="rtl"
                  />
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-right">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Login Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                    جار تسجيل الدخول...
                  </div>
                ) : (
                  'تسجيل الدخول'
                )}
              </Button>

              {/* Forgot Password */}
              <div className="text-center">
                <Link
                  to="/parent-forgot-password"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              {/* Register Link */}
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-sm mb-2">
                  ليس لديك حساب؟
                </p>
                <Link
                  to="/parent-register"
                  className="text-green-600 hover:text-green-700 font-semibold text-sm"
                >
                  إنشاء حساب جديد
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="text-center mt-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-center mb-2">
              <Phone className="w-5 h-5 text-blue-600 ml-2" />
              <span className="text-blue-800 font-semibold">
                تحتاج مساعدة؟
              </span>
            </div>
            <p className="text-blue-700 text-sm">
              تواصل معنا: 920000000
            </p>
            <p className="text-blue-600 text-xs mt-1">
              متوفرون من السبت إلى الخميس، 8 صباحاً - 6 مساءً
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}