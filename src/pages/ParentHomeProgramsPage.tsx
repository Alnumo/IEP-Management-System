import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Home, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Play,
  Pause,
  Star,
  FileText,
  Download,

  Calendar,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ParentMobileNav } from '@/components/parent/ParentMobileNav'
import { ParentDesktopNav } from '@/components/parent/ParentDesktopNav'
import { parentPortalService } from '@/services/parent-portal'
import type { HomeProgram, ParentUser } from '@/types/parent-portal'

export default function ParentHomeProgramsPage() {
  const [programs, setPrograms] = useState<HomeProgram[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<HomeProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [_parentUser, setParentUser] = useState<ParentUser | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [activeProgram, setActiveProgram] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const storedUser = localStorage.getItem('parentUser')
    if (!storedUser) {
      navigate('/parent-login')
      return
    }

    const user = JSON.parse(storedUser)
    setParentUser(user)
    loadHomePrograms()
  }, [navigate])

  useEffect(() => {
    filterPrograms()
  }, [programs, selectedStatus, selectedChild])

  const loadHomePrograms = async () => {
    try {
      // Mock data - in real app, fetch based on parent's children
      const mockPrograms: HomeProgram[] = [
        {
          id: 'hp-001',
          childId: 'child-001',
          programTitle: 'تمارين التواصل اليومية',
          description: 'تمارين لتحسين مهارات التواصل والتعبير',
          assignedBy: 'therapist-001',
          assignedByName: 'د. سارة أحمد',
          assignedDate: '2025-01-20',
          dueDate: '2025-01-27',
          priority: 'high',
          category: 'communication',
          estimatedDuration: 30,
          status: 'assigned',
          instructions: [
            {
              stepNumber: 1,
              title: 'التحضير',
              description: 'اختر مكان هادئ ومريح للطفل',
              visualAid: '',
              tips: ['تأكد من عدم وجود مشتتات', 'استخدم الإضاءة المناسبة'],
              commonMistakes: ['عدم التحضير الكافي'],
              targetBehavior: 'الاستعداد للنشاط'
            }
          ],
          materials: [
            {
              id: 'mat-001',
              name: 'بطاقات الصور',
              description: 'مجموعة من بطاقات الصور للأنشطة اليومية',
              type: 'printable',
              required: true,
              downloadUrl: '/files/communication-cards.pdf'
            }
          ],
          videoUrl: '/videos/communication-demo.mp4',
          attachments: ['/files/guide.pdf']
        },
        {
          id: 'hp-002',
          childId: 'child-001',
          programTitle: 'تمارين المهارات الحركية الدقيقة',
          description: 'أنشطة لتطوير التحكم في العضلات الصغيرة',
          assignedBy: 'therapist-002',
          assignedByName: 'أ. محمد عبدالله',
          assignedDate: '2025-01-18',
          priority: 'medium',
          category: 'motor_skills',
          estimatedDuration: 20,
          status: 'in_progress',
          instructions: [],
          materials: [],
          attachments: []
        }
      ]
      
      setPrograms(mockPrograms)
    } catch (error) {
      console.error('Error loading home programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterPrograms = () => {
    let filtered = programs

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => p.status === selectedStatus)
    }

    if (selectedChild !== 'all') {
      filtered = filtered.filter(p => p.childId === selectedChild)
    }

    setFilteredPrograms(filtered)
  }

  const handleStartProgram = (programId: string) => {
    setActiveProgram(programId)
  }

  const handleCompleteProgram = async (programId: string) => {
    try {
      const rating = 4 // Mock rating - in real app, get from user input
      const feedback = 'تم إكمال النشاط بنجاح'
      
      const success = await parentPortalService.updateHomeProgramProgress(programId, {
        status: 'completed',
        parentFeedback: feedback,
        parentRating: rating,
        completionDate: new Date().toISOString()
      })

      if (success) {
        loadHomePrograms()
        setActiveProgram(null)
      }
    } catch (error) {
      console.error('Error completing program:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-blue-600" />
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusName = (status: string) => {
    const names: Record<string, string> = {
      assigned: 'مُكلف',
      in_progress: 'قيد التنفيذ',
      completed: 'مكتمل',
      overdue: 'متأخر'
    }
    return names[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">جار تحميل البرامج المنزلية...</p>
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
          <h1 className="text-2xl font-semibold text-gray-900">البرامج والأنشطة المنزلية</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex items-center space-x-4 space-x-reverse">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-48 text-right">
              <SelectValue placeholder="حالة البرنامج" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="assigned">مُكلف</SelectItem>
              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
              <SelectItem value="completed">مكتمل</SelectItem>
              <SelectItem value="overdue">متأخر</SelectItem>
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

        {/* Programs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPrograms.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-right flex-1">
                    <CardTitle className="text-lg mb-2">{program.programTitle}</CardTitle>
                    <p className="text-gray-600 text-sm">{program.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {getStatusIcon(program.status)}
                    <div className={`
                      px-2 py-1 rounded-full text-xs font-medium border
                      ${getPriorityColor(program.priority)}
                    `}>
                      {program.priority === 'high' ? 'عالي' : program.priority === 'medium' ? 'متوسط' : 'منخفض'}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Program Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">المعالج:</span>
                    <span className="font-medium">{program.assignedByName}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">المدة المقدرة:</span>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 ml-1" />
                      <span>{program.estimatedDuration} دقيقة</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">تاريخ التكليف:</span>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 ml-1" />
                      <span>{new Date(program.assignedDate).toLocaleDateString('ar-SA')}</span>
                    </div>
                  </div>

                  {program.dueDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">تاريخ الاستحقاق:</span>
                      <span className={`font-medium ${
                        new Date(program.dueDate) < new Date() ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {new Date(program.dueDate).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">الحالة:</span>
                    <div className="flex items-center">
                      {getStatusIcon(program.status)}
                      <span className="mr-1">{getStatusName(program.status)}</span>
                    </div>
                  </div>
                </div>

                {/* Materials & Resources */}
                {program.materials.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2 text-right">المواد المطلوبة:</h4>
                    <div className="space-y-2">
                      {program.materials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="text-right flex-1">
                            <p className="font-medium text-sm">{material.name}</p>
                            {material.description && (
                              <p className="text-xs text-gray-600">{material.description}</p>
                            )}
                          </div>
                          {material.downloadUrl && (
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2 space-x-reverse">
                  {program.status === 'assigned' && (
                    <Button
                      onClick={() => handleStartProgram(program.id)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Play className="w-4 h-4 ml-2" />
                      بدء النشاط
                    </Button>
                  )}

                  {program.status === 'in_progress' && (
                    <>
                      <Button
                        onClick={() => handleCompleteProgram(program.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 ml-2" />
                        إكمال
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Pause className="w-4 h-4 ml-2" />
                        إيقاف مؤقت
                      </Button>
                    </>
                  )}

                  {program.status === 'completed' && (
                    <Button variant="outline" className="flex-1">
                      <Star className="w-4 h-4 ml-2" />
                      عرض التقييم
                    </Button>
                  )}

                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4" />
                  </Button>
                </div>

                {/* Progress for active program */}
                {activeProgram === program.id && program.status === 'in_progress' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3 text-right">النشاط الحالي</h4>
                    {program.instructions.map((instruction, index) => (
                      <div key={index} className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-blue-800 text-right">
                            {instruction.title}
                          </h5>
                          <div className="flex items-center">
                            <Target className="w-4 h-4 text-blue-600 ml-1" />
                            <span className="text-sm text-blue-700">
                              الخطوة {instruction.stepNumber}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-blue-700 text-right mb-2">
                          {instruction.description}
                        </p>
                        {instruction.tips.length > 0 && (
                          <div className="text-xs text-blue-600">
                            <p className="font-medium mb-1">نصائح:</p>
                            <ul className="space-y-1">
                              {instruction.tips.map((tip, tipIndex) => (
                                <li key={tipIndex} className="flex items-start text-right">
                                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 ml-2 flex-shrink-0"></span>
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrograms.length === 0 && (
          <div className="text-center py-12">
            <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              لا توجد برامج منزلية
            </h3>
            <p className="text-gray-600">
              سيظهر هنا البرامج المنزلية المُكلف بها من المعالجين
            </p>
          </div>
        )}
      </div>

      {/* Mobile Navigation */}
      <ParentMobileNav />
    </div>
  )
}