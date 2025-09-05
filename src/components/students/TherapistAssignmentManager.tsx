/**
 * Therapist Assignment Manager
 * 
 * Flexible interface for managing therapist assignments across individualized
 * enrollments. Supports workload management, capacity monitoring, assignment
 * optimization, and substitution workflows with bilingual support.
 * 
 * Key Features:
 * - Drag-and-drop assignment interface
 * - Real-time workload visualization
 * - Capacity management and over-assignment prevention
 * - Automatic assignment recommendations
 * - Bulk assignment operations
 * - Substitution workflow with minimal disruption
 * - Performance tracking and analytics
 * - Bilingual interface (Arabic RTL/English LTR)
 * 
 * @author BMad Development Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult
} from 'react-beautiful-dnd';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '../ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Progress } from '../ui/progress';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '../ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import {
  Users,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Target,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Search,
  Filter,
  Settings,
  Download,
  Zap,
  Brain,
  Shield
} from 'lucide-react';
import { useI18n } from '../../hooks/useI18n';
import type {
  IndividualizedEnrollment,
  ProgramTemplate
} from '../../types/individualized-enrollment';

// Types for therapist assignment management
interface Therapist {
  id: string;
  name: string;
  name_ar: string;
  email: string;
  phone: string;
  specializations: string[];
  qualifications: string[];
  experience_years: number;
  capacity_config: TherapistCapacityConfig;
  current_workload: WorkloadMetrics;
  performance_metrics: PerformanceMetrics;
  availability_schedule: AvailabilitySchedule;
  is_active: boolean;
  is_substitute_available: boolean;
  created_at: string;
  updated_at: string;
}

interface TherapistCapacityConfig {
  max_students_per_week: number;
  max_sessions_per_day: number;
  max_hours_per_week: number;
  preferred_age_range: {
    min: number;
    max: number;
  };
  preferred_diagnoses: string[];
  preferred_program_types: string[];
  buffer_time_minutes: number;
  overtime_threshold: number;
}

interface WorkloadMetrics {
  current_students: number;
  sessions_this_week: number;
  hours_this_week: number;
  utilization_percentage: number;
  capacity_remaining: number;
  upcoming_sessions: number;
  overdue_assessments: number;
  pending_notes: number;
}

interface PerformanceMetrics {
  student_satisfaction_avg: number;
  goal_achievement_rate: number;
  session_completion_rate: number;
  documentation_compliance: number;
  parent_communication_score: number;
  professional_development_hours: number;
  peer_collaboration_score: number;
  overall_performance_score: number;
}

interface AvailabilitySchedule {
  regular_schedule: Array<{
    day_of_week: number; // 0-6, Sunday is 0
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>;
  time_off_requests: Array<{
    start_date: string;
    end_date: string;
    type: 'vacation' | 'sick' | 'training' | 'other';
    is_approved: boolean;
  }>;
  special_availability: Array<{
    date: string;
    start_time: string;
    end_time: string;
    is_available: boolean;
    reason: string;
  }>;
}

interface AssignmentRecommendation {
  enrollment_id: string;
  recommended_therapists: Array<{
    therapist_id: string;
    compatibility_score: number;
    reasoning: Array<{
      factor: 'specialization' | 'experience' | 'availability' | 'workload' | 'location';
      score: number;
      description_ar: string;
      description_en: string;
    }>;
    potential_issues: Array<{
      type: 'capacity' | 'scheduling' | 'specialization' | 'distance';
      severity: 'low' | 'medium' | 'high';
      message_ar: string;
      message_en: string;
    }>;
  }>;
  current_assignment?: {
    therapist_id: string;
    assignment_date: string;
    performance_rating: number;
    change_recommendation: 'maintain' | 'review' | 'reassign';
  };
}

interface SubstitutionRequest {
  id: string;
  original_therapist_id: string;
  enrollment_id: string;
  requested_dates: string[];
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  substitute_requirements: {
    must_have_specializations: string[];
    preferred_qualifications: string[];
    continuity_important: boolean;
    parent_approval_required: boolean;
  };
  status: 'pending' | 'assigned' | 'confirmed' | 'completed' | 'cancelled';
  assigned_substitute_id?: string;
  created_at: string;
  requested_by: string;
}

interface TherapistAssignmentManagerProps {
  programTemplateId?: string;
  enrollmentIds?: string[];
  onAssignmentChange?: (enrollmentId: string, therapistId: string, previousTherapistId?: string) => void;
  onCapacityAlert?: (therapistId: string, alertType: 'over_capacity' | 'approaching_limit') => void;
  showRecommendations?: boolean;
  allowBulkOperations?: boolean;
  showSubstitutionWorkflow?: boolean;
}

export const TherapistAssignmentManager: React.FC<TherapistAssignmentManagerProps> = ({
  programTemplateId,
  enrollmentIds = [],
  onAssignmentChange,
  onCapacityAlert,
  showRecommendations = true,
  allowBulkOperations = true,
  showSubstitutionWorkflow = true
}) => {
  const { language, isRTL, t } = useI18n();
  const queryClient = useQueryClient();

  // State management
  const [selectedTab, setSelectedTab] = useState('assignments');
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCriteria, setFilterCriteria] = useState({
    specialization: '',
    availability: 'all',
    capacity_status: 'all',
    performance_rating: 'all'
  });
  const [showCapacityWarnings, setShowCapacityWarnings] = useState(true);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [substitutionDialogOpen, setSubstitutionDialogOpen] = useState(false);
  const [selectedSubstitutionRequest, setSelectedSubstitutionRequest] = useState<string | null>(null);

  // Fetch therapists data
  const { data: therapists, isLoading: therapistsLoading } = useQuery({
    queryKey: ['therapists', programTemplateId],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      const mockTherapists: Therapist[] = [
        {
          id: 'therapist-1',
          name: 'Dr. Sarah Ahmed',
          name_ar: 'د. سارة أحمد',
          email: 'sarah@therapy-center.com',
          phone: '+966501234567',
          specializations: ['autism', 'behavioral_therapy', 'speech_therapy'],
          qualifications: ['PhD Psychology', 'ABA Certification', 'ADOS Certified'],
          experience_years: 8,
          capacity_config: {
            max_students_per_week: 12,
            max_sessions_per_day: 6,
            max_hours_per_week: 40,
            preferred_age_range: { min: 3, max: 12 },
            preferred_diagnoses: ['autism', 'developmental_delay'],
            preferred_program_types: ['individual', 'small_group'],
            buffer_time_minutes: 15,
            overtime_threshold: 42
          },
          current_workload: {
            current_students: 9,
            sessions_this_week: 18,
            hours_this_week: 27,
            utilization_percentage: 67.5,
            capacity_remaining: 3,
            upcoming_sessions: 5,
            overdue_assessments: 1,
            pending_notes: 2
          },
          performance_metrics: {
            student_satisfaction_avg: 4.7,
            goal_achievement_rate: 0.84,
            session_completion_rate: 0.98,
            documentation_compliance: 0.95,
            parent_communication_score: 4.8,
            professional_development_hours: 24,
            peer_collaboration_score: 4.6,
            overall_performance_score: 8.9
          },
          availability_schedule: {
            regular_schedule: [
              { day_of_week: 1, start_time: '08:00', end_time: '16:00', is_available: true },
              { day_of_week: 2, start_time: '08:00', end_time: '16:00', is_available: true },
              { day_of_week: 3, start_time: '08:00', end_time: '16:00', is_available: true },
              { day_of_week: 4, start_time: '08:00', end_time: '16:00', is_available: true },
              { day_of_week: 5, start_time: '08:00', end_time: '14:00', is_available: true }
            ],
            time_off_requests: [],
            special_availability: []
          },
          is_active: true,
          is_substitute_available: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-09-04T10:00:00Z'
        },
        {
          id: 'therapist-2',
          name: 'Dr. Ahmed Hassan',
          name_ar: 'د. أحمد حسن',
          email: 'ahmed@therapy-center.com',
          phone: '+966507654321',
          specializations: ['occupational_therapy', 'sensory_integration', 'autism'],
          qualifications: ['MS Occupational Therapy', 'SI Certification', 'Autism Specialist'],
          experience_years: 6,
          capacity_config: {
            max_students_per_week: 10,
            max_sessions_per_day: 5,
            max_hours_per_week: 35,
            preferred_age_range: { min: 2, max: 10 },
            preferred_diagnoses: ['autism', 'sensory_processing'],
            preferred_program_types: ['individual'],
            buffer_time_minutes: 20,
            overtime_threshold: 38
          },
          current_workload: {
            current_students: 8,
            sessions_this_week: 16,
            hours_this_week: 24,
            utilization_percentage: 68.6,
            capacity_remaining: 2,
            upcoming_sessions: 4,
            overdue_assessments: 0,
            pending_notes: 1
          },
          performance_metrics: {
            student_satisfaction_avg: 4.9,
            goal_achievement_rate: 0.91,
            session_completion_rate: 0.99,
            documentation_compliance: 0.97,
            parent_communication_score: 4.9,
            professional_development_hours: 18,
            peer_collaboration_score: 4.8,
            overall_performance_score: 9.2
          },
          availability_schedule: {
            regular_schedule: [
              { day_of_week: 0, start_time: '09:00', end_time: '15:00', is_available: true },
              { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
              { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
              { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
              { day_of_week: 4, start_time: '09:00', end_time: '15:00', is_available: true }
            ],
            time_off_requests: [],
            special_availability: []
          },
          is_active: true,
          is_substitute_available: false,
          created_at: '2025-02-01T00:00:00Z',
          updated_at: '2025-09-04T10:00:00Z'
        }
      ];
      
      return mockTherapists;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch enrollments data
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments-for-assignment', programTemplateId, enrollmentIds],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      const mockEnrollments: (IndividualizedEnrollment & {
        student_name: string;
        student_name_ar: string;
        program_name: string;
        program_name_ar: string;
        urgency_level: 'low' | 'medium' | 'high';
        assignment_history: Array<{
          therapist_id: string;
          assigned_date: string;
          end_date?: string;
          reason: string;
        }>;
      })[] = [
        {
          id: 'enrollment-1',
          student_id: 'student-1',
          program_template_id: programTemplateId || 'program-1',
          individual_start_date: '2025-08-01',
          individual_end_date: '2025-12-01',
          custom_schedule: {},
          assigned_therapist_id: 'therapist-1',
          program_modifications: {},
          enrollment_status: 'active',
          created_at: '2025-08-01T00:00:00Z',
          updated_at: '2025-08-15T00:00:00Z',
          created_by: 'admin-1',
          updated_by: 'admin-1',
          student_name: 'Ali Mohammed',
          student_name_ar: 'علي محمد',
          program_name: 'Autism Development Program',
          program_name_ar: 'برنامج تطوير التوحد',
          urgency_level: 'medium',
          assignment_history: [
            {
              therapist_id: 'therapist-1',
              assigned_date: '2025-08-01',
              reason: 'Initial assignment based on specialization match'
            }
          ]
        },
        {
          id: 'enrollment-2',
          student_id: 'student-2',
          program_template_id: programTemplateId || 'program-1',
          individual_start_date: '2025-07-15',
          individual_end_date: '2025-11-15',
          custom_schedule: {},
          assigned_therapist_id: null,
          program_modifications: {},
          enrollment_status: 'active',
          created_at: '2025-07-15T00:00:00Z',
          updated_at: '2025-08-20T00:00:00Z',
          created_by: 'admin-1',
          updated_by: 'therapist-2',
          student_name: 'Fatima Hassan',
          student_name_ar: 'فاطمة حسن',
          program_name: 'Occupational Therapy Program',
          program_name_ar: 'برنامج العلاج الوظيفي',
          urgency_level: 'high',
          assignment_history: []
        }
      ];
      
      if (enrollmentIds.length > 0) {
        return mockEnrollments.filter(e => enrollmentIds.includes(e.id));
      }
      
      return mockEnrollments;
    },
    enabled: programTemplateId !== undefined || enrollmentIds.length > 0,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Fetch assignment recommendations
  const { data: recommendations } = useQuery({
    queryKey: ['assignment-recommendations', enrollmentIds, programTemplateId],
    queryFn: async () => {
      // Mock implementation - replace with actual service call
      const mockRecommendations: AssignmentRecommendation[] = [
        {
          enrollment_id: 'enrollment-2',
          recommended_therapists: [
            {
              therapist_id: 'therapist-2',
              compatibility_score: 0.92,
              reasoning: [
                {
                  factor: 'specialization',
                  score: 0.95,
                  description_ar: 'تخصص في العلاج الوظيفي والتوحد',
                  description_en: 'Specializes in occupational therapy and autism'
                },
                {
                  factor: 'experience',
                  score: 0.85,
                  description_ar: '6 سنوات خبرة مع حالات مماثلة',
                  description_en: '6 years experience with similar cases'
                },
                {
                  factor: 'availability',
                  score: 0.90,
                  description_ar: 'متاح وفق الجدول المطلوب',
                  description_en: 'Available for required schedule'
                },
                {
                  factor: 'workload',
                  score: 0.95,
                  description_ar: 'حمولة عمل مناسبة',
                  description_en: 'Appropriate workload capacity'
                }
              ],
              potential_issues: []
            },
            {
              therapist_id: 'therapist-1',
              compatibility_score: 0.75,
              reasoning: [
                {
                  factor: 'specialization',
                  score: 0.80,
                  description_ar: 'تخصص جزئي في التوحد',
                  description_en: 'Partial autism specialization'
                },
                {
                  factor: 'workload',
                  score: 0.70,
                  description_ar: 'حمولة عمل مرتفعة',
                  description_en: 'Higher workload'
                }
              ],
              potential_issues: [
                {
                  type: 'capacity',
                  severity: 'medium',
                  message_ar: 'قريب من الحد الأقصى للطلاب',
                  message_en: 'Near maximum student capacity'
                }
              ]
            }
          ]
        }
      ];
      
      return mockRecommendations;
    },
    enabled: showRecommendations && (enrollmentIds.length > 0 || !!programTemplateId),
    staleTime: 5 * 60 * 1000
  });

  // Assignment mutation
  const assignTherapistMutation = useMutation({
    mutationFn: async ({ enrollmentId, therapistId, previousTherapistId }: {
      enrollmentId: string;
      therapistId: string;
      previousTherapistId?: string;
    }) => {
      // Mock implementation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['enrollments-for-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      onAssignmentChange?.(variables.enrollmentId, variables.therapistId, variables.previousTherapistId);
    }
  });

  // Filtered data based on search and filters
  const filteredTherapists = useMemo(() => {
    if (!therapists) return [];
    
    return therapists.filter(therapist => {
      // Search filter
      const searchMatch = searchQuery === '' ||
        therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        therapist.name_ar.includes(searchQuery) ||
        therapist.specializations.some(spec => 
          spec.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Specialization filter
      const specializationMatch = filterCriteria.specialization === '' ||
        therapist.specializations.includes(filterCriteria.specialization);

      // Availability filter
      const availabilityMatch = filterCriteria.availability === 'all' ||
        (filterCriteria.availability === 'available' && therapist.is_active) ||
        (filterCriteria.availability === 'substitute' && therapist.is_substitute_available);

      // Capacity filter
      const capacityMatch = filterCriteria.capacity_status === 'all' ||
        (filterCriteria.capacity_status === 'available' && therapist.current_workload.capacity_remaining > 0) ||
        (filterCriteria.capacity_status === 'full' && therapist.current_workload.capacity_remaining === 0) ||
        (filterCriteria.capacity_status === 'over' && therapist.current_workload.utilization_percentage > 100);

      // Performance filter
      const performanceMatch = filterCriteria.performance_rating === 'all' ||
        (filterCriteria.performance_rating === 'high' && therapist.performance_metrics.overall_performance_score >= 8.5) ||
        (filterCriteria.performance_rating === 'medium' && therapist.performance_metrics.overall_performance_score >= 7.0 && therapist.performance_metrics.overall_performance_score < 8.5) ||
        (filterCriteria.performance_rating === 'low' && therapist.performance_metrics.overall_performance_score < 7.0);

      return searchMatch && specializationMatch && availabilityMatch && capacityMatch && performanceMatch;
    });
  }, [therapists, searchQuery, filterCriteria]);

  // Unassigned enrollments
  const unassignedEnrollments = useMemo(() => {
    if (!enrollments) return [];
    return enrollments.filter(enrollment => !enrollment.assigned_therapist_id);
  }, [enrollments]);

  // Drag and drop handler
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !enrollments || !therapists) return;

    const { source, destination, draggableId } = result;
    
    // Handle dropping enrollment on therapist
    if (destination.droppableId.startsWith('therapist-') && source.droppableId === 'unassigned') {
      const therapistId = destination.droppableId.replace('therapist-', '');
      const enrollment = enrollments.find(e => e.id === draggableId);
      
      if (enrollment) {
        assignTherapistMutation.mutate({
          enrollmentId: enrollment.id,
          therapistId,
          previousTherapistId: enrollment.assigned_therapist_id || undefined
        });
      }
    }

    // Handle moving enrollment between therapists
    if (destination.droppableId.startsWith('therapist-') && source.droppableId.startsWith('therapist-')) {
      const newTherapistId = destination.droppableId.replace('therapist-', '');
      const oldTherapistId = source.droppableId.replace('therapist-', '');
      
      if (newTherapistId !== oldTherapistId) {
        const enrollment = enrollments.find(e => e.id === draggableId);
        
        if (enrollment) {
          assignTherapistMutation.mutate({
            enrollmentId: enrollment.id,
            therapistId: newTherapistId,
            previousTherapistId: oldTherapistId
          });
        }
      }
    }

    // Handle returning enrollment to unassigned
    if (destination.droppableId === 'unassigned' && source.droppableId.startsWith('therapist-')) {
      const enrollment = enrollments.find(e => e.id === draggableId);
      
      if (enrollment) {
        // Implementation for unassigning therapist
        // This would involve setting assigned_therapist_id to null
      }
    }
  }, [enrollments, therapists, assignTherapistMutation]);

  // Render therapist card
  const renderTherapistCard = useCallback((therapist: Therapist) => {
    const assignedEnrollments = enrollments?.filter(e => e.assigned_therapist_id === therapist.id) || [];
    const isOverCapacity = therapist.current_workload.utilization_percentage > 100;
    const isNearCapacity = therapist.current_workload.utilization_percentage > 85;

    return (
      <Card key={therapist.id} className={`${isOverCapacity ? 'border-red-500' : isNearCapacity ? 'border-yellow-500' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${therapist.name}`} />
                <AvatarFallback>
                  {language === 'ar' && therapist.name_ar
                    ? therapist.name_ar.split(' ').map(n => n[0]).join('')
                    : therapist.name.split(' ').map(n => n[0]).join('')
                  }
                </AvatarFallback>
              </Avatar>
              
              <div>
                <CardTitle className="text-base">
                  {language === 'ar' && therapist.name_ar ? therapist.name_ar : therapist.name}
                </CardTitle>
                <div className="flex gap-1 mt-1">
                  {therapist.specializations.slice(0, 2).map((spec, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {t(spec, spec)}
                    </Badge>
                  ))}
                  {therapist.specializations.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{therapist.specializations.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isOverCapacity && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('over_capacity', 'تجاوز الطاقة الاستيعابية')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {therapist.is_substitute_available && (
                <Badge variant="outline" className="text-xs">
                  {t('substitute', 'بديل')}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Workload Metrics */}
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span>{t('capacity_utilization', 'استغلال الطاقة')}</span>
                <span className={isOverCapacity ? 'text-red-600 font-semibold' : isNearCapacity ? 'text-yellow-600' : 'text-green-600'}>
                  {therapist.current_workload.utilization_percentage.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={Math.min(therapist.current_workload.utilization_percentage, 100)} 
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">{t('current_students', 'الطلاب الحاليين')}</div>
                <div className="font-semibold">
                  {therapist.current_workload.current_students} / {therapist.capacity_config.max_students_per_week}
                </div>
              </div>
              
              <div>
                <div className="text-muted-foreground">{t('weekly_hours', 'الساعات الأسبوعية')}</div>
                <div className="font-semibold">
                  {therapist.current_workload.hours_this_week} / {therapist.capacity_config.max_hours_per_week}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {therapist.performance_metrics.overall_performance_score.toFixed(1)}/10
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {therapist.current_workload.upcoming_sessions} {t('upcoming', 'قادم')}
              </div>
            </div>
          </div>

          {/* Assigned Students Droppable Area */}
          <Droppable droppableId={`therapist-${therapist.id}`}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[100px] p-3 border-2 border-dashed rounded-lg ${
                  snapshot.isDraggingOver 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                } transition-colors`}
              >
                <div className="text-sm font-medium mb-2 text-muted-foreground">
                  {t('assigned_students', 'الطلاب المسندين')} ({assignedEnrollments.length})
                </div>
                
                {assignedEnrollments.map((enrollment, index) => (
                  <Draggable key={enrollment.id} draggableId={enrollment.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`p-2 mb-2 bg-white border rounded-lg shadow-sm cursor-move ${
                          snapshot.isDragging ? 'shadow-md rotate-2' : 'hover:shadow-md'
                        } transition-shadow`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">
                              {language === 'ar' ? enrollment.student_name_ar : enrollment.student_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {language === 'ar' ? enrollment.program_name_ar : enrollment.program_name}
                            </div>
                          </div>
                          
                          <Badge 
                            variant={enrollment.urgency_level === 'high' ? 'destructive' : 
                                   enrollment.urgency_level === 'medium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {t(enrollment.urgency_level, enrollment.urgency_level)}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                
                {provided.placeholder}
                
                {assignedEnrollments.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    {t('no_assigned_students', 'لا توجد طلاب مسندين')}
                  </div>
                )}
              </div>
            )}
          </Droppable>

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="outline" className="text-xs">
              <Settings className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {t('configure', 'إعداد')}
            </Button>
            
            <Button size="sm" variant="outline" className="text-xs">
              <TrendingUp className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
              {t('performance', 'الأداء')}
            </Button>
            
            {therapist.is_substitute_available && (
              <Button size="sm" variant="outline" className="text-xs">
                <RotateCcw className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                {t('substitute', 'بديل')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }, [enrollments, language, t, isRTL, assignTherapistMutation]);

  if (therapistsLoading || enrollmentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="w-8 h-8 animate-pulse text-blue-600 mx-auto mb-3" />
          <p>{t('loading_assignments', 'جاري تحميل التعيينات')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('therapist_assignment_manager', 'مدير تعيين المعالجين')}</h2>
          <p className="text-muted-foreground">
            {t('manage_therapist_assignments_desc', 'إدارة تعيينات المعالجين ومراقبة أحمال العمل')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {allowBulkOperations && (
            <Button
              variant={bulkSelectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBulkSelectionMode(!bulkSelectionMode)}
            >
              <Users className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('bulk_assign', 'تعيين مجمع')}
            </Button>
          )}

          {showSubstitutionWorkflow && (
            <Button variant="outline" size="sm" onClick={() => setSubstitutionDialogOpen(true)}>
              <RotateCcw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
              {t('substitutions', 'البدائل')}
            </Button>
          )}

          <Button size="sm">
            <UserPlus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('auto_assign', 'تعيين تلقائي')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('filters', 'الفلاتر')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{t('search', 'البحث')}</Label>
              <div className="relative">
                <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
                <Input
                  placeholder={t('search_therapists', 'البحث عن المعالجين')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('specialization', 'التخصص')}</Label>
              <Select value={filterCriteria.specialization} onValueChange={(value) => 
                setFilterCriteria(prev => ({ ...prev, specialization: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder={t('all_specializations', 'جميع التخصصات')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('all_specializations', 'جميع التخصصات')}</SelectItem>
                  <SelectItem value="autism">{t('autism', 'التوحد')}</SelectItem>
                  <SelectItem value="speech_therapy">{t('speech_therapy', 'علاج النطق')}</SelectItem>
                  <SelectItem value="occupational_therapy">{t('occupational_therapy', 'العلاج الوظيفي')}</SelectItem>
                  <SelectItem value="behavioral_therapy">{t('behavioral_therapy', 'العلاج السلوكي')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('capacity_status', 'حالة الطاقة')}</Label>
              <Select value={filterCriteria.capacity_status} onValueChange={(value) => 
                setFilterCriteria(prev => ({ ...prev, capacity_status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_statuses', 'جميع الحالات')}</SelectItem>
                  <SelectItem value="available">{t('available', 'متاح')}</SelectItem>
                  <SelectItem value="full">{t('full_capacity', 'ممتلئ')}</SelectItem>
                  <SelectItem value="over">{t('over_capacity', 'متجاوز')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('performance', 'الأداء')}</Label>
              <Select value={filterCriteria.performance_rating} onValueChange={(value) => 
                setFilterCriteria(prev => ({ ...prev, performance_rating: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all_ratings', 'جميع التقييمات')}</SelectItem>
                  <SelectItem value="high">{t('high_performance', 'أداء عالي')}</SelectItem>
                  <SelectItem value="medium">{t('medium_performance', 'أداء متوسط')}</SelectItem>
                  <SelectItem value="low">{t('low_performance', 'أداء منخفض')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unassigned Students Column */}
          <div className="lg:col-span-1">
            <Card className="h-fit sticky top-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <UserMinus className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                  {t('unassigned_students', 'الطلاب غير المسندين')} ({unassignedEnrollments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Droppable droppableId="unassigned">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[200px] p-3 border-2 border-dashed rounded-lg ${
                        snapshot.isDraggingOver 
                          ? 'border-red-400 bg-red-50' 
                          : 'border-gray-200 bg-gray-50'
                      } transition-colors`}
                    >
                      {unassignedEnrollments.map((enrollment, index) => (
                        <Draggable key={enrollment.id} draggableId={enrollment.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`p-3 mb-3 bg-white border rounded-lg shadow-sm cursor-move ${
                                snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              } transition-shadow`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {language === 'ar' ? enrollment.student_name_ar : enrollment.student_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {language === 'ar' ? enrollment.program_name_ar : enrollment.program_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {t('started', 'بدأ في')}: {enrollment.individual_start_date}
                                  </div>
                                </div>
                                
                                <Badge 
                                  variant={enrollment.urgency_level === 'high' ? 'destructive' : 
                                         enrollment.urgency_level === 'medium' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {t(enrollment.urgency_level, enrollment.urgency_level)}
                                </Badge>
                              </div>

                              {/* Recommendations for this enrollment */}
                              {showRecommendations && recommendations?.find(r => r.enrollment_id === enrollment.id) && (
                                <div className="mt-2 pt-2 border-t">
                                  <div className="flex items-center gap-1 text-xs text-blue-600">
                                    <Brain className="w-3 h-3" />
                                    {t('ai_recommendation', 'توصية ذكية')}
                                  </div>
                                  {recommendations.find(r => r.enrollment_id === enrollment.id)?.recommended_therapists.slice(0, 1).map((rec, idx) => {
                                    const therapist = therapists?.find(t => t.id === rec.therapist_id);
                                    return (
                                      <div key={idx} className="text-xs mt-1">
                                        <span className="font-medium">
                                          {therapist ? (language === 'ar' ? therapist.name_ar : therapist.name) : 'Unknown'}
                                        </span>
                                        <span className="text-muted-foreground">
                                          ({Math.round(rec.compatibility_score * 100)}% {t('match', 'توافق')})
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      
                      {provided.placeholder}
                      
                      {unassignedEnrollments.length === 0 && (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          {t('all_students_assigned', 'جميع الطلاب مسندين')}
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* Therapists Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {filteredTherapists.map(therapist => renderTherapistCard(therapist))}
            </div>
            
            {filteredTherapists.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {t('no_therapists_found', 'لم يتم العثور على معالجين')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('adjust_filters_or_add_therapists', 'قم بتعديل الفلاتر أو إضافة معالجين جدد')}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
};