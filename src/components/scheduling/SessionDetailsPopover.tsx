import React, { useState } from 'react'
import { format } from 'date-fns'
import { ar, enUS } from 'date-fns/locale'
import { 
  Clock, User, MapPin, Phone, Mail, Calendar,
  CheckCircle, XCircle, AlertCircle, Edit3, Save, X,
  FileText, Target, Users, Settings
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import type { ScheduledSession } from '@/types/scheduling'

/**
 * Session Details Popover Component
 * 
 * Displays comprehensive session information in a modal dialog
 * with editing capabilities and bilingual support.
 */

interface SessionDetailsPopoverProps {
  session: ScheduledSession
  onClose: () => void
  onUpdate?: (sessionId: string, updates: Partial<ScheduledSession>) => void
  readOnly?: boolean
  isOpen: boolean
}

export function SessionDetailsPopover({
  session,
  onClose,
  onUpdate,
  readOnly = false,
  isOpen
}: SessionDetailsPopoverProps) {
  const { language, isRTL } = useLanguage()
  const locale = language === 'ar' ? ar : enUS

  const [isEditing, setIsEditing] = useState(false)
  const [editedSession, setEditedSession] = useState<Partial<ScheduledSession>>(session)
  const [isSaving, setIsSaving] = useState(false)

  const statusConfig = {
    scheduled: {
      color: 'bg-blue-100 border-blue-300 text-blue-800',
      icon: Clock,
      label_ar: 'مجدولة',
      label_en: 'Scheduled'
    },
    confirmed: {
      color: 'bg-green-100 border-green-300 text-green-800',
      icon: CheckCircle,
      label_ar: 'مؤكدة',
      label_en: 'Confirmed'
    },
    completed: {
      color: 'bg-gray-100 border-gray-300 text-gray-800',
      icon: CheckCircle,
      label_ar: 'مكتملة',
      label_en: 'Completed'
    },
    cancelled: {
      color: 'bg-red-100 border-red-300 text-red-800',
      icon: XCircle,
      label_ar: 'ملغية',
      label_en: 'Cancelled'
    },
    rescheduled: {
      color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      icon: AlertCircle,
      label_ar: 'معاد جدولتها',
      label_en: 'Rescheduled'
    }
  }

  const config = statusConfig[session.session_status]
  const StatusIcon = config.icon

  const handleSave = async () => {
    if (!onUpdate) return

    setIsSaving(true)
    try {
      await onUpdate(session.id, editedSession)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update session:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedSession(session)
    setIsEditing(false)
  }

  const updateEditedField = (field: string, value: any) => {
    setEditedSession(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-2xl max-h-[90vh] overflow-y-auto ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {language === 'ar' ? 'تفاصيل الجلسة' : 'Session Details'}
              </div>
              
              <Badge className={config.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {language === 'ar' ? config.label_ar : config.label_en}
              </Badge>
            </div>

            {!readOnly && !isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                {language === 'ar' ? 'تحرير' : 'Edit'}
              </Button>
            )}
          </DialogTitle>
          
          <DialogDescription>
            {format(new Date(session.session_date), 'EEEE, MMMM d, yyyy', { locale })} • {session.start_time} - {session.end_time}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              {language === 'ar' ? 'التفاصيل' : 'Details'}
            </TabsTrigger>
            <TabsTrigger value="participants">
              {language === 'ar' ? 'المشاركين' : 'Participants'}
            </TabsTrigger>
            <TabsTrigger value="notes">
              {language === 'ar' ? 'الملاحظات' : 'Notes'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Session Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    {language === 'ar' ? 'معلومات الجلسة' : 'Session Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'نوع الجلسة' : 'Session Type'}
                    </Label>
                    {isEditing ? (
                      <Select
                        value={editedSession.session_type || ''}
                        onValueChange={(value) => updateEditedField('session_type', value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">
                            {language === 'ar' ? 'فردية' : 'Individual'}
                          </SelectItem>
                          <SelectItem value="group">
                            {language === 'ar' ? 'جماعية' : 'Group'}
                          </SelectItem>
                          <SelectItem value="assessment">
                            {language === 'ar' ? 'تقييم' : 'Assessment'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="mt-1 text-sm">{session.session_type}</div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'الفئة' : 'Category'}
                    </Label>
                    {isEditing ? (
                      <Input
                        value={editedSession.session_category || ''}
                        onChange={(e) => updateEditedField('session_category', e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 text-sm">{session.session_category}</div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'المدة' : 'Duration'}
                    </Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editedSession.duration_minutes || ''}
                        onChange={(e) => updateEditedField('duration_minutes', parseInt(e.target.value))}
                        className="mt-1"
                        placeholder={language === 'ar' ? 'بالدقائق' : 'Minutes'}
                      />
                    ) : (
                      <div className="mt-1 text-sm">
                        {session.duration_minutes} {language === 'ar' ? 'دقيقة' : 'minutes'}
                      </div>
                    )}
                  </div>

                  {session.service_fee && (
                    <div>
                      <Label className="text-sm font-medium">
                        {language === 'ar' ? 'رسوم الخدمة' : 'Service Fee'}
                      </Label>
                      <div className="mt-1 text-sm">
                        {session.service_fee} {language === 'ar' ? 'ريال' : 'SAR'}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Location & Resources */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {language === 'ar' ? 'الموقع والموارد' : 'Location & Resources'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'الغرفة' : 'Room'}
                    </Label>
                    <div className="mt-1 text-sm">
                      {session.room?.name_ar || session.room?.name_en}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">
                      {language === 'ar' ? 'العنوان' : 'Address'}
                    </Label>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {session.room?.location || 'N/A'}
                    </div>
                  </div>

                  {session.required_equipment && session.required_equipment.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">
                        {language === 'ar' ? 'الأدوات المطلوبة' : 'Required Equipment'}
                      </Label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {session.required_equipment.map((equipment, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {equipment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Goals & Objectives */}
            {session.session_goals && session.session_goals.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {language === 'ar' ? 'الأهداف' : 'Goals & Objectives'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {session.session_goals.map((goal, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-sm">{goal}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Student Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {language === 'ar' ? 'الطالب' : 'Student'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={session.student?.avatar_url} />
                      <AvatarFallback>
                        {(session.student?.name_ar || session.student?.name_en || '').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {session.student?.name_ar || session.student?.name_en}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'العمر:' : 'Age:'} {session.student?.age}
                      </div>
                    </div>
                  </div>

                  {session.student?.condition && (
                    <div>
                      <Label className="text-sm font-medium">
                        {language === 'ar' ? 'الحالة' : 'Condition'}
                      </Label>
                      <div className="mt-1 text-sm">{session.student.condition}</div>
                    </div>
                  )}

                  {session.student?.medical_notes && (
                    <div>
                      <Label className="text-sm font-medium">
                        {language === 'ar' ? 'ملاحظات طبية' : 'Medical Notes'}
                      </Label>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {session.student.medical_notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Therapist Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {language === 'ar' ? 'المعالج' : 'Therapist'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={session.therapist?.avatar_url} />
                      <AvatarFallback>
                        {(session.therapist?.name_ar || session.therapist?.name_en || '').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">
                        {session.therapist?.name_ar || session.therapist?.name_en}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.therapist?.specialization}
                      </div>
                    </div>
                  </div>

                  {session.therapist?.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{session.therapist.phone}</span>
                    </div>
                  )}

                  {session.therapist?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{session.therapist.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Parent/Guardian Contact */}
            {(session.student?.parent_phone || session.student?.parent_email) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'بيانات ولي الأمر' : 'Parent/Guardian Contact'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {session.student?.parent_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{session.student.parent_phone}</span>
                    </div>
                  )}

                  {session.student?.parent_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{session.student.parent_email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-6">
            {/* Session Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {language === 'ar' ? 'ملاحظات الجلسة' : 'Session Notes'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedSession.session_notes || ''}
                    onChange={(e) => updateEditedField('session_notes', e.target.value)}
                    placeholder={language === 'ar' ? 'أضف ملاحظات حول الجلسة...' : 'Add notes about the session...'}
                    rows={4}
                  />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {session.session_notes || (
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'لا توجد ملاحظات' : 'No notes available'}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Special Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {language === 'ar' ? 'متطلبات خاصة' : 'Special Requirements'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedSession.special_requirements || ''}
                    onChange={(e) => updateEditedField('special_requirements', e.target.value)}
                    placeholder={language === 'ar' ? 'أي متطلبات أو اعتبارات خاصة...' : 'Any special requirements or considerations...'}
                    rows={3}
                  />
                ) : (
                  <div className="text-sm">
                    {session.special_requirements || (
                      <span className="text-muted-foreground">
                        {language === 'ar' ? 'لا توجد متطلبات خاصة' : 'No special requirements'}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Progress Notes */}
            {session.progress_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {language === 'ar' ? 'ملاحظات التقدم' : 'Progress Notes'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap">
                    {session.progress_notes}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              {language === 'ar' ? 'آخر تحديث:' : 'Last updated:'} {format(new Date(session.updated_at || session.created_at), 'PPp', { locale })}
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    <X className="w-4 h-4 mr-2" />
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? (language === 'ar' ? 'يحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ' : 'Save')}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={onClose}>
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}