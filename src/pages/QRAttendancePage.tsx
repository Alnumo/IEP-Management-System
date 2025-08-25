import { useState } from 'react'
import { QrCode, Users, Clock, MapPin, BarChart3, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { QRAttendanceSystem } from '@/components/qr/QRAttendanceSystem'
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator'

export const QRAttendancePage = () => {
  const { language, isRTL } = useLanguage()
  const [activeMode, setActiveMode] = useState<'student' | 'therapist' | 'session' | 'room'>('student')

  return (
    <div className="container mx-auto p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className={`text-3xl font-bold tracking-tight ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'نظام الحضور بالرمز المربع' : 'QR Attendance System'}
          </h1>
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'تتبع الحضور والانصراف باستخدام الرموز المربعة'
              : 'Track attendance and check-ins using QR codes'
            }
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="scanner" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scanner" className="gap-2">
            <QrCode className="h-4 w-4" />
            {language === 'ar' ? 'ماسح الرمز' : 'QR Scanner'}
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-2">
            <Settings className="h-4 w-4" />
            {language === 'ar' ? 'منشئ الرموز' : 'QR Generator'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner">
          {/* Attendance System Tabs */}
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as typeof activeMode)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="student" className="gap-2">
                <Users className="h-4 w-4" />
                {language === 'ar' ? 'الطلاب' : 'Students'}
              </TabsTrigger>
              <TabsTrigger value="session" className="gap-2">
                <Clock className="h-4 w-4" />
                {language === 'ar' ? 'الجلسات' : 'Sessions'}
              </TabsTrigger>
              <TabsTrigger value="therapist" className="gap-2">
                <Users className="h-4 w-4" />
                {language === 'ar' ? 'المعالجين' : 'Therapists'}
              </TabsTrigger>
              <TabsTrigger value="room" className="gap-2">
                <MapPin className="h-4 w-4" />
                {language === 'ar' ? 'الغرف' : 'Rooms'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="space-y-6">
              <QRAttendanceSystem mode="student" />
            </TabsContent>

            <TabsContent value="session" className="space-y-6">
              <QRAttendanceSystem mode="session" />
            </TabsContent>

            <TabsContent value="therapist" className="space-y-6">
              <QRAttendanceSystem mode="therapist" />
            </TabsContent>

            <TabsContent value="room" className="space-y-6">
              <QRAttendanceSystem mode="room" />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="generator">
          <QRCodeGenerator />
        </TabsContent>
      </Tabs>

      {/* System Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {language === 'ar' ? 'نظرة عامة على النظام' : 'System Overview'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                {language === 'ar' ? 'المميزات الحالية' : 'Current Features'}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {language === 'ar' ? 'مسح رمز بالكاميرا' : 'Real camera QR scanning'}</li>
                <li>• {language === 'ar' ? 'حضور الأطفال' : 'Child attendance'}</li>
                <li>• {language === 'ar' ? 'حضور الجلسات' : 'Session attendance'}</li>
                <li>• {language === 'ar' ? 'حضور الموظفين' : 'Staff attendance'}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                {language === 'ar' ? 'التحسينات الجديدة' : 'New Enhancements'}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {language === 'ar' ? 'إنشاء رموز مخصصة' : 'Custom QR code generation'}</li>
                <li>• {language === 'ar' ? 'تتبع فوري' : 'Real-time tracking'}</li>
                <li>• {language === 'ar' ? 'تخصيص الغرف' : 'Room allocation'}</li>
                <li>• {language === 'ar' ? 'تحقق استلام الأولياء' : 'Parent pickup verification'}</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {language === 'ar' ? 'فوائد النظام' : 'System Benefits'}
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {language === 'ar' ? 'دقة في التوقيت' : 'Accurate timing'}</li>
                <li>• {language === 'ar' ? 'أمان محسن' : 'Enhanced security'}</li>
                <li>• {language === 'ar' ? 'عمل بدون اتصال' : 'Offline capability'}</li>
                <li>• {language === 'ar' ? 'سهولة الاستخدام' : 'Easy to use'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}