/**
 * Lead Management Edge Function
 * @description Handles CRM lead operations - create, update, status changes, conversion
 * @author James (Dev Agent)
 * @date 2025-09-03
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateLeadRequest {
  parent_name: string
  parent_name_ar?: string
  parent_contact: string
  parent_contact_secondary?: string
  child_name: string
  child_name_ar?: string
  child_dob: string
  child_gender?: string
  evaluation_date?: string
  evaluation_notes?: string
  notes?: string
  source?: string
  source_details?: Record<string, any>
  external_id?: string
  integration_metadata?: Record<string, any>
}

interface UpdateStatusRequest {
  lead_id: string
  status: 'new_booking' | 'confirmed' | 'evaluation_complete' | 'registered' | 'archived'
  notes?: string
}

interface AssignLeadRequest {
  lead_id: string
  user_id: string
  notes?: string
}

interface ConvertLeadRequest {
  lead_id: string
  student_data?: Record<string, any>
}

interface ApiResponse {
  success: boolean
  data?: any
  error?: string
  execution_time_ms?: number
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now()

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const jwt = authHeader.substring(7)

    // Initialize Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`
        }
      }
    })

    // Verify user authentication and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const pathname = url.pathname
    const method = req.method

    let response: ApiResponse = { success: false, error: 'Invalid endpoint' }

    // Route handling
    if (method === 'POST' && pathname.endsWith('/leads')) {
      // POST /api/leads - Create new lead
      const body: CreateLeadRequest = await req.json()
      
      // Validate required fields
      if (!body.parent_name || !body.parent_contact || !body.child_name || !body.child_dob) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: parent_name, parent_contact, child_name, child_dob' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create lead
      const { data: lead, error: createError } = await supabase
        .from('leads')
        .insert({
          ...body,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single()

      if (createError) {
        response = { success: false, error: createError.message }
      } else {
        response = { success: true, data: lead }
      }

    } else if (method === 'PUT' && pathname.includes('/status')) {
      // PUT /api/leads/:id/status - Update lead status
      const pathParts = pathname.split('/')
      const leadId = pathParts[pathParts.length - 2]
      
      const body: UpdateStatusRequest = await req.json()
      
      if (!body.status) {
        return new Response(
          JSON.stringify({ success: false, error: 'Status is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Use database function to update status with audit trail
      const { data: result, error: statusError } = await supabase
        .rpc('update_lead_status', {
          p_lead_id: leadId,
          p_new_status: body.status,
          p_notes: body.notes
        })

      if (statusError) {
        response = { success: false, error: statusError.message }
      } else {
        response = result
      }

    } else if (method === 'PUT' && pathname.includes('/assign')) {
      // PUT /api/leads/:id/assign - Assign lead to user
      const pathParts = pathname.split('/')
      const leadId = pathParts[pathParts.length - 2]
      
      const body: AssignLeadRequest = await req.json()
      
      if (!body.user_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'User ID is required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Use database function to assign lead
      const { data: result, error: assignError } = await supabase
        .rpc('assign_lead', {
          p_lead_id: leadId,
          p_user_id: body.user_id,
          p_notes: body.notes
        })

      if (assignError) {
        response = { success: false, error: assignError.message }
      } else {
        response = result
      }

    } else if (method === 'POST' && pathname.includes('/convert')) {
      // POST /api/leads/:id/convert - Convert lead to student
      const pathParts = pathname.split('/')
      const leadId = pathParts[pathParts.length - 2]
      
      const body: ConvertLeadRequest = await req.json()

      // Use database function to convert lead
      const { data: result, error: convertError } = await supabase
        .rpc('convert_lead_to_student', {
          p_lead_id: leadId,
          p_student_data: body.student_data || {}
        })

      if (convertError) {
        response = { success: false, error: convertError.message }
      } else {
        response = result
      }

    } else if (method === 'GET' && pathname.endsWith('/leads')) {
      // GET /api/leads - List leads with filtering
      const status = url.searchParams.get('status')
      const assigned_to = url.searchParams.get('assigned_to')
      const source = url.searchParams.get('source')
      const search = url.searchParams.get('search')
      const limit = parseInt(url.searchParams.get('limit') || '50')
      const offset = parseInt(url.searchParams.get('offset') || '0')

      let query = supabase
        .from('leads')
        .select(`
          *,
          assigned_user:assigned_to(id, email, raw_user_meta_data),
          interactions:lead_interactions(count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters
      if (status) {
        query = query.eq('status', status)
      }
      if (assigned_to) {
        query = query.eq('assigned_to', assigned_to)
      }
      if (source) {
        query = query.eq('source', source)
      }
      if (search) {
        query = query.or(`parent_name.ilike.%${search}%,child_name.ilike.%${search}%,parent_contact.ilike.%${search}%`)
      }

      const { data: leads, error: leadsError, count } = await query

      if (leadsError) {
        response = { success: false, error: leadsError.message }
      } else {
        response = { 
          success: true, 
          data: leads,
          total: count,
          limit,
          offset
        }
      }

    } else if (method === 'GET' && pathname.includes('/leads/') && !pathname.includes('/status') && !pathname.includes('/assign')) {
      // GET /api/leads/:id - Get single lead with full details
      const pathParts = pathname.split('/')
      const leadId = pathParts[pathParts.length - 1]

      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select(`
          *,
          assigned_user:assigned_to(id, email, raw_user_meta_data),
          audit_trail:lead_audit_trail(*),
          interactions:lead_interactions(*)
        `)
        .eq('id', leadId)
        .is('deleted_at', null)
        .single()

      if (leadError) {
        response = { success: false, error: leadError.message }
      } else {
        response = { success: true, data: lead }
      }

    } else if (method === 'GET' && pathname.includes('/stats')) {
      // GET /api/leads/stats - Get lead statistics
      const { data: stats, error: statsError } = await supabase
        .from('leads')
        .select('status')
        .is('deleted_at', null)

      if (statsError) {
        response = { success: false, error: statsError.message }
      } else {
        const statusCounts = stats.reduce((acc, lead) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)

        const totalLeads = stats.length
        const registered = statusCounts.registered || 0
        const conversionRate = totalLeads > 0 ? (registered / totalLeads) * 100 : 0

        response = {
          success: true,
          data: {
            total_leads: totalLeads,
            new_bookings: statusCounts.new_booking || 0,
            confirmed: statusCounts.confirmed || 0,
            evaluation_complete: statusCounts.evaluation_complete || 0,
            registered,
            archived: statusCounts.archived || 0,
            conversion_rate: Math.round(conversionRate * 100) / 100
          }
        }
      }
    }

    // Add execution time
    response.execution_time_ms = Date.now() - startTime

    const statusCode = response.success ? 200 : (response.error?.includes('not found') ? 404 : 400)

    return new Response(
      JSON.stringify(response),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Lead Management Function Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})