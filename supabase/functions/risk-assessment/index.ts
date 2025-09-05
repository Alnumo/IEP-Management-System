import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface RiskAssessmentRequest {
  student_id: string
  assessment_type: 'dropout_risk' | 'plan_modification_risk' | 'intervention_urgency'
  force_refresh?: boolean
}

interface RiskAssessmentResponse {
  assessment_id: string
  student_id: string
  risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: {
    attendance_risk: number
    progress_risk: number
    engagement_risk: number
    medical_complexity_risk: number
    family_support_risk: number
  }
  intervention_recommendations: {
    immediate: string[]
    short_term: string[]
    long_term: string[]
  }
  alert_configuration: {
    should_alert: boolean
    alert_level: 'info' | 'warning' | 'critical'
    alert_message: {
      ar: string
      en: string
    }
  }
  created_at: string
  expires_at: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user has clinical access
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || !['admin', 'manager', 'therapist_lead', 'therapist'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for risk assessment' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const method = req.method
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(part => part)

    switch (method) {
      case 'POST':
        return await handleRiskAssessmentRequest(req, user.id)
      
      case 'GET':
        if (pathParts.includes('student') && pathParts.length >= 3) {
          const studentId = pathParts[2]
          return await handleGetStudentRiskAssessment(studentId, user.id)
        } else if (pathParts.includes('alerts')) {
          return await handleGetRiskAlerts(url.searchParams, user.id)
        } else if (pathParts.includes('dashboard')) {
          return await handleGetRiskDashboard(url.searchParams, user.id)
        }
        break

      case 'PUT':
        if (pathParts.includes('alert') && pathParts.length >= 3) {
          const assessmentId = pathParts[2]
          return await handleUpdateAlertStatus(assessmentId, req, user.id)
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Risk Assessment API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleRiskAssessmentRequest(req: Request, userId: string): Promise<Response> {
  try {
    const body: RiskAssessmentRequest = await req.json()
    const { student_id, assessment_type, force_refresh = false } = body

    if (!student_id || !assessment_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: student_id, assessment_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify student exists and user has access
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      return new Response(
        JSON.stringify({ error: 'Student not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing assessment if not forcing refresh
    if (!force_refresh) {
      const existingAssessment = await getExistingRiskAssessment(student_id, assessment_type)
      if (existingAssessment) {
        return new Response(
          JSON.stringify({ ...existingAssessment, cached: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate new risk assessment
    const assessment = await generateRiskAssessment(student_id, assessment_type, userId)
    
    return new Response(
      JSON.stringify(assessment),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling risk assessment request:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process risk assessment request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetStudentRiskAssessment(studentId: string, userId: string): Promise<Response> {
  try {
    const { data: assessments, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ assessments: assessments || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting student risk assessment:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve risk assessments' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetRiskAlerts(searchParams: URLSearchParams, userId: string): Promise<Response> {
  try {
    const alertLevel = searchParams.get('alert_level') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    let query = supabase
      .from('risk_assessments')
      .select(`
        id,
        student_id,
        risk_level,
        risk_score,
        alert_triggered,
        alert_sent_at,
        created_at,
        metadata,
        students!inner(name, age)
      `)
      .eq('alert_triggered', true)
      .gt('expires_at', new Date().toISOString())

    if (alertLevel !== 'all') {
      query = query.eq('risk_level', alertLevel)
    }

    if (unreadOnly) {
      query = query.is('alert_sent_at', null)
    }

    const { data: alerts, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    // Format alerts for dashboard display
    const formattedAlerts = (alerts || []).map(alert => ({
      id: alert.id,
      student_id: alert.student_id,
      student_name: alert.students.name,
      student_age: alert.students.age,
      risk_level: alert.risk_level,
      risk_score: alert.risk_score,
      alert_triggered: alert.alert_triggered,
      alert_sent_at: alert.alert_sent_at,
      created_at: alert.created_at,
      is_unread: !alert.alert_sent_at
    }))

    return new Response(
      JSON.stringify({ 
        alerts: formattedAlerts,
        total_count: formattedAlerts.length,
        unread_count: formattedAlerts.filter(a => a.is_unread).length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting risk alerts:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve risk alerts' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetRiskDashboard(searchParams: URLSearchParams, userId: string): Promise<Response> {
  try {
    const timeframe = searchParams.get('timeframe') || '30d'
    const includeTrends = searchParams.get('include_trends') === 'true'

    // Calculate date range
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Get risk level distribution
    const { data: riskDistribution } = await supabase
      .from('risk_assessments')
      .select('risk_level')
      .gt('created_at', startDate.toISOString())
      .gt('expires_at', new Date().toISOString())

    // Count by risk level
    const distribution = {
      low: riskDistribution?.filter(r => r.risk_level === 'low').length || 0,
      medium: riskDistribution?.filter(r => r.risk_level === 'medium').length || 0,
      high: riskDistribution?.filter(r => r.risk_level === 'high').length || 0,
      critical: riskDistribution?.filter(r => r.risk_level === 'critical').length || 0
    }

    // Get active alerts
    const { data: activeAlerts } = await supabase
      .from('risk_assessments')
      .select('id, risk_level, alert_triggered')
      .eq('alert_triggered', true)
      .gt('expires_at', new Date().toISOString())

    const alertStats = {
      total_alerts: activeAlerts?.length || 0,
      critical_alerts: activeAlerts?.filter(a => a.risk_level === 'critical').length || 0,
      high_alerts: activeAlerts?.filter(a => a.risk_level === 'high').length || 0
    }

    // Get recent assessments for trends (if requested)
    let trends = null
    if (includeTrends) {
      const { data: trendData } = await supabase
        .from('risk_assessments')
        .select('created_at, risk_score')
        .gt('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })

      // Calculate simple trend (simplified)
      const avgRiskScore = trendData?.reduce((sum, d) => sum + d.risk_score, 0) / (trendData?.length || 1) || 0
      const recentAvg = trendData?.slice(-7).reduce((sum, d) => sum + d.risk_score, 0) / 7 || 0
      const olderAvg = trendData?.slice(0, 7).reduce((sum, d) => sum + d.risk_score, 0) / 7 || 0

      trends = {
        average_risk_score: avgRiskScore,
        trend_direction: recentAvg > olderAvg ? 'increasing' : recentAvg < olderAvg ? 'decreasing' : 'stable',
        trend_magnitude: Math.abs(recentAvg - olderAvg)
      }
    }

    const dashboardData = {
      timeframe,
      risk_distribution: distribution,
      alert_statistics: alertStats,
      total_assessments: riskDistribution?.length || 0,
      trends,
      last_updated: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(dashboardData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting risk dashboard:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve risk dashboard data' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleUpdateAlertStatus(assessmentId: string, req: Request, userId: string): Promise<Response> {
  try {
    const body = await req.json()
    const { action } = body // 'acknowledge', 'dismiss', 'escalate'

    if (!action || !['acknowledge', 'dismiss', 'escalate'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Must be: acknowledge, dismiss, escalate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update alert status
    const updateData: any = {
      alert_sent_at: new Date().toISOString(),
      metadata: { 
        alert_action: action,
        handled_by: userId,
        handled_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabase
      .from('risk_assessments')
      .update(updateData)
      .eq('id', assessmentId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ message: `Alert ${action}d successfully`, assessment: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating alert status:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update alert status' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getExistingRiskAssessment(
  studentId: string,
  assessmentType: string
): Promise<RiskAssessmentResponse | null> {
  try {
    const { data, error } = await supabase
      .from('risk_assessments')
      .select('*')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return formatRiskAssessmentResponse(data)
  } catch (error) {
    console.error('Error getting existing risk assessment:', error)
    return null
  }
}

async function generateRiskAssessment(
  studentId: string,
  assessmentType: string,
  userId: string
): Promise<RiskAssessmentResponse> {
  try {
    // Extract student features for risk calculation
    const features = await extractStudentRiskFeatures(studentId)
    
    // Calculate risk scores
    const riskScores = calculateRiskScores(features)
    
    // Determine overall risk level
    const overallRiskScore = calculateOverallRisk(riskScores)
    const riskLevel = determineRiskLevel(overallRiskScore)
    
    // Generate intervention recommendations
    const interventions = generateInterventionRecommendations(riskLevel, riskScores)
    
    // Configure alerts
    const alertConfig = configureAlerts(riskLevel, overallRiskScore)
    
    // Set expiration (7 days for risk assessments)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Store in database
    const { data, error } = await supabase
      .from('risk_assessments')
      .insert({
        student_id: studentId,
        risk_score: overallRiskScore,
        risk_level: riskLevel,
        risk_factors: riskScores,
        intervention_recommendations: interventions,
        alert_triggered: alertConfig.should_alert,
        alert_sent_at: alertConfig.should_alert ? null : new Date().toISOString(),
        attendance_score: riskScores.attendance_risk,
        progress_score: riskScores.progress_risk,
        engagement_score: riskScores.engagement_risk,
        assessment_trend_score: riskScores.medical_complexity_risk,
        expires_at: expiresAt.toISOString(),
        created_by: userId,
        metadata: {
          assessment_type: assessmentType,
          feature_count: Object.keys(features).length,
          model_version: '1.0.0'
        }
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return formatRiskAssessmentResponse(data)
  } catch (error) {
    console.error('Error generating risk assessment:', error)
    throw new Error(`Failed to generate risk assessment: ${error}`)
  }
}

async function extractStudentRiskFeatures(studentId: string): Promise<any> {
  try {
    // Get student basic data
    const { data: student } = await supabase
      .from('students')
      .select('created_at, medical_records')
      .eq('id', studentId)
      .single()

    // Get session data
    const { data: sessions } = await supabase
      .from('therapy_sessions')
      .select('attendance_status, session_date, session_duration')
      .eq('student_id', studentId)
      .order('session_date', { ascending: false })
      .limit(20)

    // Get assessment data
    const { data: assessments } = await supabase
      .from('student_assessments')
      .select('score, assessment_date')
      .eq('student_id', studentId)
      .order('assessment_date', { ascending: false })
      .limit(10)

    return {
      enrollment_duration: student ? (Date.now() - new Date(student.created_at).getTime()) / (1000 * 60 * 60 * 24) : 0,
      medical_records: student?.medical_records || {},
      session_count: sessions?.length || 0,
      attendance_rate: sessions?.length > 0 ? 
        sessions.filter(s => s.attendance_status === 'present').length / sessions.length : 0,
      avg_session_duration: sessions?.length > 0 ? 
        sessions.reduce((sum, s) => sum + (s.session_duration || 60), 0) / sessions.length : 60,
      assessment_count: assessments?.length || 0,
      avg_assessment_score: assessments?.length > 0 ? 
        assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length : 0.5,
      assessment_trend: calculateAssessmentTrend(assessments || [])
    }
  } catch (error) {
    console.error('Error extracting student risk features:', error)
    return {} // Return empty features if extraction fails
  }
}

function calculateRiskScores(features: any) {
  const attendanceRisk = Math.max(0, 1 - (features.attendance_rate || 0))
  
  const progressRisk = features.assessment_trend === 'declining' ? 0.8 :
                       features.assessment_trend === 'stable' ? 0.4 : 0.2
  
  const engagementRisk = features.session_count < 5 ? 0.7 :
                        features.avg_session_duration < 45 ? 0.5 : 0.3
  
  const medicalComplexityRisk = calculateMedicalComplexity(features.medical_records)
  
  const familySupportRisk = 0.4 // Simplified - would calculate from family engagement data

  return {
    attendance_risk: attendanceRisk,
    progress_risk: progressRisk,
    engagement_risk: engagementRisk,
    medical_complexity_risk: medicalComplexityRisk,
    family_support_risk: familySupportRisk
  }
}

function calculateOverallRisk(riskScores: any): number {
  const weights = {
    attendance: 0.25,
    progress: 0.30,
    engagement: 0.25,
    medical: 0.10,
    family: 0.10
  }

  return Math.min(
    riskScores.attendance_risk * weights.attendance +
    riskScores.progress_risk * weights.progress +
    riskScores.engagement_risk * weights.engagement +
    riskScores.medical_complexity_risk * weights.medical +
    riskScores.family_support_risk * weights.family,
    1.0
  )
}

function determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (riskScore >= 0.8) return 'critical'
  if (riskScore >= 0.6) return 'high'
  if (riskScore >= 0.4) return 'medium'
  return 'low'
}

function generateInterventionRecommendations(riskLevel: string, riskScores: any) {
  const immediate: string[] = []
  const short_term: string[] = []
  const long_term: string[] = []

  if (riskLevel === 'critical') {
    immediate.push('Schedule immediate case review meeting')
    immediate.push('Contact family for urgent consultation')
  }

  if (riskScores.attendance_risk > 0.6) {
    immediate.push('Implement attendance recovery plan')
    short_term.push('Consider flexible scheduling options')
  }

  if (riskScores.progress_risk > 0.6) {
    immediate.push('Reassess therapy goals and methods')
    short_term.push('Increase session frequency if needed')
  }

  if (riskScores.engagement_risk > 0.5) {
    short_term.push('Introduce motivation enhancement strategies')
    long_term.push('Consider therapy approach modifications')
  }

  return { immediate, short_term, long_term }
}

function configureAlerts(riskLevel: string, riskScore: number) {
  const shouldAlert = riskLevel !== 'low'
  
  let alertLevel: 'info' | 'warning' | 'critical'
  if (riskLevel === 'critical') alertLevel = 'critical'
  else if (riskLevel === 'high') alertLevel = 'critical'
  else alertLevel = 'warning'

  const alertMessage = {
    ar: generateArabicAlertMessage(riskLevel, riskScore),
    en: generateEnglishAlertMessage(riskLevel, riskScore)
  }

  return {
    should_alert: shouldAlert,
    alert_level: alertLevel,
    alert_message: alertMessage
  }
}

function calculateAssessmentTrend(assessments: any[]): 'improving' | 'stable' | 'declining' {
  if (assessments.length < 2) return 'stable'
  
  const recent = assessments.slice(0, 3)
  const older = assessments.slice(3, 6)
  
  const recentAvg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length
  const olderAvg = older.length > 0 ? older.reduce((sum, a) => sum + a.score, 0) / older.length : recentAvg
  
  const difference = recentAvg - olderAvg
  
  if (difference > 0.1) return 'improving'
  if (difference < -0.1) return 'declining'
  return 'stable'
}

function calculateMedicalComplexity(medicalRecords: any): number {
  if (!medicalRecords) return 0

  let complexity = 0
  if (medicalRecords.diagnosis_codes) {
    complexity += Math.min(medicalRecords.diagnosis_codes.length * 0.2, 0.6)
  }
  if (medicalRecords.medications) {
    complexity += Math.min(medicalRecords.medications.length * 0.1, 0.3)
  }
  if (medicalRecords.allergies) {
    complexity += Math.min(medicalRecords.allergies.length * 0.05, 0.1)
  }

  return Math.min(complexity, 1.0)
}

function generateArabicAlertMessage(riskLevel: string, score: number): string {
  const scorePercent = (score * 100).toFixed(0)

  switch (riskLevel) {
    case 'critical':
      return `تحذير عاجل: مخاطر عالية لانقطاع العلاج (${scorePercent}%). يتطلب تدخل فوري.`
    case 'high':
      return `تحذير: مخاطر عالية (${scorePercent}%). يُنصح بالمتابعة المكثفة.`
    case 'medium':
      return `تنبيه: مخاطر متوسطة (${scorePercent}%). يُنصح بالمراقبة الإضافية.`
    default:
      return `معلومات: يواصل العلاج بشكل مناسب (${scorePercent}%).`
  }
}

function generateEnglishAlertMessage(riskLevel: string, score: number): string {
  const scorePercent = (score * 100).toFixed(0)

  switch (riskLevel) {
    case 'critical':
      return `URGENT: Critical risk for therapy discontinuation (${scorePercent}%). Immediate intervention required.`
    case 'high':
      return `WARNING: High risk level (${scorePercent}%). Intensive monitoring recommended.`
    case 'medium':
      return `ALERT: Moderate risk level (${scorePercent}%). Additional monitoring advised.`
    default:
      return `INFO: Maintaining appropriate therapy progress (${scorePercent}%).`
  }
}

function formatRiskAssessmentResponse(data: any): RiskAssessmentResponse {
  return {
    assessment_id: data.id,
    student_id: data.student_id,
    risk_score: data.risk_score,
    risk_level: data.risk_level,
    risk_factors: data.risk_factors,
    intervention_recommendations: data.intervention_recommendations,
    alert_configuration: {
      should_alert: data.alert_triggered,
      alert_level: data.risk_level === 'critical' ? 'critical' : 
                   data.risk_level === 'high' ? 'critical' : 'warning',
      alert_message: {
        ar: generateArabicAlertMessage(data.risk_level, data.risk_score),
        en: generateEnglishAlertMessage(data.risk_level, data.risk_score)
      }
    },
    created_at: data.created_at,
    expires_at: data.expires_at
  }
}