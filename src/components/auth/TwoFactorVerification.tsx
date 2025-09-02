import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../auth/AuthGuard'

// Alias for consistency
const useI18n = useLanguage
import { SecurityService } from '../../services/security-service'
import { mark2FASessionVerified } from '../../lib/auth-utils'
import { toast } from 'sonner'
import { Loader2, Shield, Key, AlertTriangle, Smartphone } from 'lucide-react'

interface TwoFactorVerificationProps {
  onVerificationComplete?: () => void
  onCancel?: () => void
  showBackupCodeOption?: boolean
  redirectOnSuccess?: string
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  onVerificationComplete,
  onCancel,
  showBackupCodeOption = true,
  redirectOnSuccess
}) => {
  const { t, language, isRTL } = useI18n()
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'totp' | 'backup'>('totp')
  const [totpCode, setTotpCode] = useState<string>('')
  const [backupCode, setBackupCode] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string>('')
  const [remainingBackupCodes, setRemainingBackupCodes] = useState<number>(0)
  const [isRateLimited, setIsRateLimited] = useState(false)

  useEffect(() => {
    if (user) {
      loadBackupCodesCount()
      checkRateLimit()
    }
  }, [user])

  const loadBackupCodesCount = async () => {
    if (!user) return
    
    try {
      const count = await SecurityService.getUnusedBackupCodesCount(user.id)
      setRemainingBackupCodes(count)
    } catch (error) {
      console.error('Error loading backup codes count:', error)
    }
  }

  const checkRateLimit = async () => {
    if (!user) return
    
    try {
      const rateLimited = await SecurityService.checkRecentFailedAttempts(user.id)
      setIsRateLimited(rateLimited)
    } catch (error) {
      console.error('Error checking rate limit:', error)
    }
  }

  const handleTotpVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !totpCode || isRateLimited) return
    
    setIsVerifying(true)
    setError('')
    
    try {
      const isValid = await SecurityService.verifyTotpCode(user.id, totpCode)
      
      if (!isValid) {
        throw new Error(t('auth.2fa.verify.invalid', 'Invalid verification code'))
      }
      
      // Mark session as 2FA verified
      await mark2FASessionVerified()
      
      toast.success(t('auth.2fa.verify.success', 'Two-factor authentication successful'))
      
      if (onVerificationComplete) {
        onVerificationComplete()
      }
      
      if (redirectOnSuccess) {
        window.location.href = redirectOnSuccess
      }
      
    } catch (err: any) {
      console.error('TOTP verification error:', err)
      setError(err.message || t('auth.2fa.verify.error', 'Verification failed'))
      
      // Check if user is now rate limited
      await checkRateLimit()
      
    } finally {
      setIsVerifying(false)
      setTotpCode('')
    }
  }

  const handleBackupCodeVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !backupCode || isRateLimited) return
    
    setIsVerifying(true)
    setError('')
    
    try {
      const isValid = await SecurityService.verifyBackupCode(user.id, backupCode)
      
      if (!isValid) {
        throw new Error(t('auth.2fa.backup.invalid', 'Invalid backup code'))
      }
      
      // Mark session as 2FA verified
      await mark2FASessionVerified()
      
      // Update remaining backup codes count
      setRemainingBackupCodes(prev => Math.max(0, prev - 1))
      
      toast.success(t('auth.2fa.backup.success', 'Backup code verified successfully'))
      
      if (onVerificationComplete) {
        onVerificationComplete()
      }
      
      if (redirectOnSuccess) {
        window.location.href = redirectOnSuccess
      }
      
    } catch (err: any) {
      console.error('Backup code verification error:', err)
      setError(err.message || t('auth.2fa.backup.error', 'Invalid backup code'))
      
      await checkRateLimit()
      
    } finally {
      setIsVerifying(false)
      setBackupCode('')
    }
  }

  const formatTotpCode = (value: string) => {
    // Only allow digits and limit to 6 characters
    return value.replace(/\D/g, '').slice(0, 6)
  }

  const formatBackupCode = (value: string) => {
    // Only allow alphanumeric and limit to 12 characters
    return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 12).toUpperCase()
  }

  if (isRateLimited) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-red-700">
            {t('auth.2fa.rate_limited.title', 'Too Many Attempts')}
          </CardTitle>
          <CardDescription>
            {t('auth.2fa.rate_limited.description', 'Please wait 15 minutes before trying again')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={onCancel} className="w-full">
            {t('common.back', 'Back')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
          {t('auth.2fa.verify.title', 'Two-Factor Authentication')}
        </CardTitle>
        <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
          {t('auth.2fa.verify.description', 'Enter your verification code to continue')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'totp' | 'backup')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="totp" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              {t('auth.2fa.tabs.app', 'App Code')}
            </TabsTrigger>
            {showBackupCodeOption && (
              <TabsTrigger 
                value="backup" 
                className="flex items-center gap-2"
                disabled={remainingBackupCodes === 0}
              >
                <Key className="w-4 h-4" />
                {t('auth.2fa.tabs.backup', 'Backup Code')}
                {remainingBackupCodes > 0 && (
                  <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded">
                    {remainingBackupCodes}
                  </span>
                )}
              </TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="totp" className="mt-6">
            <form onSubmit={handleTotpVerification} className="space-y-4">
              <div>
                <Label htmlFor="totp-code" className={isRTL ? 'text-right' : 'text-left'}>
                  {t('auth.2fa.code.label', 'Authentication Code')}
                </Label>
                <Input
                  id="totp-code"
                  type="text"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(formatTotpCode(e.target.value))}
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                  disabled={isVerifying}
                  dir="ltr"
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('auth.2fa.code.help', 'Enter the 6-digit code from your authenticator app')}
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isVerifying}
                  className="flex-1"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={isVerifying || totpCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {t('auth.2fa.verify.button', 'Verify')}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          {showBackupCodeOption && (
            <TabsContent value="backup" className="mt-6">
              <form onSubmit={handleBackupCodeVerification} className="space-y-4">
                <div>
                  <Label htmlFor="backup-code" className={isRTL ? 'text-right' : 'text-left'}>
                    {t('auth.2fa.backup.label', 'Backup Code')}
                  </Label>
                  <Input
                    id="backup-code"
                    type="text"
                    placeholder="XXXXXXXXXXXX"
                    value={backupCode}
                    onChange={(e) => setBackupCode(formatBackupCode(e.target.value))}
                    className="text-center text-lg font-mono tracking-widest"
                    maxLength={12}
                    disabled={isVerifying}
                    dir="ltr"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('auth.2fa.backup.help', 'Enter one of your 12-character backup codes')}
                  </p>
                  {remainingBackupCodes > 0 && (
                    <p className="text-xs text-orange-600 mt-1">
                      {t('auth.2fa.backup.remaining', `${remainingBackupCodes} backup codes remaining`)}
                    </p>
                  )}
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isVerifying || backupCode.length !== 12}
                    className="flex-1"
                  >
                    {isVerifying && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {t('auth.2fa.verify.button', 'Verify')}
                  </Button>
                </div>
              </form>
            </TabsContent>
          )}
        </Tabs>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t('auth.2fa.security.note', 'This helps keep your account secure')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default TwoFactorVerification