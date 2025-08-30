import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, addDays, isAfter, isBefore } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, FileText, AlertTriangle, CheckCircle, XCircle, Plus, Trash2, Send } from 'lucide-react'
import { useIEPs } from '@/hooks/useIEPs'
import { useIEPCompliance } from '@/hooks/useIEPCompliance'
import { toast } from 'sonner'

// Schema for meeting management
const attendeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  role: z.enum(['parent', 'guardian', 'general_education_teacher', 'special_education_teacher', 'school_psychologist', 'administrator', 'related_services', 'student', 'advocate', 'other']),
  required: z.boolean().default(true),
  attendance_confirmed: z.boolean().default(false),
  attendance_status: z.enum(['confirmed', 'tentative', 'declined', 'no_response']).default('no_response'),
  notes: z.string().optional()
})

const agendaItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  duration_minutes: z.number().min(5).max(180),
  presenter: z.string().optional(),
  documents_needed: z.array(z.string()).optional(),
  completed: z.boolean().default(false),
  notes: z.string().optional()
})

const meetingSchema = z.object({
  id: z.string().optional(),
  iep_id: z.string().min(1, 'IEP selection is required'),
  meeting_type: z.enum(['annual_review', 'triennial_evaluation', 'initial_eligibility', 'reevaluation', 'transition_planning', 'emergency', 'progress_review', 'other']),
  scheduled_date: z.string().min(1, 'Date is required'),
  scheduled_time: z.string().min(1, 'Time is required'),
  duration_minutes: z.number().min(30).max(480).default(60),
  location: z.string().min(1, 'Location is required'),
  virtual_meeting_link: z.string().url('Valid URL required').optional().or(z.literal('')),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled']).default('scheduled'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  attendees: z.array(attendeeSchema).min(1, 'At least one attendee required'),
  agenda_items: z.array(agendaItemSchema).min(1, 'At least one agenda item required'),
  notice_sent_date: z.string().optional(),
  meeting_minutes: z.string().optional(),
  follow_up_actions: z.array(z.object({
    action: z.string().min(1),
    assigned_to: z.string().optional(),
    due_date: z.string().optional(),
    completed: z.boolean().default(false)
  })).optional(),
  documents_reviewed: z.array(z.string()).optional(),
  decisions_made: z.array(z.string()).optional(),
  parent_consent_received: z.boolean().optional(),
  interpreter_needed: z.boolean().default(false),
  interpreter_language: z.string().optional(),
  accommodations_needed: z.string().optional()
})

type MeetingFormData = z.infer<typeof meetingSchema>
type AttendeeData = z.infer<typeof attendeeSchema>

interface IEPMeetingManagerProps {
  iepId?: string
  studentId?: string
  onMeetingScheduled?: (meetingData: MeetingFormData) => void
}

const MEETING_TYPES = {
  annual_review: { label: 'Annual Review', labelAr: 'المراجعة السنوية', color: 'blue' },
  triennial_evaluation: { label: 'Triennial Evaluation', labelAr: 'التقييم الثلاثي', color: 'purple' },
  initial_eligibility: { label: 'Initial Eligibility', labelAr: 'الأهلية الأولية', color: 'green' },
  reevaluation: { label: 'Reevaluation', labelAr: 'إعادة التقييم', color: 'orange' },
  transition_planning: { label: 'Transition Planning', labelAr: 'تخطيط الانتقال', color: 'teal' },
  emergency: { label: 'Emergency Meeting', labelAr: 'اجتماع طارئ', color: 'red' },
  progress_review: { label: 'Progress Review', labelAr: 'مراجعة التقدم', color: 'indigo' },
  other: { label: 'Other', labelAr: 'أخرى', color: 'gray' }
}

