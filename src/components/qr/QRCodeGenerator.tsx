import { useState, useEffect } from 'react'
import { QrCode, Download, Copy, Users, Clock, MapPin, UserCheck, Calendar, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { useGenerateQRCode, useQRHistory } from '@/hooks/useAttendance'
import { useStudents } from '@/hooks/useStudents'
import { useTherapists } from '@/hooks/useTherapists'
import { useCourses } from '@/hooks/useCourses'

interface QRData {
  type: 'student' | 'session' | 'therapist' | 'room' | 'center_entry' | 'center_exit' | 'session_specific'
  // Center-level properties
  facilityId?: string
  location?: string
  centerAction?: 'check_in' | 'check_out'
  // Session-level properties  
  studentId?: string
  studentName?: string
  sessionId?: string
  sessionType?: string
  therapistId?: string
  therapistName?: string
  roomNumber?: string
  // Enhanced metadata
  timestamp: string
  level?: 'center' | 'session' | 'general'
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
    roomNumber: '',
    courseId: '',
    description: '',
    tags: '',
    // Dual-level properties
    facilityId: 'arkan_center_main',
    location: '',
    centerAction: 'check_in' as 'check_in' | 'check_out'
  })
  const [generatedQR, setGeneratedQR] = useState<string>('')
  const [qrDataString, setQrDataString] = useState<string>('')
  const [generatedQRRecord, setGeneratedQRRecord] = useState<any>(null)
  
  // Advanced settings
  const [isSingleUse, setIsSingleUse] = useState(false)
  const [hasExpiry, setHasExpiry] = useState(false)
  const [expiryHours, setExpiryHours] = useState('24')
  const [maxScans, setMaxScans] = useState('')
  
  // Data hooks
  const { data: students = [] } = useStudents()
  const { data: therapists = [] } = useTherapists()
  const { data: courses = [] } = useCourses()
  const generateQRMutation = useGenerateQRCode()
  const { data: qrHistory = [] } = useQRHistory({ limit: 10 })

  const generateQRData = async () => {
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
        qrData.level = 'general'
        break
      case 'session':
        qrData.sessionId = formData.sessionId
        qrData.sessionType = formData.sessionType
        qrData.studentId = formData.studentId
        qrData.studentName = formData.studentName
        qrData.therapistId = formData.therapistId
        qrData.therapistName = formData.therapistName
        qrData.roomNumber = formData.roomNumber
        qrData.level = 'general'
        break
      case 'therapist':
        qrData.therapistId = formData.therapistId
        qrData.therapistName = formData.therapistName
        qrData.level = 'general'
        break
      case 'room':
        qrData.roomNumber = formData.roomNumber
        qrData.level = 'general'
        break
      // NEW: Dual-level QR types
      case 'center_entry':
        qrData.facilityId = formData.facilityId
        qrData.location = formData.location
        qrData.centerAction = 'check_in'
        qrData.level = 'center'
        break
      case 'center_exit':
        qrData.facilityId = formData.facilityId
        qrData.location = formData.location
        qrData.centerAction = 'check_out'
        qrData.level = 'center'
        break
      case 'session_specific':
        qrData.sessionId = formData.sessionId
        qrData.sessionType = formData.sessionType
        qrData.studentId = formData.studentId
        qrData.therapistId = formData.therapistId
        qrData.roomNumber = formData.roomNumber
        qrData.level = 'session'
        break
    }

    const qrString = JSON.stringify(qrData)
    setQrDataString(qrString)
    
    // Generate QR code URL (using a QR code API service)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`
    setGeneratedQR(qrCodeUrl)

    // Calculate expiry time if needed
    let expiresAt: string | undefined
    if (hasExpiry) {
      const expiry = new Date()
      expiry.setHours(expiry.getHours() + parseInt(expiryHours))
      expiresAt = expiry.toISOString()
    }

    // Generate QR code record in database
    try {
      const result = await generateQRMutation.mutateAsync({
        qr_type: qrType,
        data: qrData,
        student_id: formData.studentId || undefined,
        session_id: formData.sessionId || undefined,
        therapist_id: formData.therapistId || undefined,
        course_id: formData.courseId || undefined,
        expires_at: expiresAt,
        is_single_use: isSingleUse,
        max_scans: maxScans ? parseInt(maxScans) : undefined,
        description: formData.description || undefined,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : []
      })
      
      setGeneratedQRRecord(result)
      
      toast.success(
        language === 'ar' ? 'تم إنشاء رمز الاستجابة السريعة' : 'QR Code generated successfully'
      )
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast.error(
        language === 'ar' ? 'خطأ في إنشاء الرمز' : 'Error generating QR code'
      )
    }
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
        room: 'غرفة',
        center_entry: 'دخول المركز',
        center_exit: 'خروج المركز', 
        session_specific: 'جلسة محددة'
      },
      en: {
        student: 'Student',
        session: 'Session',
        therapist: 'Therapist',
        room: 'Room',
        center_entry: 'Center Entry',
        center_exit: 'Center Exit',
        session_specific: 'Session Specific'
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
                {/* General QR Types */}
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b">
                  {language === 'ar' ? 'عام' : 'General'}
                </div>
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
                {/* Dual-Level QR Types */}
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-b border-t">
                  {language === 'ar' ? 'المستوى المزدوج' : 'Dual-Level'}
                </div>
                {(['center_entry', 'center_exit', 'session_specific'] as const).map((type) => {
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
                    {language === 'ar' ? 'الطالب' : 'Student'}
                  </Label>
                  <Select 
                    value={formData.studentId} 
                    onValueChange={(value) => {
                      const selectedStudent = students.find(s => s.id === value)
                      setFormData(prev => ({ 
                        ...prev, 
                        studentId: value,
                        studentName: selectedStudent?.name || ''
                      }))
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الطالب' : 'Select student'} />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'اسم الطالب' : 'Student Name'}
                  </Label>
                  <Input
                    value={formData.studentName}
                    onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
                    placeholder={language === 'ar' ? 'سيتم ملؤه تلقائياً' : 'Auto-filled'}
                    className="mt-1"
                    disabled
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
                    {language === 'ar' ? 'المعالج' : 'Therapist'}
                  </Label>
                  <Select 
                    value={formData.therapistId} 
                    onValueChange={(value) => {
                      const selectedTherapist = therapists.find(t => t.id === value)
                      setFormData(prev => ({ 
                        ...prev, 
                        therapistId: value,
                        therapistName: selectedTherapist?.name || ''
                      }))
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر المعالج' : 'Select therapist'} />
                    </SelectTrigger>
                    <SelectContent>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist.id} value={therapist.id}>
                          {therapist.name} - {therapist.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'اسم المعالج' : 'Therapist Name'}
                  </Label>
                  <Input
                    value={formData.therapistName}
                    onChange={(e) => setFormData(prev => ({ ...prev, therapistName: e.target.value }))}
                    placeholder={language === 'ar' ? 'سيتم ملؤه تلقائياً' : 'Auto-filled'}
                    className="mt-1"
                    disabled
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

            {/* NEW: Dual-level QR specific fields */}
            {(qrType === 'center_entry' || qrType === 'center_exit') && (
              <>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'موقع المركز' : 'Center Location'}
                  </Label>
                  <Select 
                    value={formData.location} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الموقع' : 'Select location'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Entrance">{language === 'ar' ? 'المدخل الرئيسي' : 'Main Entrance'}</SelectItem>
                      <SelectItem value="Emergency Exit">{language === 'ar' ? 'مخرج الطوارئ' : 'Emergency Exit'}</SelectItem>
                      <SelectItem value="Side Door">{language === 'ar' ? 'الباب الجانبي' : 'Side Door'}</SelectItem>
                      <SelectItem value="Reception Area">{language === 'ar' ? 'منطقة الاستقبال' : 'Reception Area'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'معرف المرفق' : 'Facility ID'}
                  </Label>
                  <Input
                    value={formData.facilityId}
                    onChange={(e) => setFormData(prev => ({ ...prev, facilityId: e.target.value }))}
                    placeholder="arkan_center_main"
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {qrType === 'session_specific' && (
              <>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'الجلسة' : 'Session'}
                  </Label>
                  <Select 
                    value={formData.sessionId} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sessionId: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الجلسة' : 'Select session'} />
                    </SelectTrigger>
                    <SelectContent>
                      {/* TODO: Replace with actual sessions query */}
                      <SelectItem value="session_1">
                        {language === 'ar' ? 'جلسة علاج النطق - 10:00 ص' : 'Speech Therapy - 10:00 AM'}
                      </SelectItem>
                      <SelectItem value="session_2">
                        {language === 'ar' ? 'جلسة ABA - 2:00 م' : 'ABA Therapy - 2:00 PM'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'الطالب (اختياري)' : 'Student (Optional)'}
                  </Label>
                  <Select 
                    value={formData.studentId} 
                    onValueChange={(value) => {
                      const selectedStudent = students.find(s => s.id === value)
                      setFormData(prev => ({ 
                        ...prev, 
                        studentId: value,
                        studentName: selectedStudent?.name || ''
                      }))
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر الطالب (اختياري)' : 'Select student (optional)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{language === 'ar' ? 'لا يوجد' : 'None'}</SelectItem>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'المعالج' : 'Therapist'}
                  </Label>
                  <Select 
                    value={formData.therapistId} 
                    onValueChange={(value) => {
                      const selectedTherapist = therapists.find(t => t.id === value)
                      setFormData(prev => ({ 
                        ...prev, 
                        therapistId: value,
                        therapistName: selectedTherapist?.name || ''
                      }))
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={language === 'ar' ? 'اختر المعالج' : 'Select therapist'} />
                    </SelectTrigger>
                    <SelectContent>
                      {therapists.map((therapist) => (
                        <SelectItem key={therapist.id} value={therapist.id}>
                          {therapist.name} - {therapist.specialization}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </>
            )}
          </div>

          {/* Additional metadata */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'الوصف (اختياري)' : 'Description (Optional)'}
              </Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={language === 'ar' ? 'وصف الرمز' : 'QR code description'}
                className="mt-1"
              />
            </div>
            <div>
              <Label className={language === 'ar' ? 'font-arabic' : ''}>
                {language === 'ar' ? 'العلامات (مفصولة بفواصل)' : 'Tags (comma separated)'}
              </Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder={language === 'ar' ? 'مثال: حضور، جلسة، طالب' : 'Example: attendance, session, student'}
                className="mt-1"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الإعدادات المتقدمة' : 'Advanced Settings'}
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="single-use"
                  checked={isSingleUse}
                  onCheckedChange={setIsSingleUse}
                />
                <Label htmlFor="single-use" className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'استخدام واحد فقط' : 'Single use only'}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="has-expiry"
                  checked={hasExpiry}
                  onCheckedChange={setHasExpiry}
                />
                <Label htmlFor="has-expiry" className={language === 'ar' ? 'font-arabic' : ''}>
                  {language === 'ar' ? 'له تاريخ انتهاء' : 'Has expiry time'}
                </Label>
              </div>

              {hasExpiry && (
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'انتهاء الصلاحية (ساعات)' : 'Expires in (hours)'}
                  </Label>
                  <Select value={expiryHours} onValueChange={setExpiryHours}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 {language === 'ar' ? 'ساعة' : 'hour'}</SelectItem>
                      <SelectItem value="6">6 {language === 'ar' ? 'ساعات' : 'hours'}</SelectItem>
                      <SelectItem value="12">12 {language === 'ar' ? 'ساعة' : 'hours'}</SelectItem>
                      <SelectItem value="24">24 {language === 'ar' ? 'ساعة' : 'hours'}</SelectItem>
                      <SelectItem value="48">48 {language === 'ar' ? 'ساعة' : 'hours'}</SelectItem>
                      <SelectItem value="168">7 {language === 'ar' ? 'أيام' : 'days'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isSingleUse && (
                <div>
                  <Label className={language === 'ar' ? 'font-arabic' : ''}>
                    {language === 'ar' ? 'الحد الأقصى للمسح' : 'Max scans (optional)'}
                  </Label>
                  <Input
                    type="number"
                    value={maxScans}
                    onChange={(e) => setMaxScans(e.target.value)}
                    placeholder={language === 'ar' ? 'غير محدود' : 'Unlimited'}
                    className="mt-1"
                    min="1"
                    max="1000"
                  />
                </div>
              )}
            </div>
          </div>

          <Button 
            onClick={generateQRData} 
            className="w-full gap-2" 
            disabled={generateQRMutation.isPending}
          >
            <QrCode className="h-4 w-4" />
            {generateQRMutation.isPending 
              ? (language === 'ar' ? 'جاري الإنشاء...' : 'Generating...')
              : (language === 'ar' ? 'إنشاء الرمز' : 'Generate QR Code')
            }
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

      {/* QR Code History */}
      {qrHistory && qrHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
              <Calendar className="h-5 w-5" />
              {language === 'ar' ? 'سجل الرموز المُنشأة' : 'Recent QR Codes'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {qrHistory.slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const Icon = getTypeIcon(record.qr_type)
                        return <Icon className="h-4 w-4 text-muted-foreground" />
                      })()}
                      <span className="font-medium">
                        {getTypeLabel(record.qr_type)}
                      </span>
                      {record.is_single_use && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          {language === 'ar' ? 'استخدام واحد' : 'Single Use'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {record.description || (language === 'ar' ? 'بدون وصف' : 'No description')}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        {language === 'ar' ? 'تم الإنشاء:' : 'Created:'} {' '}
                        {new Date(record.generated_at).toLocaleDateString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                      <span>
                        {language === 'ar' ? 'المسح:' : 'Scans:'} {record.scan_count}
                        {record.max_scans && `/${record.max_scans}`}
                      </span>
                      {record.expires_at && (
                        <span>
                          {language === 'ar' ? 'ينتهي:' : 'Expires:'} {' '}
                          {new Date(record.expires_at).toLocaleString(
                            language === 'ar' ? 'ar-SA' : 'en-US'
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.is_active ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs">
                        <CheckCircle className="h-3 w-3" />
                        {language === 'ar' ? 'نشط' : 'Active'}
                      </span>
                    ) : (
                      <span className="text-red-600 text-xs">
                        {language === 'ar' ? 'غير نشط' : 'Inactive'}
                      </span>
                    )}
                    {record.tags && record.tags.length > 0 && (
                      <div className="flex gap-1">
                        {record.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}