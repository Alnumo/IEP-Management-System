import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import UserForm, { UpdateUserData } from '@/components/forms/UserForm'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>()
  const { language, isRTL } = useLanguage()
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error

        setUser(data)
      } catch (error: any) {
        console.error('Error fetching user:', error)
        toast.error(
          language === 'ar' 
            ? 'خطأ في تحميل بيانات المستخدم' 
            : 'Error loading user data'
        )
        navigate('/users')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchUser()
    }
  }, [id, language, navigate])

  const handleSubmit = async (data: UpdateUserData) => {
    try {
      setIsLoading(true)

      // Update user profile in database
      const updateData: any = {
        name: data.name,
        email: data.email,
        role: data.role,
        updated_at: new Date().toISOString()
      }

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', data.id)

      if (profileError) {
        throw profileError
      }

      // Update password if provided
      if (data.password) {
        const { error: passwordError } = await supabase.auth.admin.updateUserById(
          data.id,
          { password: data.password }
        )
        
        if (passwordError) {
          console.warn('Password update failed:', passwordError)
          // Don't fail the entire update if password update fails
        }
      }

      toast.success(
        language === 'ar' 
          ? 'تم تحديث بيانات المستخدم بنجاح' 
          : 'User updated successfully'
      )
      
      navigate('/users')
    } catch (error: any) {
      console.error('Error updating user:', error)
      
      toast.error(
        language === 'ar'
          ? 'حدث خطأ في تحديث بيانات المستخدم'
          : `Error updating user: ${error.message}`
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate('/users')
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {language === 'ar' ? 'المستخدم غير موجود' : 'User not found'}
          </p>
          <Button onClick={() => navigate('/users')} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'ar' ? 'العودة' : 'Back'}
          </Button>
        </div>
      </div>
    )
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
            {language === 'ar' ? 'تعديل المستخدم' : 'Edit User'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? `تعديل بيانات المستخدم: ${user.name}` 
              : `Edit user: ${user.name}`
            }
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Save className="w-5 h-5" />
            {language === 'ar' ? 'بيانات المستخدم' : 'User Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            initialData={{
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            }}
            isEditing={true}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}