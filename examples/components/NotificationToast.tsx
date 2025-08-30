/**
 * Notification Toast Examples
 * 
 * Why: Demonstrates notification patterns for therapy applications:
 * - Arabic/RTL toast notifications
 * - Therapy-specific notification types
 * - Auto-dismiss with Arabic timing
 * - Action buttons with Arabic text
 * - Progress indicators for therapy sessions
 * - Accessibility features for Arabic content
 */

import React, { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Calendar, Clock } from 'lucide-react'
import { useLanguage } from '../hooks/useLanguage'
import { formatArabicRelativeTime } from '../utils/arabic-formatting'

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'therapy'

export interface NotificationData {
  id: string
  type: NotificationType
  title: {
    ar: string
    en: string
  }
  message: {
    ar: string
    en: string
  }
  duration?: number // in milliseconds, 0 for persistent
  action?: {
    label: { ar: string; en: string }
    onClick: () => void
  }
  therapyContext?: {
    sessionId?: string
    studentName?: { ar: string; en: string }
    therapistName?: { ar: string; en: string }
    sessionType?: 'speech' | 'physical' | 'occupational' | 'behavioral' | 'cognitive'
  }
  timestamp?: Date
}

interface NotificationToastProps {
  notification: NotificationData
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  position = 'top-right'
}) => {
  const { language, isRTL } = useLanguage()
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  // Auto-dismiss logic
  useEffect(() => {
    setIsVisible(true)
    
    if (notification.duration && notification.duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (notification.duration! / 100))
          if (newProgress <= 0) {
            clearInterval(interval)
            handleDismiss()
            return 0
          }
          return newProgress
        })
      }, 100)

      return () => clearInterval(interval)
    }
  }, [notification.duration])

  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => onDismiss(notification.id), 300)
  }, [notification.id, onDismiss])

  // Get icon based on notification type
  const getIcon = () => {
    const iconProps = { className: "w-5 h-5 flex-shrink-0" }
    
    switch (notification.type) {
      case 'success':
        return <CheckCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-green-500" />
      case 'error':
        return <AlertCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-red-500" />
      case 'warning':
        return <AlertTriangle {...iconProps} className="w-5 h-5 flex-shrink-0 text-yellow-500" />
      case 'therapy':
        return <Calendar {...iconProps} className="w-5 h-5 flex-shrink-0 text-teal-500" />
      case 'info':
      default:
        return <Info {...iconProps} className="w-5 h-5 flex-shrink-0 text-blue-500" />
    }
  }

  // Get background color based on type
  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'therapy':
        return 'bg-teal-50 border-teal-200'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  // Get position classes
  const getPositionClasses = () => {
    const baseClasses = 'fixed z-50'
    
    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 ${isRTL ? 'left-4' : 'right-4'}`
      case 'top-left':
        return `${baseClasses} top-4 ${isRTL ? 'right-4' : 'left-4'}`
      case 'bottom-right':
        return `${baseClasses} bottom-4 ${isRTL ? 'left-4' : 'right-4'}`
      case 'bottom-left':
        return `${baseClasses} bottom-4 ${isRTL ? 'right-4' : 'left-4'}`
      case 'top-center':
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`
      default:
        return `${baseClasses} top-4 ${isRTL ? 'left-4' : 'right-4'}`
    }
  }

  const title = notification.title[language]
  const message = notification.message[language]

  return (
    <div
      className={`
        ${getPositionClasses()}
        max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="alert"
      aria-live="polite"
    >
      <div className={`
        ${getBackgroundColor()}
        border rounded-lg shadow-lg overflow-hidden
        backdrop-blur-sm bg-opacity-95
      `}>
        {/* Progress bar */}
        {notification.duration && notification.duration > 0 && (
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {getIcon()}
            
            <div className="flex-1 min-w-0">
              {/* Title */}
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                {title}
              </h4>
              
              {/* Message */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {message}
              </p>

              {/* Therapy context */}
              {notification.therapyContext && (
                <div className="mt-2 text-xs text-gray-600">
                  {notification.therapyContext.studentName && (
                    <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium">
                        {language === 'ar' ? 'الطالب:' : 'Student:'}
                      </span>
                      <span>{notification.therapyContext.studentName[language]}</span>
                    </div>
                  )}
                  {notification.therapyContext.therapistName && (
                    <div className={`flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="font-medium">
                        {language === 'ar' ? 'المعالج:' : 'Therapist:'}
                      </span>
                      <span>{notification.therapyContext.therapistName[language]}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              {notification.timestamp && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {language === 'ar' 
                      ? formatArabicRelativeTime(notification.timestamp)
                      : notification.timestamp.toLocaleTimeString()
                    }
                  </span>
                </div>
              )}

              {/* Action button */}
              {notification.action && (
                <button
                  onClick={notification.action.onClick}
                  className={`
                    mt-3 px-3 py-1 text-xs font-medium rounded
                    bg-white border border-gray-300 hover:bg-gray-50
                    focus:outline-none focus:ring-2 focus:ring-teal-500
                    transition-colors duration-200
                    ${isRTL ? 'ml-auto' : 'mr-auto'}
                  `}
                >
                  {notification.action.label[language]}
                </button>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className={`
                flex-shrink-0 p-1 rounded-full
                text-gray-400 hover:text-gray-600
                focus:outline-none focus:ring-2 focus:ring-teal-500
                transition-colors duration-200
                ${isRTL ? 'mr-1' : 'ml-1'}
              `}
              aria-label={language === 'ar' ? 'إغلاق الإشعار' : 'Close notification'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Notification Manager Hook
export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      duration: notification.duration ?? 5000 // Default 5 seconds
    }

    setNotifications(prev => [...prev, newNotification])
    return newNotification.id
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Predefined notification creators
  const showSuccess = useCallback((title: { ar: string; en: string }, message: { ar: string; en: string }, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  }, [addNotification])

  const showError = useCallback((title: { ar: string; en: string }, message: { ar: string; en: string }, options?: Partial<NotificationData>) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: 0, // Persistent by default for errors
      ...options
    })
  }, [addNotification])

  const showTherapyUpdate = useCallback((
    title: { ar: string; en: string },
    message: { ar: string; en: string },
    therapyContext: NotificationData['therapyContext'],
    options?: Partial<NotificationData>
  ) => {
    return addNotification({
      type: 'therapy',
      title,
      message,
      therapyContext,
      ...options
    })
  }, [addNotification])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showTherapyUpdate
  }
}

