/**
 * IEP Archive Manager Component
 * مدير أرشيف البرنامج التعليمي الفردي
 * 
 * @description Comprehensive IEP archive and retrieval system with full version history, search, and restore capabilities
 * نظام أرشفة واسترجاع شامل للبرنامج التعليمي الفردي مع سجل الإصدارات الكامل والبحث وإمكانيات الاستعادة
 */

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  Archive,
  ArchiveRestore,
  Search,
  Filter,
  Calendar,
  FileText,
  User,
  Clock,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  History,
  Settings,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  XCircle,
  Package,
  FolderArchive,
  Undo2,
  HardDrive,
  Database,
  ChevronDown,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Star,
  Tag,
  Shield
} from 'lucide-react'

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type ArchiveStatus = 
  | 'active'
  | 'archived'
  | 'soft_deleted'
  | 'permanently_deleted'

export type ArchiveReason = 
  | 'completed_program'
  | 'student_graduated'
  | 'student_transferred'
  | 'program_discontinued'
  | 'legal_retention'
  | 'compliance_requirement'
  | 'manual_archive'
  | 'bulk_operation'

export type RetentionPolicy = 
  | 'indefinite'
  | '1_year'
  | '3_years' 
  | '5_years'
  | '7_years'
  | '10_years'
  | 'custom'

export interface ArchivedIEP {
  id: string
  original_iep_id: string
  student_id: string
  
  // Student Information
  student_name_ar: string
  student_name_en: string
  student_identifier: string
  
  // IEP Details
  iep_title_ar: string
  iep_title_en: string
  academic_year: string
  iep_type: 'initial' | 'annual' | 'triennial' | 'amendment'
  
  // Archive Information
  archive_status: ArchiveStatus
  archive_reason: ArchiveReason
  archive_date: string
  archived_by: string
  archived_by_name: string
  
  // Retention Information
  retention_policy: RetentionPolicy
  retention_until: string | null
  legal_hold: boolean
  
  // Version Information
  version_number: number
  total_versions: number
  last_modified: string
  last_modified_by: string
  
  // Content Summary
  content_summary_ar?: string
  content_summary_en?: string
  goals_count: number
  services_count: number
  accommodations_count: number
  
  // File Information
  archive_size: number // bytes
  archive_format: 'json' | 'pdf' | 'xml' | 'compressed'
  archive_location: string
  backup_locations: string[]
  
  // Compliance Information
  compliance_category: string[]
  legal_requirements: string[]
  audit_trail_included: boolean
  
  // Restore Information
  can_restore: boolean
  restore_restrictions: string[]
  last_accessed: string | null
  access_count: number
  
