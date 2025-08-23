import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  MessageCircle, 
  Calendar, 
  FileText, 
  User
} from 'lucide-react'

export const ParentMobileNav: React.FC = () => {
  const location = useLocation()

  const navItems = [
    {
      path: '/parent-dashboard',
      icon: Home,
      label: 'الرئيسية',
      activeColor: 'text-blue-600'
    },
    {
      path: '/parent-messages',
      icon: MessageCircle,
      label: 'الرسائل',
      activeColor: 'text-purple-600'
    },
    {
      path: '/parent-appointments',
      icon: Calendar,
      label: 'المواعيد',
      activeColor: 'text-green-600'
    },
    {
      path: '/parent-home-programs',
      icon: User,
      label: 'الأنشطة',
      activeColor: 'text-orange-600'
    },
    {
      path: '/parent-documents',
      icon: FileText,
      label: 'الوثائق',
      activeColor: 'text-indigo-600'
    }
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive 
                  ? `${item.activeColor} bg-opacity-10 ${item.activeColor.replace('text-', 'bg-').replace('-600', '-50')}`
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? item.activeColor : 'text-gray-600'}`} />
              <span className={`text-xs font-medium ${isActive ? item.activeColor : 'text-gray-600'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      
      {/* Notification Badge */}
      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
        <div className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
          3
        </div>
      </div>
    </div>
  )
}