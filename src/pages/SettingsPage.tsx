import { useState, useEffect } from 'react'
import { 
  Settings, Save, Upload, Bell, Shield, Palette, Globe, 
  Database, Mail, Clock, Building, Phone, MapPin,
  CreditCard, Calendar, FileText, Monitor
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { LogoUpload } from '@/components/ui/LogoUpload'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface SettingsData {
  // Organization Settings
  organizationName: string
  organizationNameAr: string
  email: string
  phone: string
  address: string
  addressAr: string
  website: string
  
  // System Settings
  timezone: string
  dateFormat: string
  timeFormat: string
  currency: string
  language: string
  
  // Notification Settings
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  weeklyReports: boolean
  monthlyReports: boolean
  appointmentReminders: boolean
  
  // Appearance Settings
  theme: string
  primaryColor: string
  headerLogo: string | null
  sidebarLogo: string | null
  
  // Session Settings
  defaultSessionDuration: number
  sessionBookingWindow: number
  cancellationPolicy: string
  
  // Billing Settings
  taxRate: number
  paymentTerms: number
  invoicePrefix: string
  
  // Security Settings
  sessionTimeout: number
  passwordPolicy: string
  twoFactorAuth: boolean
  
  // Backup Settings
  autoBackup: boolean
  backupFrequency: string
  retentionDays: number
}

export const SettingsPage = () => {
  const { language, isRTL } = useLanguage()
  const [isSaving, setIsSaving] = useState(false)
  const [currentTab, setCurrentTab] = useState<'general' | 'notifications' | 'appearance' | 'system' | 'security' | 'billing'>('general')
  
  const [settings, setSettings] = useState<SettingsData>({
    // Organization Settings
    organizationName: 'Arkan Growth Center',
    organizationNameAr: 'مركز أركان النمو',
    email: 'info@arkan.sa',
    phone: '+966 11 234 5678',
    address: '123 Health Street, Riyadh, Saudi Arabia',
    addressAr: '١٢٣ شارع الصحة، الرياض، المملكة العربية السعودية',
    website: 'https://arkan.sa',
    
    // System Settings
    timezone: 'Asia/Riyadh',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'SAR',
    language: 'ar',
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    appointmentReminders: true,
    
    // Appearance Settings
    theme: 'light',
    primaryColor: '#0891b2',
    headerLogo: null,
    sidebarLogo: null,
    
    // Session Settings
    defaultSessionDuration: 60,
    sessionBookingWindow: 7,
    cancellationPolicy: '24h',
    
    // Billing Settings
    taxRate: 15,
    paymentTerms: 30,
    invoicePrefix: 'INV',
    
    // Security Settings
    sessionTimeout: 120,
    passwordPolicy: 'strong',
    twoFactorAuth: false,
    
    // Backup Settings
    autoBackup: true,
    backupFrequency: 'daily',
    retentionDays: 30
  })

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.error('Error parsing saved settings:', error)
      }
    }
  }, [])

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      // Save all settings to localStorage (in production, you'd save to your backend)
      localStorage.setItem('app-settings', JSON.stringify(settings))
      
      // Handle logo updates separately for backward compatibility
      if (settings.headerLogo) {
        localStorage.setItem('header-logo', settings.headerLogo)
      } else {
        localStorage.removeItem('header-logo')
      }
      
      if (settings.sidebarLogo) {
        localStorage.setItem('sidebar-logo', settings.sidebarLogo)
      } else {
        localStorage.removeItem('sidebar-logo')
      }

      // Trigger events to notify other components
      window.dispatchEvent(new CustomEvent('logo-updated'))
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }))
      
      toast.success(
        language === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully'
      )
      
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error(
        language === 'ar' ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Error saving settings'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const tabs = [
    { id: 'general', label: language === 'ar' ? 'عام' : 'General', icon: Settings },
    { id: 'notifications', label: language === 'ar' ? 'الإشعارات' : 'Notifications', icon: Bell },
    { id: 'appearance', label: language === 'ar' ? 'المظهر' : 'Appearance', icon: Palette },
    { id: 'system', label: language === 'ar' ? 'النظام' : 'System', icon: Database },
    { id: 'security', label: language === 'ar' ? 'الأمان' : 'Security', icon: Shield },
    { id: 'billing', label: language === 'ar' ? 'الفواتير' : 'Billing', icon: CreditCard },
  ]

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
              ? 'إدارة إعدادات النظام والمؤسسة'
              : 'Manage system and organization settings'
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

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`
                  ${currentTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
                  }
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                `}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* General Settings Tab */}
        {currentTab === 'general' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Building className="h-5 w-5" />
                  {language === 'ar' ? 'معلومات المؤسسة' : 'Organization Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'اسم المؤسسة (عربي)' : 'Organization Name (Arabic)'}
                    </Label>
                    <Input
                      value={settings.organizationNameAr}
                      onChange={(e) => updateSetting('organizationNameAr', e.target.value)}
                      placeholder={language === 'ar' ? 'اسم المؤسسة' : 'Organization name in Arabic'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'اسم المؤسسة (إنجليزي)' : 'Organization Name (English)'}
                    </Label>
                    <Input
                      value={settings.organizationName}
                      onChange={(e) => updateSetting('organizationName', e.target.value)}
                      placeholder="Organization name in English"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                      <Mail className="h-4 w-4" />
                      {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    </Label>
                    <Input
                      type="email"
                      value={settings.email}
                      onChange={(e) => updateSetting('email', e.target.value)}
                      placeholder="info@organization.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                      <Phone className="h-4 w-4" />
                      {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    </Label>
                    <Input
                      value={settings.phone}
                      onChange={(e) => updateSetting('phone', e.target.value)}
                      placeholder="+966 11 234 5678"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                    <Globe className="h-4 w-4" />
                    {language === 'ar' ? 'الموقع الإلكتروني' : 'Website'}
                  </Label>
                  <Input
                    type="url"
                    value={settings.website}
                    onChange={(e) => updateSetting('website', e.target.value)}
                    placeholder="https://www.organization.com"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                      <MapPin className="h-4 w-4" />
                      {language === 'ar' ? 'العنوان (عربي)' : 'Address (Arabic)'}
                    </Label>
                    <Textarea
                      value={settings.addressAr}
                      onChange={(e) => updateSetting('addressAr', e.target.value)}
                      placeholder={language === 'ar' ? 'العنوان بالعربية' : 'Address in Arabic'}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                      <MapPin className="h-4 w-4" />
                      {language === 'ar' ? 'العنوان (إنجليزي)' : 'Address (English)'}
                    </Label>
                    <Textarea
                      value={settings.address}
                      onChange={(e) => updateSetting('address', e.target.value)}
                      placeholder="Address in English"
                      rows={2}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Clock className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات النظام' : 'System Configuration'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'المنطقة الزمنية' : 'Timezone'}
                    </Label>
                    <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asia/Riyadh">{language === 'ar' ? 'الرياض' : 'Riyadh'}</SelectItem>
                        <SelectItem value="Asia/Dubai">{language === 'ar' ? 'دبي' : 'Dubai'}</SelectItem>
                        <SelectItem value="Asia/Kuwait">{language === 'ar' ? 'الكويت' : 'Kuwait'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'تنسيق التاريخ' : 'Date Format'}
                    </Label>
                    <Select value={settings.dateFormat} onValueChange={(value) => updateSetting('dateFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'تنسيق الوقت' : 'Time Format'}
                    </Label>
                    <Select value={settings.timeFormat} onValueChange={(value) => updateSetting('timeFormat', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 {language === 'ar' ? 'ساعة' : 'Hour'}</SelectItem>
                        <SelectItem value="24h">24 {language === 'ar' ? 'ساعة' : 'Hour'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'العملة' : 'Currency'}
                    </Label>
                    <Select value={settings.currency} onValueChange={(value) => updateSetting('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAR">{language === 'ar' ? 'ريال سعودي' : 'Saudi Riyal (SAR)'}</SelectItem>
                        <SelectItem value="AED">{language === 'ar' ? 'درهم إماراتي' : 'UAE Dirham (AED)'}</SelectItem>
                        <SelectItem value="USD">{language === 'ar' ? 'دولار أمريكي' : 'US Dollar (USD)'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'اللغة الافتراضية' : 'Default Language'}
                    </Label>
                    <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">{language === 'ar' ? 'العربية' : 'Arabic'}</SelectItem>
                        <SelectItem value="en">{language === 'ar' ? 'الإنجليزية' : 'English'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {currentTab === 'notifications' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Bell className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الإشعارات' : 'Notification Preferences'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الإشعارات عبر البريد الإلكتروني' : 'Email Notifications'}
                      </Label>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'استلام إشعارات عبر البريد الإلكتروني' : 'Receive notifications via email'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الإشعارات النصية (SMS)' : 'SMS Notifications'}
                      </Label>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'استلام إشعارات عبر الرسائل النصية' : 'Receive notifications via SMS'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الإشعارات الفورية' : 'Push Notifications'}
                      </Label>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'استلام إشعارات فورية في المتصفح' : 'Receive push notifications in browser'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التقارير الأسبوعية' : 'Weekly Reports'}
                      </Label>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'استلام تقارير أسبوعية عن الأداء' : 'Receive weekly performance reports'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.weeklyReports}
                      onCheckedChange={(checked) => updateSetting('weeklyReports', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'التقارير الشهرية' : 'Monthly Reports'}
                      </Label>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'استلام تقارير شهرية مفصلة' : 'Receive detailed monthly reports'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.monthlyReports}
                      onCheckedChange={(checked) => updateSetting('monthlyReports', checked)}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'تذكير المواعيد' : 'Appointment Reminders'}
                      </Label>
                      <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'إرسال تذكيرات قبل المواعيد' : 'Send reminders before appointments'}
                      </p>
                    </div>
                    <Switch
                      checked={settings.appointmentReminders}
                      onCheckedChange={(checked) => updateSetting('appointmentReminders', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appearance Tab */}
        {currentTab === 'appearance' && (
          <div className="space-y-6">
            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Palette className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات المظهر' : 'Theme Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'المظهر' : 'Theme'}
                  </Label>
                  <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{language === 'ar' ? 'فاتح' : 'Light'}</SelectItem>
                      <SelectItem value="dark">{language === 'ar' ? 'داكن' : 'Dark'}</SelectItem>
                      <SelectItem value="system">{language === 'ar' ? 'حسب النظام' : 'System'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'اللون الأساسي' : 'Primary Color'}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      className="w-10 h-10 rounded border"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => updateSetting('primaryColor', e.target.value)}
                      placeholder="#0891b2"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logo Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Header Logo */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                    <Upload className="h-5 w-5" />
                    {language === 'ar' ? 'شعار الرأسية' : 'Header Logo'}
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
                    onLogoChange={(logo) => updateSetting('headerLogo', logo)}
                    currentLogo={settings.headerLogo}
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
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                    <Monitor className="h-5 w-5" />
                    {language === 'ar' ? 'شعار الشريط الجانبي' : 'Sidebar Logo'}
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
                    onLogoChange={(logo) => updateSetting('sidebarLogo', logo)}
                    currentLogo={settings.sidebarLogo}
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
          </div>
        )}

        {/* System Tab */}
        {currentTab === 'system' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Calendar className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الجلسات' : 'Session Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'مدة الجلسة الافتراضية (دقائق)' : 'Default Session Duration (minutes)'}
                    </Label>
                    <Input
                      type="number"
                      min="15"
                      max="180"
                      step="15"
                      value={settings.defaultSessionDuration}
                      onChange={(e) => updateSetting('defaultSessionDuration', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'نافذة الحجز (أيام)' : 'Booking Window (days)'}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.sessionBookingWindow}
                      onChange={(e) => updateSetting('sessionBookingWindow', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'سياسة الإلغاء' : 'Cancellation Policy'}
                    </Label>
                    <Select value={settings.cancellationPolicy} onValueChange={(value) => updateSetting('cancellationPolicy', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24h">24 {language === 'ar' ? 'ساعة' : 'Hours'}</SelectItem>
                        <SelectItem value="48h">48 {language === 'ar' ? 'ساعة' : 'Hours'}</SelectItem>
                        <SelectItem value="72h">72 {language === 'ar' ? 'ساعة' : 'Hours'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Backup Settings */}
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Database className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات النسخ الاحتياطي' : 'Backup Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'النسخ الاحتياطي التلقائي' : 'Automatic Backup'}
                    </Label>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'تفعيل النسخ الاحتياطي التلقائي للبيانات' : 'Enable automatic data backup'}
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
                  />
                </div>
                
                {settings.autoBackup && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'تكرار النسخ' : 'Backup Frequency'}
                      </Label>
                      <Select value={settings.backupFrequency} onValueChange={(value) => updateSetting('backupFrequency', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{language === 'ar' ? 'يومي' : 'Daily'}</SelectItem>
                          <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                          <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className={language === 'ar' ? 'font-arabic' : ''}>
                        {language === 'ar' ? 'مدة الاحتفاظ (أيام)' : 'Retention Period (days)'}
                      </Label>
                      <Input
                        type="number"
                        min="7"
                        max="365"
                        value={settings.retentionDays}
                        onChange={(e) => updateSetting('retentionDays', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Security Tab */}
        {currentTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <Shield className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'مهلة انتهاء الجلسة (دقائق)' : 'Session Timeout (minutes)'}
                    </Label>
                    <Input
                      type="number"
                      min="15"
                      max="480"
                      value={settings.sessionTimeout}
                      onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'سياسة كلمة المرور' : 'Password Policy'}
                    </Label>
                    <Select value={settings.passwordPolicy} onValueChange={(value) => updateSetting('passwordPolicy', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">{language === 'ar' ? 'أساسي' : 'Basic'}</SelectItem>
                        <SelectItem value="medium">{language === 'ar' ? 'متوسط' : 'Medium'}</SelectItem>
                        <SelectItem value="strong">{language === 'ar' ? 'قوي' : 'Strong'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className={`text-base font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}
                    </Label>
                    <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {language === 'ar' ? 'تفعيل طبقة أمان إضافية' : 'Enable additional security layer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={settings.twoFactorAuth ? 'default' : 'secondary'}>
                      {settings.twoFactorAuth 
                        ? (language === 'ar' ? 'مفعل' : 'Enabled') 
                        : (language === 'ar' ? 'معطل' : 'Disabled')
                      }
                    </Badge>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className={`font-semibold text-yellow-800 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'نصائح أمنية' : 'Security Recommendations'}
                      </h4>
                      <ul className={`mt-2 space-y-1 text-sm text-yellow-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        <li>• {language === 'ar' ? 'استخدم كلمات مرور قوية ومعقدة' : 'Use strong and complex passwords'}</li>
                        <li>• {language === 'ar' ? 'فعّل المصادقة الثنائية لحماية إضافية' : 'Enable two-factor authentication for extra protection'}</li>
                        <li>• {language === 'ar' ? 'راجع سجلات الدخول بانتظام' : 'Review login logs regularly'}</li>
                        <li>• {language === 'ar' ? 'حدّث النظام والتطبيقات باستمرار' : 'Keep system and applications updated'}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Billing Tab */}
        {currentTab === 'billing' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic flex-row-reverse' : ''}`}>
                  <CreditCard className="h-5 w-5" />
                  {language === 'ar' ? 'إعدادات الفواتير' : 'Billing Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'معدل الضريبة (%)' : 'Tax Rate (%)'}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={settings.taxRate}
                      onChange={(e) => updateSetting('taxRate', parseFloat(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'شروط الدفع (أيام)' : 'Payment Terms (days)'}
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.paymentTerms}
                      onChange={(e) => updateSetting('paymentTerms', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={language === 'ar' ? 'font-arabic' : ''}>
                      {language === 'ar' ? 'بادئة رقم الفاتورة' : 'Invoice Prefix'}
                    </Label>
                    <Input
                      value={settings.invoicePrefix}
                      onChange={(e) => updateSetting('invoicePrefix', e.target.value)}
                      placeholder="INV"
                    />
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className={`font-semibold text-blue-800 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'معلومات الفواتير' : 'Invoice Information'}
                      </h4>
                      <p className={`mt-1 text-sm text-blue-700 ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' 
                          ? 'ستظهر هذه الإعدادات في جميع الفواتير المُنشأة من النظام'
                          : 'These settings will appear on all invoices generated by the system'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
      </div>
    </div>
  )
}