  // Tags and Metadata
  tags: string[]
  metadata: Record<string, any>
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface ArchiveOperation {
  id: string
  operation_type: 'archive' | 'restore' | 'delete' | 'bulk_archive' | 'bulk_restore'
  
  // Operation Details
  target_ieps: string[]
  operation_status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  
  // Configuration
  archive_reason: ArchiveReason
  retention_policy: RetentionPolicy
  include_versions: boolean
  include_attachments: boolean
  
  // Progress Tracking
  total_count: number
  processed_count: number
  successful_count: number
  failed_count: number
  error_messages: string[]
  
  // Operator Information
  initiated_by: string
  initiated_by_name: string
  initiated_at: string
  completed_at?: string
  
  // Metadata
  estimated_duration: number
  actual_duration?: number
  archive_size_estimate: number
  actual_archive_size?: number
}

interface IEPArchiveManagerProps {
  language: 'ar' | 'en'
  currentUserId: string
  userRole: string
  className?: string
  onArchiveUpdated?: () => void
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const getStatusColor = (status: ArchiveStatus): string => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'archived':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'soft_deleted':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'permanently_deleted':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusIcon = (status: ArchiveStatus) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="h-4 w-4" />
    case 'archived':
      return <Archive className="h-4 w-4" />
    case 'soft_deleted':
      return <AlertCircle className="h-4 w-4" />
    case 'permanently_deleted':
      return <XCircle className="h-4 w-4" />
    default:
      return <FileText className="h-4 w-4" />
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string, language: 'ar' | 'en'): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const IEPArchiveManager: React.FC<IEPArchiveManagerProps> = ({
  language = 'ar',
  currentUserId,
  userRole,
  className,
  onArchiveUpdated
}) => {
  const isRTL = language === 'ar'
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('archived')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ArchiveStatus>('all')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<'all' | ArchiveReason>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  
  // Dialog states
  const [archiveDialog, setArchiveDialog] = useState(false)
  const [restoreDialog, setRestoreDialog] = useState<ArchivedIEP | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<ArchivedIEP | null>(null)
  const [bulkDialog, setBulkDialog] = useState(false)
  const [operationDialog, setOperationDialog] = useState<ArchiveOperation | null>(null)
  
  // Sample data - would be fetched from API
  const [archivedIEPs] = useState<ArchivedIEP[]>([
    {
      id: '1',
      original_iep_id: 'iep_123',
      student_id: 'student_456',
      student_name_ar: 'أحمد محمد علي',
      student_name_en: 'Ahmed Mohammed Ali',
      student_identifier: 'STU-2023-001',
      iep_title_ar: 'برنامج تعليمي فردي - اضطرابات التواصل',
      iep_title_en: 'Individual Education Program - Communication Disorders',
      academic_year: '2022-2023',
      iep_type: 'annual',
      archive_status: 'archived',
      archive_reason: 'completed_program',
      archive_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      archived_by: currentUserId,
      archived_by_name: 'د. سارة أحمد',
      retention_policy: '7_years',
      retention_until: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      legal_hold: false,
      version_number: 3,
      total_versions: 5,
      last_modified: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      last_modified_by: 'teacher_123',
      content_summary_ar: 'برنامج مكتمل يركز على تطوير مهارات التواصل والنطق',
      content_summary_en: 'Completed program focusing on communication and speech development',
      goals_count: 8,
      services_count: 4,
      accommodations_count: 12,
      archive_size: 2048000, // ~2MB
      archive_format: 'json',
      archive_location: '/archives/2023/iep_123_v3.json',
      backup_locations: ['/backup1/iep_123_v3.json', '/backup2/iep_123_v3.json'],
      compliance_category: ['IDEA_2024', 'FERPA', 'Saudi_PDPL'],
      legal_requirements: ['7_year_retention', 'audit_trail'],
      audit_trail_included: true,
      can_restore: true,
      restore_restrictions: [],
      last_accessed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      access_count: 3,
      tags: ['communication', 'speech', 'completed'],
      metadata: { priority: 'normal', category: 'therapy' },
      created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      original_iep_id: 'iep_789',
      student_id: 'student_101',
      student_name_ar: 'فاطمة خالد محمد',
      student_name_en: 'Fatima Khalid Mohammed',
      student_identifier: 'STU-2021-045',
      iep_title_ar: 'برنامج تعليمي فردي - صعوبات التعلم',
      iep_title_en: 'Individual Education Program - Learning Difficulties',
      academic_year: '2020-2021',
      iep_type: 'triennial',
      archive_status: 'archived',
      archive_reason: 'student_graduated',
      archive_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
      archived_by: 'coordinator_456',
      archived_by_name: 'أ. محمد أحمد',
      retention_policy: '10_years',
      retention_until: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      legal_hold: true,
      version_number: 5,
      total_versions: 7,
      last_modified: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      last_modified_by: 'teacher_789',
      content_summary_ar: 'برنامج متخصص لصعوبات التعلم مع تركيز على القراءة والكتابة',
      content_summary_en: 'Specialized program for learning difficulties focusing on reading and writing',
      goals_count: 12,
      services_count: 6,
      accommodations_count: 18,
      archive_size: 4096000, // ~4MB
      archive_format: 'json',
      archive_location: '/archives/2021/iep_789_v5.json',
      backup_locations: ['/backup1/iep_789_v5.json', '/backup2/iep_789_v5.json'],
      compliance_category: ['IDEA_2024', 'FERPA', 'Saudi_PDPL'],
      legal_requirements: ['10_year_retention', 'legal_hold', 'audit_trail'],
      audit_trail_included: true,
      can_restore: false,
      restore_restrictions: ['legal_hold_active', 'compliance_review_required'],
      last_accessed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      access_count: 8,
      tags: ['learning_difficulties', 'reading', 'writing', 'graduated'],
      metadata: { priority: 'high', category: 'academic' },
      created_at: new Date(Date.now() - 1095 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    }
  ])

  const [archiveOperations] = useState<ArchiveOperation[]>([
    {
      id: 'op_1',
      operation_type: 'bulk_archive',
      target_ieps: ['iep_123', 'iep_456', 'iep_789'],
      operation_status: 'completed',
      archive_reason: 'completed_program',
      retention_policy: '7_years',
      include_versions: true,
      include_attachments: true,
      total_count: 3,
      processed_count: 3,
      successful_count: 3,
      failed_count: 0,
      error_messages: [],
      initiated_by: currentUserId,
      initiated_by_name: 'د. سارة أحمد',
      initiated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 300000).toISOString(),
      estimated_duration: 300, // 5 minutes
      actual_duration: 280, // 4 minutes 40 seconds
      archive_size_estimate: 8000000, // ~8MB
      actual_archive_size: 7500000 // ~7.5MB
    }
  ])

  // Filtered and sorted data
  const filteredItems = useMemo(() => {
    let filtered = archivedIEPs.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.student_name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student_name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.iep_title_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.iep_title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student_identifier.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || item.archive_status === statusFilter
      const matchesYear = yearFilter === 'all' || item.academic_year.includes(yearFilter)
      const matchesReason = reasonFilter === 'all' || item.archive_reason === reasonFilter
      
      return matchesSearch && matchesStatus && matchesYear && matchesReason
    })

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.archive_date).getTime() - new Date(b.archive_date).getTime()
          break
        case 'name':
          comparison = (language === 'ar' ? a.student_name_ar : a.student_name_en)
            .localeCompare(language === 'ar' ? b.student_name_ar : b.student_name_en)
          break
        case 'size':
          comparison = a.archive_size - b.archive_size
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [archivedIEPs, searchQuery, statusFilter, yearFilter, reasonFilter, sortBy, sortOrder, language])

  // Event handlers
  const handleArchive = async (iepIds: string[], reason: ArchiveReason, retentionPolicy: RetentionPolicy) => {
    console.log('Archiving IEPs:', iepIds, 'Reason:', reason, 'Retention:', retentionPolicy)
    onArchiveUpdated?.()
  }

  const handleRestore = async (archivedIEP: ArchivedIEP) => {
    console.log('Restoring IEP:', archivedIEP.id)
    setRestoreDialog(null)
    onArchiveUpdated?.()
  }

  const handleDelete = async (archivedIEP: ArchivedIEP, permanent: boolean = false) => {
    console.log('Deleting IEP:', archivedIEP.id, 'Permanent:', permanent)
    setDeleteDialog(null)
    onArchiveUpdated?.()
  }

  const handleBulkOperation = async (operation: string) => {
    console.log('Bulk operation:', operation, 'Selected items:', selectedItems)
    setBulkDialog(false)
    setSelectedItems([])
    onArchiveUpdated?.()
  }

  const toggleItemSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleAllSelection = () => {
    setSelectedItems(
      selectedItems.length === filteredItems.length ? [] : filteredItems.map(item => item.id)
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between",
        isRTL && "flex-row-reverse"
      )}>
        <div>
          <h2 className="text-2xl font-bold">
            {isRTL ? 'مدير الأرشيف والاسترجاع' : 'Archive & Retrieval Manager'}
          </h2>
          <p className="text-muted-foreground">
            {isRTL 
              ? 'إدارة أرشيف الخطط التعليمية الفردية والاسترجاع مع سجل الإصدارات الكامل'
              : 'Manage IEP archives and retrieval with complete version history'
            }
          </p>
        </div>
        <div className={cn(
          "flex items-center gap-2",
          isRTL && "flex-row-reverse"
        )}>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => console.log('Refresh')}>
            <RefreshCw className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
          <Button size="sm" onClick={() => setArchiveDialog(true)}>
            <Archive className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
            {isRTL ? 'أرشفة جديدة' : 'New Archive'}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'المؤرشفة' : 'Archived'}
                </p>
                <p className="text-2xl font-bold">
                  {archivedIEPs.filter(item => item.archive_status === 'archived').length}
                </p>
              </div>
              <Archive className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'قابلة للاستعادة' : 'Restorable'}
                </p>
                <p className="text-2xl font-bold">
                  {archivedIEPs.filter(item => item.can_restore).length}
                </p>
              </div>
              <ArchiveRestore className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'حجم الأرشيف' : 'Archive Size'}
                </p>
                <p className="text-2xl font-bold">
                  {formatFileSize(archivedIEPs.reduce((sum, item) => sum + item.archive_size, 0))}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'الإصدارات المحفوظة' : 'Versions Stored'}
                </p>
                <p className="text-2xl font-bold">
                  {archivedIEPs.reduce((sum, item) => sum + item.total_versions, 0)}
                </p>
              </div>
              <Database className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="archived">
            {isRTL ? 'المؤرشفة' : 'Archived'}
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {archivedIEPs.filter(item => item.archive_status === 'archived').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="operations">
            {isRTL ? 'العمليات' : 'Operations'}
          </TabsTrigger>
          <TabsTrigger value="settings">
            {isRTL ? 'الإعدادات' : 'Settings'}
          </TabsTrigger>
        </TabsList>

        <div className="space-y-4">
          {/* Filters and Search */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="search">{isRTL ? 'البحث' : 'Search'}</Label>
                  <div className="relative">
                    <Search className={cn(
                      "absolute top-3 h-4 w-4 text-muted-foreground",
                      isRTL ? "right-3" : "left-3"
                    )} />
                    <Input
                      id="search"
                      placeholder={isRTL ? 'ابحث في الأرشيف...' : 'Search archive...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(isRTL ? "pr-9" : "pl-9")}
                    />
                  </div>
                </div>

                <div>
                  <Label>{isRTL ? 'الحالة' : 'Status'}</Label>
                  <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                      <SelectItem value="archived">{isRTL ? 'مؤرشف' : 'Archived'}</SelectItem>
                      <SelectItem value="soft_deleted">{isRTL ? 'محذوف مؤقتاً' : 'Soft Deleted'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'السنة الأكاديمية' : 'Academic Year'}</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isRTL ? 'جميع السنوات' : 'All Years'}</SelectItem>
                      <SelectItem value="2023">2023-2024</SelectItem>
                      <SelectItem value="2022">2022-2023</SelectItem>
                      <SelectItem value="2021">2021-2022</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{isRTL ? 'ترتيب بواسطة' : 'Sort By'}</Label>
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">{isRTL ? 'التاريخ' : 'Date'}</SelectItem>
                      <SelectItem value="name">{isRTL ? 'الاسم' : 'Name'}</SelectItem>
                      <SelectItem value="size">{isRTL ? 'الحجم' : 'Size'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </Button>
                  {selectedItems.length > 0 && (
                    <Button size="sm" onClick={() => setBulkDialog(true)}>
                      <Package className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
                      {isRTL ? 'عمليات مجمعة' : 'Bulk Actions'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="archived" className="space-y-4">
            {/* Selection header */}
            {filteredItems.length > 0 && (
              <div className={cn(
                "flex items-center justify-between p-4 bg-muted/50 rounded-lg",
                isRTL && "flex-row-reverse"
              )}>
                <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                  <Checkbox
                    checked={selectedItems.length === filteredItems.length}
                    onCheckedChange={toggleAllSelection}
                  />
                  <span className="text-sm">
                    {selectedItems.length > 0 
                      ? (isRTL 
                          ? `تم تحديد ${selectedItems.length} من ${filteredItems.length}` 
                          : `${selectedItems.length} of ${filteredItems.length} selected`)
                      : (isRTL ? 'تحديد الكل' : 'Select All')
                    }
                  </span>
                </div>
                {selectedItems.length > 0 && (
                  <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
                    <Button variant="outline" size="sm" onClick={() => setSelectedItems([])}>
                      {isRTL ? 'إلغاء التحديد' : 'Clear Selection'}
                    </Button>
                    <Button size="sm" onClick={() => setBulkDialog(true)}>
                      {isRTL ? 'عمليات مجمعة' : 'Bulk Actions'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Archive List */}
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <Card key={item.id} className={selectedItems.includes(item.id) ? 'border-primary bg-primary/5' : ''}>
                  <CardContent className="p-6">
                    <div className={cn(
                      "flex items-start gap-4",
                      isRTL && "flex-row-reverse"
                    )}>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                      />
                      
                      <div className="flex-1">
                        <div className={cn(
                          "flex items-start justify-between mb-3",
                          isRTL && "flex-row-reverse"
                        )}>
                          <div>
                            <div className={cn(
                              "flex items-center gap-3 mb-2",
                              isRTL && "flex-row-reverse"
                            )}>
                              <h3 className="text-lg font-semibold">
                                {language === 'ar' ? item.student_name_ar : item.student_name_en}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {item.student_identifier}
                              </Badge>
                              <Badge className={getStatusColor(item.archive_status)}>
                                {getStatusIcon(item.archive_status)}
                                {isRTL 
                                  ? item.archive_status === 'archived' ? 'مؤرشف'
                                    : item.archive_status === 'soft_deleted' ? 'محذوف مؤقتاً'
                                    : 'نشط'
                                  : item.archive_status.replace(/_/g, ' ')
                                }
                              </Badge>
                              {item.legal_hold && (
                                <Badge variant="destructive" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  {isRTL ? 'حفظ قانوني' : 'Legal Hold'}
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm font-medium mb-1">
                              {language === 'ar' ? item.iep_title_ar : item.iep_title_en}
                            </p>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {language === 'ar' ? item.content_summary_ar : item.content_summary_en}
                            </p>
                            
                            <div className={cn(
                              "flex items-center gap-4 text-sm text-muted-foreground",
                              isRTL && "flex-row-reverse"
                            )}>
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Calendar className="h-4 w-4" />
                                {item.academic_year}
                              </span>
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <Archive className="h-4 w-4" />
                                {formatDate(item.archive_date, language)}
                              </span>
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <HardDrive className="h-4 w-4" />
                                {formatFileSize(item.archive_size)}
                              </span>
                              <span className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
                                <History className="h-4 w-4" />
                                {item.total_versions} {isRTL ? 'إصدارات' : 'versions'}
                              </span>
                            </div>
                            
                            {/* Tags */}
                            <div className={cn(
                              "flex items-center gap-2 mt-2",
                              isRTL && "flex-row-reverse"
                            )}>
                              {item.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </Badge>
                              ))}
                              {item.tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                {isRTL ? 'الإجراءات' : 'Actions'}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => console.log('View details')}>
                                <Eye className="h-4 w-4 mr-2" />
                                {isRTL ? 'عرض التفاصيل' : 'View Details'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => console.log('Download')}>
                                <Download className="h-4 w-4 mr-2" />
                                {isRTL ? 'تحميل' : 'Download'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => console.log('View versions')}>
                                <History className="h-4 w-4 mr-2" />
                                {isRTL ? 'عرض الإصدارات' : 'View Versions'}
                              </DropdownMenuItem>
                              {item.can_restore && (
                                <DropdownMenuItem onClick={() => setRestoreDialog(item)}>
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                  {isRTL ? 'استعادة' : 'Restore'}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteDialog(item)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isRTL ? 'حذف' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Progress indicators for goals, services, accommodations */}
                        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600">{item.goals_count}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'أهداف' : 'Goals'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{item.services_count}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'خدمات' : 'Services'}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-purple-600">{item.accommodations_count}</p>
                            <p className="text-xs text-muted-foreground">{isRTL ? 'تسهيلات' : 'Accommodations'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <FolderArchive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{isRTL ? 'لا توجد عناصر مؤرشفة' : 'No archived items found'}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="operations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'عمليات الأرشفة' : 'Archive Operations'}</CardTitle>
                <CardDescription>
                  {isRTL 
                    ? 'تتبع حالة عمليات الأرشفة والاستعادة'
                    : 'Track status of archive and restore operations'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {archiveOperations.map((operation) => (
                    <div key={operation.id} className="border rounded-lg p-4">
                      <div className={cn(
                        "flex items-center justify-between mb-3",
                        isRTL && "flex-row-reverse"
                      )}>
                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                          <h3 className="font-medium">
                            {isRTL 
                              ? operation.operation_type === 'bulk_archive' ? 'أرشفة مجمعة'
                                : operation.operation_type === 'bulk_restore' ? 'استعادة مجمعة'
                                : 'عملية مجمعة'
                              : operation.operation_type.replace(/_/g, ' ')
                            }
                          </h3>
                          <Badge className={
                            operation.operation_status === 'completed' ? 'bg-green-100 text-green-800' :
                            operation.operation_status === 'failed' ? 'bg-red-100 text-red-800' :
                            operation.operation_status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {isRTL 
                              ? operation.operation_status === 'completed' ? 'مكتملة'
                                : operation.operation_status === 'failed' ? 'فشلت'
                                : operation.operation_status === 'in_progress' ? 'قيد التنفيذ'
                                : 'في الانتظار'
                              : operation.operation_status.replace(/_/g, ' ')
                            }
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(operation.initiated_at, language)}
                        </span>
                      </div>
                      
                      <div className={cn(
                        "flex items-center justify-between mb-2",
                        isRTL && "flex-row-reverse"
                      )}>
                        <span className="text-sm">
                          {isRTL ? 'التقدم' : 'Progress'}: {operation.successful_count}/{operation.total_count}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((operation.successful_count / operation.total_count) * 100)}%
                        </span>
                      </div>
                      
                      <Progress 
                        value={(operation.successful_count / operation.total_count) * 100} 
                        className="h-2"
                      />
                      
                      <div className={cn(
                        "flex items-center gap-4 mt-3 text-sm text-muted-foreground",
                        isRTL && "flex-row-reverse"
                      )}>
                        <span>
                          {isRTL ? 'المدة:' : 'Duration:'} {operation.actual_duration || operation.estimated_duration}s
                        </span>
                        <span>
                          {isRTL ? 'الحجم:' : 'Size:'} {formatFileSize(operation.actual_archive_size || operation.archive_size_estimate)}
                        </span>
                        <span>
                          {isRTL ? 'بواسطة:' : 'By:'} {operation.initiated_by_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{isRTL ? 'إعدادات الأرشيف' : 'Archive Settings'}</CardTitle>
                <CardDescription>
                  {isRTL 
                    ? 'تكوين سياسات الاحتفاظ والأرشفة التلقائية'
                    : 'Configure retention policies and automatic archiving'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-medium">
                    {isRTL ? 'سياسة الاحتفاظ الافتراضية' : 'Default Retention Policy'}
                  </Label>
                  <Select defaultValue="7_years">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1_year">{isRTL ? 'سنة واحدة' : '1 Year'}</SelectItem>
                      <SelectItem value="3_years">{isRTL ? '3 سنوات' : '3 Years'}</SelectItem>
                      <SelectItem value="5_years">{isRTL ? '5 سنوات' : '5 Years'}</SelectItem>
                      <SelectItem value="7_years">{isRTL ? '7 سنوات' : '7 Years'}</SelectItem>
                      <SelectItem value="10_years">{isRTL ? '10 سنوات' : '10 Years'}</SelectItem>
                      <SelectItem value="indefinite">{isRTL ? 'إلى الأبد' : 'Indefinite'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">
                    {isRTL ? 'الأرشفة التلقائية' : 'Automatic Archiving'}
                  </Label>
                  <div className="space-y-4 mt-3">
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div>
                        <p className="font-medium">{isRTL ? 'أرشفة البرامج المكتملة تلقائياً' : 'Auto-archive completed programs'}</p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'أرشف البرامج المكتملة بعد 30 يوماً' : 'Archive completed programs after 30 days'}
                        </p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                    
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div>
                        <p className="font-medium">{isRTL ? 'أرشفة البرامج المنتهية الصلاحية' : 'Auto-archive expired programs'}</p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'أرشف البرامج منتهية الصلاحية بعد 60 يوماً' : 'Archive expired programs after 60 days'}
                        </p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-base font-medium">
                    {isRTL ? 'إعدادات النسخ الاحتياطي' : 'Backup Settings'}
                  </Label>
                  <div className="space-y-4 mt-3">
                    <div>
                      <Label>{isRTL ? 'عدد النسخ الاحتياطية' : 'Number of Backup Copies'}</Label>
                      <Select defaultValue="3">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div>
                        <p className="font-medium">{isRTL ? 'ضغط الملفات' : 'Compress Files'}</p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'ضغط الملفات لتوفير مساحة التخزين' : 'Compress files to save storage space'}
                        </p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                    
                    <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                      <div>
                        <p className="font-medium">{isRTL ? 'تشفير النسخ الاحتياطية' : 'Encrypt Backups'}</p>
                        <p className="text-sm text-muted-foreground">
                          {isRTL ? 'تشفير النسخ الاحتياطية للحماية الإضافية' : 'Encrypt backups for additional security'}
                        </p>
                      </div>
                      <Checkbox defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Restore Dialog */}
      <Dialog open={!!restoreDialog} onOpenChange={(open) => !open && setRestoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'استعادة من الأرشيف' : 'Restore from Archive'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'استعادة هذا العنصر من الأرشيف إلى حالة نشطة'
                : 'Restore this item from archive to active state'
              }
            </DialogDescription>
          </DialogHeader>
          
          {restoreDialog && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">
                  {language === 'ar' ? restoreDialog.student_name_ar : restoreDialog.student_name_en}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? restoreDialog.iep_title_ar : restoreDialog.iep_title_en}
                </p>
              </div>

              {restoreDialog.restore_restrictions.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{isRTL ? 'قيود الاستعادة' : 'Restore Restrictions'}</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {restoreDialog.restore_restrictions.map((restriction, index) => (
                        <li key={index}>{restriction}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="restore-reason">{isRTL ? 'سبب الاستعادة' : 'Restore Reason'}</Label>
                <Textarea
                  id="restore-reason"
                  placeholder={isRTL ? 'اكتب سبب الاستعادة...' : 'Write restore reason...'}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => {
              if (restoreDialog) {
                handleRestore(restoreDialog)
              }
            }} disabled={!restoreDialog?.can_restore}>
              <ArchiveRestore className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'استعادة' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">{isRTL ? 'حذف من الأرشيف' : 'Delete from Archive'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? 'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف العنصر نهائياً.'
                : 'This action cannot be undone. The item will be permanently deleted.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {deleteDialog && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{isRTL ? 'تحذير' : 'Warning'}</AlertTitle>
                <AlertDescription>
                  {isRTL 
                    ? 'سيتم حذف جميع الإصدارات والملفات المرتبطة نهائياً.'
                    : 'All versions and associated files will be permanently deleted.'
                  }
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="font-medium mb-2">
                  {language === 'ar' ? deleteDialog.student_name_ar : deleteDialog.student_name_en}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? deleteDialog.iep_title_ar : deleteDialog.iep_title_en}
                </p>
              </div>

              <div>
                <Label htmlFor="delete-reason">{isRTL ? 'سبب الحذف (مطلوب)' : 'Delete Reason (Required)'}</Label>
                <Textarea
                  id="delete-reason"
                  placeholder={isRTL ? 'اكتب سبب الحذف النهائي...' : 'Write reason for permanent deletion...'}
                  rows={3}
                  required
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deleteDialog) {
                  handleDelete(deleteDialog, true)
                }
              }}
            >
              <Trash2 className={cn("h-4 w-4", isRTL ? "ml-2" : "mr-2")} />
              {isRTL ? 'حذف نهائي' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Dialog */}
      <Dialog open={bulkDialog} onOpenChange={setBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isRTL ? 'العمليات المجمعة' : 'Bulk Operations'}</DialogTitle>
            <DialogDescription>
              {isRTL 
                ? `تنفيذ عملية على ${selectedItems.length} عنصر محدد`
                : `Perform operation on ${selectedItems.length} selected items`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => handleBulkOperation('restore')}
              >
                <ArchiveRestore className="h-6 w-6" />
                <span>{isRTL ? 'استعادة مجمعة' : 'Bulk Restore'}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => handleBulkOperation('download')}
              >
                <Download className="h-6 w-6" />
                <span>{isRTL ? 'تحميل مجمع' : 'Bulk Download'}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2"
                onClick={() => handleBulkOperation('tag')}
              >
                <Tag className="h-6 w-6" />
                <span>{isRTL ? 'تسمية مجمعة' : 'Bulk Tag'}</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center gap-2 text-red-600 hover:text-red-700"
                onClick={() => handleBulkOperation('delete')}
              >
                <Trash2 className="h-6 w-6" />
                <span>{isRTL ? 'حذف مجمع' : 'Bulk Delete'}</span>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IEPArchiveManager