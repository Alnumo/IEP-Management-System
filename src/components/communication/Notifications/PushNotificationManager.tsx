/**
 * Push Notification Manager - Browser Push Integration
 * Service worker management and browser push notification handling
 * Arkan Al-Numo Center - Push Notification System
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  BellOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Smartphone,
  Globe,
  Shield,
  RefreshCw,
  Power,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { communicationPushNotifications, useCommunicationNotifications } from '@/services/communication-push-notifications'
import { toast } from 'sonner'

interface PushNotificationManagerProps {
  userId: string
  onPermissionChange?: (permission: NotificationPermission) => void
  onSubscriptionChange?: (subscribed: boolean) => void
  showTestButton?: boolean
  className?: string
}

interface DeviceInfo {
  userAgent: string
  platform: string
  language: string
  cookiesEnabled: boolean
  serviceWorkerSupported: boolean
  notificationSupported: boolean
  pushManagerSupported: boolean
}

export const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({
  userId,
  onPermissionChange,
  onSubscriptionChange,
  showTestButton = true,
  className
}) => {
  const { language, isRTL } = useLanguage()
  
  // Use the communication notifications hook
  const {
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    testNotification
  } = useCommunicationNotifications(userId)

  // Local state
  const [loading, setLoading] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [subscriptionDetails, setSubscriptionDetails] = useState<PushSubscription | null>(null)
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'checking' | 'registered' | 'failed'>('checking')

  // Get device information
  useEffect(() => {
    const getDeviceInfo = async () => {
      const info: DeviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        serviceWorkerSupported: 'serviceWorker' in navigator,
        notificationSupported: 'Notification' in window,
        pushManagerSupported: 'PushManager' in window
      }
      setDeviceInfo(info)
    }

    getDeviceInfo()
  }, [])

  // Check service worker status
  useEffect(() => {
    const checkServiceWorker = async () => {
      if (!('serviceWorker' in navigator)) {
        setServiceWorkerStatus('failed')
        return
      }

      try {
        const registration = await navigator.serviceWorker.getRegistration()
        setServiceWorkerStatus(registration ? 'registered' : 'failed')
      } catch (error) {
        console.error('Service worker check failed:', error)
        setServiceWorkerStatus('failed')
      }
    }

    checkServiceWorker()
  }, [])

  // Get current subscription details
  useEffect(() => {
    const getSubscriptionDetails = async () => {
      if (!('serviceWorker' in navigator)) return

      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration) {
          const subscription = await registration.pushManager.getSubscription()
          setSubscriptionDetails(subscription)
        }
      } catch (error) {
        console.error('Failed to get subscription details:', error)
      }
    }

    if (isSubscribed) {
      getSubscriptionDetails()
    } else {
      setSubscriptionDetails(null)
    }
  }, [isSubscribed])

  // Handle subscription toggle
  const handleSubscriptionToggle = async () => {
    setLoading(true)
    try {
      if (isSubscribed) {
        const success = await unsubscribe()
        if (success) {
          toast.success(language === 'ar' ? 'تم إلغاء الاشتراك في الإشعارات' : 'Unsubscribed from notifications')
          onSubscriptionChange?.(false)
        } else {
          toast.error(language === 'ar' ? 'فشل في إلغاء الاشتراك' : 'Failed to unsubscribe')
        }
      } else {
        const success = await subscribe()
        if (success) {
          toast.success(language === 'ar' ? 'تم الاشتراك في الإشعارات بنجاح' : 'Successfully subscribed to notifications')
          onSubscriptionChange?.(true)
        } else {
          toast.error(language === 'ar' ? 'فشل في الاشتراك' : 'Failed to subscribe')
        }
      }
    } catch (error) {
      console.error('Subscription toggle failed:', error)
      toast.error(language === 'ar' ? 'حدث خطأ في النظام' : 'System error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Handle test notification
  const handleTestNotification = async () => {
    setLoading(true)
    try {
      await testNotification()
      toast.success(language === 'ar' ? 'تم إرسال إشعار تجريبي' : 'Test notification sent')
    } catch (error) {
      console.error('Test notification failed:', error)
      toast.error(language === 'ar' ? 'فشل في إرسال الإشعار التجريبي' : 'Failed to send test notification')
    } finally {
      setLoading(false)
    }
  }

  // Get permission status display
  const getPermissionStatus = () => {
    const statuses = {
      granted: {
        icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        text: language === 'ar' ? 'مُمكن' : 'Granted',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200'
      },
      denied: {
        icon: <XCircle className="w-5 h-5 text-red-500" />,
        text: language === 'ar' ? 'مرفوض' : 'Denied',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200'
      },
      default: {
        icon: <AlertCircle className="w-5 h-5 text-yellow-500" />,
        text: language === 'ar' ? 'في انتظار الإذن' : 'Awaiting Permission',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200'
      }
    }

    return statuses[permission] || statuses.default
  }

  // Get compatibility status
  const getCompatibilityStatus = () => {
    if (!deviceInfo) return null

    const compatible = deviceInfo.serviceWorkerSupported && 
                      deviceInfo.notificationSupported && 
                      deviceInfo.pushManagerSupported

    return {
      compatible,
      issues: [
        !deviceInfo.serviceWorkerSupported && 'Service Worker not supported',
        !deviceInfo.notificationSupported && 'Notifications not supported',
        !deviceInfo.pushManagerSupported && 'Push Manager not supported'
      ].filter(Boolean)
    }
  }

  const permissionStatus = getPermissionStatus()
  const compatibilityStatus = getCompatibilityStatus()

  // Notify permission change
  useEffect(() => {
    onPermissionChange?.(permission)
  }, [permission, onPermissionChange])

  return (
    <div className={cn("space-y-6", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {language === 'ar' ? 'إشعارات الدفع' : 'Push Notifications'}
          </CardTitle>
          <CardDescription>
            {language === 'ar' ? 
              'إدارة إشعارات المتصفح والإعدادات المتقدمة' : 
              'Manage browser notifications and advanced settings'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className={cn("p-4 rounded-lg border", permissionStatus.bgColor)}>
            <div className="flex items-center gap-3">
              {permissionStatus.icon}
              <div>
                <h4 className={cn("font-medium", permissionStatus.color)}>
                  {language === 'ar' ? 'حالة الإذن' : 'Permission Status'}
                </h4>
                <p className={cn("text-sm", permissionStatus.color)}>
                  {permissionStatus.text}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">
                  {language === 'ar' ? 'تمكين الإشعارات' : 'Enable Notifications'}
                </Label>
                <p className="text-sm text-gray-600">
                  {language === 'ar' ? 
                    'تلقي إشعارات فورية في المتصفح' : 
                    'Receive instant notifications in browser'
                  }
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {isSubscribed && (
                  <Badge variant="secondary" className="text-xs">
                    {language === 'ar' ? 'نشط' : 'Active'}
                  </Badge>
                )}
                
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleSubscriptionToggle}
                  disabled={loading || permission === 'denied' || !compatibilityStatus?.compatible}
                />
              </div>
            </div>

            {/* Test Notification Button */}
            {showTestButton && isSubscribed && permission === 'granted' && (
              <Button
                onClick={handleTestNotification}
                variant="outline"
                disabled={loading}
                className="w-full"
              >
                <Bell className="w-4 h-4 mr-2" />
                {loading ? 
                  (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') :
                  (language === 'ar' ? 'إرسال إشعار تجريبي' : 'Send Test Notification')
                }
              </Button>
            )}
          </div>

          <Separator />

          {/* Service Worker Status */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {language === 'ar' ? 'حالة النظام' : 'System Status'}
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>{language === 'ar' ? 'Service Worker' : 'Service Worker'}</span>
                <Badge variant={serviceWorkerStatus === 'registered' ? 'default' : 'destructive'}>
                  {serviceWorkerStatus === 'registered' ? 
                    (language === 'ar' ? 'مسجل' : 'Registered') :
                    serviceWorkerStatus === 'failed' ?
                    (language === 'ar' ? 'فاشل' : 'Failed') :
                    (language === 'ar' ? 'جاري التحقق' : 'Checking')
                  }
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span>{language === 'ar' ? 'دعم الإشعارات' : 'Notification Support'}</span>
                <Badge variant={deviceInfo?.notificationSupported ? 'default' : 'destructive'}>
                  {deviceInfo?.notificationSupported ? 
                    (language === 'ar' ? 'مدعوم' : 'Supported') :
                    (language === 'ar' ? 'غير مدعوم' : 'Not Supported')
                  }
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span>{language === 'ar' ? 'دعم Push Manager' : 'Push Manager Support'}</span>
                <Badge variant={deviceInfo?.pushManagerSupported ? 'default' : 'destructive'}>
                  {deviceInfo?.pushManagerSupported ? 
                    (language === 'ar' ? 'مدعوم' : 'Supported') :
                    (language === 'ar' ? 'غير مدعوم' : 'Not Supported')
                  }
                </Badge>
              </div>
            </div>
          </div>

          {/* Subscription Details */}
          {subscriptionDetails && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  {language === 'ar' ? 'تفاصيل الاشتراك' : 'Subscription Details'}
                </h4>
                
                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Endpoint:</span>
                    <div className="text-xs text-gray-600 break-all">
                      {subscriptionDetails.endpoint.substring(0, 60)}...
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {language === 'ar' ? 'تاريخ الإنشاء' : 'Created'}
                    </span>
                    <span className="text-gray-600">
                      {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Compatibility Issues */}
      {compatibilityStatus && !compatibilityStatus.compatible && (
        <Alert variant="destructive">
          <XCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                {language === 'ar' ? 
                  'متصفحك لا يدعم الإشعارات بالكامل' : 
                  'Your browser does not fully support notifications'
                }
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {compatibilityStatus.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Permission Denied Help */}
      {permission === 'denied' && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                {language === 'ar' ? 
                  'تم رفض إذن الإشعارات' : 
                  'Notification permission denied'
                }
              </p>
              <p className="text-sm">
                {language === 'ar' ? 
                  'لتمكين الإشعارات، يرجى النقر على أيقونة القفل في شريط العناوين واختيار "السماح" للإشعارات.' :
                  'To enable notifications, click the lock icon in the address bar and select "Allow" for notifications.'
                }
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Device Information */}
      {deviceInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Smartphone className="w-4 h-4" />
              {language === 'ar' ? 'معلومات الجهاز' : 'Device Information'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">{language === 'ar' ? 'المنصة' : 'Platform'}:</span>
                <div className="text-gray-600">{deviceInfo.platform}</div>
              </div>
              
              <div>
                <span className="font-medium">{language === 'ar' ? 'اللغة' : 'Language'}:</span>
                <div className="text-gray-600">{deviceInfo.language}</div>
              </div>
              
              <div>
                <span className="font-medium">Cookies:</span>
                <div className="text-gray-600">
                  {deviceInfo.cookiesEnabled ? 
                    (language === 'ar' ? 'مُمكن' : 'Enabled') :
                    (language === 'ar' ? 'معطل' : 'Disabled')
                  }
                </div>
              </div>
              
              <div>
                <span className="font-medium">User Agent:</span>
                <div className="text-gray-600 text-xs break-all">
                  {deviceInfo.userAgent.substring(0, 50)}...
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Healthcare Compliance Notice */}
      <Alert>
        <Shield className="w-4 h-4" />
        <AlertDescription>
          <p className="text-sm">
            {language === 'ar' ? 
              'جميع الإشعارات تتبع معايير الخصوصية الطبية ولا تحتوي على معلومات طبية حساسة.' :
              'All notifications follow medical privacy standards and do not contain sensitive medical information.'
            }
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}