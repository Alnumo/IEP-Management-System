import { useState, useEffect } from 'react'
import { Settings, Save, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { useLanguage } from '@/contexts/LanguageContext'

export const SettingsPage = () => {
  const { language, isRTL } = useLanguage()
  const [headerLogo, setHeaderLogo] = useState<string | null>(null)
  const [sidebarLogo, setSidebarLogo] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Load saved logos from localStorage on component mount
  useEffect(() => {
    const savedHeaderLogo = localStorage.getItem('header-logo')
    const savedSidebarLogo = localStorage.getItem('sidebar-logo')
    
    if (savedHeaderLogo) {
      setHeaderLogo(savedHeaderLogo)
    }
    if (savedSidebarLogo) {
      setSidebarLogo(savedSidebarLogo)
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Save logos to localStorage (in production, you'd save to your backend)
      if (headerLogo) {
        localStorage.setItem('header-logo', headerLogo)
      } else {
        localStorage.removeItem('header-logo')
      }
      
      if (sidebarLogo) {
        localStorage.setItem('sidebar-logo', sidebarLogo)
      } else {
        localStorage.removeItem('sidebar-logo')
      }

      // Trigger a custom event to notify header/sidebar components
      window.dispatchEvent(new CustomEvent('logo-updated'))
      
      // Show success message (you can replace this with a toast notification)
      alert(language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully')
      
    } catch (error) {
      console.error('Error saving settings:', error)
      alert(language === 'ar' ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الإعدادات' : 'Settings'}
          </h1>
          <p className={`text-sm sm:text-base text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'إدارة شعارات المؤسسة وإعدادات النظام'
              : 'Manage organization logos and system settings'
            }
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-fit">
          <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isSaving 
            ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
            : (language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings')
          }
        </Button>
      </div>

      {/* Logo Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Header Logo */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic space-x-2 space-x-reverse' : 'space-x-2'}`}>
              <Upload className="h-5 w-5 text-teal-600" />
              <span>{language === 'ar' ? 'شعار الرأسية' : 'Header Logo'}</span>
            </CardTitle>
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'الشعار المعروض في شريط التنقل العلوي'
                : 'Logo displayed in the top navigation bar'
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogoUpload
              onLogoChange={setHeaderLogo}
              currentLogo={headerLogo}
              aspectRatio="horizontal"
              maxSize={5}
            />
            <div className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
              <p>{language === 'ar' ? 'الأبعاد المُوصى بها: 200×50 بكسل' : 'Recommended dimensions: 200×50 pixels'}</p>
              <p>{language === 'ar' ? 'نسبة العرض إلى الارتفاع: 4:1' : 'Aspect ratio: 4:1'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Logo */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className={`flex items-center ${language === 'ar' ? 'font-arabic space-x-2 space-x-reverse' : 'space-x-2'}`}>
              <Settings className="h-5 w-5 text-green-600" />
              <span>{language === 'ar' ? 'شعار الشريط الجانبي' : 'Sidebar Logo'}</span>
            </CardTitle>
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'الشعار المعروض في الشريط الجانبي'
                : 'Logo displayed in the sidebar navigation'
              }
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <LogoUpload
              onLogoChange={setSidebarLogo}
              currentLogo={sidebarLogo}
              aspectRatio="square"
              maxSize={5}
            />
            <div className={`text-xs text-gray-500 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
              <p>{language === 'ar' ? 'الأبعاد المُوصى بها: 80×80 بكسل' : 'Recommended dimensions: 80×80 pixels'}</p>
              <p>{language === 'ar' ? 'نسبة العرض إلى الارتفاع: 1:1 (مربع)' : 'Aspect ratio: 1:1 (square)'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-gradient-to-r from-teal-50 to-green-50 border-teal-200">
        <CardContent className="p-6">
          <h3 className={`font-semibold text-teal-800 mb-3 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            {language === 'ar' ? 'تعليمات رفع الشعارات' : 'Logo Upload Instructions'}
          </h3>
          <ul className={`space-y-2 text-sm text-teal-700 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
            <li className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-start`}>
              <span className={`${isRTL ? 'ml-2' : 'mr-2'} text-teal-500`}>•</span>
              {language === 'ar' 
                ? 'استخدم صيغ PNG أو SVG للحصول على أفضل جودة'
                : 'Use PNG or SVG formats for best quality'
              }
            </li>
            <li className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-start`}>
              <span className={`${isRTL ? 'ml-2' : 'mr-2'} text-teal-500`}>•</span>
              {language === 'ar' 
                ? 'تأكد من أن الخلفية شفافة للحصول على مظهر احترافي'
                : 'Ensure background is transparent for professional appearance'
              }
            </li>
            <li className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-start`}>
              <span className={`${isRTL ? 'ml-2' : 'mr-2'} text-teal-500`}>•</span>
              {language === 'ar' 
                ? 'يمكنك سحب وإفلات الصور مباشرة في المنطقة المخصصة'
                : 'You can drag and drop images directly into the upload area'
              }
            </li>
            <li className={`flex ${isRTL ? 'flex-row-reverse' : ''} items-start`}>
              <span className={`${isRTL ? 'ml-2' : 'mr-2'} text-teal-500`}>•</span>
              {language === 'ar' 
                ? 'سيتم تطبيق التغييرات فور حفظ الإعدادات'
                : 'Changes will be applied immediately after saving settings'
              }
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}