import { useState, useEffect, useRef } from 'react'
import { QrCode, Users, Clock, MapPin, CheckCircle, Camera, Wifi, WifiOff } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { useAttendanceRecords, useAttendanceStats, useCheckInStudent, useStartSession, useRealTimeAttendance } from '@/hooks/useAttendance'

interface QRAttendanceSystemProps {
  mode: 'student' | 'therapist' | 'session' | 'room'
}

export const QRAttendanceSystem = ({ mode }: QRAttendanceSystemProps) => {
  const { language, isRTL } = useLanguage()
  const [isScanning, setIsScanning] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [scanError, setScanError] = useState<string>('')
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const scannerElementId = 'qr-reader-' + mode
  
  // Hooks for data management
  const { data: attendanceRecords = [], isLoading } = useAttendanceRecords()
  const { data: stats } = useAttendanceStats()
  const checkInMutation = useCheckInStudent()
  const startSessionMutation = useStartSession()
  const liveUpdates = useRealTimeAttendance()

  // Monitor online status and cleanup scanner
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [])

  const handleQRScan = async (qrData: string) => {
    setIsScanning(true)
    setShowScanner(false)
    
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
      console.error('QR Scan Error:', error)
      toast.error(language === 'ar' ? 'خطأ في قراءة الرمز' : 'Error reading QR code')
    } finally {
      setIsScanning(false)
    }
  }

  const handleScanError = (error: any) => {
    console.error('Scanner Error:', error)
    setScanError(error?.message || 'Camera error')
    toast.error(language === 'ar' ? 'خطأ في تشغيل الكاميرا' : 'Camera error')
  }

  const handleScanSuccess = (decodedText: string) => {
    handleQRScan(decodedText)
    stopScanning()
  }

  const startScanning = () => {
    setShowScanner(true)
    setScanError('')
    
    // Initialize scanner after DOM element is available
    setTimeout(() => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          scannerElementId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          false
        )
        
        scannerRef.current.render(handleScanSuccess, handleScanError)
      } catch (error) {
        console.error('Error initializing scanner:', error)
        handleScanError(error)
      }
    }, 100)
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
      scannerRef.current = null
    }
    setShowScanner(false)
    setScanError('')
  }

  const handleStudentAttendance = async (qrInfo: any) => {
    try {
      await checkInMutation.mutateAsync(qrInfo)
      const existingRecord = attendanceRecords.find(r => 
        r.student_id === qrInfo.studentId && 
        r.status !== 'checked_out'
      )
      
      if (existingRecord) {
        toast.success(
          language === 'ar' 
            ? `تم تسجيل خروج ${qrInfo.studentName}` 
            : `${qrInfo.studentName} checked out`
        )
      } else {
        toast.success(
          language === 'ar' 
            ? `تم تسجيل دخول ${qrInfo.studentName}` 
            : `${qrInfo.studentName} checked in`
        )
      }
    } catch (error) {
      throw error
    }
  }

  const handleSessionAttendance = async (qrInfo: any) => {
    try {
      await startSessionMutation.mutateAsync(qrInfo)
      toast.success(
        language === 'ar' 
          ? `تم بدء الجلسة للطالب ${qrInfo.studentName}` 
          : `Session started for ${qrInfo.studentName}`
      )
    } catch (error) {
      throw error
    }
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
            <div className="ml-auto flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">
                    {language === 'ar' ? 'متصل' : 'Online'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">
                    {language === 'ar' ? 'غير متصل' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showScanner ? (
            <div className="relative rounded-lg overflow-hidden">
              <div 
                id={scannerElementId}
                className="w-full"
              />
              <div className="flex justify-center mt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopScanning}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {language === 'ar' ? 'إيقاف المسح' : 'Stop Scanning'}
                </Button>
              </div>
              {scanError && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                  <p className="font-semibold mb-1">
                    {language === 'ar' ? 'خطأ في المسح' : 'Scan Error'}
                  </p>
                  <p>{scanError}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
              <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {language === 'ar' ? 'امسح رمز الحضور' : 'Scan Attendance QR Code'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {language === 'ar' 
                  ? 'اضغط لفتح الكاميرا ومسح رمز الحضور'
                  : 'Click to open camera and scan attendance QR code'
                }
              </p>
              <div className="space-x-2">
                <Button 
                  onClick={startScanning}
                  disabled={isScanning}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {isScanning 
                    ? (language === 'ar' ? 'جاري المسح...' : 'Scanning...')
                    : (language === 'ar' ? 'فتح الكاميرا' : 'Open Camera')
                  }
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleQRScan('{"studentId":"std-003","studentName":"محمد أحمد","sessionType":"OT","roomNumber":"C-301"}')}
                  disabled={isScanning}
                  className="gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  {language === 'ar' ? 'اختبار (وهمي)' : 'Test (Demo)'}
                </Button>
              </div>
            </div>
          )}

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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : attendanceRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {language === 'ar' ? 'لا يوجد سجلات حضور' : 'No attendance records'}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Live Updates */}
              {liveUpdates.slice(0, 3).map((record) => (
                <div 
                  key={`live-${record.id}`} 
                  className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg animate-pulse"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold flex items-center gap-2">
                      {record.student_name}
                      <Badge variant="secondary" className="text-xs">
                        {language === 'ar' ? 'جديد' : 'NEW'}
                      </Badge>
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.check_in_time).toLocaleTimeString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                      {record.room_number && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.room_number}
                        </span>
                      )}
                      <span>{record.session_type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(record.status)}>
                      {getStatusText(record.status)}
                    </Badge>
                  </div>
                </div>
              ))}
              
              {/* Regular Records */}
              {attendanceRecords.map((record) => (
                <div 
                  key={record.id} 
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <h4 className="font-semibold">{record.student_name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(record.check_in_time).toLocaleTimeString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                      {record.room_number && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {record.room_number}
                        </span>
                      )}
                      <span>{record.session_type}</span>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats?.inSession || 0}
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
                {stats?.presentStudents || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'حاضر اليوم' : 'Present Today'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {stats?.checkedOut || 0}
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
              <div className="text-2xl font-bold text-purple-600">
                {stats?.activeTherapists || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'معالجين نشطين' : 'Active Staff'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats?.attendanceRate || 0}%
              </div>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}