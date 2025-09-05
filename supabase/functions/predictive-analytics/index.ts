import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PredictionRequest {
  student_id: string
  prediction_type: 'therapy_outcome' | 'risk_assessment' | 'goal_timeline'
  features?: number[]
  use_cached?: boolean
}

interface PredictionResponse {
  prediction_id: string
  student_id: string
  prediction_type: string
  prediction_value: any
  confidence_interval: {
    lower: number
    upper: number
  }
  risk_factors?: string[]
  clinical_explanations: {
    ar: string
    en: string
  }
  model_version: string
  created_at: string
  expires_at: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user permissions (admin/manager/therapist_lead)
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || !['admin', 'manager', 'therapist_lead'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const method = req.method
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(part => part)

    switch (method) {
      case 'POST':
        return await handlePredictionRequest(req, user.id)
      
      case 'GET':
        if (pathParts.includes('student') && pathParts.length >= 3) {
          const studentId = pathParts[2]
          return await handleGetStudentPredictions(studentId, user.id)
        } else if (pathParts.includes('batch')) {
          return await handleBatchPredictions(req, user.id)
        }
        return new Response(
          JSON.stringify({ error: 'Invalid GET endpoint' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        return new Response(
          JSON.stringify({ error: 'Method not allowed' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Predictive Analytics API Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handlePredictionRequest(req: Request, userId: string): Promise<Response> {
  try {
    const body: PredictionRequest = await req.json()
    const { student_id, prediction_type, features, use_cached = true } = body

    if (!student_id || !prediction_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: student_id, prediction_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if student exists and user has access
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

    // Check for cached predictions if requested
    if (use_cached) {
      const cachedPrediction = await getCachedPrediction(student_id, prediction_type)
      if (cachedPrediction) {
        return new Response(
          JSON.stringify({ ...cachedPrediction, cached: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate new prediction
    const prediction = await generatePrediction(student_id, prediction_type, features, userId)
    
    return new Response(
      JSON.stringify(prediction),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling prediction request:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process prediction request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleGetStudentPredictions(studentId: string, userId: string): Promise<Response> {
  try {
    // Verify access to student
    const { data: student } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .single()

    if (!student) {
      return new Response(
        JSON.stringify({ error: 'Student not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get all predictions for student
    const { data: predictions, error } = await supabase
      .from('predictive_analytics')
      .select('*')
      .eq('student_id', studentId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ predictions: predictions || [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error getting student predictions:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to retrieve predictions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function handleBatchPredictions(req: Request, userId: string): Promise<Response> {
  try {
    const url = new URL(req.url)
    const studentIds = url.searchParams.get('student_ids')?.split(',') || []
    const predictionType = url.searchParams.get('prediction_type') as 'therapy_outcome' | 'risk_assessment' | 'goal_timeline'

    if (!studentIds.length || !predictionType) {
      return new Response(
        JSON.stringify({ error: 'Missing student_ids or prediction_type parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limit batch size
    if (studentIds.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Batch size too large. Maximum 50 students.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process batch predictions
    const predictions = await Promise.all(
      studentIds.map(async (studentId) => {
        try {
          // Check cache first
          const cachedPrediction = await getCachedPrediction(studentId.trim(), predictionType)
          if (cachedPrediction) {
            return { ...cachedPrediction, cached: true }
          }

          // Generate new prediction
          return await generatePrediction(studentId.trim(), predictionType, undefined, userId)
        } catch (error) {
          console.error(`Error predicting for student ${studentId}:`, error)
          return {
            student_id: studentId,
            error: 'Failed to generate prediction'
          }
        }
      })
    )

    return new Response(
      JSON.stringify({ predictions }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error handling batch predictions:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process batch predictions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getCachedPrediction(
  studentId: string, 
  predictionType: string
): Promise<PredictionResponse | null> {
  try {
    const { data, error } = await supabase
      .from('predictive_analytics')
      .select('*')
      .eq('student_id', studentId)
      .eq('prediction_type', predictionType)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return {
      prediction_id: data.id,
      student_id: data.student_id,
      prediction_type: data.prediction_type,
      prediction_value: data.prediction_value,
      confidence_interval: data.confidence_interval,
      risk_factors: data.risk_factors,
      clinical_explanations: data.clinical_explanations,
      model_version: data.model_version,
      created_at: data.created_at,
      expires_at: data.expires_at
    }
  } catch (error) {
    console.error('Error getting cached prediction:', error)
    return null
  }
}

async function generatePrediction(
  studentId: string,
  predictionType: 'therapy_outcome' | 'risk_assessment' | 'goal_timeline',
  features?: number[],
  userId?: string
): Promise<PredictionResponse> {
  try {
    // If features not provided, extract them from student data
    let processedFeatures = features
    if (!processedFeatures) {
      processedFeatures = await extractStudentFeatures(studentId)
    }

    // Simulate ML prediction (in real implementation, this would call the actual ML models)
    const predictionResult = simulatePrediction(predictionType, processedFeatures)

    // Calculate expiration time (24 hours for therapy outcomes, 7 days for risk assessments)
    const expirationHours = predictionType === 'risk_assessment' ? 168 : 24
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000)

    // Store prediction in database
    const { data, error } = await supabase
      .from('predictive_analytics')
      .insert({
        student_id: studentId,
        prediction_type: predictionType,
        prediction_value: predictionResult.prediction_value,
        confidence_interval: predictionResult.confidence_interval,
        risk_factors: predictionResult.risk_factors,
        clinical_explanations: predictionResult.clinical_explanations,
        model_version: '1.0.0',
        expires_at: expiresAt.toISOString(),
        created_by: userId,
        metadata: {
          feature_count: processedFeatures.length,
          processing_time: predictionResult.processing_time
        }
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return {
      prediction_id: data.id,
      student_id: data.student_id,
      prediction_type: data.prediction_type,
      prediction_value: data.prediction_value,
      confidence_interval: data.confidence_interval,
      risk_factors: data.risk_factors,
      clinical_explanations: data.clinical_explanations,
      model_version: data.model_version,
      created_at: data.created_at,
      expires_at: data.expires_at
    }
  } catch (error) {
    console.error('Error generating prediction:', error)
    throw new Error(`Failed to generate prediction: ${error}`)
  }
}

async function extractStudentFeatures(studentId: string): Promise<number[]> {
  try {
    // Get student data
    const { data: studentData } = await supabase
      .from('ml_training_data')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (!studentData) {
      throw new Error('Insufficient student data for prediction')
    }

    // Convert to normalized features (simplified feature extraction)
    const features = [
      Math.min((Date.now() - new Date(studentData.enrollment_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000), 2.0), // enrollment age in years
      studentData.difficulty_level === 'beginner' ? 0.2 : 
      studentData.difficulty_level === 'intermediate' ? 0.5 :
      studentData.difficulty_level === 'advanced' ? 0.8 : 1.0, // difficulty encoding
      Math.min(studentData.duration_weeks / 52, 2.0), // duration normalized
      Math.min(studentData.sessions_per_week / 5, 1.0), // frequency normalized
      Math.min(studentData.total_sessions / 100, 1.0), // sessions normalized
      Math.min(studentData.avg_assessment_score || 0, 1.0), // assessment score
      Math.min((studentData.assessment_variety || 1) / 10, 1.0), // variety normalized
      Math.min((studentData.goals_achieved || 0) / (studentData.total_sessions || 1), 1.0), // achievement rate
      Math.min(studentData.attendance_rate || 0, 1.0), // attendance rate
      Math.min((studentData.avg_session_hours || 1) / 2, 1.0), // session hours normalized
      calculateMedicalComplexity(studentData.medical_records) // medical complexity
    ]

    return features
  } catch (error) {
    console.error('Error extracting student features:', error)
    // Return default neutral features if extraction fails
    return Array(11).fill(0.5)
  }
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

function simulatePrediction(
  predictionType: string,
  features: number[]
): {
  prediction_value: any
  confidence_interval: { lower: number; upper: number }
  risk_factors?: string[]
  clinical_explanations: { ar: string; en: string }
  processing_time: number
} {
  const startTime = Date.now()
  
  // Simulate ML computation delay
  const processingTime = Math.random() * 100 + 50

  // Calculate prediction based on feature averages (simplified)
  const featureAverage = features.reduce((sum, f) => sum + f, 0) / features.length
  
  let prediction_value: any
  let confidence_interval: { lower: number; upper: number }
  let risk_factors: string[] | undefined
  let clinical_explanations: { ar: string; en: string }

  switch (predictionType) {
    case 'therapy_outcome':
      prediction_value = {
        success_probability: Math.min(Math.max(featureAverage + (Math.random() - 0.5) * 0.3, 0), 1),
        expected_timeline_weeks: Math.round(12 + (1 - featureAverage) * 24),
        goal_achievement_likelihood: Math.min(Math.max(featureAverage * 1.2 + (Math.random() - 0.5) * 0.2, 0), 1)
      }
      confidence_interval = {
        lower: Math.max(prediction_value.success_probability - 0.15, 0),
        upper: Math.min(prediction_value.success_probability + 0.15, 1)
      }
      clinical_explanations = {
        ar: `احتمالية نجاح العلاج: ${(prediction_value.success_probability * 100).toFixed(0)}%. الوقت المتوقع: ${prediction_value.expected_timeline_weeks} أسبوع.`,
        en: `Therapy success probability: ${(prediction_value.success_probability * 100).toFixed(0)}%. Expected timeline: ${prediction_value.expected_timeline_weeks} weeks.`
      }
      break

    case 'risk_assessment':
      prediction_value = {
        dropout_risk: Math.min(Math.max(1 - featureAverage + (Math.random() - 0.5) * 0.3, 0), 1),
        plan_modification_risk: Math.min(Math.max(0.7 - featureAverage + (Math.random() - 0.5) * 0.2, 0), 1)
      }
      confidence_interval = {
        lower: Math.max(prediction_value.dropout_risk - 0.2, 0),
        upper: Math.min(prediction_value.dropout_risk + 0.2, 1)
      }
      
      if (prediction_value.dropout_risk > 0.6) {
        risk_factors = ['Low attendance pattern', 'Declining assessment scores', 'Poor family engagement']
      } else if (prediction_value.dropout_risk > 0.4) {
        risk_factors = ['Inconsistent session attendance', 'Moderate progress concerns']
      }
      
      clinical_explanations = {
        ar: `مخاطر انقطاع العلاج: ${(prediction_value.dropout_risk * 100).toFixed(0)}%. ${prediction_value.dropout_risk > 0.6 ? 'يُنصح بالتدخل الفوري.' : 'مراقبة مستمرة مطلوبة.'}`,
        en: `Dropout risk: ${(prediction_value.dropout_risk * 100).toFixed(0)}%. ${prediction_value.dropout_risk > 0.6 ? 'Immediate intervention recommended.' : 'Continued monitoring required.'}`
      }
      break

    case 'goal_timeline':
      prediction_value = {
        estimated_completion_weeks: Math.round(8 + (1 - featureAverage) * 16),
        milestone_probabilities: [
          { week: 4, probability: Math.min(featureAverage * 1.5, 1) },
          { week: 8, probability: Math.min(featureAverage * 1.2, 1) },
          { week: 12, probability: Math.min(featureAverage * 1.0, 1) }
        ]
      }
      confidence_interval = {
        lower: Math.max(prediction_value.estimated_completion_weeks - 3, 4),
        upper: prediction_value.estimated_completion_weeks + 4
      }
      clinical_explanations = {
        ar: `الوقت المتوقع لتحقيق الهدف: ${prediction_value.estimated_completion_weeks} أسبوع.`,
        en: `Estimated goal completion: ${prediction_value.estimated_completion_weeks} weeks.`
      }
      break

    default:
      throw new Error(`Unknown prediction type: ${predictionType}`)
  }

  return {
    prediction_value,
    confidence_interval,
    risk_factors,
    clinical_explanations,
    processing_time: Date.now() - startTime
  }
}