const ATTENDEE_ROLES = {
  parent: { label: 'Parent', labelAr: 'الوالد/الوالدة' },
  guardian: { label: 'Legal Guardian', labelAr: 'الوصي القانوني' },
  general_education_teacher: { label: 'General Education Teacher', labelAr: 'معلم التعليم العام' },
  special_education_teacher: { label: 'Special Education Teacher', labelAr: 'معلم التربية الخاصة' },
  school_psychologist: { label: 'School Psychologist', labelAr: 'الأخصائي النفسي المدرسي' },
  administrator: { label: 'School Administrator', labelAr: 'مدير المدرسة' },
  related_services: { label: 'Related Services Provider', labelAr: 'مقدم الخدمات ذات الصلة' },
  student: { label: 'Student', labelAr: 'الطالب' },
  advocate: { label: 'Student Advocate', labelAr: 'مدافع عن الطالب' },
  other: { label: 'Other', labelAr: 'أخرى' }
}

export const IEPMeetingManager: React.FC<IEPMeetingManagerProps> = ({
  iepId,
  studentId,
  onMeetingScheduled
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTab, setCurrentTab] = useState('details')
  const [isArabic, setIsArabic] = useState(false)
  
  const { data: ieps, getIEP } = useIEPs({ studentId })
  const { createComplianceAlert } = useIEPCompliance()

  const form = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      iep_id: iepId || '',
      meeting_type: 'annual_review',
      scheduled_date: '',
      scheduled_time: '',
      duration_minutes: 60,
      location: '',
      virtual_meeting_link: '',
      status: 'scheduled',
      purpose: '',
      attendees: [
        {
          name: '',
          email: '',
          role: 'parent',
          required: true,
          attendance_confirmed: false,
          attendance_status: 'no_response'
        }
      ],
      agenda_items: [
        {
          title: '',
          description: '',
          duration_minutes: 15,
          completed: false
        }
      ],
      interpreter_needed: false,
      parent_consent_received: false
    }
  })

  const { fields: attendeeFields, append: appendAttendee, remove: removeAttendee } = useFieldArray({
    control: form.control,
    name: 'attendees'
  })

  const { fields: agendaFields, append: appendAgendaItem, remove: removeAgendaItem } = useFieldArray({
    control: form.control,
    name: 'agenda_items'
  })

  // Auto-populate form when IEP is selected
  useEffect(() => {
    if (iepId && getIEP) {
      const iepData = getIEP(iepId)
      if (iepData?.student) {
        // Auto-add student info to attendees if student is 14+
        const studentAge = iepData.student.date_of_birth ? 
          new Date().getFullYear() - new Date(iepData.student.date_of_birth).getFullYear() : 0

        if (studentAge >= 14) {
          const currentAttendees = form.getValues('attendees')
          const hasStudent = currentAttendees.some(attendee => attendee.role === 'student')
          
          if (!hasStudent) {
            appendAttendee({
              name: `${iepData.student.first_name} ${iepData.student.last_name}`,
              email: '',
              role: 'student',
              required: true,
              attendance_confirmed: false,
              attendance_status: 'no_response'
            })
          }
        }
      }
    }
  }, [iepId, getIEP, appendAttendee, form])

  const validateMeetingDate = (date: string, time: string) => {
    const meetingDateTime = new Date(`${date}T${time}`)
    const now = new Date()
    const tenDaysFromNow = addDays(now, 10)

    // Check if meeting is at least 10 days in advance (compliance requirement)
    if (isBefore(meetingDateTime, tenDaysFromNow)) {
      return {
        isValid: false,
        message: 'IEP meetings must be scheduled at least 10 days in advance for proper notice'
      }
    }

    return { isValid: true, message: '' }
  }

  const sendMeetingNotices = async (meetingData: MeetingFormData) => {
    const meetingDateTime = new Date(`${meetingData.scheduled_date}T${meetingData.scheduled_time}`)
    const noticeDeadline = addDays(meetingDateTime, -10)
    const now = new Date()

    if (isAfter(now, noticeDeadline)) {
      // Create compliance alert for late notice
      createComplianceAlert({
        iep_id: meetingData.iep_id,
        alert_type: 'late_meeting_notice',
        severity: 'high',
        message: `Meeting notice sent less than 10 days in advance. Notice deadline was ${format(noticeDeadline, 'PPP')}`,
        due_date: meetingDateTime.toISOString()
      })
    }

    // Send notices to all attendees with email addresses
    const attendeesWithEmail = meetingData.attendees.filter(attendee => attendee.email)
    
    if (attendeesWithEmail.length > 0) {
      // TODO: Implement actual email sending logic
      toast.success(`Meeting notices sent to ${attendeesWithEmail.length} attendees`)
      return new Date().toISOString()
    }

    return undefined
  }

  const onSubmit = async (data: MeetingFormData) => {
    try {
      // Validate meeting date
      const dateValidation = validateMeetingDate(data.scheduled_date, data.scheduled_time)
      if (!dateValidation.isValid) {
        toast.error(dateValidation.message)
        return
      }

      // Send meeting notices
      const noticeDate = await sendMeetingNotices(data)
      
      const meetingData = {
        ...data,
        notice_sent_date: noticeDate,
        id: `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // TODO: Implement actual database save
      console.log('Meeting scheduled:', meetingData)
      
      if (onMeetingScheduled) {
        onMeetingScheduled(meetingData)
      }

      toast.success('IEP meeting scheduled successfully!')
      setIsOpen(false)
      form.reset()

    } catch (error) {
      console.error('Error scheduling meeting:', error)
      toast.error('Failed to schedule meeting. Please try again.')
    }
  }

  const addRequiredAttendees = () => {
    const currentAttendees = form.getValues('attendees')
    const requiredRoles = ['parent', 'general_education_teacher', 'special_education_teacher', 'administrator']
    
    requiredRoles.forEach(role => {
      const hasRole = currentAttendees.some(attendee => attendee.role === role)
      if (!hasRole) {
        appendAttendee({
          name: '',
          email: '',
          role: role as AttendeeData['role'],
          required: true,
          attendance_confirmed: false,
          attendance_status: 'no_response'
        })
      }
    })

    toast.info('Required attendee roles added to the meeting')
  }

  const generateStandardAgenda = (meetingType: string) => {
    const standardAgendas = {
      annual_review: [
        { title: 'Review Current IEP', description: 'Review progress on current goals and services', duration_minutes: 20 },
        { title: 'Present Evaluation Data', description: 'Present current performance and assessment data', duration_minutes: 15 },
        { title: 'Discuss Goals', description: 'Review and update IEP goals', duration_minutes: 20 },
        { title: 'Determine Services', description: 'Determine appropriate special education services', duration_minutes: 15 },
        { title: 'Placement Decision', description: 'Determine least restrictive environment', duration_minutes: 10 }
      ],
      triennial_evaluation: [
        { title: 'Review Evaluation Results', description: 'Present comprehensive evaluation findings', duration_minutes: 30 },
        { title: 'Eligibility Determination', description: 'Determine continued eligibility for special education', duration_minutes: 15 },
        { title: 'Educational Needs Discussion', description: 'Identify current educational needs', duration_minutes: 20 },
        { title: 'Service Recommendations', description: 'Recommend appropriate services and supports', duration_minutes: 15 }
      ]
    }

    const agenda = standardAgendas[meetingType as keyof typeof standardAgendas] || []
    
    // Clear current agenda items and add standard ones
    form.setValue('agenda_items', agenda.map((item, index) => ({
      id: `agenda-${index}`,
      ...item,
      completed: false
    })))

    toast.success(`Standard agenda for ${MEETING_TYPES[meetingType as keyof typeof MEETING_TYPES].label} loaded`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Calendar className="w-4 h-4 mr-2" />
          Schedule IEP Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            IEP Meeting Management
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsArabic(!isArabic)}
              className="ml-auto"
            >
              {isArabic ? 'EN' : 'عر'}
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Meeting Details</TabsTrigger>
                <TabsTrigger value="attendees">Attendees</TabsTrigger>
                <TabsTrigger value="agenda">Agenda</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="iep_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IEP Selection</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select IEP..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ieps?.map((iep) => (
                              <SelectItem key={iep.id} value={iep.id}>
                                {iep.student?.first_name} {iep.student?.last_name} - {iep.program_type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meeting_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select meeting type..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(MEETING_TYPES).map(([value, config]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-${config.color}-600`}>
                                    {config.label}
                                  </Badge>
                                  {isArabic && <span className="text-sm text-gray-500">{config.labelAr}</span>}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="scheduled_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} min={format(addDays(new Date(), 10), 'yyyy-MM-dd')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduled_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            min="30"
                            max="480"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Conference room, virtual, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="virtual_meeting_link"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Virtual Meeting Link (if applicable)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://zoom.us/j/..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="purpose"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Purpose</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the purpose and objectives of this meeting..."
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="attendees" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Meeting Attendees</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addRequiredAttendees}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Add Required Roles
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendAttendee({
                        name: '',
                        email: '',
                        role: 'other',
                        required: false,
                        attendance_confirmed: false,
                        attendance_status: 'no_response'
                      })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Attendee
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {attendeeFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Attendee #{index + 1}</CardTitle>
                          {attendeeFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttendee(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`attendees.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Attendee name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`attendees.${index}.email`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email (optional)</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="attendee@email.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`attendees.${index}.role`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select role..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {Object.entries(ATTENDEE_ROLES).map(([value, config]) => (
                                      <SelectItem key={value} value={value}>
                                        {config.label}
                                        {isArabic && <span className="text-sm text-gray-500 mr-2">{config.labelAr}</span>}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`attendees.${index}.attendance_status`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Attendance Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="confirmed">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        Confirmed
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="tentative">
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-yellow-600" />
                                        Tentative
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="declined">
                                      <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        Declined
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="no_response">
                                      <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-gray-600" />
                                        No Response
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="agenda" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Meeting Agenda</h3>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const meetingType = form.getValues('meeting_type')
                        if (meetingType) {
                          generateStandardAgenda(meetingType)
                        }
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Load Standard Agenda
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => appendAgendaItem({
                        title: '',
                        description: '',
                        duration_minutes: 15,
                        completed: false
                      })}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {agendaFields.map((field, index) => (
                    <Card key={field.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Agenda Item #{index + 1}</CardTitle>
                          {agendaFields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAgendaItem(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`agenda_items.${index}.title`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Agenda item title" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name={`agenda_items.${index}.duration_minutes`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duration (min)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    min="5"
                                    max="180"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name={`agenda_items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Detailed description of this agenda item..."
                                  className="min-h-[60px]"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Meeting Notice Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-600">
                        • Meeting notices must be sent at least 10 calendar days before the meeting
                      </p>
                      <p className="text-sm text-gray-600">
                        • Notice must include purpose, time, location, and attendees
                      </p>
                      <p className="text-sm text-gray-600">
                        • Parents must be given sufficient time to arrange their participation
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Required Attendees
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm text-gray-600">
                        • Parent or legal guardian
                      </p>
                      <p className="text-sm text-gray-600">
                        • General education teacher (if applicable)
                      </p>
                      <p className="text-sm text-gray-600">
                        • Special education teacher or provider
                      </p>
                      <p className="text-sm text-gray-600">
                        • School administrator or designee
                      </p>
                      <p className="text-sm text-gray-600">
                        • Student (if 14+ years old or appropriate)
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="interpreter_needed"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Interpreter Needed</FormLabel>
                          <p className="text-sm text-gray-500">
                            Check if language interpretation services are required
                          </p>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="parent_consent_received"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Parent Consent</FormLabel>
                          <p className="text-sm text-gray-500">
                            Check when parental consent has been received
                          </p>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value || false}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('interpreter_needed') && (
                  <FormField
                    control={form.control}
                    name="interpreter_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interpreter Language</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Spanish, Arabic, ASL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="accommodations_needed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Accommodations</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special accommodations needed for the meeting (accessibility, technology, etc.)"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const formData = form.getValues()
                    await sendMeetingNotices(formData)
                  }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Notices Only
                </Button>
                <Button type="submit">
                  Schedule Meeting
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default IEPMeetingManager