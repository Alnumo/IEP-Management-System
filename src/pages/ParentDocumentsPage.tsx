import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Download, 
  Eye, 
  Share2, 
  Search,
  Lock,

  File,
  Image,
  Video,
  FileImage,
  FolderOpen,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'
import { ParentDesktopNav } from '@/components/parent/ParentDesktopNav'
// import { parentPortalService } from '@/services/parent-portal'
import type { DocumentAccess, ParentUser } from '@/types/parent-portal'

export default function ParentDocumentsPage() {
  const [documents, setDocuments] = useState<DocumentAccess[]>([])
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [_parentUser, setParentUser] = useState<ParentUser | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [selectedDocument, setSelectedDocument] = useState<DocumentAccess | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('parentUser')
    if (!storedUser) {
      navigate('/parent-login')
      return
    }

    const user = JSON.parse(storedUser)
    setParentUser(user)
    loadDocuments()
  }, [navigate])

  useEffect(() => {
    filterDocuments()
  }, [documents, searchTerm, selectedType, selectedChild])

  const loadDocuments = async () => {
    try {
      // Mock documents data
      const mockDocuments: DocumentAccess[] = [
        {
          id: 'doc-001',
          childId: 'child-001',
          documentTitle: 'تقرير التقييم الشامل - يناير 2025',
          documentType: 'assessment_report',
          filePath: '/documents/assessment_jan_2025.pdf',
          fileSize: 2045678,
          mimeType: 'application/pdf',
          uploadedBy: 'th-001',
          uploadedByName: 'د. سارة أحمد',
          uploadedAt: '2025-01-20T10:00:00Z',
          isConfidential: true,
          downloadCount: 3,
          lastAccessedAt: '2025-01-22T14:30:00Z',
          parentNotes: 'تم مراجعته مع المعالج',
          tags: ['تقييم', 'نطق', 'تقدم']
        },
        {
          id: 'doc-002',
          childId: 'child-001',
          documentTitle: 'تقرير التقدم الأسبوعي - الأسبوع الثالث',
          documentType: 'progress_report',
          filePath: '/documents/weekly_progress_w3.pdf',
          fileSize: 856432,
          mimeType: 'application/pdf',
          uploadedBy: 'th-002',
          uploadedByName: 'أ. محمد عبدالله',
          uploadedAt: '2025-01-22T16:45:00Z',
          isConfidential: false,
          downloadCount: 1,
          tags: ['تقدم', 'أسبوعي', 'علاج_وظيفي']
        },
        {
          id: 'doc-003',
          childId: 'child-001',
          documentTitle: 'خطة التعليم الفردية (IEP)',
          documentType: 'iep',
          filePath: '/documents/iep_2025.pdf',
          fileSize: 1234567,
          mimeType: 'application/pdf',
          uploadedBy: 'admin-001',
          uploadedByName: 'منسق البرنامج',
          uploadedAt: '2025-01-15T09:00:00Z',
          isConfidential: true,
          downloadCount: 5,
          lastAccessedAt: '2025-01-21T11:15:00Z',
          tags: ['IEP', 'خطة', 'تعليم', 'فردية']
        },
        {
          id: 'doc-004',
          childId: 'child-001',
          documentTitle: 'صور من جلسة العلاج الوظيفي',
          documentType: 'photo',
          filePath: '/media/ot_session_photos.zip',
          fileSize: 3456789,
          mimeType: 'application/zip',
          uploadedBy: 'th-002',
          uploadedByName: 'أ. محمد عبدالله',
          uploadedAt: '2025-01-21T13:20:00Z',
          isConfidential: false,
          downloadCount: 2,
          tags: ['صور', 'جلسة', 'علاج_وظيفي']
        }
      ]

      setDocuments(mockDocuments)
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterDocuments = () => {
    let filtered = documents

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.documentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.uploadedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filter by document type
    if (selectedType !== 'all') {
      filtered = filtered.filter(doc => doc.documentType === selectedType)
    }

    // Filter by child
    if (selectedChild !== 'all') {
      filtered = filtered.filter(doc => doc.childId === selectedChild)
    }

    setFilteredDocuments(filtered)
  }

  const getDocumentIcon = (documentType: string, mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="w-8 h-8 text-green-600" />
    }
    if (mimeType.startsWith('video/')) {
      return <Video className="w-8 h-8 text-red-600" />
    }
    
    switch (documentType) {
      case 'assessment_report':
      case 'progress_report':
      case 'iep':
        return <FileText className="w-8 h-8 text-blue-600" />
      case 'photo':
        return <FileImage className="w-8 h-8 text-green-600" />
      default:
        return <File className="w-8 h-8 text-gray-600" />
    }
  }

  const getDocumentTypeName = (type: string) => {
    const names: Record<string, string> = {
      assessment_report: 'تقرير تقييم',
      progress_report: 'تقرير تقدم',
      iep: 'خطة التعليم الفردية',
      medical_record: 'السجل الطبي',
      session_notes: 'ملاحظات الجلسة',
      home_program: 'برنامج منزلي',
      photo: 'صور',
      video: 'فيديو'
    }
    return names[type] || type
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 بايت'
    const k = 1024
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleDocumentView = (document: DocumentAccess) => {
    setSelectedDocument(document)
    // In real app, increment view count and update last accessed
  }

  const handleDocumentDownload = (document: DocumentAccess) => {
    // In real app, trigger actual download and increment download count
    console.log('Downloading:', document.documentTitle)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جار تحميل الوثائق...</p>
        </div>
      </div>
    )
  }

  const handleLogout = () => {
    localStorage.removeItem('parentUser')
    localStorage.removeItem('parentSession')
    navigate('/parent-login')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop Navigation */}
      <ParentDesktopNav 
        onLogout={handleLogout}
        parentName={`${_parentUser?.firstName || ''} ${_parentUser?.lastName || ''}`.trim() || 'ولي الأمر'}
      />

      {/* Page Header - Desktop */}
      <div className="bg-white border-b px-6 py-4 hidden md:block">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900">الوثائق والملفات</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="البحث في الوثائق..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 text-right"
              dir="rtl"
            />
          </div>

          <div className="flex space-x-4 space-x-reverse">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-48 text-right">
                <SelectValue placeholder="نوع الوثيقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="assessment_report">تقارير التقييم</SelectItem>
                <SelectItem value="progress_report">تقارير التقدم</SelectItem>
                <SelectItem value="iep">خطط التعليم الفردية</SelectItem>
                <SelectItem value="session_notes">ملاحظات الجلسات</SelectItem>
                <SelectItem value="photo">الصور</SelectItem>
                <SelectItem value="video">الفيديوهات</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-48 text-right">
                <SelectValue placeholder="الطفل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأطفال</SelectItem>
                <SelectItem value="child-001">أحمد محمد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-right flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 leading-tight">
                      {document.documentTitle}
                    </h3>
                    <div className="flex items-center justify-end text-sm text-gray-600 mb-1">
                      <span className="ml-1">{getDocumentTypeName(document.documentType)}</span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full mx-2"></span>
                      <span>{formatFileSize(document.fileSize)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    {getDocumentIcon(document.documentType, document.mimeType)}
                    {document.isConfidential && (
                      <div className="bg-red-100 p-1 rounded">
                        <Lock className="w-3 h-3 text-red-600" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">رُفع بواسطة:</span>
                    <span className="font-medium">{document.uploadedByName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">تاريخ الرفع:</span>
                    <span>{new Date(document.uploadedAt).toLocaleDateString('ar-SA')}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">مرات التحميل:</span>
                    <div className="flex items-center">
                      <Download className="w-4 h-4 ml-1" />
                      <span>{document.downloadCount}</span>
                    </div>
                  </div>

                  {document.lastAccessedAt && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">آخر عرض:</span>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 ml-1" />
                        <span>{new Date(document.lastAccessedAt).toLocaleDateString('ar-SA')}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {document.tags.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {document.tags.map((tag, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parent Notes */}
                {document.parentNotes && (
                  <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-gray-600 mb-1 text-right">ملاحظاتي:</p>
                    <p className="text-sm text-yellow-800 text-right">{document.parentNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 space-x-reverse">
                  <Button 
                    onClick={() => handleDocumentView(document)}
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    <Eye className="w-4 h-4 ml-2" />
                    عرض
                  </Button>
                  
                  <Button 
                    onClick={() => handleDocumentDownload(document)}
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تحميل
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedType !== 'all' || selectedChild !== 'all' 
                ? 'لا توجد وثائق تطابق البحث' 
                : 'لا توجد وثائق متاحة'
              }
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedType !== 'all' || selectedChild !== 'all'
                ? 'جرب تغيير معايير البحث أو المرشحات'
                : 'ستظهر هنا الوثائق والتقارير التي يشاركها الفريق العلاجي'
              }
            </p>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-right text-lg">
                  {selectedDocument.documentTitle}
                </CardTitle>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Button
                    onClick={() => handleDocumentDownload(selectedDocument)}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    تحميل
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDocument(null)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="h-[70vh] bg-gray-100 flex items-center justify-center">
                {selectedDocument.mimeType === 'application/pdf' ? (
                  <div className="text-center">
                    <FileText className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">معاينة ملف PDF</p>
                    <Button
                      onClick={() => handleDocumentDownload(selectedDocument)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تحميل الملف للعرض
                    </Button>
                  </div>
                ) : selectedDocument.mimeType.startsWith('image/') ? (
                  <div className="text-center">
                    <Image className="w-16 h-16 text-green-600 mx-auto mb-4" />
                    <p className="text-gray-600">معاينة الصورة</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <File className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      نوع الملف: {selectedDocument.mimeType}
                    </p>
                    <Button
                      onClick={() => handleDocumentDownload(selectedDocument)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تحميل الملف
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Navigation */}
      <ParentMobileNav />
    </div>
  )
}