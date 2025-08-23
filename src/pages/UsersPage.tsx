import { useState, useEffect } from 'react'
import { Plus, User, Mail, Shield, Calendar, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  created_at: string
  updated_at: string
}

export const UsersPage = () => {
  const { language, isRTL } = useLanguage()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    // Check current user authentication
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user)
      if (user) {
        loadUsers()
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null)
        if (session?.user) {
          loadUsers()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading users:', error)
      } else {
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error loading users:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    const roles = {
      admin: language === 'ar' ? 'مدير' : 'Admin',
      manager: language === 'ar' ? 'مدير تنفيذي' : 'Manager',
      therapist_lead: language === 'ar' ? 'رئيس معالجين' : 'Therapist Lead',
      receptionist: language === 'ar' ? 'موظف استقبال' : 'Receptionist'
    }
    return roles[role as keyof typeof roles] || (language === 'ar' ? 'غير محدد' : 'Unknown')
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive'
      case 'manager':
        return 'default'
      case 'therapist_lead':
        return 'secondary'
      case 'receptionist':
        return 'outline'
      default:
        return 'outline'
    }
  }

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getRoleDisplayName(user.role).toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show login message if not authenticated
  if (!currentUser) {
    return (
      <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
          </h1>
          <p className={`text-muted-foreground mb-6 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'يجب تسجيل الدخول للوصول لإدارة المستخدمين'
              : 'Please log in to access user management'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 gap-4">
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
          </h1>
          <p className={`text-sm sm:text-base text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' 
              ? 'إدارة حسابات المستخدمين وصلاحياتهم'
              : 'Manage user accounts and their permissions'
            }
          </p>
        </div>
        <Button disabled>
          <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          <span className="hidden sm:inline">
            {language === 'ar' ? 'مستخدم جديد' : 'New User'}
          </span>
          <span className="sm:hidden">
            {language === 'ar' ? 'إضافة' : 'Add'}
          </span>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground`} />
          <Input
            placeholder={language === 'ar' ? 'البحث في المستخدمين...' : 'Search users...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${isRTL ? 'pr-10' : 'pl-10'}`}
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'إجمالي المستخدمين' : 'Total Users'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'المديرين' : 'Admins'}
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'المدراء التنفيذيين' : 'Managers'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'manager').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
            <CardTitle className={`text-xs sm:text-sm font-medium ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'الموظفين' : 'Staff'}
            </CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => ['therapist_lead', 'receptionist'].includes(u.role)).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-8">
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {language === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-8">
          <p className={`text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
            {searchTerm 
              ? (language === 'ar' ? 'لا توجد نتائج للبحث' : 'No search results found')
              : (language === 'ar' ? 'لا يوجد مستخدمين' : 'No users found')
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-center gap-2">
                  <div className="space-y-1">
                    <h3 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
                      {user.name || user.email}
                    </h3>
                    {user.name && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    )}
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {getRoleDisplayName(user.role)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} text-sm text-muted-foreground`}>
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                
                <div className={`flex items-center ${isRTL ? 'space-x-2 space-x-reverse' : 'space-x-2'} text-sm text-muted-foreground`}>
                  <Calendar className="h-4 w-4" />
                  <span>
                    {language === 'ar' ? 'انضم في' : 'Joined'} {' '}
                    {new Date(user.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    {language === 'ar' ? 'تعديل' : 'Edit'}
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    {language === 'ar' ? 'عرض' : 'View'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Note about functionality */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <h4 className={`font-semibold ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' ? 'ملاحظة' : 'Note'}
            </h4>
            <p className={`text-sm text-muted-foreground ${language === 'ar' ? 'font-arabic' : ''}`}>
              {language === 'ar' 
                ? 'إدارة المستخدمين متاحة للعرض فقط حالياً. لإضافة مستخدمين جدد، يرجى استخدام لوحة تحكم Supabase.'
                : 'User management is currently view-only. To add new users, please use the Supabase Dashboard.'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}