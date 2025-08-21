import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSessions } from '@/hooks/useSessions'
import type { Session } from '@/types/session'

export const SessionCalendarPage = () => {
  const { language, isRTL } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Get current month sessions
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  const { data: sessions = [] } = useSessions({
    date_from: startOfMonth.toISOString().split('T')[0],
    date_to: endOfMonth.toISOString().split('T')[0],
    search: searchTerm.trim() || undefined
  })
  

  // Calendar navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Calendar generation
  const { calendarDays, monthName, year } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate()
    
    // Generate calendar days
    const days: Array<{
      date: Date
      isCurrentMonth: boolean
      isToday: boolean
      isSelected: boolean
      sessions: Session[]
    }> = []
    
    // Previous month days
    const daysFromPrevMonth = firstDayOfWeek
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        sessions: []
      })
    }
    
    // Current month days
    const today = new Date()
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateString = date.toISOString().split('T')[0]
      const daySessions = sessions.filter(session => session.session_date === dateString)
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isSelected: selectedDate?.toDateString() === date.toDateString(),
        sessions: daySessions
      })
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length // 6 weeks × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day)
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        sessions: []
      })
    }
    
    const monthNames = language === 'ar' 
      ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    
    return {
      calendarDays: days,
      monthName: monthNames[month],
      year
    }
  }, [currentDate, sessions, selectedDate, language])

  const weekDays = language === 'ar' 
    ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
      case 'rescheduled': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const selectedDateSessions = selectedDate 
    ? sessions.filter(session => session.session_date === selectedDate.toISOString().split('T')[0])
    : []

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'تقويم الجلسات' : 'Sessions Calendar'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'عرض وإدارة جلسات الدورات' : 'View and manage course sessions'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/sessions'}>
            <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'عرض القائمة' : 'List View'}
          </Button>
          <Button onClick={() => window.location.href = '/sessions/add'}>
            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'إضافة جلسة' : 'Add Session'}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في الجلسات...' : 'Search sessions...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'} ${language === 'ar' ? 'font-arabic' : ''}`}
          />
        </div>
        <Button variant="outline">
          <Filter className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {language === 'ar' ? 'تصفية' : 'Filter'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={`text-xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
                {language === 'ar' ? `${monthName} ${year}` : `${monthName} ${year}`}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  {language === 'ar' ? 'اليوم' : 'Today'}
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
                  {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
                  {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div key={day} className={`p-2 text-center text-sm font-medium text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`
                    min-h-[100px] p-1 border border-gray-100 cursor-pointer transition-colors hover:bg-gray-50
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                    ${day.isSelected ? 'bg-blue-50 border-blue-200' : ''}
                  `}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className={`text-sm ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'} ${language === 'ar' ? 'font-arabic text-right' : 'text-left'}`}>
                    {day.date.getDate()}
                  </div>
                  
                  {/* Sessions for this day */}
                  <div className="space-y-1 mt-1">
                    {day.sessions.slice(0, 3).map((session) => (
                      <div
                        key={session.id}
                        className={`text-xs p-1 rounded border ${getStatusColor(session.status)} truncate ${language === 'ar' ? 'font-arabic text-right' : 'text-left'}`}
                        title={`${session.session_time} - ${language === 'ar' ? session.course?.name_ar : session.course?.name_en || session.course?.name_ar}`}
                      >
                        {session.session_time.split('-')[0]}
                        {session.course && (
                          <span className="ml-1">
                            {language === 'ar' ? session.course.name_ar : (session.course.name_en || session.course.name_ar)}
                          </span>
                        )}
                      </div>
                    ))}
                    
                    {day.sessions.length > 3 && (
                      <div className="text-xs text-gray-500 p-1">
                        +{day.sessions.length - 3} {language === 'ar' ? 'المزيد' : 'more'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar - Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle className={`text-lg font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {selectedDate ? (
                language === 'ar' ? 
                  `جلسات ${selectedDate.toLocaleDateString('ar-SA')}` :
                  `Sessions on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              ) : (
                language === 'ar' ? 'اختر تاريخاً' : 'Select a Date'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDateSessions.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateSessions.map((session) => (
                    <div key={session.id} className="p-3 border rounded-lg">
                      <div className={`flex items-center justify-between mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
                          {session.session_time}
                        </div>
                        <Badge variant="outline" className={getStatusColor(session.status)}>
                          {language === 'ar' ? 
                            (session.status === 'scheduled' ? 'مجدولة' : 
                             session.status === 'completed' ? 'مكتملة' :
                             session.status === 'cancelled' ? 'ملغاة' : 'مُعاد جدولتها') :
                            session.status
                          }
                        </Badge>
                      </div>
                      
                      <div className={`text-sm text-gray-600 mb-1 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                        {session.course?.course_code} - {language === 'ar' ? session.course?.name_ar : (session.course?.name_en || session.course?.name_ar)}
                      </div>
                      
                      {session.topic_ar || session.topic_en ? (
                        <div className={`text-sm text-gray-500 ${language === 'ar' ? 'font-arabic text-right' : ''}`}>
                          {language === 'ar' ? session.topic_ar : (session.topic_en || session.topic_ar)}
                        </div>
                      ) : null}
                      
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          {language === 'ar' ? 'عرض' : 'View'}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          {language === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    className="w-full mt-4"
                    onClick={() => {
                      const dateStr = selectedDate.toISOString().split('T')[0]
                      window.location.href = `/sessions/add?date=${dateStr}`
                    }}
                  >
                    <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {language === 'ar' ? 'إضافة جلسة' : 'Add Session'}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className={`text-muted-foreground mb-4 ${language === 'ar' ? 'font-arabic' : ''}`}>
                    {language === 'ar' ? 'لا توجد جلسات في هذا التاريخ' : 'No sessions on this date'}
                  </p>
                  <Button 
                    onClick={() => {
                      const dateStr = selectedDate.toISOString().split('T')[0]
                      window.location.href = `/sessions/add?date=${dateStr}`
                    }}
                  >
                    <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    {language === 'ar' ? 'إضافة جلسة' : 'Add Session'}
                  </Button>
                </div>
              )
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
                  {language === 'ar' ? 'انقر على تاريخ لعرض الجلسات' : 'Click on a date to view sessions'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}