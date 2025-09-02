// Invoice Automation Component for Story 2.3: Financial Management
// Manages automated invoice generation rules and processes

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Separator } from '../ui/separator'
import { Alert, AlertDescription } from '../ui/alert'
import { 
  PlusIcon,
  SettingsIcon,
  PlayCircleIcon,
  PauseCircleIcon,
  EditIcon,
  TrashIcon,
  CalendarIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  BarChart3Icon,
  FileTextIcon
} from 'lucide-react'
import { invoiceAutomationService } from '../../services/invoice-automation-service'
import type {
  InvoiceGenerationRule,
  DiscountRule,
  AutomatedInvoiceGeneration,
  ServiceType
} from '../types/financial-management'

interface InvoiceAutomationProps {
  onRuleUpdated?: () => void
}

interface RuleFormData extends Partial<InvoiceGenerationRule> {
  discountRules?: DiscountRule[]
}

const SERVICE_TYPES: Array<{ value: ServiceType; label: string; labelAr: string }> = [
  { value: 'aba_session', label: 'ABA Therapy', labelAr: 'العلاج السلوكي التطبيقي' },
  { value: 'speech_therapy', label: 'Speech Therapy', labelAr: 'علاج النطق' },
  { value: 'occupational_therapy', label: 'Occupational Therapy', labelAr: 'العلاج الوظيفي' },
  { value: 'physical_therapy', label: 'Physical Therapy', labelAr: 'العلاج الطبيعي' },
  { value: 'behavioral_therapy', label: 'Behavioral Therapy', labelAr: 'العلاج السلوكي' },
  { value: 'assessment', label: 'Assessment', labelAr: 'التقييم' },
  { value: 'consultation', label: 'Consultation', labelAr: 'الاستشارة' }
]

const TRIGGER_TYPES = [
  { value: 'session_completion', label: 'Session Completion', labelAr: 'انتهاء الجلسة' },
  { value: 'service_delivery', label: 'Service Delivery', labelAr: 'تقديم الخدمة' },
  { value: 'goal_achievement', label: 'Goal Achievement', labelAr: 'تحقيق الهدف' },
  { value: 'time_based', label: 'Time Based', labelAr: 'زمني' },
  { value: 'manual', label: 'Manual', labelAr: 'يدوي' }
]

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', labelAr: 'يومي' },
  { value: 'weekly', label: 'Weekly', labelAr: 'أسبوعي' },
  { value: 'monthly', label: 'Monthly', labelAr: 'شهري' },
  { value: 'quarterly', label: 'Quarterly', labelAr: 'ربع سنوي' }
]

