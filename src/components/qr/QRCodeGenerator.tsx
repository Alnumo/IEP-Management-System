import { useState } from 'react'
import { QrCode, Download, Copy, Users, Clock, MapPin, UserCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface QRData {
  type: 'student' | 'session' | 'therapist' | 'room'
  studentId?: string
  studentName?: string
  sessionId?: string
  sessionType?: string
  therapistId?: string
  therapistName?: string
  roomNumber?: string
  timestamp: string
}

export const QRCodeGenerator = () => {
  const { language, isRTL } = useLanguage()
  const [qrType, setQrType] = useState<QRData['type']>('student')
  const [formData, setFormData] = useState({
    studentId: '',
    studentName: '',
    sessionId: '',
    sessionType: '',
    therapistId: '',
    therapistName: '',
    roomNumber: ''
  })
  const [generatedQR, setGeneratedQR] = useState<string>('')
  const [qrDataString, setQrDataString] = useState<string>('')

  const generateQRData = () => {
    const qrData: QRData = {
      type: qrType,
      timestamp: new Date().toISOString()
    }

    switch (qrType) {
      case 'student':
        qrData.studentId = formData.studentId
        qrData.studentName = formData.studentName
        qrData.sessionType = formData.sessionType
        qrData.roomNumber = formData.roomNumber
        break
      case 'session':
        qrData.sessionId = formData.sessionId
        qrData.sessionType = formData.sessionType
        qrData.studentId = formData.studentId
        qrData.studentName = formData.studentName
        qrData.therapistId = formData.therapistId
        qrData.therapistName = formData.therapistName
        qrData.roomNumber = formData.roomNumber
        break
      case 'therapist':
        qrData.therapistId = formData.therapistId
        qrData.therapistName = formData.therapistName
        break
      case 'room':
        qrData.roomNumber = formData.roomNumber
        break
    }

    const qrString = JSON.stringify(qrData)
    setQrDataString(qrString)
    
    // Generate QR code URL (using a QR code API service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`
    setGeneratedQR(qrCodeUrl)
    
    toast.success(
      language === 'ar' ? 'تم إنشاء رمز الاستجابة السريعة' : 'QR Code generated successfully'
    )
  }

  const copyQRData = () => {
    navigator.clipboard.writeText(qrDataString)
    toast.success(
      language === 'ar' ? 'تم نسخ بيانات الرمز' : 'QR data copied to clipboard'
    )
  }

  const downloadQR = () => {
    if (!generatedQR) return
    
    const link = document.createElement('a')
    link.href = generatedQR
    link.download = `qr-code-${qrType}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success(
      language === 'ar' ? 'تم تحميل رمز الاستجابة السريعة' : 'QR Code downloaded'
    )
  }

  const getTypeIcon = (type: QRData['type']) => {
    switch (type) {
      case 'student': return Users
      case 'session': return Clock
      case 'therapist': return UserCheck
      case 'room': return MapPin
      default: return QrCode
    }
  }

  const getTypeLabel = (type: QRData['type']) => {
    const labels = {
      ar: {
        student: 'طالب',
        session: 'جلسة',
        therapist: 'معالج',
        room: 'غرفة'
      },
      en: {
        student: 'Student',
        session: 'Session',
        therapist: 'Therapist',
        room: 'Room'
      }
    }
    return labels[language as keyof typeof labels][type] || type
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* QR Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {language === 'ar' ? 'منشئ رموز الاستجابة السريعة' : 'QR Code Generator'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className={language === 'ar' ? 'font-arabic' : ''}>
              {language === 'ar' ? 'نوع الرمز' : 'QR Type'}
            </Label>
            <Select value={qrType} onValueChange={(value: QRData['type']) => setQrType(value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['student', 'session', 'therapist', 'room'] as const).map((type) => {
                  const Icon = getTypeIcon(type)
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {getTypeLabel(type)}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(qrType === 'student' || qrType === 'session') && (
              <>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'رقم الطالب' : 'Student ID'}
                  </Label>
                  <Input
                    value={formData.studentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل رقم الطالب' : 'Enter student ID'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'اسم الطالب' : 'Student Name'}
                  </Label>
                  <Input
                    value={formData.studentName}
                    onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل اسم الطالب' : 'Enter student name'}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {qrType === 'session' && (
              <>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'رقم الجلسة' : 'Session ID'}
                  </Label>
                  <Input
                    value={formData.sessionId}
                    onChange={(e) => setFormData(prev => ({ ...prev, sessionId: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل رقم الجلسة' : 'Enter session ID'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'رقم المعالج' : 'Therapist ID'}
                  </Label>
                  <Input
                    value={formData.therapistId}
                    onChange={(e) => setFormData(prev => ({ ...prev, therapistId: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل رقم المعالج' : 'Enter therapist ID'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'اسم المعالج' : 'Therapist Name'}
                  </Label>
                  <Input
                    value={formData.therapistName}
                    onChange={(e) => setFormData(prev => ({ ...prev, therapistName: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل اسم المعالج' : 'Enter therapist name'}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {(qrType === 'therapist') && (
              <>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'رقم المعالج' : 'Therapist ID'}
                  </Label>
                  <Input
                    value={formData.therapistId}
                    onChange={(e) => setFormData(prev => ({ ...prev, therapistId: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل رقم المعالج' : 'Enter therapist ID'}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'اسم المعالج' : 'Therapist Name'}
                  </Label>
                  <Input
                    value={formData.therapistName}
                    onChange={(e) => setFormData(prev => ({ ...prev, therapistName: e.target.value }))}
                    placeholder={language === 'ar' ? 'أدخل اسم المعالج' : 'Enter therapist name'}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {(qrType === 'student' || qrType === 'session') && (
              <div>
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'نوع الجلسة' : 'Session Type'}
                </Label>
                <Select 
                  value={formData.sessionType} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sessionType: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={language === 'ar' ? 'اختر نوع الجلسة' : 'Select session type'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABA Therapy">ABA Therapy</SelectItem>
                    <SelectItem value="Speech Therapy">Speech Therapy</SelectItem>
                    <SelectItem value="Occupational Therapy">Occupational Therapy</SelectItem>
                    <SelectItem value="Physical Therapy">Physical Therapy</SelectItem>
                    <SelectItem value="Behavioral Intervention">Behavioral Intervention</SelectItem>
                    <SelectItem value="Assessment">Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(qrType === 'room' || qrType === 'student' || qrType === 'session') && (
              <div>
                <Label className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'رقم الغرفة' : 'Room Number'}
                </Label>
                <Input
                  value={formData.roomNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, roomNumber: e.target.value }))}
                  placeholder={language === 'ar' ? 'أدخل رقم الغرفة' : 'Enter room number'}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <Button onClick={generateQRData} className="w-full gap-2">
            <QrCode className="h-4 w-4" />
            {language === 'ar' ? 'إنشاء الرمز' : 'Generate QR Code'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated QR Code */}
      {generatedQR && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <QrCode className="h-5 w-5" />
              {language === 'ar' ? 'رمز الاستجابة السريعة المُنشأ' : 'Generated QR Code'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border">
                <img 
                  src={generatedQR} 
                  alt="Generated QR Code" 
                  className="w-64 h-64"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={downloadQR} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  {language === 'ar' ? 'تحميل' : 'Download'}
                </Button>
                <Button onClick={copyQRData} variant="outline" className="gap-2">
                  <Copy className="h-4 w-4" />
                  {language === 'ar' ? 'نسخ البيانات' : 'Copy Data'}
                </Button>
              </div>
            </div>

            {/* QR Data Preview */}
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'بيانات الرمز' : 'QR Data'}
              </Label>
              <Textarea
                value={qrDataString}
                readOnly
                rows={6}
                className="mt-1 font-mono text-xs"
                placeholder={language === 'ar' ? 'بيانات الرمز ستظهر هنا' : 'QR data will appear here'}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}