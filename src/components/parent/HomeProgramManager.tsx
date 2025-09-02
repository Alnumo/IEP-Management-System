/**
 * Home Program Manager Component
 * Complete home program management system for parents
 * نظام إدارة البرامج المنزلية الشامل لأولياء الأمور
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Home,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Camera,
  Video,
  FileText,
  Upload,
  Download,
  Star,
  MessageSquare,
  Target,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useHomePrograms,
  useCompleteHomeProgram,
  useParentPortal 
} from '@/hooks/useParentProgress';
import type { 
  HomeProgram, 
  HomeProgramCompletion,
  Language 
} from '@/types/parent';

interface HomeProgramManagerProps {
  className?: string;
}

interface CompletionFormData {
  success_rating: number;
  completion_date: string;
  parent_notes_ar: string;
  parent_notes_en: string;
  evidence_urls: string[];
}

interface ProgramFilters {
  status: 'all' | 'active' | 'completed' | 'overdue';
  difficulty: 'all' | 'easy' | 'medium' | 'hard';
  category: string;
}

const HomeProgramManager: React.FC<HomeProgramManagerProps> = ({ className }) => {
  const { language, isRTL } = useLanguage();
  const [selectedProgram, setSelectedProgram] = useState<HomeProgram | null>(null);
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionFormData>({
    success_rating: 5,
    completion_date: new Date().toISOString().split('T')[0],
    parent_notes_ar: '',
    parent_notes_en: '',
    evidence_urls: []
  });
  const [filters, setFilters] = useState<ProgramFilters>({
    status: 'all',
    difficulty: 'all',
    category: 'all'
  });
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  // Get comprehensive parent portal data
  const { profile, isLoading: isProfileLoading } = useParentPortal();
  const parentId = profile?.id;
  const studentId = profile?.student_id;

  // Get home programs with real-time updates
  const {
    data: homePrograms = [],
    isLoading: isProgramsLoading,
    error: programsError,
    refetch: refetchPrograms
  } = useHomePrograms(parentId || '', studentId || '');

  // Mutation for completing home programs
  const completeHomeProgramMutation = useCompleteHomeProgram();

  // Filter and categorize programs
  const { filteredPrograms, programStats } = useMemo(() => {
    let filtered = [...homePrograms];

    // Status filter
    if (filters.status !== 'all') {
      const today = new Date();
      filtered = filtered.filter(program => {
        switch (filters.status) {
          case 'active':
            return program.is_active && !program.completion_rate || program.completion_rate < 100;
          case 'completed':
            return program.completion_rate >= 100;
          case 'overdue':
            return program.is_active && 
                   new Date(program.target_completion_date || '') < today &&
                   (program.completion_rate || 0) < 100;
          default:
            return true;
        }
      });
    }

    // Difficulty filter
    if (filters.difficulty !== 'all') {
      filtered = filtered.filter(program => 
        program.difficulty_level === filters.difficulty
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(program => {
        const category = language === 'ar' ? 
          program.category_ar : 
          program.category_en;
        return category === filters.category;
      });
    }

    // Calculate stats
    const stats = {
      total: homePrograms.length,
      active: homePrograms.filter(p => p.is_active && (p.completion_rate || 0) < 100).length,
      completed: homePrograms.filter(p => (p.completion_rate || 0) >= 100).length,
      overdue: homePrograms.filter(p => {
        const today = new Date();
        return p.is_active && 
               new Date(p.target_completion_date || '') < today &&
               (p.completion_rate || 0) < 100;
      }).length
    };

    return { filteredPrograms: filtered, programStats: stats };
  }, [homePrograms, filters, language]);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    homePrograms.forEach(program => {
      const category = language === 'ar' ? 
        program.category_ar : 
        program.category_en;
      if (category) categorySet.add(category);
    });
    return Array.from(categorySet).sort();
  }, [homePrograms, language]);

  const handleCompleteProgram = async (programId: string) => {
    try {
      await completeHomeProgramMutation.mutateAsync({
        home_program_id: programId,
        ...completionData,
        evidence_urls: evidenceFiles.length > 0 ? 
          evidenceFiles.map(file => URL.createObjectURL(file)) : // This would be actual upload URLs
          []
      });
      
      setShowCompletionForm(false);
      setCompletionData({
        success_rating: 5,
        completion_date: new Date().toISOString().split('T')[0],
        parent_notes_ar: '',
        parent_notes_en: '',
        evidence_urls: []
      });
      setEvidenceFiles([]);
    } catch (error) {
      console.error('Failed to complete home program:', error);
    }
  };

  const handleEvidenceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files).filter(file => {
        // Validate file size (max 50MB for videos)
        if (file.size > 50 * 1024 * 1024) {
          alert(language === 'ar' ? 'حجم الملف كبير جداً (أقصى حد 50 ميجابايت)' : 'File size too large (max 50MB)');
          return false;
        }
        
        // Validate file type
        const allowedTypes = ['image/', 'video/', 'audio/', 'application/pdf'];
        if (!allowedTypes.some(type => file.type.startsWith(type))) {
          alert(language === 'ar' ? 'نوع الملف غير مدعوم' : 'File type not supported');
          return false;
        }
        return true;
      });
      
      setEvidenceFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeEvidenceFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getProgramStatusBadge = (program: HomeProgram) => {
    const today = new Date();
    const isOverdue = program.target_completion_date && 
                     new Date(program.target_completion_date) < today &&
                     (program.completion_rate || 0) < 100;
    const isCompleted = (program.completion_rate || 0) >= 100;

    if (isCompleted) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'مكتمل' : 'Completed'}
        </Badge>
      );
    } else if (isOverdue) {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'متأخر' : 'Overdue'}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          <Clock className="h-3 w-3 mr-1" />
          {language === 'ar' ? 'نشط' : 'Active'}
        </Badge>
      );
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    const count = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <Star 
            key={i} 
            className={cn(
              "h-3 w-3",
              i < count ? "text-yellow-400 fill-current" : "text-gray-300"
            )} 
          />
        ))}
      </div>
    );
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return language === 'ar' ? `${minutes} دقيقة` : `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return language === 'ar' ? 
        `${hours} ساعة ${mins > 0 ? `${mins} دقيقة` : ''}` :
        `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Camera className="h-4 w-4" />;
    } else if (file.type.startsWith('video/')) {
      return <Video className="h-4 w-4" />;
    } else {
      return <FileText className="h-4 w-4" />;
    }
  };

  if (isProfileLoading || isProgramsLoading) {
    return (
      <div className={cn("space-y-6", className)} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Programs Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (programsError) {
    return (
      <Alert variant="destructive" className={cn("max-w-2xl mx-auto", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {language === 'ar' ? 'خطأ في تحميل البرامج المنزلية' : 'Error loading home programs'}
          <br />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchPrograms()}
            className="mt-2"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-600" />
            {language === 'ar' ? 'البرامج المنزلية' : 'Home Programs'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 
              'تتبع وإكمال الأنشطة المنزلية المخصصة للطفل' :
              'Track and complete assigned home activities for your child'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">
                {language === 'ar' ? 'جميع الحالات' : 'All status'}
              </option>
              <option value="active">
                {language === 'ar' ? 'نشط' : 'Active'}
              </option>
              <option value="completed">
                {language === 'ar' ? 'مكتمل' : 'Completed'}
              </option>
              <option value="overdue">
                {language === 'ar' ? 'متأخر' : 'Overdue'}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'إجمالي البرامج' : 'Total Programs'}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {programStats.total}
                </p>
              </div>
              <Home className="h-8 w-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'مكتملة' : 'Completed'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {programStats.completed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'نشطة' : 'Active'}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {programStats.active}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'متأخرة' : 'Overdue'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {programStats.overdue}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Programs Grid */}
      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {language === 'ar' ? 'لا توجد برامج منزلية' : 'No home programs'}
            </h3>
            <p className="text-gray-600">
              {language === 'ar' ? 
                'لم يتم تخصيص أي برامج منزلية حالياً' :
                'No home programs have been assigned currently'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {language === 'ar' ? program.program_name_ar : program.program_name_en}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {language === 'ar' ? program.description_ar : program.description_en}
                    </p>
                  </div>
                  {getProgramStatusBadge(program)}
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {language === 'ar' ? 'التقدم' : 'Progress'}
                    </span>
                    <span className="text-sm text-gray-600">
                      {program.completion_rate || 0}%
                    </span>
                  </div>
                  <Progress value={program.completion_rate || 0} className="h-2" />
                </div>

                {/* Program Details */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {formatDuration(program.estimated_duration_minutes || 30)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {program.target_frequency || 'Daily'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {program.target_completion_date && 
                        new Date(program.target_completion_date).toLocaleDateString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {language === 'ar' ? 'الصعوبة:' : 'Difficulty:'}
                    </span>
                    {getDifficultyIcon(program.difficulty_level || 'medium')}
                  </div>
                </div>

                {/* Latest Completion */}
                {program.last_completion && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {language === 'ar' ? 'آخر إتمام' : 'Latest Completion'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-green-700">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={cn(
                              "h-3 w-3",
                              i < (program.last_completion?.success_rating || 0) ? 
                                "text-yellow-400 fill-current" : "text-gray-300"
                            )} 
                          />
                        ))}
                        <span className="ml-1">{program.last_completion.success_rating}/5</span>
                      </div>
                      <span>
                        {new Date(program.last_completion.completion_date).toLocaleDateString(
                          language === 'ar' ? 'ar-SA' : 'en-US'
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedProgram(program)}
                    className="flex-1"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'التفاصيل' : 'Details'}
                  </Button>
                  
                  {(program.completion_rate || 0) < 100 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedProgram(program);
                        setShowCompletionForm(true);
                      }}
                      disabled={completeHomeProgramMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {language === 'ar' ? 'تسجيل الإنجاز' : 'Mark Complete'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Program Details Modal */}
      {selectedProgram && !showCompletionForm && (
        <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-2xl">
          <CardHeader className="sticky top-0 bg-white border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {language === 'ar' ? selectedProgram.program_name_ar : selectedProgram.program_name_en}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProgram(null)}
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            {/* Program Description */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {language === 'ar' ? 'الوصف' : 'Description'}
              </h4>
              <p className="text-gray-700 leading-relaxed">
                {language === 'ar' ? selectedProgram.description_ar : selectedProgram.description_en}
              </p>
            </div>

            {/* Instructions */}
            {selectedProgram.instructions_ar && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {language === 'ar' ? 'التعليمات' : 'Instructions'}
                </h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-900 leading-relaxed">
                    {language === 'ar' ? selectedProgram.instructions_ar : selectedProgram.instructions_en}
                  </p>
                </div>
              </div>
            )}

            {/* Materials Needed */}
            {selectedProgram.materials_needed && selectedProgram.materials_needed.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {language === 'ar' ? 'المواد المطلوبة' : 'Materials Needed'}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {selectedProgram.materials_needed.map((material, index) => (
                    <li key={index}>{material}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Completion History */}
            {selectedProgram.home_program_completions && selectedProgram.home_program_completions.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {language === 'ar' ? 'سجل الإنجاز' : 'Completion History'}
                </h4>
                <div className="space-y-3">
                  {selectedProgram.home_program_completions.map((completion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={cn(
                                "h-4 w-4",
                                i < completion.success_rating ? 
                                  "text-yellow-400 fill-current" : "text-gray-300"
                              )} 
                            />
                          ))}
                          <span className="text-sm font-medium">
                            {completion.success_rating}/5
                          </span>
                        </div>
                        <span className="text-sm text-gray-600">
                          {new Date(completion.completion_date).toLocaleDateString(
                            language === 'ar' ? 'ar-SA' : 'en-US'
                          )}
                        </span>
                      </div>
                      
                      {(completion.parent_notes_ar || completion.parent_notes_en) && (
                        <p className="text-sm text-gray-700 mt-2">
                          {language === 'ar' ? completion.parent_notes_ar : completion.parent_notes_en}
                        </p>
                      )}
                      
                      {completion.therapist_feedback_ar && (
                        <div className="mt-3 bg-green-50 border border-green-200 rounded p-3">
                          <p className="text-sm font-medium text-green-800 mb-1">
                            {language === 'ar' ? 'ملاحظات المعالج:' : 'Therapist Feedback:'}
                          </p>
                          <p className="text-sm text-green-700">
                            {language === 'ar' ? completion.therapist_feedback_ar : completion.therapist_feedback_en}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completion Form Modal */}
      {showCompletionForm && selectedProgram && (
        <Card className="fixed inset-4 z-50 overflow-auto bg-white shadow-2xl">
          <CardHeader className="sticky top-0 bg-white border-b">
            <div className="flex items-center justify-between">
              <CardTitle>
                {language === 'ar' ? 'تسجيل إنجاز البرنامج' : 'Record Program Completion'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCompletionForm(false)}
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {language === 'ar' ? selectedProgram.program_name_ar : selectedProgram.program_name_en}
              </h4>
              <p className="text-gray-600">
                {language === 'ar' ? selectedProgram.description_ar : selectedProgram.description_en}
              </p>
            </div>

            {/* Success Rating */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {language === 'ar' ? 'تقييم النجاح' : 'Success Rating'}
              </label>
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCompletionData(prev => ({ ...prev, success_rating: i + 1 }))}
                    className="focus:outline-none"
                  >
                    <Star 
                      className={cn(
                        "h-6 w-6 cursor-pointer transition-colors",
                        i < completionData.success_rating ? 
                          "text-yellow-400 fill-current" : "text-gray-300 hover:text-yellow-200"
                      )} 
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-gray-600">
                  {completionData.success_rating}/5
                </span>
              </div>
            </div>

            {/* Completion Date */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {language === 'ar' ? 'تاريخ الإنجاز' : 'Completion Date'}
              </label>
              <Input
                type="date"
                value={completionData.completion_date}
                onChange={(e) => setCompletionData(prev => ({ ...prev, completion_date: e.target.value }))}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}
              </label>
              <Textarea
                placeholder={language === 'ar' ? 
                  'اكتب ملاحظاتك حول أداء الطفل...' :
                  'Write your notes about the child\'s performance...'}
                value={language === 'ar' ? completionData.parent_notes_ar : completionData.parent_notes_en}
                onChange={(e) => setCompletionData(prev => ({
                  ...prev,
                  [language === 'ar' ? 'parent_notes_ar' : 'parent_notes_en']: e.target.value
                }))}
                rows={4}
              />
            </div>

            {/* Evidence Upload */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                {language === 'ar' ? 'إثبات الإنجاز (اختياري)' : 'Evidence of Completion (Optional)'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*,application/pdf"
                  onChange={handleEvidenceUpload}
                  className="hidden"
                  id="evidence-upload"
                />
                <label htmlFor="evidence-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {language === 'ar' ? 
                      'اضغط لرفع الصور أو مقاطع الفيديو' :
                      'Click to upload photos or videos'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'ar' ? 
                      'مدعوم: صور، فيديو، صوت، PDF (أقصى 50 ميجابايت)' :
                      'Supported: Images, Video, Audio, PDF (max 50MB)'}
                  </p>
                </label>
              </div>

              {/* Evidence Files Preview */}
              {evidenceFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    {language === 'ar' ? 'الملفات المرفقة:' : 'Attached Files:'}
                  </p>
                  {evidenceFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      {getFileIcon(file)}
                      <span className="text-sm text-gray-700 flex-1 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEvidenceFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-6 border-t">
              <Button
                onClick={() => handleCompleteProgram(selectedProgram.id)}
                disabled={completeHomeProgramMutation.isPending}
                className="flex-1"
              >
                {completeHomeProgramMutation.isPending ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                    {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'حفظ الإنجاز' : 'Save Completion'}
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setShowCompletionForm(false)}
                disabled={completeHomeProgramMutation.isPending}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HomeProgramManager;