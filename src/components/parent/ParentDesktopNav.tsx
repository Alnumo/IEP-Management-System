import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  MessageCircle, 
  Calendar, 
  FileText, 
  User,
  Bell,
  Settings,
  LogOut,
  Heart
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ParentDesktopNavProps {
  onLogout?: () => void
  parentName?: string
}

export const ParentDesktopNav: React.FC<ParentDesktopNavProps> = ({ 
  onLogout, 
  parentName = 'ولي الأمر' 
}) => {
  const location = useLocation()

  const navItems = [
    {
      path: '/parent-dashboard',
      icon: Home,
      label: 'الرئيسية',
      activeColor: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    {
      path: '/parent-messages',
      icon: MessageCircle,
      label: 'الرسائل',
      activeColor: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      path: '/parent-appointments',
      icon: Calendar,
      label: 'المواعيد',
      activeColor: 'text-green-600 bg-green-50 border-green-200'
    },
    {
      path: '/parent-home-programs',
      icon: User,
      label: 'الأنشطة المنزلية',
      activeColor: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    {
      path: '/parent-documents',
      icon: FileText,
      label: 'الوثائق',
      activeColor: 'text-indigo-600 bg-indigo-50 border-indigo-200'
    }
  ]

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/parent-dashboard" className="flex items-center ml-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="mr-3 text-lg font-semibold text-gray-900">
                بوابة أولياء الأمور
              </span>
            </Link>

            {/* Desktop Navigation Menu */}
            <nav className="hidden md:flex space-x-1 space-x-reverse mr-8">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? item.activeColor
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ml-2 ${isActive ? item.activeColor.split(' ')[0] : 'text-gray-500'}`} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* User Welcome */}
            <div className="hidden md:flex items-center text-right">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  أهلاً، {parentName}
                </p>
                <p className="text-xs text-gray-600">
                  ولي الأمر
                </p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <User className="w-4 h-4 text-blue-600" />
              </div>
            </div>

            {/* Action Buttons */}
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Bell className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="sm" className="hidden md:flex">
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden md:inline mr-2">تسجيل الخروج</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}