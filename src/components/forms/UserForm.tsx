import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Save, ArrowLeft, User, Mail, Shield } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { UserRole } from '@/types/auth'

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'manager', 'therapist_lead', 'receptionist'] as const),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
})

type UserFormData = z.infer<typeof userSchema>

export interface CreateUserData {
  name: string
  email: string
  role: UserRole
  password: string
}

export interface UpdateUserData {
  id: string
  name: string
  email: string
  role: UserRole
  password?: string
}

interface UserFormProps {
  onSubmit: (data: CreateUserData | UpdateUserData) => void | Promise<void>
  onCancel: () => void
  isLoading?: boolean
  initialData?: Partial<UpdateUserData>
  isEditing?: boolean
}

export default function UserForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData,
  isEditing = false 
}: UserFormProps) {
  const { language } = useLanguage()

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      role: initialData?.role || 'receptionist',
      password: '',
    }
  })

  const handleSubmit = (data: UserFormData) => {
    if (isEditing && initialData?.id) {
      const formData: UpdateUserData = {
        id: initialData.id,
        name: data.name,
        email: data.email,
        role: data.role,
        ...(data.password && { password: data.password })
      }
      onSubmit(formData)
    } else {
      const formData: CreateUserData = {
        name: data.name,
        email: data.email,
        role: data.role,
        password: data.password || ''
      }
      onSubmit(formData)
    }
  }

  const getRoleDisplayName = (role: UserRole) => {
    const roleNames = {
      admin: { ar: 'مدير نظام', en: 'Administrator' },
      manager: { ar: 'مدير', en: 'Manager' },
      therapist_lead: { ar: 'رئيس المعالجين', en: 'Lead Therapist' },
      receptionist: { ar: 'موظف استقبال', en: 'Receptionist' }
    }
    return language === 'ar' ? roleNames[role].ar : roleNames[role].en
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                <User className="w-5 h-5" />
                {language === 'ar' ? 'معلومات المستخدم' : 'User Information'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={language === 'ar' ? 'أدخل الاسم الكامل' : 'Enter full name'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={language === 'ar' ? 'example@domain.com' : 'example@domain.com'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <Shield className="w-4 h-4" />
                        {language === 'ar' ? 'الدور *' : 'Role *'}
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'ar' ? 'اختر الدور' : 'Select Role'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">{getRoleDisplayName('admin')}</SelectItem>
                          <SelectItem value="manager">{getRoleDisplayName('manager')}</SelectItem>
                          <SelectItem value="therapist_lead">{getRoleDisplayName('therapist_lead')}</SelectItem>
                          <SelectItem value="receptionist">{getRoleDisplayName('receptionist')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <Mail className="w-4 h-4" />
                        {isEditing 
                          ? (language === 'ar' ? 'كلمة مرور جديدة (اختياري)' : 'New Password (Optional)')
                          : (language === 'ar' ? 'كلمة المرور *' : 'Password *')
                        }
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={language === 'ar' ? 'أدخل كلمة المرور' : 'Enter password'}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {!isEditing && (
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' 
                            ? 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل' 
                            : 'Password must be at least 8 characters long'
                          }
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>

            </CardContent>
          </Card>

          {/* Role Description */}
          <Card>
            <CardHeader>
              <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'صلاحيات الدور' : 'Role Permissions'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'مدير النظام' : 'Administrator'}
                  </h4>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'صلاحيات كاملة لجميع النظام وإدارة المستخدمين' 
                      : 'Full system access and user management'
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'المدير' : 'Manager'}
                  </h4>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'إدارة البرامج والخطط وعرض المستخدمين' 
                      : 'Manage programs, plans and view users'
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'رئيس المعالجين' : 'Lead Therapist'}
                  </h4>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'عرض البرامج والخطط فقط' 
                      : 'View programs and plans only'
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'موظف الاستقبال' : 'Receptionist'}
                  </h4>
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'عرض محدود للبرامج والخطط' 
                      : 'Limited view of programs and plans'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading 
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                : (language === 'ar' ? 'حفظ المستخدم' : 'Save User')
              }
            </Button>
          </div>

        </form>
      </Form>
    </div>
  )
}