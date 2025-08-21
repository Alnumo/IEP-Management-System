import { useState } from 'react'
import { Plus, Search, Filter, Calendar, Clock, Users, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { Badge } from '@/components/ui/badge'
import { useSessions, useSessionStats } from '@/hooks/useSessions'
import type { SessionFilters } from '@/types/session'

export const SessionsPage = () => {
  const { language, isRTL } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  
  // Prepare filters for sessions query
  const filters: SessionFilters = {}
  if (searchTerm.trim()) {
    filters.search = searchTerm.trim()
  }

  // Fetch real data
  const { data: sessions = [], isLoading: sessionsLoading, error: sessionsError } = useSessions(filters)
  const { data: stats, isLoading: statsLoading } = useSessionStats()

  // Debug logging
  console.log('🔍 SessionsPage: sessionsLoading:', sessionsLoading)
  console.log('🔍 SessionsPage: sessionsError:', sessionsError)
  console.log('🔍 SessionsPage: sessions:', sessions)
  console.log('🔍 SessionsPage: statsLoading:', statsLoading)
  console.log('🔍 SessionsPage: stats:', stats)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'default'
      case 'completed': return 'secondary' 
      case 'cancelled': return 'destructive'
      case 'rescheduled': return 'outline'
      default: return 'secondary'
    }
  }

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      scheduled: language === 'ar' ? 'مجدولة' : 'Scheduled',
      completed: language === 'ar' ? 'مكتملة' : 'Completed',
      cancelled: language === 'ar' ? 'ملغاة' : 'Cancelled',
      rescheduled: language === 'ar' ? 'مُعاد جدولتها' : 'Rescheduled'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')
  }

  const formatTime = (timeString: string) => {
    return timeString // Already in HH:MM-HH:MM format
  }

  return (
    <div className="space-y-4 sm:space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'الجلسات' : 'Sessions'}
          </h1>
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة جلسات الدورات' : 'Manage course sessions'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/sessions/calendar'}>
            <Calendar className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {language === 'ar' ? 'عرض التقويم' : 'Calendar View'}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي الجلسات' : 'Total Sessions'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? '...' : stats?.total_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'جلسة متاحة' : 'available sessions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الجلسات المجدولة' : 'Scheduled Sessions'}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? '...' : stats?.scheduled_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'جلسة مجدولة' : 'scheduled sessions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الجلسات المكتملة' : 'Completed Sessions'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? '...' : stats?.completed_sessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'جلسة مكتملة' : 'completed sessions'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'معدل الحضور' : 'Attendance Rate'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statsLoading ? '...' : `${stats?.attendance_rate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {language === 'ar' ? 'معدل الحضور' : 'attendance rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'ar' ? 'قائمة الجلسات' : 'Sessions List'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessionsError ? (
            <div className="text-center py-8">
              <p className="text-destructive text-sm">
                {language === 'ar' ? 'خطأ في تحميل الجلسات' : 'Error loading sessions'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {sessionsError.message}
              </p>
            </div>
          ) : sessionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'لا توجد جلسات متاحة' : 'No sessions available'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ar' ? 'ابدأ بإنشاء جلسة جديدة' : 'Start by creating a new session'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                        {language === 'ar' ? 'الجلسة' : 'Session'} #{session.session_number}
                        {session.topic_ar && (
                          <span className="text-sm text-muted-foreground ml-2">
                            - {language === 'ar' ? session.topic_ar : (session.topic_en || session.topic_ar)}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {session.course?.course_code} • {language === 'ar' ? session.course?.name_ar : (session.course?.name_en || session.course?.name_ar)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(session.session_date)}</span>
                        <span>•</span>
                        <span>{formatTime(session.session_time)}</span>
                        <span>•</span>
                        <span>{session.duration_minutes} {language === 'ar' ? 'دقيقة' : 'minutes'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={getStatusBadgeVariant(session.status)}>
                      {getStatusLabel(session.status)}
                    </Badge>
                    <Button variant="outline" size="sm">
                      {language === 'ar' ? 'عرض' : 'View'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}