import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Plus,
  Edit,
  X,
  Check,
  AlertCircle,
  Video,
  Phone
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'
import { ParentDesktopNav } from '@/components/parent/ParentDesktopNav'
import { parentPortalService } from '@/services/parent-portal'
import type { Appointment, AppointmentRequest, ParentUser } from '@/types/parent-portal'

export default function ParentAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [parentUser, setParentUser] = useState<ParentUser | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedView, setSelectedView] = useState<'upcoming' | 'history'>('upcoming')
  const [bookingForm, setBookingForm] = useState<Partial<AppointmentRequest>>({
    requestType: 'new_session',
    priority: 'routine',
    preferredDates: [],
    preferredTimes: [],
    duration: 60
  })
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('parentUser')
    if (!storedUser) {
      navigate('/parent-login')
      return
    }

    const user = JSON.parse(storedUser)
    setParentUser(user)
    loadAppointments()
  }, [navigate])

  const loadAppointments = async () => {
    try {
      // Mock appointments data
      const mockAppointments: Appointment[] = [
        {
          id: 'app-001',
          childId: 'child-001',
          childName: 'أحمد محمد',
          therapistId: 'th-001',
          therapistName: 'د. سارة أحمد',
          sessionType: 'جلسة علاج نطق',
          programType: 'Speech Therapy',
          scheduledDate: '2025-01-25',
          scheduledTime: '10:00',
          duration: 45,
          roomNumber: 'غرفة 101',
          status: 'scheduled',
          reminderSent: false,
          specialInstructions: 'يرجى إحضار الكتاب التفاعلي',
          canReschedule: true,
          rescheduleDeadline: '2025-01-24T10:00:00Z'
        },
        {
          id: 'app-002',
          childId: 'child-001',
          childName: 'أحمد محمد',
          therapistId: 'th-002',
          therapistName: 'أ. محمد عبدالله',
          sessionType: 'جلسة علاج وظيفي',
          programType: 'Occupational Therapy',
          scheduledDate: '2025-01-27',
          scheduledTime: '14:30',
          duration: 60,
          roomNumber: 'غرفة 203',
          status: 'confirmed',
          reminderSent: true,
          canReschedule: true,
          rescheduleDeadline: '2025-01-26T14:30:00Z'
        }
      ]

      setAppointments(mockAppointments)
    } catch (error) {
      console.error('Error loading appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBookingSubmit = async () => {
    if (!parentUser || !bookingForm.childId || !bookingForm.reason) return

    try {
      const appointmentRequest: Partial<AppointmentRequest> = {
        ...bookingForm,
        parentId: parentUser.id
      }

      const success = await parentPortalService.requestAppointment(appointmentRequest)
      if (success) {
        setShowBookingForm(false)
        setBookingForm({
          requestType: 'new_session',
          priority: 'routine',
          preferredDates: [],
          preferredTimes: [],
          duration: 60
        })
        // Show success message
      }
    } catch (error) {
      console.error('Error booking appointment:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusName = (status: string) => {
    const names: Record<string, string> = {
      scheduled: 'مُجدول',
      confirmed: 'مؤكد',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتمل',
      cancelled: 'ملغي',
      no_show: 'عدم حضور'
    }
    return names[status] || status
  }

  const upcomingAppointments = appointments.filter(
    app => new Date(app.scheduledDate) >= new Date()
  )

  const pastAppointments = appointments.filter(
    app => new Date(app.scheduledDate) < new Date()
  )

  const displayAppointments = selectedView === 'upcoming' ? upcomingAppointments : pastAppointments

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جار تحميل المواعيد...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('parentUser')
    localStorage.removeItem('parentSession')
    navigate('/parent-login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <ParentDesktopNav 
        onLogout={handleLogout}
        parentName={`${parentUser?.firstName || ''} ${parentUser?.lastName || ''}`.trim() || 'ولي الأمر'}
      />

      {/* Page Header - Desktop */}
      <div className="bg-white border-b px-6 py-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">المواعيد</h1>
          <Button
            onClick={() => setShowBookingForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 ml-2" />
            حجز موعد جديد
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Toggle */}
        <div className="flex items-center space-x-4 space-x-reverse mb-6">
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <Button
              variant={selectedView === 'upcoming' ? 'default' : 'ghost'}
              onClick={() => setSelectedView('upcoming')}
              className="px-4 py-2"
            >
              المواعيد القادمة ({upcomingAppointments.length})
            </Button>
            <Button
              variant={selectedView === 'history' ? 'default' : 'ghost'}
              onClick={() => setSelectedView('history')}
              className="px-4 py-2"
            >
              السجل ({pastAppointments.length})
            </Button>
          </div>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {displayAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-right flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {appointment.sessionType}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {appointment.childName} - {appointment.programType}
                    </p>
                    <div className="flex items-center justify-end text-sm text-gray-600 mb-1">
                      <span className="ml-1">{appointment.therapistName}</span>
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`
                      px-3 py-1 rounded-full text-sm font-medium border
                      ${getStatusColor(appointment.status)}
                    `}>
                      {getStatusName(appointment.status)}
                    </div>
                    {appointment.reminderSent && (
                      <div className="text-xs text-green-600 flex items-center">
                        <Check className="w-3 h-3 ml-1" />
                        تم إرسال التذكير
                      </div>
                    )}
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center justify-end bg-gray-50 p-3 rounded-lg">
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">التاريخ</p>
                      <p className="font-semibold">
                        {new Date(appointment.scheduledDate).toLocaleDateString('ar-SA', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                  </div>

                  <div className="flex items-center justify-end bg-gray-50 p-3 rounded-lg">
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">الوقت</p>
                      <p className="font-semibold">
                        {appointment.scheduledTime} - {appointment.duration} دقيقة
                      </p>
                    </div>
                    <Clock className="w-5 h-5 text-green-600 mr-3" />
                  </div>

                  <div className="flex items-center justify-end bg-gray-50 p-3 rounded-lg">
                    <div className="text-right">
                      <p className="text-gray-600 text-sm">المكان</p>
                      <p className="font-semibold">
                        {appointment.roomNumber || 'سيتم تحديده'}
                      </p>
                    </div>
                    <MapPin className="w-5 h-5 text-purple-600 mr-3" />
                  </div>
                </div>

                {/* Special Instructions */}
                {appointment.specialInstructions && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-yellow-600 ml-2 mt-0.5 flex-shrink-0" />
                      <div className="text-right flex-1">
                        <h4 className="font-medium text-yellow-900 mb-1">تعليمات خاصة</h4>
                        <p className="text-yellow-800 text-sm">{appointment.specialInstructions}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 space-x-reverse">
                  {appointment.canReschedule && selectedView === 'upcoming' && (
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 ml-2" />
                      إعادة جدولة
                    </Button>
                  )}
                  
                  {selectedView === 'upcoming' && appointment.status === 'scheduled' && (
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                      <X className="w-4 h-4 ml-2" />
                      إلغاء
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    <Video className="w-4 h-4 ml-2" />
                    انضمام عبر الفيديو
                  </Button>

                  <Button variant="outline" size="sm">
                    <Phone className="w-4 h-4 ml-2" />
                    اتصال
                  </Button>
                </div>

                {/* Reschedule Deadline Warning */}
                {appointment.canReschedule && appointment.rescheduleDeadline && selectedView === 'upcoming' && (
                  <div className="mt-3 text-xs text-gray-500 text-right">
                    يمكن إعادة الجدولة حتى: {new Date(appointment.rescheduleDeadline).toLocaleString('ar-SA')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {displayAppointments.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedView === 'upcoming' ? 'لا توجد مواعيد قادمة' : 'لا يوجد سجل مواعيد'}
            </h3>
            <p className="text-gray-600 mb-4">
              {selectedView === 'upcoming' 
                ? 'احجز موعدك الأول للبدء'
                : 'ستظهر هنا المواعيد السابقة بمجرد إجرائها'
              }
            </p>
            {selectedView === 'upcoming' && (
              <Button
                onClick={() => setShowBookingForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 ml-2" />
                احجز موعد جديد
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-right">حجز موعد جديد</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBookingForm(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Child Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  الطفل *
                </label>
                <Select 
                  value={bookingForm.childId || ''} 
                  onValueChange={(value) => setBookingForm({...bookingForm, childId: value})}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر الطفل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child-001">أحمد محمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Request Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  نوع الطلب *
                </label>
                <Select 
                  value={bookingForm.requestType || ''} 
                  onValueChange={(value: any) => setBookingForm({...bookingForm, requestType: value})}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="نوع الطلب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_session">جلسة جديدة</SelectItem>
                    <SelectItem value="reschedule">إعادة جدولة</SelectItem>
                    <SelectItem value="consultation">استشارة</SelectItem>
                    <SelectItem value="assessment">تقييم</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Therapist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  المعالج المفضل
                </label>
                <Select 
                  value={bookingForm.preferredTherapist || ''} 
                  onValueChange={(value) => setBookingForm({...bookingForm, preferredTherapist: value})}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المعالج" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="th-001">د. سارة أحمد</SelectItem>
                    <SelectItem value="th-002">أ. محمد عبدالله</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  المدة (بالدقائق) *
                </label>
                <Select 
                  value={bookingForm.duration?.toString() || ''} 
                  onValueChange={(value) => setBookingForm({...bookingForm, duration: parseInt(value)})}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="المدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 دقيقة</SelectItem>
                    <SelectItem value="45">45 دقيقة</SelectItem>
                    <SelectItem value="60">60 دقيقة</SelectItem>
                    <SelectItem value="90">90 دقيقة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  الأولوية *
                </label>
                <Select 
                  value={bookingForm.priority || ''} 
                  onValueChange={(value: any) => setBookingForm({...bookingForm, priority: value})}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="مستوى الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">عادي</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                    <SelectItem value="emergency">طارئ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  سبب الحجز *
                </label>
                <Input
                  type="text"
                  value={bookingForm.reason || ''}
                  onChange={(e) => setBookingForm({...bookingForm, reason: e.target.value})}
                  placeholder="اذكر سبب الحجز"
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 text-right mb-2">
                  ملاحظات إضافية
                </label>
                <Input
                  type="text"
                  value={bookingForm.notes || ''}
                  onChange={(e) => setBookingForm({...bookingForm, notes: e.target.value})}
                  placeholder="أي ملاحظات إضافية"
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 space-x-reverse pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowBookingForm(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleBookingSubmit}
                  disabled={!bookingForm.childId || !bookingForm.reason}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  إرسال طلب الحجز
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Navigation */}
      <ParentMobileNav />
    </div>
  )
}