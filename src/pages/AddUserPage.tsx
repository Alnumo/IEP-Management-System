import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import UserForm, { CreateUserData } from '@/components/forms/UserForm'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function AddUserPage() {
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()

  const handleSubmit = async (data: CreateUserData) => {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        throw authError
      }

      // Create user profile in the database
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: authData.user.id,
              email: data.email,
              name: data.name,
              role: data.role,
            }
          ])

        if (profileError) {
          throw profileError
        }
      }

      toast.success(
        language === 'ar' 
          ? 'تم إنشاء المستخدم بنجاح' 
          : 'User created successfully'
      )
      
      navigate('/users')
    } catch (error: any) {
      console.error('Error creating user:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في إنشاء المستخدم'
          : `Error creating user: ${error.message}`
      )
    }
  }

  const handleCancel = () => {
    navigate('/users')
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/users')}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ar' ? 'العودة' : 'Back'}
        </Button>
        
        <div className="space-y-1">
          <h1 className={`text-2xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إضافة مستخدم جديد' : 'Add New User'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' ? 'إنشاء حساب مستخدم جديد في النظام' : 'Create a new user account in the system'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'معلومات المستخدم' : 'User Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}