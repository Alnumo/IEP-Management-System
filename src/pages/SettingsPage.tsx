import { useState, useEffect } from 'react'
import { User, Globe, Moon, Sun, Database, Shield, Info, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

export const SettingsPage = () => {
  const { language, isRTL, setLanguage } = useLanguage()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  
  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      
      if (user) {
        // Get user profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            setProfile(data)
          })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    // Check if dark mode is enabled
    const isDark = document.documentElement.classList.contains('dark')
    setDarkMode(isDark)

    return () => subscription.unsubscribe()
  }, [])

  const handleLanguageChange = (isArabic: boolean) => {
    setLanguage(isArabic ? 'ar' : 'en')
  }

  const handleDarkModeToggle = (enabled: boolean) => {
    setDarkMode(enabled)
    if (enabled) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    // Save preference to localStorage
    localStorage.setItem('darkMode', enabled.toString())
  }

  const handleLogout = async () => {
    const confirmed = window.confirm(
      language === 'ar' 
        ? 'هل أنت متأكد من تسجيل الخروج؟'
        : 'Are you sure you want to logout?'
    )
    
    if (confirmed) {
      await supabase.auth.signOut()
    }
  }

  // Show login message if not authenticated
  if (!user) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className={`text-muted-foreground mb-6 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'يجب تسجيل الدخول للوصول للإعدادات'
              : 'Please log in to access settings'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' ? 'الإعدادات' : 'Settings'}
        </h1>
        <p className={`text-sm sm:text-base text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
          {language === 'ar' 
            ? 'إدارة إعدادات حسابك وتفضيلات التطبيق'
            : 'Manage your account settings and application preferences'
          }
        </p>
      </div>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
            <User className="h-5 w-5" />
            <span>{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' 
              ? 'معلومات حسابك الشخصي'
              : 'Your personal account information'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              </Label>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الاسم' : 'Name'}
              </Label>
              <p className="text-sm font-medium">{profile?.name || user.email}</p>
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الدور' : 'Role'}
              </Label>
              <Badge variant="outline">
                {profile?.role === 'admin' ? (language === 'ar' ? 'مدير' : 'Admin') :
                 profile?.role === 'manager' ? (language === 'ar' ? 'مدير تنفيذي' : 'Manager') :
                 profile?.role === 'therapist_lead' ? (language === 'ar' ? 'رئيس معالجين' : 'Therapist Lead') :
                 profile?.role === 'receptionist' ? (language === 'ar' ? 'موظف استقبال' : 'Receptionist') :
                 (language === 'ar' ? 'غير محدد' : 'Unknown')
                }
              </Badge>
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'تاريخ الانضمام' : 'Member Since'}
              </Label>
              <p className="text-sm font-medium">
                {new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Globe className="h-5 w-5" />
            <span>{language === 'ar' ? 'اللغة والمنطقة' : 'Language & Region'}</span>
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' 
              ? 'اختر لغة التطبيق المفضلة'
              : 'Choose your preferred application language'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between`}>
            <div className="space-y-1">
              <Label className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'اللغة العربية' : 'Arabic Language'}
              </Label>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? 'استخدام اللغة العربية كلغة أساسية'
                  : 'Use Arabic as the primary language'
                }
              </p>
            </div>
            <Switch
              checked={language === 'ar'}
              onCheckedChange={handleLanguageChange}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'اللغة الحالية' : 'Current Language'}
            </Label>
            <Badge variant="secondary">
              {language === 'ar' ? 'العربية (Arabic)' : 'English (إنجليزية)'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
            {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <span>{language === 'ar' ? 'المظهر' : 'Appearance'}</span>
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' 
              ? 'تخصيص مظهر التطبيق'
              : 'Customize the application appearance'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between`}>
            <div className="space-y-1">
              <Label className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'الوضع الليلي' : 'Dark Mode'}
              </Label>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? 'استخدام الألوان الداكنة لراحة العينين'
                  : 'Use dark colors for better eye comfort'
                }
              </p>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={handleDarkModeToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Info className="h-5 w-5" />
            <span>{language === 'ar' ? 'معلومات النظام' : 'System Information'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'اسم التطبيق' : 'Application Name'}
              </Label>
              <p className="text-sm font-medium">
                {language === 'ar' ? 'مدير البرامج العلاجية' : 'Therapy Plans Manager'}
              </p>
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الإصدار' : 'Version'}
              </Label>
              <p className="text-sm font-medium">1.0.0</p>
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'المركز' : 'Center'}
              </Label>
              <p className="text-sm font-medium">
                {language === 'ar' ? 'مركز أركان النمو' : 'Arkan Al-Numo Center'}
              </p>
            </div>
            
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'البيئة' : 'Environment'}
              </Label>
              <Badge variant="outline">
                {import.meta.env.MODE === 'development' 
                  ? (language === 'ar' ? 'تطوير' : 'Development')
                  : (language === 'ar' ? 'إنتاج' : 'Production')
                }
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} ${language === 'ar' ? 'font-arabic' : ''}`}>
            <Shield className="h-5 w-5" />
            <span>{language === 'ar' ? 'الأمان' : 'Security'}</span>
          </CardTitle>
          <CardDescription className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' 
              ? 'إدارة إعدادات الأمان والجلسات'
              : 'Manage security settings and sessions'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between`}>
            <div className="space-y-1">
              <Label className={`font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </Label>
              <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' 
                  ? 'تسجيل الخروج من جميع الأجهزة'
                  : 'Sign out from all devices'
                }
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}