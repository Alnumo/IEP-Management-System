import React, { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../auth/AuthGuard'

// Alias for consistency
const useI18n = useLanguage
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { Loader2, Copy, Check, AlertTriangle } from 'lucide-react'

interface TwoFactorSetupProps {
  onSetupComplete?: () => void
  onCancel?: () => void
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  onSetupComplete,
  onCancel
}) => {
  const { t, language, isRTL } = useI18n()
  const { user } = useAuth()
  
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false)

  // Initialize 2FA setup
  useEffect(() => {
    if (!user) return
    initializeTwoFactor()
  }, [user])

  const initializeTwoFactor = async () => {
    if (!user) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Generate TOTP secret
      const { data: secretData, error: secretError } = await supabase
        .rpc('generate_totp_secret', { target_user_id: user.id })
      
      if (secretError) throw secretError
      
      const totpSecret = secretData
      setSecret(totpSecret)
      
      // Generate QR code
      const appName = t('app.name', 'Arkan Growth Center')
      const userEmail = user.email || user.phone || 'user'
      const otpauth = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${totpSecret}&issuer=${encodeURIComponent(appName)}`
      
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      
      setQrCodeUrl(qrCodeDataUrl)
      
    } catch (err: any) {
      console.error('Error initializing 2FA:', err)
      setError(err.message || t('auth.2fa.setup.error', 'Failed to initialize two-factor authentication'))
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, type: 'secret' | 'backup') => {
    try {
      await navigator.clipboard.writeText(text)
      
      if (type === 'secret') {
        setCopiedSecret(true)
        setTimeout(() => setCopiedSecret(false), 2000)
        toast.success(t('auth.2fa.secret.copied', 'Secret key copied to clipboard'))
      } else {
        setCopiedBackupCodes(true)
        setTimeout(() => setCopiedBackupCodes(false), 2000)
        toast.success(t('auth.2fa.backup.copied', 'Backup codes copied to clipboard'))
      }
    } catch (err) {
      toast.error(t('common.copy.error', 'Failed to copy to clipboard'))
    }
  }

  const verifyTotpCode = async () => {
    if (!user || !verificationCode) return
    
    setIsLoading(true)
    setError('')
    
    try {
      // Verify TOTP code
      const { data: isValid, error: verifyError } = await supabase
        .rpc('verify_totp_code', { 
          target_user_id: user.id, 
          totp_code: verificationCode 
        })
      
      if (verifyError) throw verifyError
      
      if (!isValid) {
        throw new Error(t('auth.2fa.verify.invalid', 'Invalid verification code'))
      }
      
      // Generate backup codes
      const { data: codes, error: codesError } = await supabase
        .rpc('generate_backup_codes', { target_user_id: user.id })
      
      if (codesError) throw codesError
      
      setBackupCodes(codes)
      setStep('complete')
      
      toast.success(t('auth.2fa.setup.success', 'Two-factor authentication enabled successfully'))
      
    } catch (err: any) {
      console.error('Error verifying 2FA:', err)
      setError(err.message || t('auth.2fa.verify.error', 'Failed to verify code'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    if (onSetupComplete) {
      onSetupComplete()
    }
  }

  const renderSetupStep = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">
          {t('auth.2fa.setup.title', 'Set up Two-Factor Authentication')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t('auth.2fa.setup.description', 'Scan the QR code below with your authenticator app')}
        </p>
      </div>
      
      {qrCodeUrl && (
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg border">
            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
          </div>
          
          <div className="w-full max-w-md">
            <Label htmlFor="secret">
              {t('auth.2fa.manual.title', 'Or enter this code manually:')}
            </Label>
            <div className="flex items-center space-x-2 mt-1">
              <Input
                id="secret"
                value={secret}
                readOnly
                className="font-mono text-sm"
                dir="ltr"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(secret, 'secret')}
                disabled={!secret}
              >
                {copiedSecret ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button
          onClick={() => setStep('verify')}
          disabled={isLoading || !secret}
        >
          {t('common.continue', 'Continue')}
        </Button>
      </div>
    </div>
  )

  const renderVerifyStep = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">
          {t('auth.2fa.verify.title', 'Verify Your Setup')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.2fa.verify.description', 'Enter the 6-digit code from your authenticator app')}
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-sm">
          <Label htmlFor="verification-code">
            {t('auth.2fa.code.label', 'Verification Code')}
          </Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="123456"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center text-lg font-mono tracking-widest"
            maxLength={6}
            dir="ltr"
          />
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      
      <div className="flex gap-3 justify-center">
        <Button
          variant="outline"
          onClick={() => setStep('setup')}
          disabled={isLoading}
        >
          {t('common.back', 'Back')}
        </Button>
        <Button
          onClick={verifyTotpCode}
          disabled={isLoading || verificationCode.length !== 6}
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {t('auth.2fa.verify.button', 'Verify & Enable')}
        </Button>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className={`space-y-6 ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-medium mb-2 text-green-700">
          {t('auth.2fa.complete.title', 'Two-Factor Authentication Enabled!')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('auth.2fa.complete.description', 'Your account is now protected with 2FA')}
        </p>
      </div>
      
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          {t('auth.2fa.backup.warning', 'Save these backup codes in a safe place. Each code can only be used once.')}
        </AlertDescription>
      </Alert>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">
            {t('auth.2fa.backup.title', 'Backup Codes')}
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(backupCodes.join('\n'), 'backup')}
          >
            {copiedBackupCodes ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {t('common.copy', 'Copy')}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, index) => (
            <code key={index} className="text-sm font-mono bg-white px-3 py-2 rounded border">
              {code}
            </code>
          ))}
        </div>
      </div>
      
      <Button onClick={handleComplete} className="w-full">
        {t('auth.2fa.complete.button', 'Complete Setup')}
      </Button>
    </div>
  )

  if (isLoading && step === 'setup') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm text-muted-foreground">
              {t('auth.2fa.initializing', 'Initializing two-factor authentication...')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className={isRTL ? 'text-right' : 'text-left'}>
          {t('auth.2fa.title', 'Two-Factor Authentication')}
        </CardTitle>
        <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
          {t('auth.2fa.subtitle', 'Enhance your account security')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'setup' && renderSetupStep()}
        {step === 'verify' && renderVerifyStep()}
        {step === 'complete' && renderCompleteStep()}
      </CardContent>
    </Card>
  )
}

export default TwoFactorSetup