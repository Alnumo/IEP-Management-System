/**
 * TherapistAvailabilityManager Component
 * Story 3.1: Automated Scheduling Engine
 * 
 * Comprehensive therapist availability management interface
 * Supports Arabic RTL/English LTR with calendar views and time slot management
 */

import React, { useState, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Calendar, Clock, Plus, Edit, Trash2, Copy, AlertCircle, CheckCircle, Save, X } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet'
import { Alert, AlertDescription } from '../ui/alert'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Textarea } from '../ui/textarea'
import { toast } from 'sonner'

import { 
  useTherapistAvailability,
  useAvailabilityTemplates,
  useAvailabilityExceptions,
  useAvailabilityConflicts,
  useAvailabilitySummary
} from '../../hooks/useTherapistAvailability'
import { useLanguage } from '../../contexts/LanguageContext'
import type { TherapistAvailability, AvailabilityTemplate, ConflictSeverity } from '../../types/scheduling'

// =====================================================
// Main Component
// =====================================================

interface TherapistAvailabilityManagerProps {
  therapistId: string
  therapistName: string
  therapistNameAr?: string
  className?: string
}

export default function TherapistAvailabilityManager({
  therapistId,
  therapistName,
  therapistNameAr,
  className = ''
}: TherapistAvailabilityManagerProps) {
  const { language, isRTL } = useLanguage()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedSlot, setSelectedSlot] = useState<TherapistAvailability | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false)
  const [view, setView] = useState<'week' | 'month'>('week')

  // Calculate date range based on current view
  const { startDate, endDate, dateRange } = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 }) // Sunday
      const end = endOfWeek(currentDate, { weekStartsOn: 0 })
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        dateRange: eachDayOfInterval({ start, end })
      }
    } else {
      // Month view logic would go here
      const start = startOfWeek(currentDate, { weekStartsOn: 0 })
      const end = endOfWeek(currentDate, { weekStartsOn: 0 })
      return {
        startDate: format(start, 'yyyy-MM-dd'),
        endDate: format(end, 'yyyy-MM-dd'),
        dateRange: eachDayOfInterval({ start, end })
      }
    }
  }, [currentDate, view])

  // Fetch availability data
  const { 
    availability, 
    isLoading, 
    createOrUpdate, 
    delete: deleteAvailability,
    isSaving,
    isDeleting 
  } = useTherapistAvailability(therapistId, startDate, endDate)

  const { templates, createTemplate, applyTemplate } = useAvailabilityTemplates(therapistId)
  const { exceptions } = useAvailabilityExceptions(therapistId, startDate, endDate)
  const { summary } = useAvailabilitySummary(therapistId, startDate, endDate)

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1))
  }

  // Handle slot creation/editing
  const handleSaveSlot = async (slotData: Partial<TherapistAvailability>) => {
    try {
      await createOrUpdate({
        ...slotData,
        therapist_id: therapistId
      })
      setIsEditDialogOpen(false)
      setSelectedSlot(null)
    } catch (error) {
      console.error('Failed to save availability slot:', error)
    }
  }

  // Handle slot deletion
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm(language === 'ar' ? 'هل تريد حذف هذه الفترة؟' : 'Delete this availability slot?')) {
      return
    }
    
    try {
      await deleteAvailability(slotId)
    } catch (error) {
      console.error('Failed to delete availability slot:', error)
    }
  }

  // Group availability by day for display
  const availabilityByDay = useMemo(() => {
    const grouped: Record<string, TherapistAvailability[]> = {}
    
    dateRange.forEach(date => {
      const dayKey = format(date, 'yyyy-MM-dd')
      const dayOfWeek = date.getDay()
      
      // Get recurring slots for this day of week
      const recurringSlots = availability.filter(slot => 
        slot.is_recurring && slot.day_of_week === dayOfWeek && !slot.specific_date
      )
      
      // Get date-specific slots
      const specificSlots = availability.filter(slot => 
        slot.specific_date === dayKey
      )
      
      grouped[dayKey] = [...recurringSlots, ...specificSlots]
    })
    
    return grouped
  }, [availability, dateRange])

  const displayName = language === 'ar' && therapistNameAr ? therapistNameAr : therapistName

  return (
    <div className={`space-y-6 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'إدارة توفر المعالج' : 'Therapist Availability'}
          </h2>
          <p className="text-muted-foreground">
            {displayName}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <Select value={view} onValueChange={(value) => setView(value as 'week' | 'month')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">
                {language === 'ar' ? 'أسبوعي' : 'Weekly'}
              </SelectItem>
              <SelectItem value="month">
                {language === 'ar' ? 'شهري' : 'Monthly'}
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Templates Sheet */}
          <Sheet open={isTemplateSheetOpen} onOpenChange={setIsTemplateSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'القوالب' : 'Templates'}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <AvailabilityTemplatesPanel
                therapistId={therapistId}
                templates={templates}
                onCreateTemplate={createTemplate}
                onApplyTemplate={applyTemplate}
                onClose={() => setIsTemplateSheetOpen(false)}
              />
            </SheetContent>
          </Sheet>

          {/* Add Availability */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedSlot(null)}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'إضافة توفر' : 'Add Availability'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <AvailabilitySlotForm
                slot={selectedSlot}
                onSave={handleSaveSlot}
                onClose={() => {
                  setIsEditDialogOpen(false)
                  setSelectedSlot(null)
                }}
                isSaving={isSaving}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الفترات' : 'Total Slots'}
                </p>
                <p className="text-2xl font-bold">{summary.totalSlots}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'معدل الاستغلال' : 'Utilization'}
                </p>
                <p className="text-2xl font-bold">{summary.utilizationRate}%</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الجلسات المحجوزة' : 'Booked Sessions'}
                </p>
                <p className="text-2xl font-bold">{summary.bookedSlots}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'الطاقة المتبقية' : 'Available Capacity'}
                </p>
                <p className="text-2xl font-bold">{summary.remainingCapacity}</p>
              </div>
              <Plus className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigateWeek('prev')}>
          {language === 'ar' ? 'الأسبوع السابق' : 'Previous Week'}
        </Button>
        <h3 className="text-lg font-semibold">
          {format(dateRange[0], 'MMM dd', { locale: language === 'ar' ? ar : undefined })} - {' '}
          {format(dateRange[6], 'MMM dd, yyyy', { locale: language === 'ar' ? ar : undefined })}
        </h3>
        <Button variant="outline" onClick={() => navigateWeek('next')}>
          {language === 'ar' ? 'الأسبوع التالي' : 'Next Week'}
        </Button>
      </div>

      {/* Availability Grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Card key={index} className="h-48">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {dateRange.map((date) => {
            const dayKey = format(date, 'yyyy-MM-dd')
            const daySlots = availabilityByDay[dayKey] || []
            const isToday = isSameDay(date, new Date())
            const dayException = exceptions.find(ex => 
              ex.start_date <= dayKey && ex.end_date >= dayKey
            )

            return (
              <Card key={dayKey} className={`min-h-48 ${isToday ? 'ring-2 ring-blue-500' : ''}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {format(date, 'EEE', { locale: language === 'ar' ? ar : undefined })}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {format(date, 'MMM dd', { locale: language === 'ar' ? ar : undefined })}
                  </CardDescription>
                  {dayException && (
                    <Badge variant="destructive" className="text-xs">
                      {language === 'ar' ? 'إجازة' : 'Time Off'}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="space-y-1">
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'غير متاح' : 'No availability'}
                      </p>
                    ) : (
                      daySlots.map((slot) => (
                        <AvailabilitySlotCard
                          key={slot.id}
                          slot={slot}
                          onEdit={(slot) => {
                            setSelectedSlot(slot)
                            setIsEditDialogOpen(true)
                          }}
                          onDelete={handleDeleteSlot}
                        />
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Exceptions Alert */}
      {exceptions.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {language === 'ar' 
              ? `يوجد ${exceptions.length} استثناء في هذا الأسبوع`
              : `${exceptions.length} exception(s) this week`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// =====================================================
// Availability Slot Card Component
// =====================================================

interface AvailabilitySlotCardProps {
  slot: TherapistAvailability
  onEdit: (slot: TherapistAvailability) => void
  onDelete: (slotId: string) => void
}

function AvailabilitySlotCard({ slot, onEdit, onDelete }: AvailabilitySlotCardProps) {
  const { language } = useLanguage()
  
  const utilizationColor = slot.utilization_rate > 80 
    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    : slot.utilization_rate > 50 
    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
    : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'

  return (
    <div className={`p-2 rounded-md border text-xs ${slot.is_available ? 'border-green-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium">
          {slot.start_time} - {slot.end_time}
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onEdit(slot)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onDelete(slot.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={`text-xs ${utilizationColor}`}>
          {slot.current_bookings}/{slot.max_sessions_per_slot}
        </Badge>
        
        {slot.is_time_off && (
          <Badge variant="destructive" className="text-xs">
            {language === 'ar' ? 'إجازة' : 'Off'}
          </Badge>
        )}
      </div>
      
      {slot.notes && (
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {slot.notes}
        </p>
      )}
    </div>
  )
}

// =====================================================
// Availability Slot Form Component
// =====================================================

interface AvailabilitySlotFormProps {
  slot: TherapistAvailability | null
  onSave: (slot: Partial<TherapistAvailability>) => void
  onClose: () => void
  isSaving: boolean
}

function AvailabilitySlotForm({ slot, onSave, onClose, isSaving }: AvailabilitySlotFormProps) {
  const { language } = useLanguage()
  const [formData, setFormData] = useState({
    day_of_week: slot?.day_of_week ?? new Date().getDay(),
    start_time: slot?.start_time ?? '09:00',
    end_time: slot?.end_time ?? '17:00',
    is_available: slot?.is_available ?? true,
    is_recurring: slot?.is_recurring ?? true,
    specific_date: slot?.specific_date ?? '',
    max_sessions_per_slot: slot?.max_sessions_per_slot ?? 1,
    is_time_off: slot?.is_time_off ?? false,
    time_off_reason: slot?.time_off_reason ?? '',
    notes: slot?.notes ?? ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...slot,
      ...formData
    })
  }

  const dayOptions = [
    { value: 0, label: language === 'ar' ? 'الأحد' : 'Sunday' },
    { value: 1, label: language === 'ar' ? 'الاثنين' : 'Monday' },
    { value: 2, label: language === 'ar' ? 'الثلاثاء' : 'Tuesday' },
    { value: 3, label: language === 'ar' ? 'الأربعاء' : 'Wednesday' },
    { value: 4, label: language === 'ar' ? 'الخميس' : 'Thursday' },
    { value: 5, label: language === 'ar' ? 'الجمعة' : 'Friday' },
    { value: 6, label: language === 'ar' ? 'السبت' : 'Saturday' }
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>
          {slot 
            ? (language === 'ar' ? 'تعديل التوفر' : 'Edit Availability')
            : (language === 'ar' ? 'إضافة توفر' : 'Add Availability')
          }
        </DialogTitle>
        <DialogDescription>
          {language === 'ar' 
            ? 'قم بتحديد أوقات التوفر والسعة المطلوبة'
            : 'Set availability times and capacity requirements'
          }
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="day_of_week">
            {language === 'ar' ? 'يوم الأسبوع' : 'Day of Week'}
          </Label>
          <Select 
            value={formData.day_of_week.toString()} 
            onValueChange={(value) => setFormData({...formData, day_of_week: parseInt(value)})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dayOptions.map(day => (
                <SelectItem key={day.value} value={day.value.toString()}>
                  {day.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="specific_date">
            {language === 'ar' ? 'تاريخ محدد (اختياري)' : 'Specific Date (Optional)'}
          </Label>
          <Input
            type="date"
            value={formData.specific_date}
            onChange={(e) => setFormData({...formData, specific_date: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_time">
            {language === 'ar' ? 'وقت البداية' : 'Start Time'}
          </Label>
          <Input
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({...formData, start_time: e.target.value})}
            required
          />
        </div>

        <div>
          <Label htmlFor="end_time">
            {language === 'ar' ? 'وقت النهاية' : 'End Time'}
          </Label>
          <Input
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({...formData, end_time: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="max_sessions">
          {language === 'ar' ? 'أقصى عدد جلسات' : 'Max Sessions per Slot'}
        </Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={formData.max_sessions_per_slot}
          onChange={(e) => setFormData({...formData, max_sessions_per_slot: parseInt(e.target.value)})}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_available}
          onCheckedChange={(checked) => setFormData({...formData, is_available: checked})}
        />
        <Label>
          {language === 'ar' ? 'متاح للحجز' : 'Available for booking'}
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_recurring}
          onCheckedChange={(checked) => setFormData({...formData, is_recurring: checked})}
        />
        <Label>
          {language === 'ar' ? 'متكرر أسبوعياً' : 'Recurring weekly'}
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_time_off}
          onCheckedChange={(checked) => setFormData({...formData, is_time_off: checked})}
        />
        <Label>
          {language === 'ar' ? 'إجازة' : 'Time off'}
        </Label>
      </div>

      {formData.is_time_off && (
        <div>
          <Label htmlFor="time_off_reason">
            {language === 'ar' ? 'سبب الإجازة' : 'Time off reason'}
          </Label>
          <Input
            value={formData.time_off_reason}
            onChange={(e) => setFormData({...formData, time_off_reason: e.target.value})}
            placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
          />
        </div>
      )}

      <div>
        <Label htmlFor="notes">
          {language === 'ar' ? 'ملاحظات' : 'Notes'}
        </Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
          className="resize-none"
          rows={2}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {language === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'حفظ' : 'Save'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// =====================================================
// Availability Templates Panel Component
// =====================================================

interface AvailabilityTemplatesPanelProps {
  therapistId: string
  templates: AvailabilityTemplate[]
  onCreateTemplate: (data: { name: { en: string; ar: string }, description?: { en: string; ar: string } }) => Promise<void>
  onApplyTemplate: (data: { templateId: string, startDate: string }) => Promise<void>
  onClose: () => void
}

function AvailabilityTemplatesPanel({ 
  templates, 
  onCreateTemplate, 
  onApplyTemplate, 
  onClose 
}: AvailabilityTemplatesPanelProps) {
  const { language } = useLanguage()
  const [isCreating, setIsCreating] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: ''
  })

  const handleCreateTemplate = async () => {
    if (!newTemplate.name_en || !newTemplate.name_ar) {
      toast.error(language === 'ar' ? 'يجب إدخال اسم القالب' : 'Template name is required')
      return
    }

    try {
      await onCreateTemplate({
        name: { en: newTemplate.name_en, ar: newTemplate.name_ar },
        description: newTemplate.description_en || newTemplate.description_ar ? {
          en: newTemplate.description_en,
          ar: newTemplate.description_ar
        } : undefined
      })
      
      setNewTemplate({ name_en: '', name_ar: '', description_en: '', description_ar: '' })
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create template:', error)
    }
  }

  return (
    <SheetHeader>
      <SheetTitle>
        {language === 'ar' ? 'قوالب التوفر' : 'Availability Templates'}
      </SheetTitle>
      <SheetDescription>
        {language === 'ar' 
          ? 'قم بإنشاء وتطبيق قوالب التوفر المحفوظة'
          : 'Create and apply saved availability templates'
        }
      </SheetDescription>
      
      <div className="space-y-4 pt-4">
        {/* Create New Template */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">
              {language === 'ar' ? 'إنشاء قالب جديد' : 'Create New Template'}
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreating(!isCreating)}
            >
              <Plus className="h-4 w-4 mr-1" />
              {language === 'ar' ? 'جديد' : 'New'}
            </Button>
          </div>

          {isCreating && (
            <div className="space-y-3 p-3 border rounded-md">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder={language === 'ar' ? 'الاسم بالإنجليزية' : 'Name (English)'}
                  value={newTemplate.name_en}
                  onChange={(e) => setNewTemplate({...newTemplate, name_en: e.target.value})}
                />
                <Input
                  placeholder={language === 'ar' ? 'الاسم بالعربية' : 'Name (Arabic)'}
                  value={newTemplate.name_ar}
                  onChange={(e) => setNewTemplate({...newTemplate, name_ar: e.target.value})}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreateTemplate}>
                  {language === 'ar' ? 'إنشاء' : 'Create'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsCreating(false)}>
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Existing Templates */}
        <div className="space-y-3">
          <h4 className="font-medium">
            {language === 'ar' ? 'القوالب المحفوظة' : 'Saved Templates'}
          </h4>
          
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'لا توجد قوالب محفوظة' : 'No saved templates'}
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <Card key={template.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium">
                        {language === 'ar' ? template.name.ar : template.name.en}
                      </h5>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">
                          {language === 'ar' ? template.description.ar : template.description.en}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onApplyTemplate({
                        templateId: template.id,
                        startDate: new Date().toISOString().split('T')[0]
                      })}
                    >
                      {language === 'ar' ? 'تطبيق' : 'Apply'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SheetHeader>
  )
}