// Notification Container Component
interface NotificationContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
  maxNotifications?: number
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  position = 'top-right',
  maxNotifications = 5
}) => {
  const { notifications, removeNotification } = useNotifications()
  const { isRTL } = useLanguage()

  // Limit number of visible notifications
  const visibleNotifications = notifications.slice(-maxNotifications)

  return (
    <div className="pointer-events-none">
      {visibleNotifications.map((notification, index) => (
        <div
          key={notification.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * (isRTL ? -80 : 80)}px)`,
            zIndex: 1000 - index
          }}
        >
          <NotificationToast
            notification={notification}
            onDismiss={removeNotification}
            position={position}
          />
        </div>
      ))}
    </div>
  )
}

// Usage Examples:
/*
function TherapyApp() {
  const {
    notifications,
    showSuccess,
    showError,
    showTherapyUpdate,
    removeNotification
  } = useNotifications()

  const handleSessionComplete = () => {
    showSuccess(
      { ar: 'تم إكمال الجلسة', en: 'Session Completed' },
      { ar: 'تم حفظ تقرير الجلسة بنجاح', en: 'Session report saved successfully' },
      {
        therapyContext: {
          sessionId: 'session-123',
          studentName: { ar: 'أحمد محمد', en: 'Ahmed Mohammed' },
          therapistName: { ar: 'د. فاطمة أحمد', en: 'Dr. Fatima Ahmed' },
          sessionType: 'speech'
        },
        action: {
          label: { ar: 'عرض التقرير', en: 'View Report' },
          onClick: () => navigate('/reports/session-123')
        }
      }
    )
  }

  const handleError = () => {
    showError(
      { ar: 'خطأ في الاتصال', en: 'Connection Error' },
      { ar: 'فشل في حفظ البيانات، يرجى المحاولة مرة أخرى', en: 'Failed to save data, please try again' },
      {
        action: {
          label: { ar: 'إعادة المحاولة', en: 'Retry' },
          onClick: () => retryOperation()
        }
      }
    )
  }

  const handleTherapyReminder = () => {
    showTherapyUpdate(
      { ar: 'تذكير بالجلسة', en: 'Session Reminder' },
      { ar: 'جلسة علاج النطق تبدأ خلال ١٥ دقيقة', en: 'Speech therapy session starts in 15 minutes' },
      {
        studentName: { ar: 'سارة علي', en: 'Sara Ali' },
        therapistName: { ar: 'د. محمد حسن', en: 'Dr. Mohammed Hassan' },
        sessionType: 'speech'
      },
      {
        action: {
          label: { ar: 'انضم للجلسة', en: 'Join Session' },
          onClick: () => navigate('/session/join')
        }
      }
    )
  }

  return (
    <div>
      <button onClick={handleSessionComplete}>Complete Session</button>
      <button onClick={handleError}>Show Error</button>
      <button onClick={handleTherapyReminder}>Show Reminder</button>
      
      <NotificationContainer position="top-right" maxNotifications={3} />
    </div>
  )
}
*/
