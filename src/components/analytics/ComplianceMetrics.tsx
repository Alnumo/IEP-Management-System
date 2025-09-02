/**
 * Compliance Metrics Component
 * Displays compliance analytics, audit trails, and regulatory reporting
 */

import React, { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ComplianceAnalytics } from '@/types/analytics'
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  Eye,
  Download,
  Calendar,
  TrendingUp,
  Users,
  Award
} from 'lucide-react'

interface ComplianceMetricsProps {
  data: ComplianceAnalytics
  language: 'ar' | 'en'
}

const COMPLIANCE_COLORS = {
  compliant: '#22c55e',
  warning: '#f59e0b',
  critical: '#ef4444',
  overdue: '#dc2626',
  upcoming: '#3b82f6'
}

const getComplianceStatusColor = (status: string) => {
  switch (status) {
    case 'compliant':
    case 'completed':
      return 'success'
    case 'warning':
    case 'due_soon':
      return 'warning'
    case 'critical':
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const getComplianceStatusIcon = (status: string) => {
  switch (status) {
    case 'compliant':
    case 'completed':
      return <CheckCircle className="h-4 w-4" />
    case 'warning':
    case 'due_soon':
      return <AlertTriangle className="h-4 w-4" />
    case 'critical':
    case 'overdue':
      return <XCircle className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getComplianceStatusLabel = (status: string, language: 'ar' | 'en') => {
  const labels = {
    compliant: { ar: 'ملتزم', en: 'Compliant' },
    completed: { ar: 'مكتمل', en: 'Completed' },
    warning: { ar: 'تحذير', en: 'Warning' },
    due_soon: { ar: 'مستحق قريباً', en: 'Due Soon' },
    critical: { ar: 'حرج', en: 'Critical' },
    overdue: { ar: 'متأخر', en: 'Overdue' },
    pending: { ar: 'معلق', en: 'Pending' }
  }
  return labels[status as keyof typeof labels]?.[language] || status
}

export const ComplianceMetrics: React.FC<ComplianceMetricsProps> = ({
  data,
  language
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [selectedCategory, setSelectedCategory] = useState('all')

  if (!data) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        {language === 'ar' ? 'لا توجد بيانات امتثال' : 'No compliance data available'}
      </div>
    )
  }

  // Process compliance data for charts
  const overallComplianceData = [
    {
      name: language === 'ar' ? 'ملتزم' : 'Compliant',
      value: data.overall_compliance_score || 85,
      color: COMPLIANCE_COLORS.compliant
    },
    {
      name: language === 'ar' ? 'يحتاج انتباه' : 'Needs Attention',
      value: 100 - (data.overall_compliance_score || 85),
      color: COMPLIANCE_COLORS.warning
    }
  ]

  // Sample compliance requirements data
  const complianceRequirements = data.compliance_requirements || [
    {
      id: '1',
      requirement_name_ar: 'مراجعة خطة التعليم الفردي',
      requirement_name_en: 'IEP Review',
      status: 'compliant',
      due_date: '2024-12-31',
      completion_rate: 95,
      category: 'documentation'
    },
    {
      id: '2',
      requirement_name_ar: 'تقييم التقدم الربع سنوي',
      requirement_name_en: 'Quarterly Progress Assessment',
      status: 'due_soon',
      due_date: '2024-10-15',
      completion_rate: 75,
      category: 'assessment'
    },
    {
      id: '3',
      requirement_name_ar: 'توثيق الجلسات العلاجية',
      requirement_name_en: 'Therapy Session Documentation',
      status: 'warning',
      due_date: '2024-09-30',
      completion_rate: 65,
      category: 'documentation'
    },
    {
      id: '4',
      requirement_name_ar: 'مراجعة الأهداف الشهرية',
      requirement_name_en: 'Monthly Goal Review',
      status: 'overdue',
      due_date: '2024-09-01',
      completion_rate: 40,
      category: 'planning'
    }
  ]

  // Sample audit trail data
  const auditTrail = data.audit_trail || [
    {
      timestamp: '2024-09-15T10:30:00Z',
      user: 'د. أحمد محمد',
      action_ar: 'تحديث خطة التعليم الفردي',
      action_en: 'Updated IEP Plan',
      category: 'document_update',
      status: 'completed'
    },
    {
      timestamp: '2024-09-14T14:15:00Z',
      user: 'أ. سارة أحمد',
      action_ar: 'إضافة تقرير جلسة علاجية',
      action_en: 'Added therapy session report',
      category: 'session_documentation',
      status: 'completed'
    },
    {
      timestamp: '2024-09-13T09:45:00Z',
      user: 'د. محمد علي',
      action_ar: 'مراجعة تقدم الهدف',
      action_en: 'Reviewed goal progress',
      category: 'progress_review',
      status: 'completed'
    }
  ]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}%
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header with overall compliance score */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            {language === 'ar' ? 'مقاييس الامتثال' : 'Compliance Metrics'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? `نسبة الامتثال الإجمالية: ${data.overall_compliance_score || 85}%`
              : `Overall compliance rate: ${data.overall_compliance_score || 85}%`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'تصدير التقرير' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">
              {language === 'ar' ? 'الشهر الحالي' : 'Current Month'}
            </SelectItem>
            <SelectItem value="current_quarter">
              {language === 'ar' ? 'الربع الحالي' : 'Current Quarter'}
            </SelectItem>
            <SelectItem value="current_year">
              {language === 'ar' ? 'السنة الحالية' : 'Current Year'}
            </SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {language === 'ar' ? 'جميع الفئات' : 'All Categories'}
            </SelectItem>
            <SelectItem value="documentation">
              {language === 'ar' ? 'التوثيق' : 'Documentation'}
            </SelectItem>
            <SelectItem value="assessment">
              {language === 'ar' ? 'التقييم' : 'Assessment'}
            </SelectItem>
            <SelectItem value="planning">
              {language === 'ar' ? 'التخطيط' : 'Planning'}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            {language === 'ar' ? 'نظرة عامة' : 'Overview'}
          </TabsTrigger>
          <TabsTrigger value="requirements">
            {language === 'ar' ? 'المتطلبات' : 'Requirements'}
          </TabsTrigger>
          <TabsTrigger value="audit">
            {language === 'ar' ? 'سجل التدقيق' : 'Audit Trail'}
          </TabsTrigger>
          <TabsTrigger value="reports">
            {language === 'ar' ? 'التقارير' : 'Reports'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-green-600">
                      {data.compliant_items || 12}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'عناصر ملتزمة' : 'Compliant Items'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-yellow-600">
                      {data.warning_items || 3}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'تحذيرات' : 'Warnings'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-red-600">
                      {data.critical_items || 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'عناصر حرجة' : 'Critical Items'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <div className="text-2xl font-bold text-blue-600">
                      {data.upcoming_deadlines || 5}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'مواعيد قريبة' : 'Upcoming Deadlines'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Compliance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'نسبة الامتثال الإجمالية' : 'Overall Compliance Rate'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overallComplianceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {overallComplianceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'اتجاه الامتثال الشهري' : 'Monthly Compliance Trend'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthly_trends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="compliance_rate"
                        stroke={COMPLIANCE_COLORS.compliant}
                        strokeWidth={2}
                        name={language === 'ar' ? 'نسبة الامتثال %' : 'Compliance Rate %'}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requirements Tab */}
        <TabsContent value="requirements" className="space-y-6">
          <div className="space-y-4">
            {complianceRequirements.map((requirement) => (
              <Card key={requirement.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">
                        {language === 'ar' ? requirement.requirement_name_ar : requirement.requirement_name_en}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getComplianceStatusColor(requirement.status)}>
                          {getComplianceStatusIcon(requirement.status)}
                          <span className="ml-1">
                            {getComplianceStatusLabel(requirement.status, language)}
                          </span>
                        </Badge>
                        <span className="text-xs text-muted-foreground capitalize">
                          {requirement.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{requirement.completion_rate}%</div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'مكتمل' : 'Complete'}
                      </div>
                    </div>
                  </div>
                  
                  <Progress value={requirement.completion_rate} className="mb-3" />
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {language === 'ar' ? 'تاريخ الاستحقاق:' : 'Due date:'} {requirement.due_date}
                    </span>
                    <Button variant="outline" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      {language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                {language === 'ar' ? 'سجل التدقيق الأخير' : 'Recent Audit Trail'}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'سجل بجميع الإجراءات والتغييرات المتعلقة بالامتثال'
                  : 'Log of all compliance-related actions and changes'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditTrail.map((entry, index) => (
                  <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-sm">
                          {language === 'ar' ? entry.action_ar : entry.action_en}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.user} • {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {entry.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="h-5 w-5 mr-2" />
                  {language === 'ar' ? 'تقارير الامتثال' : 'Compliance Reports'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تقرير الامتثال الشهري' : 'Monthly Compliance Report'}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تقرير المواعيد النهائية' : 'Deadline Report'}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تحليل الاتجاهات' : 'Trend Analysis'}
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'تقرير الفريق' : 'Team Report'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {language === 'ar' ? 'تقارير مخصصة' : 'Custom Reports'}
                </CardTitle>
                <CardDescription>
                  {language === 'ar' 
                    ? 'إنشاء تقارير مخصصة بناءً على معايير محددة'
                    : 'Generate custom reports based on specific criteria'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      {language === 'ar' ? 'نوع التقرير:' : 'Report Type:'}
                    </label>
                    <Select>
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue placeholder={language === 'ar' ? 'اختر النوع' : 'Select type'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compliance_overview">
                          {language === 'ar' ? 'نظرة عامة على الامتثال' : 'Compliance Overview'}
                        </SelectItem>
                        <SelectItem value="requirement_status">
                          {language === 'ar' ? 'حالة المتطلبات' : 'Requirement Status'}
                        </SelectItem>
                        <SelectItem value="audit_summary">
                          {language === 'ar' ? 'ملخص التدقيق' : 'Audit Summary'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    {language === 'ar' ? 'إنشاء التقرير' : 'Generate Report'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ComplianceMetrics