export const InvoiceAutomation: React.FC<InvoiceAutomationProps> = ({
  onRuleUpdated
}) => {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  // State management
  const [rules, setRules] = useState<InvoiceGenerationRule[]>([])
  const [automationStats, setAutomationStats] = useState<any>(null)
  const [recentGenerations, setRecentGenerations] = useState<AutomatedInvoiceGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRule, setSelectedRule] = useState<InvoiceGenerationRule | null>(null)
  const [showRuleDialog, setShowRuleDialog] = useState(false)
  const [ruleForm, setRuleForm] = useState<RuleFormData>({})

  // Load data on mount
  useEffect(() => {
    loadAutomationData()
  }, [])

  const loadAutomationData = async () => {
    setLoading(true)
    try {
      // Load rules, stats, and recent generations
      // In a real implementation, these would be API calls
      await Promise.all([
        loadRules(),
        loadAutomationStats(),
        loadRecentGenerations()
      ])
    } catch (error) {
      console.error('Error loading automation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRules = async () => {
    // Mock data - replace with actual API call
    const mockRules: InvoiceGenerationRule[] = [
      {
        id: '1',
        name: 'Weekly ABA Sessions',
        nameAr: 'جلسات العلاج السلوكي الأسبوعية',
        isActive: true,
        triggerType: 'time_based',
        triggerConditions: {
          frequency: 'weekly',
          dayOfWeek: 1, // Monday
          serviceTypes: ['aba_session'],
          minSessionCount: 3
        },
        invoiceConfig: {
          paymentTerms: 30,
          currency: 'SAR',
          autoSend: true,
          sendToParent: true,
          createPaymentPlan: false
        },
        createdBy: 'admin',
        createdAt: '2024-08-01T00:00:00Z',
        updatedAt: '2024-08-01T00:00:00Z'
      }
    ]
    setRules(mockRules)
  }

  const loadAutomationStats = async () => {
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    
    const stats = await invoiceAutomationService.getAutomationStatistics(startDate, endDate)
    setAutomationStats(stats)
  }

  const loadRecentGenerations = async () => {
    // Mock data - replace with actual API call
    setRecentGenerations([])
  }

  const handleCreateRule = () => {
    setSelectedRule(null)
    setRuleForm({
      name: '',
      nameAr: '',
      isActive: true,
      triggerType: 'session_completion',
      triggerConditions: {},
      invoiceConfig: {
        paymentTerms: 30,
        currency: 'SAR',
        autoSend: false,
        sendToParent: true,
        createPaymentPlan: false
      }
    })
    setShowRuleDialog(true)
  }

  const handleEditRule = (rule: InvoiceGenerationRule) => {
    setSelectedRule(rule)
    setRuleForm({ ...rule })
    setShowRuleDialog(true)
  }

  const handleSaveRule = async () => {
    try {
      if (selectedRule) {
        // Update existing rule
        await invoiceAutomationService.updateGenerationRule(selectedRule.id, ruleForm)
      } else {
        // Create new rule
        await invoiceAutomationService.createGenerationRule(ruleForm as any)
      }
      
      setShowRuleDialog(false)
      await loadRules()
      onRuleUpdated?.()
    } catch (error) {
      console.error('Error saving rule:', error)
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await invoiceAutomationService.updateGenerationRule(ruleId, { isActive })
      await loadRules()
    } catch (error) {
      console.error('Error toggling rule:', error)
    }
  }

  const getRuleStatusColor = (rule: InvoiceGenerationRule) => {
    if (!rule.isActive) return 'bg-gray-100 text-gray-800'
    return 'bg-green-100 text-green-800'
  }

  const getTriggerTypeLabel = (triggerType: string) => {
    const type = TRIGGER_TYPES.find(t => t.value === triggerType)
    return isRTL ? type?.labelAr : type?.label
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const renderRulesTab = () => (
    <div className="space-y-6">
      {/* Rules Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t('Invoice Generation Rules')}</h3>
          <p className="text-gray-600">{t('Manage automated invoice generation rules')}</p>
        </div>
        <Button onClick={handleCreateRule}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('New Rule')}
        </Button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold">{isRTL ? rule.nameAr : rule.name}</h4>
                    <Badge className={getRuleStatusColor(rule)}>
                      {rule.isActive ? t('Active') : t('Inactive')}
                    </Badge>
                    <Badge variant="outline">
                      {getTriggerTypeLabel(rule.triggerType)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-gray-500">{t('Payment Terms')}</p>
                      <p className="font-medium">{rule.invoiceConfig?.paymentTerms || 30} {t('days')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('Auto Send')}</p>
                      <p className="font-medium">{rule.invoiceConfig?.autoSend ? t('Yes') : t('No')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('Service Types')}</p>
                      <p className="font-medium">
                        {rule.triggerConditions?.serviceTypes?.length || 0} {t('selected')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">{t('Created')}</p>
                      <p className="font-medium">{new Date(rule.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                  >
                    {rule.isActive ? (
                      <PauseCircleIcon className="h-4 w-4" />
                    ) : (
                      <PlayCircleIcon className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditRule(rule)}
                  >
                    <EditIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                {t('No automation rules')}
              </h3>
              <p className="text-gray-500 mb-4">
                {t('Create your first rule to automate invoice generation')}
              </p>
              <Button onClick={handleCreateRule}>
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('Create Rule')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )

  const renderStatsTab = () => (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3Icon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Total Generations')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {automationStats?.totalGenerations || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Successful')}</p>
                <p className="text-2xl font-bold text-green-600">
                  {automationStats?.successfulGenerations || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircleIcon className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Failed')}</p>
                <p className="text-2xl font-bold text-red-600">
                  {automationStats?.failedGenerations || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">{t('Total Amount')}</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(automationStats?.totalAmount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Rules */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Most Active Rules')}</CardTitle>
        </CardHeader>
        <CardContent>
          {automationStats?.topRules?.length > 0 ? (
            <div className="space-y-3">
              {automationStats.topRules.map((rule: any, index: number) => (
                <div key={rule.ruleId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{rule.ruleName}</span>
                  </div>
                  <Badge>{rule.count} {t('generations')}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {t('No automation data available')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderRecentTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Recent Generations')}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentGenerations.length > 0 ? (
            <div className="space-y-3">
              {recentGenerations.map((generation) => (
                <div key={generation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Rule: {generation.ruleId}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(generation.triggeredAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(generation.totalAmount)}</p>
                    <Badge variant={generation.invoiceStatus === 'generated' ? 'default' : 'secondary'}>
                      {generation.invoiceStatus}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {t('No recent generations')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderRuleDialog = () => (
    <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {selectedRule ? t('Edit Rule') : t('Create New Rule')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">{t('Rule Name (English)')}</Label>
              <Input
                id="name"
                value={ruleForm.name || ''}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                placeholder={t('Enter rule name')}
              />
            </div>
            <div>
              <Label htmlFor="nameAr">{t('Rule Name (Arabic)')}</Label>
              <Input
                id="nameAr"
                value={ruleForm.nameAr || ''}
                onChange={(e) => setRuleForm({ ...ruleForm, nameAr: e.target.value })}
                placeholder={t('Enter Arabic rule name')}
                dir="rtl"
              />
            </div>
          </div>

          {/* Trigger Configuration */}
          <div>
            <Label>{t('Trigger Type')}</Label>
            <Select
              value={ruleForm.triggerType}
              onValueChange={(value) => setRuleForm({ ...ruleForm, triggerType: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {isRTL ? type.labelAr : type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Types */}
          <div>
            <Label>{t('Service Types')}</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SERVICE_TYPES.map((serviceType) => (
                <div key={serviceType.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={serviceType.value}
                    checked={ruleForm.triggerConditions?.serviceTypes?.includes(serviceType.value) || false}
                    onChange={(e) => {
                      const currentTypes = ruleForm.triggerConditions?.serviceTypes || []
                      const newTypes = e.target.checked
                        ? [...currentTypes, serviceType.value]
                        : currentTypes.filter(t => t !== serviceType.value)
                      
                      setRuleForm({
                        ...ruleForm,
                        triggerConditions: {
                          ...ruleForm.triggerConditions,
                          serviceTypes: newTypes
                        }
                      })
                    }}
                  />
                  <Label htmlFor={serviceType.value} className="text-sm">
                    {isRTL ? serviceType.labelAr : serviceType.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Configuration */}
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="paymentTerms">{t('Payment Terms (Days)')}</Label>
              <Input
                id="paymentTerms"
                type="number"
                value={ruleForm.invoiceConfig?.paymentTerms || 30}
                onChange={(e) => setRuleForm({
                  ...ruleForm,
                  invoiceConfig: {
                    ...ruleForm.invoiceConfig,
                    paymentTerms: parseInt(e.target.value) || 30
                  }
                })}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={ruleForm.invoiceConfig?.autoSend || false}
                onCheckedChange={(checked) => setRuleForm({
                  ...ruleForm,
                  invoiceConfig: {
                    ...ruleForm.invoiceConfig,
                    autoSend: checked
                  }
                })}
              />
              <Label>{t('Auto-send invoices')}</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleSaveRule}>
              {t('Save Rule')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading automation settings...')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold">{t('Invoice Automation')}</h2>
          <p className="text-gray-600">{t('Manage automated invoice generation and rules')}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={loadAutomationData}>
            <SettingsIcon className="h-4 w-4 mr-2" />
            {t('Refresh')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">{t('Rules')}</TabsTrigger>
          <TabsTrigger value="statistics">{t('Statistics')}</TabsTrigger>
          <TabsTrigger value="recent">{t('Recent Activity')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules">{renderRulesTab()}</TabsContent>
        <TabsContent value="statistics">{renderStatsTab()}</TabsContent>
        <TabsContent value="recent">{renderRecentTab()}</TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      {renderRuleDialog()}
    </div>
  )
}

export default InvoiceAutomation