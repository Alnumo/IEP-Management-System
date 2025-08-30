import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  Bell,
  Search,
  Plus,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  isRTL?: boolean
  children?: React.ReactNode
}

/**
 * DashboardLayout - Demonstrates the project's dashboard layout pattern
 * 
 * Why: Shows how to create responsive dashboard layouts with:
 * - RTL/Arabic language support with proper sidebar positioning
 * - Mobile-responsive sidebar with overlay behavior
 * - Header with search, notifications, and language toggle
 * - Main content area with proper spacing and grid system
 * - Therapy-specific navigation and quick actions
 * - Stats cards with progress indicators
 * - Glass morphism design with backdrop blur effects
 * 
 * Pattern: Responsive dashboard with sidebar navigation and RTL support
 */
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  isRTL = false,
  children
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigationItems = [
    { 
      icon: Home, 
      label: isRTL ? 'الرئيسية' : 'Dashboard', 
      active: true 
    },
    { 
      icon: Users, 
      label: isRTL ? 'الأطفال' : 'Students', 
      active: false 
    },
    { 
      icon: Calendar, 
      label: isRTL ? 'الجلسات' : 'Sessions', 
      active: false,
      badge: '3'
    },
    { 
      icon: FileText, 
      label: isRTL ? 'الخطط العلاجية' : 'Therapy Plans', 
      active: false 
    },
    { 
      icon: TrendingUp, 
      label: isRTL ? 'التقارير' : 'Reports', 
      active: false 
    },
    { 
      icon: Settings, 
      label: isRTL ? 'الإعدادات' : 'Settings', 
      active: false 
    }
  ]

  const statsCards = [
    {
      title: isRTL ? 'إجمالي الأطفال' : 'Total Students',
      value: '24',
      change: '+12%',
      trend: 'up',
      color: 'teal'
    },
    {
      title: isRTL ? 'الجلسات اليوم' : 'Today\'s Sessions',
      value: '8',
      change: '3 pending',
      trend: 'stable',
      color: 'blue'
    },
    {
      title: isRTL ? 'معدل التقدم' : 'Progress Rate',
      value: '87%',
      change: '+5%',
      trend: 'up',
      color: 'green'
    },
    {
      title: isRTL ? 'الخطط النشطة' : 'Active Plans',
      value: '18',
      change: '2 new',
      trend: 'up',
      color: 'orange'
    }
  ]

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 h-full w-64 bg-white/90 backdrop-blur-md border-r border-white/20 shadow-xl z-50 transition-transform duration-300',
        isRTL ? 'right-0 border-l border-r-0' : 'left-0',
        sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full'),
        'md:translate-x-0'
      )}>
        {/* Sidebar Header */}
        <div className={cn(
          'flex items-center justify-between p-6 border-b border-white/20',
          isRTL && 'flex-row-reverse'
        )}>
          <div className={cn(
            'flex items-center gap-3',
            isRTL && 'flex-row-reverse'
          )}>
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-green-400 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <h2 className={cn(
              'font-bold text-gray-900',
              isRTL && 'font-arabic text-right'
            )}>
              {isRTL ? 'أركان' : 'Arkan'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item, index) => (
              <li key={index}>
                <a
                  href="#"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    isRTL && 'flex-row-reverse text-right',
                    item.active 
                      ? 'bg-gradient-to-r from-teal-500 to-green-400 text-white shadow-lg' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className={cn(
                    'font-medium flex-1',
                    isRTL && 'font-arabic text-right'
                  )}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <Badge className="bg-red-500 text-white text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300',
        isRTL ? 'md:mr-64' : 'md:ml-64'
      )}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className={cn(
              'flex items-center justify-between h-16',
              isRTL && 'flex-row-reverse'
            )}>
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search Bar */}
              <div className="flex-1 max-w-md mx-4">
                <div className="relative">
                  <Search className={cn(
                    'absolute top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400',
                    isRTL ? 'right-3' : 'left-3'
                  )} />
                  <input
                    type="text"
                    placeholder={isRTL ? 'البحث...' : 'Search...'}
                    className={cn(
                      'w-full bg-gray-100 border-0 rounded-xl py-2 text-sm focus:ring-2 focus:ring-teal-500',
                      isRTL ? 'pr-10 pl-4 text-right font-arabic' : 'pl-10 pr-4'
                    )}
                  />
                </div>
              </div>

              {/* Header Actions */}
              <div className={cn(
                'flex items-center gap-2',
                isRTL && 'flex-row-reverse'
              )}>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    2
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={cn(
                    'bg-gradient-to-r from-teal-500 to-green-400 text-white border-0',
                    isRTL && 'font-arabic'
                  )}
                >
                  <Plus className={cn('h-4 w-4', isRTL ? 'ml-1' : 'mr-1')} />
                  {isRTL ? 'جلسة جديدة' : 'New Session'}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className={cn(
              'text-2xl font-bold text-gray-900 mb-2',
              isRTL && 'text-right font-arabic'
            )}>
              {isRTL ? 'مرحباً، د. سارة' : 'Welcome back, Dr. Sarah'}
            </h1>
            <p className={cn(
              'text-gray-600',
              isRTL && 'text-right font-arabic'
            )}>
              {isRTL ? 'لديك 8 جلسات مجدولة اليوم' : 'You have 8 sessions scheduled for today'}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((stat, index) => (
              <Card key={index} className="backdrop-blur-sm bg-white/90 border-white/20 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className={cn(
                    'flex items-center justify-between mb-4',
                    isRTL && 'flex-row-reverse'
                  )}>
                    <div className={cn(
                      `w-12 h-12 rounded-xl flex items-center justify-center`,
                      stat.color === 'teal' && 'bg-teal-100',
                      stat.color === 'blue' && 'bg-blue-100',
                      stat.color === 'green' && 'bg-green-100',
                      stat.color === 'orange' && 'bg-orange-100'
                    )}>
                      <TrendingUp className={cn(
                        'h-6 w-6',
                        stat.color === 'teal' && 'text-teal-600',
                        stat.color === 'blue' && 'text-blue-600',
                        stat.color === 'green' && 'text-green-600',
                        stat.color === 'orange' && 'text-orange-600'
                      )} />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stat.change}
                    </Badge>
                  </div>
                  <h3 className={cn(
                    'text-sm font-medium text-gray-600 mb-1',
                    isRTL && 'text-right font-arabic'
                  )}>
                    {stat.title}
                  </h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Content Area */}
          {children || (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Sessions */}
              <Card className="backdrop-blur-sm bg-white/90 border-white/20">
                <CardHeader>
                  <CardTitle className={cn(
                    'text-lg font-semibold',
                    isRTL && 'text-right font-arabic'
                  )}>
                    {isRTL ? 'الجلسات الأخيرة' : 'Recent Sessions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className={cn(
                      'flex items-center justify-between p-3 rounded-lg bg-gray-50',
                      isRTL && 'flex-row-reverse'
                    )}>
                      <div className={cn(
                        'flex items-center gap-3',
                        isRTL && 'flex-row-reverse'
                      )}>
                        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                          <Clock className="h-5 w-5 text-teal-600" />
                        </div>
                        <div className={isRTL ? 'text-right' : ''}>
                          <p className={cn(
                            'font-medium text-gray-900',
                            isRTL && 'font-arabic'
                          )}>
                            {isRTL ? 'أحمد محمد علي' : 'Ahmed Mohamed Ali'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {isRTL ? 'علاج النطق' : 'Speech Therapy'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {isRTL ? 'مكتمل' : 'Completed'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Progress Overview */}
              <Card className="backdrop-blur-sm bg-white/90 border-white/20">
                <CardHeader>
                  <CardTitle className={cn(
                    'text-lg font-semibold',
                    isRTL && 'text-right font-arabic'
                  )}>
                    {isRTL ? 'نظرة عامة على التقدم' : 'Progress Overview'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { label: isRTL ? 'النطق الواضح' : 'Speech Clarity', value: 85 },
                    { label: isRTL ? 'المفردات' : 'Vocabulary', value: 72 },
                    { label: isRTL ? 'التفاعل الاجتماعي' : 'Social Interaction', value: 90 }
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className={cn(
                        'flex justify-between text-sm',
                        isRTL && 'flex-row-reverse font-arabic'
                      )}>
                        <span className="font-medium text-gray-900">{item.label}</span>
                        <span className="text-gray-600">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// Usage Examples:
export const DashboardLayoutUsage = () => {
  return (
    <div className="space-y-8">
      {/* Arabic/RTL Dashboard */}
      <div className="h-screen">
        <DashboardLayout isRTL={true} />
      </div>

      {/* English/LTR Dashboard */}
      <div className="h-screen">
        <DashboardLayout isRTL={false} />
      </div>
    </div>
  )
}
