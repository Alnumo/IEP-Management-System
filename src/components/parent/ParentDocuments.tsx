/**
 * Parent Documents Component
 * Secure document access system for parents with PDF support
 * نظام الوصول الآمن للمستندات لأولياء الأمور مع دعم PDF
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  Shield,
  Lock,
  Unlock,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  Share,
  Print,
  Bookmark,
  BookmarkCheck,
  FolderOpen,
  Archive,
  TrendingUp,
  Award,
  Activity,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useParentDocuments,
  useParentPortal,
  useTrackDocumentView,
  useTrackDocumentDownload
} from '@/hooks/useParentProgress';
import ConsentDialog from './ConsentDialog';
import { supabase } from '@/lib/supabase';
import type { 
  ParentDocument,
  DocumentType,
  DocumentCategory,
  Language 
} from '@/types/parent';

interface ParentDocumentsProps {
  className?: string;
}

interface DocumentFilters {
  category: 'all' | DocumentCategory;
  type: 'all' | DocumentType;
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year';
  status: 'all' | 'new' | 'viewed' | 'bookmarked';
}

interface DocumentViewerProps {
  document: ParentDocument;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const { language, isRTL } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleDocumentLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleDocumentError = () => {
    setIsLoading(false);
    setError(language === 'ar' ? 'فشل في تحميل المستند' : 'Failed to load document');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1" dir={isRTL ? 'rtl' : 'ltr'}>
            <h3 className="text-lg font-semibold text-gray-900">
              {language === 'ar' ? document.title_ar : document.title_en}
            </h3>
            <p className="text-sm text-gray-600">
              {language === 'ar' ? document.description_ar : document.description_en}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(document.file_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'فتح في علامة تبويب جديدة' : 'Open in new tab'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadDocument(document)}
              disabled={trackDownloadMutation.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'تحميل' : 'Download'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {language === 'ar' ? 'جاري تحميل المستند...' : 'Loading document...'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* PDF Embed */}
          {document.file_url && (
            <iframe
              src={`${document.file_url}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={document.title_en}
              onLoad={handleDocumentLoad}
              onError={handleDocumentError}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ParentDocuments: React.FC<ParentDocumentsProps> = ({ className }) => {
  const { language, isRTL } = useLanguage();
  const [selectedDocument, setSelectedDocument] = useState<ParentDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [consentDialog, setConsentDialog] = useState<{
    isOpen: boolean;
    document: ParentDocument | null;
    action: 'view' | 'download';
  }>({
    isOpen: false,
    document: null,
    action: 'view'
  });
  const [filters, setFilters] = useState<DocumentFilters>({
    category: 'all',
    type: 'all',
    dateRange: 'all',
    status: 'all'
  });
  const [bookmarkedDocs, setBookmarkedDocs] = useState<Set<string>>(new Set());

  // Get comprehensive parent portal data
  const { profile, isLoading: isProfileLoading } = useParentPortal();
  const parentId = profile?.id;

  // Get documents with real-time updates
  const {
    data: documents = [],
    isLoading: isDocumentsLoading,
    error: documentsError,
    refetch: refetchDocuments
  } = useParentDocuments(parentId || '');

  // Document tracking mutations
  const trackViewMutation = useTrackDocumentView();
  const trackDownloadMutation = useTrackDocumentDownload();

  // Handler functions
  const checkDocumentSensitivity = (document: ParentDocument) => {
    // Check if document requires consent based on category or explicit flag
    const sensitiveCategories = ['medical_records', 'assessment_reports', 'psychological_evaluations'];
    return document.is_sensitive || 
           sensitiveCategories.includes(document.category) ||
           document.security_classification === 'restricted' ||
           document.security_classification === 'top_secret';
  };

  const getConsentType = (document: ParentDocument): 'sensitive_document_access' | 'medical_records_access' | 'assessment_reports_access' => {
    if (document.category === 'medical_records') return 'medical_records_access';
    if (document.category === 'assessment_reports') return 'assessment_reports_access';
    return 'sensitive_document_access';
  };

  const handleViewDocument = (document: ParentDocument) => {
    if (checkDocumentSensitivity(document)) {
      setConsentDialog({
        isOpen: true,
        document,
        action: 'view'
      });
    } else {
      setSelectedDocument(document);
      if (parentId) {
        trackViewMutation.mutate({ documentId: document.id, parentId });
      }
    }
  };

  const handleDownloadDocument = (document: ParentDocument) => {
    if (checkDocumentSensitivity(document)) {
      setConsentDialog({
        isOpen: true,
        document,
        action: 'download'
      });
    } else if (parentId) {
      trackDownloadMutation.mutate({ documentId: document.id, parentId });
    }
  };

  const handleConsentGiven = async (consentData: any) => {
    if (!consentDialog.document || !parentId) return;

    try {
      // First record the consent
      const { error: consentError } = await supabase
        .from('parent_consent_log')
        .insert({
          parent_id: parentId,
          student_id: consentDialog.document.student_id,
          consent_type: getConsentType(consentDialog.document),
          consent_details: {
            ...consentData.consent_details,
            document_id: consentDialog.document.id
          },
          expires_at: consentData.expires_at,
          ip_address: null, // Will be populated by RLS if available
          user_agent: navigator.userAgent
        });

      if (consentError) {
        throw new Error('Failed to record consent');
      }

      // Then proceed with the requested action
      if (consentDialog.action === 'view') {
        setSelectedDocument(consentDialog.document);
        trackViewMutation.mutate({ 
          documentId: consentDialog.document.id, 
          parentId 
        });
      } else if (consentDialog.action === 'download') {
        trackDownloadMutation.mutate({ 
          documentId: consentDialog.document.id, 
          parentId 
        });
      }

      // Close consent dialog
      setConsentDialog({
        isOpen: false,
        document: null,
        action: 'view'
      });

    } catch (error) {
      console.error('Error handling consent:', error);
      // Handle error - maybe show a toast notification
    }
  };

  // Filter and search documents
  const { filteredDocuments, documentStats } = useMemo(() => {
    let filtered = [...documents];

    // Text search
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => {
        const title = language === 'ar' ? 
          doc.title_ar?.toLowerCase() : 
          doc.title_en?.toLowerCase();
        const description = language === 'ar' ? 
          doc.description_ar?.toLowerCase() : 
          doc.description_en?.toLowerCase();
        const therapistName = language === 'ar' ? 
          doc.created_by_name_ar?.toLowerCase() : 
          doc.created_by_name_en?.toLowerCase();
        
        return title?.includes(searchTerm) || 
               description?.includes(searchTerm) ||
               therapistName?.includes(searchTerm);
      });
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(doc => doc.category === filters.category);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === filters.type);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const getDateThreshold = () => {
        switch (filters.dateRange) {
          case 'today':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
          case 'week':
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return weekAgo;
          case 'month':
            const monthAgo = new Date(now);
            monthAgo.setMonth(now.getMonth() - 1);
            return monthAgo;
          case 'quarter':
            const quarterAgo = new Date(now);
            quarterAgo.setMonth(now.getMonth() - 3);
            return quarterAgo;
          case 'year':
            const yearAgo = new Date(now);
            yearAgo.setFullYear(now.getFullYear() - 1);
            return yearAgo;
          default:
            return new Date(0);
        }
      };

      const threshold = getDateThreshold();
      filtered = filtered.filter(doc => 
        new Date(doc.created_at) >= threshold
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      switch (filters.status) {
        case 'new':
          filtered = filtered.filter(doc => !doc.viewed_at);
          break;
        case 'viewed':
          filtered = filtered.filter(doc => !!doc.viewed_at);
          break;
        case 'bookmarked':
          filtered = filtered.filter(doc => bookmarkedDocs.has(doc.id));
          break;
      }
    }

    // Sort by created date (newest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Calculate stats
    const stats = {
      total: documents.length,
      new: documents.filter(doc => !doc.viewed_at).length,
      viewed: documents.filter(doc => !!doc.viewed_at).length,
      bookmarked: documents.filter(doc => bookmarkedDocs.has(doc.id)).length,
      thisMonth: documents.filter(doc => {
        const docDate = new Date(doc.created_at);
        const now = new Date();
        return docDate.getMonth() === now.getMonth() && 
               docDate.getFullYear() === now.getFullYear();
      }).length
    };

    return { filteredDocuments: filtered, documentStats: stats };
  }, [documents, searchQuery, filters, language, bookmarkedDocs]);

  // Group documents by category
  const groupedDocuments = useMemo(() => {
    const groups: { [key: string]: ParentDocument[] } = {};
    
    filteredDocuments.forEach(doc => {
      const category = doc.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(doc);
    });

    return groups;
  }, [filteredDocuments]);

  const getDocumentIcon = (type: DocumentType) => {
    const iconProps = { className: "h-4 w-4" };
    
    switch (type) {
      case 'assessment':
        return <Activity {...iconProps} className="h-4 w-4 text-blue-500" />;
      case 'report':
        return <TrendingUp {...iconProps} className="h-4 w-4 text-green-500" />;
      case 'session_summary':
        return <Clock {...iconProps} className="h-4 w-4 text-purple-500" />;
      case 'iep':
        return <Award {...iconProps} className="h-4 w-4 text-yellow-500" />;
      case 'medical':
        return <Shield {...iconProps} className="h-4 w-4 text-red-500" />;
      case 'administrative':
        return <Settings {...iconProps} className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText {...iconProps} className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryLabel = (category: DocumentCategory) => {
    const labels = {
      ar: {
        assessment: 'التقييمات',
        therapy: 'العلاج',
        progress: 'التقدم',
        medical: 'طبي',
        administrative: 'إداري',
        other: 'أخرى'
      },
      en: {
        assessment: 'Assessments',
        therapy: 'Therapy',
        progress: 'Progress',
        medical: 'Medical',
        administrative: 'Administrative',
        other: 'Other'
      }
    };
    return labels[language][category] || category;
  };

  const getDocumentTypeLabel = (type: DocumentType) => {
    const labels = {
      ar: {
        assessment: 'تقييم',
        report: 'تقرير',
        session_summary: 'ملخص جلسة',
        iep: 'خطة تعليمية فردية',
        medical: 'مستند طبي',
        administrative: 'مستند إداري',
        other: 'أخرى'
      },
      en: {
        assessment: 'Assessment',
        report: 'Report',
        session_summary: 'Session Summary',
        iep: 'IEP Document',
        medical: 'Medical Document',
        administrative: 'Administrative',
        other: 'Other'
      }
    };
    return labels[language][type] || type;
  };

  const toggleBookmark = (documentId: string) => {
    setBookmarkedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return isRTL ? 
      date.toLocaleDateString('ar-SA', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }) :
      date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
  };

  if (isProfileLoading || isDocumentsLoading) {
    return (
      <div className={cn("space-y-6", className)} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Documents Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
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

  if (documentsError) {
    return (
      <Alert variant="destructive" className={cn("max-w-2xl mx-auto", className)}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {language === 'ar' ? 'خطأ في تحميل المستندات' : 'Error loading documents'}
          <br />
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchDocuments()}
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
            <FolderOpen className="h-6 w-6 text-blue-600" />
            {language === 'ar' ? 'المستندات' : 'Documents'}
          </h1>
          <p className="text-gray-600 mt-1">
            {language === 'ar' ? 
              'الوصول إلى التقارير والتقييمات ومستندات العلاج' :
              'Access therapy reports, assessments, and treatment documents'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={language === 'ar' ? 
                'البحث في المستندات...' : 
                'Search documents...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {language === 'ar' ? 'الفئة' : 'Category'}
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">
                  {language === 'ar' ? 'جميع الفئات' : 'All Categories'}
                </option>
                <option value="assessment">{getCategoryLabel('assessment')}</option>
                <option value="therapy">{getCategoryLabel('therapy')}</option>
                <option value="progress">{getCategoryLabel('progress')}</option>
                <option value="medical">{getCategoryLabel('medical')}</option>
                <option value="administrative">{getCategoryLabel('administrative')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {language === 'ar' ? 'النوع' : 'Type'}
              </label>
              <select
                value={filters.type}
                onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">
                  {language === 'ar' ? 'جميع الأنواع' : 'All Types'}
                </option>
                <option value="assessment">{getDocumentTypeLabel('assessment')}</option>
                <option value="report">{getDocumentTypeLabel('report')}</option>
                <option value="session_summary">{getDocumentTypeLabel('session_summary')}</option>
                <option value="iep">{getDocumentTypeLabel('iep')}</option>
                <option value="medical">{getDocumentTypeLabel('medical')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {language === 'ar' ? 'الفترة الزمنية' : 'Date Range'}
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">{language === 'ar' ? 'جميع التواريخ' : 'All Dates'}</option>
                <option value="today">{language === 'ar' ? 'اليوم' : 'Today'}</option>
                <option value="week">{language === 'ar' ? 'آخر أسبوع' : 'Past Week'}</option>
                <option value="month">{language === 'ar' ? 'آخر شهر' : 'Past Month'}</option>
                <option value="quarter">{language === 'ar' ? 'آخر 3 أشهر' : 'Past 3 Months'}</option>
                <option value="year">{language === 'ar' ? 'آخر سنة' : 'Past Year'}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {language === 'ar' ? 'الحالة' : 'Status'}
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</option>
                <option value="new">{language === 'ar' ? 'جديد' : 'New'}</option>
                <option value="viewed">{language === 'ar' ? 'تم العرض' : 'Viewed'}</option>
                <option value="bookmarked">{language === 'ar' ? 'مفضل' : 'Bookmarked'}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'إجمالي المستندات' : 'Total Documents'}
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {documentStats.total}
                </p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'جديدة' : 'New'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {documentStats.new}
                </p>
              </div>
              <Eye className="h-8 w-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'تم العرض' : 'Viewed'}
                </p>
                <p className="text-2xl font-bold text-yellow-600">
                  {documentStats.viewed}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-yellow-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'مفضلة' : 'Bookmarked'}
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {documentStats.bookmarked}
                </p>
              </div>
              <Bookmark className="h-8 w-8 text-purple-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ar' ? 'هذا الشهر' : 'This Month'}
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {documentStats.thisMonth}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Grid */}
      {filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {language === 'ar' ? 'لا توجد مستندات' : 'No documents found'}
            </h3>
            <p className="text-gray-600">
              {language === 'ar' ? 
                'لم يتم العثور على مستندات تطابق المعايير المحددة' :
                'No documents found matching the specified criteria'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getDocumentIcon(document.document_type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {language === 'ar' ? document.title_ar : document.title_en}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {getDocumentTypeLabel(document.document_type)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!document.viewed_at && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        {language === 'ar' ? 'جديد' : 'New'}
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBookmark(document.id)}
                      className="text-gray-400 hover:text-yellow-500"
                    >
                      {bookmarkedDocs.has(document.id) ? (
                        <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 line-clamp-3 mb-4">
                  {language === 'ar' ? document.description_ar : document.description_en}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>
                      {language === 'ar' ? 
                        document.created_by_name_ar || document.created_by_name_en :
                        document.created_by_name_en || document.created_by_name_ar}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(document.created_at)}</span>
                  </div>
                  
                  {document.file_size && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{formatFileSize(document.file_size)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(document)}
                    className="flex-1"
                    disabled={trackViewMutation.isPending}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'عرض' : 'View'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument(document)}
                    disabled={trackDownloadMutation.isPending}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تحميل' : 'Download'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results Summary */}
      {filteredDocuments.length > 0 && (
        <div className="text-center pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            {language === 'ar' ? 
              `عرض ${filteredDocuments.length} من أصل ${documents.length} مستند` :
              `Showing ${filteredDocuments.length} of ${documents.length} documents`}
          </p>
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      )}

      {/* Consent Dialog for Sensitive Documents */}
      {consentDialog.document && (
        <ConsentDialog
          isOpen={consentDialog.isOpen}
          onClose={() => setConsentDialog({
            isOpen: false,
            document: null,
            action: 'view'
          })}
          onConsent={handleConsentGiven}
          documentTitle={language === 'ar' ? consentDialog.document.title : consentDialog.document.title_en}
          documentTitleEn={consentDialog.document.title_en}
          consentType={getConsentType(consentDialog.document)}
          isLoading={trackViewMutation.isPending || trackDownloadMutation.isPending}
        />
      )}
    </div>
  );
};

export default ParentDocuments;