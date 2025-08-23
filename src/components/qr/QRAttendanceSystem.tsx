import { useState, useEffect } from 'react'
import { QrCode, Users, Clock, MapPin, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  sessionId?: string
  sessionType: string
  checkInTime: string
  checkOutTime?: string
  roomNumber?: string
  therapistId?: string
  therapistName?: string
  status: 'checked_in' | 'in_session' | 'checked_out'
}

interface QRAttendanceSystemProps {
  mode: 'student' | 'therapist' | 'session' | 'room'
}

export const QRAttendanceSystem = ({ mode }: QRAttendanceSystemProps) => {
  const { language, isRTL } = useLanguage()
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [, setCurrentSession] = useState<any>(null)

  // Mock data for demo
  useEffect(() => {
    const mockRecords: AttendanceRecord[] = [
      {
        id: '1',
        studentId: 'std-001',
        studentName: 'أحمد محمد الأحمد',
        sessionId: 'sess-001',
        sessionType: 'ABA Therapy',
        checkInTime: '2025-01-22T09:00:00',
        roomNumber: 'A-101',
        therapistId: 'th-001',
        therapistName: 'د. سارة أحمد',
        status: 'in_session'
      },
      {
        id: '2',
        studentId: 'std-002',
        studentName: 'فاطمة علي السالم',
        sessionId: 'sess-002',
        sessionType: 'Speech Therapy',
        checkInTime: '2025-01-22T10:30:00',
        checkOutTime: '2025-01-22T11:15:00',
        roomNumber: 'B-205',
        therapistId: 'th-002',
        therapistName: 'أ. نور الدين',
        status: 'checked_out'
      }
    ]
    setAttendanceRecords(mockRecords)
  }, [])

  const handleQRScan = async (qrData: string) => {
    setIsScanning(true)
    
    try {
      // Parse QR code data
      const qrInfo = JSON.parse(qrData)
      
      switch (mode) {
        case 'student':
          await handleStudentAttendance(qrInfo)
          break
        case 'session':
          await handleSessionAttendance(qrInfo)
          break
        case 'therapist':
          await handleTherapistAttendance(qrInfo)
          break
        case 'room':
          await handleRoomUtilization(qrInfo)
          break
      }
      
      toast.success(language === 'ar' ? 'تم تسجيل الحضور بنجاح' : 'Attendance recorded successfully')
    } catch (error) {
      toast.error(language === 'ar' ? 'خطأ في قراءة الرمز' : 'Error reading QR code')
    } finally {
      setIsScanning(false)
    }
  }

  const handleStudentAttendance = async (qrInfo: any) => {
    // Student check-in/check-out logic
    const existingRecord = attendanceRecords.find(r => 
      r.studentId === qrInfo.studentId && 
      r.status !== 'checked_out'
    )

    if (existingRecord) {
      // Check out
      const updatedRecords = attendanceRecords.map(record =>
        record.id === existingRecord.id
          ? { ...record, checkOutTime: new Date().toISOString(), status: 'checked_out' as const }
          : record
      )
      setAttendanceRecords(updatedRecords)
    } else {
      // Check in
      const newRecord: AttendanceRecord = {
        id: Date.now().toString(),
        studentId: qrInfo.studentId,
        studentName: qrInfo.studentName,
        sessionType: qrInfo.sessionType || 'General',
        checkInTime: new Date().toISOString(),
        status: 'checked_in',
        roomNumber: qrInfo.roomNumber
      }
      setAttendanceRecords([...attendanceRecords, newRecord])
    }
  }

  const handleSessionAttendance = async (qrInfo: any) => {
    // Session-specific attendance
    setCurrentSession(qrInfo)
    
    const updatedRecords = attendanceRecords.map(record =>
      record.studentId === qrInfo.studentId
        ? { ...record, sessionId: qrInfo.sessionId, status: 'in_session' as const }
        : record
    )
    setAttendanceRecords(updatedRecords)
  }

  const handleTherapistAttendance = async (_qrInfo: any) => {
    // Therapist check-in for sessions
    toast.info(language === 'ar' ? 'تم تسجيل دخول المعالج' : 'Therapist checked in')
  }

  const handleRoomUtilization = async (_qrInfo: any) => {
    // Room utilization tracking
    toast.info(language === 'ar' ? 'تم تسجيل استخدام الغرفة' : 'Room utilization recorded')
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'checked_in': return 'secondary'
      case 'in_session': return 'default'
      case 'checked_out': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    const statusTexts = {
      ar: {
        checked_in: 'تم الحضور',
        in_session: 'في الجلسة',
        checked_out: 'تم الانصراف'
      },
      en: {
        checked_in: 'Checked In',
        in_session: 'In Session',
        checked_out: 'Checked Out'
      }
    }
    return statusTexts[language as keyof typeof statusTexts][status as keyof typeof statusTexts.ar] || status
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* QR Scanner Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            {language === 'ar' ? 'نظام الحضور بالرمز المربع' : 'QR Attendance System'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ar' ? 'امسح رمز الحضور' : 'Scan Attendance QR Code'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {language === 'ar' 
                ? 'وجه الكاميرا نحو رمز الحضور المربع'
                : 'Point camera at the attendance QR code'
              }
            </p>
            <Button 
              onClick={() => handleQRScan('{"studentId":"std-003","studentName":"محمد أحمد","sessionType":"OT","roomNumber":"C-301"}')}
              disabled={isScanning}
              className="gap-2"
            >
              <QrCode className="h-4 w-4" />
              {isScanning 
                ? (language === 'ar' ? 'جاري المسح...' : 'Scanning...')
                : (language === 'ar' ? 'بدء المسح' : 'Start Scan')
              }
            </Button>
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: 'student', icon: Users, labelAr: 'حضور الطلاب', labelEn: 'Student Attendance' },
              { key: 'session', icon: Clock, labelAr: 'جلسات العلاج', labelEn: 'Therapy Sessions' },
              { key: 'therapist', icon: CheckCircle, labelAr: 'حضور المعالجين', labelEn: 'Therapist Attendance' },
              { key: 'room', icon: MapPin, labelAr: 'استخدام الغرف', labelEn: 'Room Utilization' }
            ].map((modeOption) => (
              <Button
                key={modeOption.key}
                variant={mode === modeOption.key ? 'default' : 'outline'}
                size="sm"
                className="gap-2 justify-start"
              >
                <modeOption.icon className="h-4 w-4" />
                {language === 'ar' ? modeOption.labelAr : modeOption.labelEn}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Live Attendance Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === 'ar' ? 'الحضور المباشر' : 'Live Attendance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendanceRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا يوجد سجلات حضور' : 'No attendance records'}
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold">{record.studentName}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.checkInTime).toLocaleTimeString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                      {record.roomNumber && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.roomNumber}
                        </span>
                      )}
                      <span>{record.sessionType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(record.status)}>
                      {getStatusText(record.status)}
                    </Badge>
                    {record.status === 'in_session' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs">
                          {language === 'ar' ? 'نشط' : 'Active'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {attendanceRecords.filter(r => r.status === 'in_session').length}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'في الجلسة' : 'In Session'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {attendanceRecords.filter(r => r.status === 'checked_in').length}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'في الانتظار' : 'Waiting'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {attendanceRecords.filter(r => r.status === 'checked_out').length}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'تم الانصراف' : 'Completed'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {attendanceRecords.length}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'إجمالي اليوم' : 'Total Today'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}