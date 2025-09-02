import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  useTherapistAssignments, 
  useStudentTherapistAssignments,
  useCreateTherapistAssignment,
  useUpdateTherapistAssignment,
  useDeleteTherapistAssignment,
  useAssignSubstitute,
  useRemoveSubstitute
} from '@/hooks/useTherapistAssignments'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import { Plus, Users, UserMinus, Calendar, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { 
  AssignmentFilters,
  CreateTherapistSpecializationAssignmentData,
  UpdateTherapistSpecializationAssignmentData
} from '@/types/therapist-assignment'
import { THERAPY_SPECIALIZATIONS } from '@/types/therapist'

interface TherapistAssignmentManagerProps {
  className?: string
  studentId?: string
}

export function TherapistAssignmentManager({ 
  className,
  studentId 
}: TherapistAssignmentManagerProps) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'
  
  const [filters, setFilters] = useState<AssignmentFilters>({
    student_id: studentId,
    status: 'active'
  })
  const [selectedAssignment, setSelectedAssignment] = useState<string>('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubstituteDialogOpen, setIsSubstituteDialogOpen] = useState(false)

  // Hooks
  const { 
    data: assignments = [], 
    isLoading: assignmentsLoading,
    error: assignmentsError 
  } = useTherapistAssignments(filters)
  
  const {
    data: studentAssignments = [],
    isLoading: studentAssignmentsLoading
  } = useStudentTherapistAssignments(studentId)

  const createAssignmentMutation = useCreateTherapistAssignment()
  const updateAssignmentMutation = useUpdateTherapistAssignment()
  const deleteAssignmentMutation = useDeleteTherapistAssignment()
  const assignSubstituteMutation = useAssignSubstitute()
  const removeSubstituteMutation = useRemoveSubstitute()

  // Form state
  const [createForm, setCreateForm] = useState<CreateTherapistSpecializationAssignmentData>({
    student_id: studentId || '',
    primary_therapist_id: '',
    specialization_ar: '',
    specialization_en: '',
    assignment_reason: ''
  })

  const [substituteForm, setSubstituteForm] = useState({
    substituteId: '',
    reason: '',
    startDate: '',
    endDate: ''
  })

  // Handle assignment creation
  const handleCreateAssignment = async () => {
    try {
      await createAssignmentMutation.mutateAsync(createForm)
      toast({
        title: isRTL ? 'تم إنشاء التكليف' : 'Assignment Created',
        description: isRTL 
          ? 'تم إنشاء تكليف المعالج بنجاح' 
          : 'Therapist assignment created successfully',
      })
      setIsCreateDialogOpen(false)
      setCreateForm({
        student_id: studentId || '',
        primary_therapist_id: '',
        specialization_ar: '',
        specialization_en: '',
        assignment_reason: ''
      })
    } catch (error) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL 
          ? 'فشل في إنشاء التكليف' 
          : 'Failed to create assignment',
        variant: 'destructive',
      })
    }
  }

  // Handle substitute assignment
  const handleAssignSubstitute = async () => {
    if (!selectedAssignment) return
    
    try {
      await assignSubstituteMutation.mutateAsync({
        assignmentId: selectedAssignment,
        substituteId: substituteForm.substituteId,
        reason: substituteForm.reason,
        startDate: substituteForm.startDate,
        endDate: substituteForm.endDate
      })
      toast({
        title: isRTL ? 'تم تعيين البديل' : 'Substitute Assigned',
        description: isRTL 
          ? 'تم تعيين المعالج البديل بنجاح' 
          : 'Substitute therapist assigned successfully',
      })
      setIsSubstituteDialogOpen(false)
      setSubstituteForm({ substituteId: '', reason: '', startDate: '', endDate: '' })
    } catch (error) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL 
          ? 'فشل في تعيين المعالج البديل' 
          : 'Failed to assign substitute therapist',
        variant: 'destructive',
      })
    }
  }

  // Handle substitute removal
  const handleRemoveSubstitute = async (assignmentId: string) => {
    try {
      await removeSubstituteMutation.mutateAsync(assignmentId)
      toast({
        title: isRTL ? 'تم إزالة البديل' : 'Substitute Removed',
        description: isRTL 
          ? 'تم إزالة المعالج البديل بنجاح' 
          : 'Substitute therapist removed successfully',
      })
    } catch (error) {
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL 
          ? 'فشل في إزالة المعالج البديل' 
          : 'Failed to remove substitute therapist',
        variant: 'destructive',
      })
    }
  }

  // Get specialization display name
  const getSpecializationLabel = (key: string, isArabic: boolean) => {
    const specialization = THERAPY_SPECIALIZATIONS.find(s => s.value === key)
    return specialization 
      ? (isArabic ? specialization.label_ar : specialization.label_en)
      : key
  }

  if (assignmentsError) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle size={20} />
            <p>{isRTL ? 'خطأ في تحميل البيانات' : 'Error loading assignments'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isRTL ? 'إدارة تكليفات المعالجين' : 'Therapist Assignment Management'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'إدارة تكليفات المعالجين والبدائل حسب التخصص' 
              : 'Manage therapist assignments and substitutes by specialization'
            }
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'تكليف جديد' : 'New Assignment'}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {isRTL ? 'إنشاء تكليف جديد' : 'Create New Assignment'}
              </DialogTitle>
              <DialogDescription>
                {isRTL 
                  ? 'قم بتكليف معالج أساسي لتخصص محدد' 
                  : 'Assign a primary therapist to a specific specialization'
                }
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="specialization">
                  {isRTL ? 'التخصص' : 'Specialization'}
                </Label>
                <Select
                  value={createForm.specialization_ar}
                  onValueChange={(value) => {
                    const specialization = THERAPY_SPECIALIZATIONS.find(s => s.label_ar === value)
                    setCreateForm(prev => ({
                      ...prev,
                      specialization_ar: value,
                      specialization_en: specialization?.label_en || '',
                    }))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isRTL ? 'اختر التخصص' : 'Select specialization'} />
                  </SelectTrigger>
                  <SelectContent>
                    {THERAPY_SPECIALIZATIONS.map((spec) => (
                      <SelectItem key={spec.value} value={spec.label_ar}>
                        {isRTL ? spec.label_ar : spec.label_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reason">
                  {isRTL ? 'سبب التكليف' : 'Assignment Reason'}
                </Label>
                <Input
                  id="reason"
                  value={createForm.assignment_reason}
                  onChange={(e) => setCreateForm(prev => ({ 
                    ...prev, 
                    assignment_reason: e.target.value 
                  }))}
                  placeholder={isRTL ? 'اختياري' : 'Optional'}
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleCreateAssignment}
                disabled={!createForm.specialization_ar || createAssignmentMutation.isPending}
              >
                {createAssignmentMutation.isPending 
                  ? (isRTL ? 'جاري الحفظ...' : 'Creating...') 
                  : (isRTL ? 'إنشاء التكليف' : 'Create Assignment')
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assignments">
            {isRTL ? 'التكليفات النشطة' : 'Active Assignments'}
          </TabsTrigger>
          <TabsTrigger value="student-view">
            {isRTL ? 'عرض الطالب' : 'Student View'}
          </TabsTrigger>
        </TabsList>

        {/* Active Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                {isRTL ? 'التكليفات النشطة' : 'Active Assignments'}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? 'جميع تكليفات المعالجين النشطة مع معلومات البدائل' 
                  : 'All active therapist assignments with substitute information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">
                    {isRTL ? 'جاري التحميل...' : 'Loading...'}
                  </p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {isRTL ? 'لا توجد تكليفات' : 'No assignments found'}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                          {isRTL ? 'الطالب' : 'Student'}
                        </TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                          {isRTL ? 'التخصص' : 'Specialization'}
                        </TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                          {isRTL ? 'المعالج الأساسي' : 'Primary Therapist'}
                        </TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                          {isRTL ? 'البديل' : 'Substitute'}
                        </TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                          {isRTL ? 'الحالة' : 'Status'}
                        </TableHead>
                        <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                          {isRTL ? 'الإجراءات' : 'Actions'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {isRTL 
                                  ? assignment.student?.first_name_ar 
                                  : assignment.student?.first_name_en || assignment.student?.first_name_ar
                                }
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {isRTL ? assignment.specialization_ar : assignment.specialization_en}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {isRTL 
                                  ? `${assignment.primary_therapist?.first_name_ar} ${assignment.primary_therapist?.last_name_ar}`
                                  : `${assignment.primary_therapist?.first_name_en || assignment.primary_therapist?.first_name_ar} ${assignment.primary_therapist?.last_name_en || assignment.primary_therapist?.last_name_ar}`
                                }
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {assignment.current_substitute_id ? (
                              <div>
                                <Badge variant="outline" className="text-orange-600">
                                  {isRTL ? 'بديل نشط' : 'Active Substitute'}
                                </Badge>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {isRTL 
                                    ? `${assignment.substitute_therapist?.first_name_ar} ${assignment.substitute_therapist?.last_name_ar}`
                                    : `${assignment.substitute_therapist?.first_name_en || assignment.substitute_therapist?.first_name_ar} ${assignment.substitute_therapist?.last_name_en || assignment.substitute_therapist?.last_name_ar}`
                                  }
                                </p>
                              </div>
                            ) : (
                              <Badge variant="secondary">
                                {isRTL ? 'لا يوجد بديل' : 'No Substitute'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={assignment.status === 'active' ? 'default' : 'secondary'}
                            >
                              {isRTL 
                                ? (assignment.status === 'active' ? 'نشط' : 'غير نشط')
                                : assignment.status
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {assignment.current_substitute_id ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRemoveSubstitute(assignment.id)}
                                  disabled={removeSubstituteMutation.isPending}
                                >
                                  <UserMinus className="h-4 w-4" />
                                  {isRTL ? 'إزالة البديل' : 'Remove Substitute'}
                                </Button>
                              ) : (
                                <Dialog 
                                  open={isSubstituteDialogOpen && selectedAssignment === assignment.id}
                                  onOpenChange={(open) => {
                                    setIsSubstituteDialogOpen(open)
                                    if (open) setSelectedAssignment(assignment.id)
                                    if (!open) setSelectedAssignment('')
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Users className="h-4 w-4" />
                                      {isRTL ? 'تعيين بديل' : 'Assign Substitute'}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>
                                        {isRTL ? 'تعيين معالج بديل' : 'Assign Substitute Therapist'}
                                      </DialogTitle>
                                      <DialogDescription>
                                        {isRTL 
                                          ? 'قم بتعيين معالج بديل مؤقت لهذا التكليف' 
                                          : 'Assign a temporary substitute therapist for this assignment'
                                        }
                                      </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label>{isRTL ? 'سبب التعيين' : 'Assignment Reason'}</Label>
                                        <Input
                                          value={substituteForm.reason}
                                          onChange={(e) => setSubstituteForm(prev => ({ 
                                            ...prev, 
                                            reason: e.target.value 
                                          }))}
                                          placeholder={isRTL ? 'سبب تعيين البديل' : 'Reason for substitute'}
                                          dir={isRTL ? 'rtl' : 'ltr'}
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>{isRTL ? 'تاريخ البداية' : 'Start Date'}</Label>
                                          <Input
                                            type="date"
                                            value={substituteForm.startDate}
                                            onChange={(e) => setSubstituteForm(prev => ({ 
                                              ...prev, 
                                              startDate: e.target.value 
                                            }))}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>{isRTL ? 'تاريخ النهاية' : 'End Date'}</Label>
                                          <Input
                                            type="date"
                                            value={substituteForm.endDate}
                                            onChange={(e) => setSubstituteForm(prev => ({ 
                                              ...prev, 
                                              endDate: e.target.value 
                                            }))}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <DialogFooter>
                                      <Button
                                        variant="outline"
                                        onClick={() => {
                                          setIsSubstituteDialogOpen(false)
                                          setSelectedAssignment('')
                                        }}
                                      >
                                        {isRTL ? 'إلغاء' : 'Cancel'}
                                      </Button>
                                      <Button 
                                        onClick={handleAssignSubstitute}
                                        disabled={assignSubstituteMutation.isPending}
                                      >
                                        {assignSubstituteMutation.isPending 
                                          ? (isRTL ? 'جاري التعيين...' : 'Assigning...') 
                                          : (isRTL ? 'تعيين البديل' : 'Assign Substitute')
                                        }
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Student View Tab */}
        <TabsContent value="student-view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={20} />
                {isRTL ? 'عرض الطالب - التكليفات' : 'Student View - Assignments'}
              </CardTitle>
              <CardDescription>
                {isRTL 
                  ? 'عرض شامل لجميع تكليفات المعالجين لكل طالب' 
                  : 'Comprehensive view of all therapist assignments per student'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {studentAssignmentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">
                    {isRTL ? 'جاري التحميل...' : 'Loading...'}
                  </p>
                </div>
              ) : studentAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {isRTL ? 'لا توجد تكليفات للطلاب' : 'No student assignments found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {studentAssignments.map((assignment) => (
                    <Card key={assignment.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">
                              {isRTL ? assignment.student_name_ar : assignment.student_name_en}
                            </h3>
                            <Badge variant="secondary">
                              {isRTL ? assignment.specialization_ar : assignment.specialization_en}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              <span className="font-medium">
                                {isRTL ? 'المعالج الأساسي: ' : 'Primary Therapist: '}
                              </span>
                              {isRTL ? assignment.primary_therapist_name_ar : assignment.primary_therapist_name_en}
                            </p>
                            {assignment.substitute_therapist_id && (
                              <p>
                                <span className="font-medium">
                                  {isRTL ? 'البديل: ' : 'Substitute: '}
                                </span>
                                {isRTL ? assignment.substitute_therapist_name_ar : assignment.substitute_therapist_name_en}
                                {assignment.substitute_start_date && (
                                  <span className="text-orange-600 ml-2">
                                    ({isRTL ? 'من' : 'from'} {new Date(assignment.substitute_start_date).toLocaleDateString()})
                                  </span>
                                )}
                              </p>
                            )}
                            <p>
                              <span className="font-medium">
                                {isRTL ? 'تاريخ التكليف: ' : 'Assigned: '}
                              </span>
                              {new Date(assignment.assigned_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {assignment.substitute_therapist_id ? (
                            <Badge variant="outline" className="text-orange-600">
                              {isRTL ? 'بديل نشط' : 'Active Substitute'}
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              {isRTL ? 'نشط' : 'Active'}
                            </Badge>
                          )}
                          {!assignment.parent_notified && (
                            <Badge variant="destructive">
                              {isRTL ? 'لم يتم إبلاغ الوالدين' : 'Parent Not Notified'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}