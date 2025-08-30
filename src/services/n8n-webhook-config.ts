/**
 * N8N Webhook Configuration for Student Enrollment & Onboarding Workflow
 * 
 * This service configures and manages the connection to the n8n webhook
 * for student enrollment and onboarding automation.
 */

import { webhookService, WEBHOOK_EVENTS } from './webhooks'

export interface N8nWebhookConfig {
  studentEnrollment: {
    url: string
    active: boolean
  }
  studentCreation: {
    url: string
    active: boolean
  }
}

export const N8N_CONFIG: N8nWebhookConfig = {
  studentEnrollment: {
    url: 'https://n8n.thenotch.site/webhook-test/c5b224ac-8a4e-4d38-8739-f85d212cb724',
    active: true
  },
  studentCreation: {
    url: 'https://n8n.thenotch.site/webhook-test/ea87cecc-f4bf-4937-8690-6cf025d56d70',
    active: true
  }
}

/**
 * Initialize all n8n webhook configurations
 */
export const initializeN8nWebhooks = () => {
  try {
    console.log('🔧 Initializing n8n webhooks...')

    // Student Enrollment Webhook Configuration
    if (N8N_CONFIG.studentEnrollment.active) {
      webhookService.addWebhook(WEBHOOK_EVENTS.ENROLLMENT_CREATED, {
        url: N8N_CONFIG.studentEnrollment.url,
        events: [
          WEBHOOK_EVENTS.ENROLLMENT_CREATED,
          WEBHOOK_EVENTS.ENROLLMENT_FORM_SUBMITTED
        ],
        active: true,
        retryAttempts: 3,
        timeout: 30000
      })

      console.log('✅ Student enrollment webhook configured:', N8N_CONFIG.studentEnrollment.url)
    }

    // Student Creation Webhook Configuration
    if (N8N_CONFIG.studentCreation.active) {
      webhookService.addWebhook(WEBHOOK_EVENTS.STUDENT_CREATED, {
        url: N8N_CONFIG.studentCreation.url,
        events: [
          WEBHOOK_EVENTS.STUDENT_CREATED,
          WEBHOOK_EVENTS.STUDENT_FORM_SUBMITTED
        ],
        active: true,
        retryAttempts: 3,
        timeout: 30000
      })

      console.log('✅ Student creation webhook configured:', N8N_CONFIG.studentCreation.url)
    }

    console.log('🚀 N8n webhooks initialized successfully')
    
  } catch (error) {
    console.error('❌ Failed to initialize n8n webhooks:', error)
  }
}

/**
 * Test the student creation webhook
 */
export const testStudentCreationWebhook = async (testData?: any) => {
  try {
    console.log('🧪 Testing student creation webhook...')
    
    const sampleStudentData = testData || {
      id: 'test-student-' + Date.now(),
      registration_number: 'STU' + Date.now(),
      first_name_ar: 'محمد',
      last_name_ar: 'أحمد',
      first_name_en: 'Mohammed',
      last_name_en: 'Ahmed',
      phone: '+966501234567',
      email: 'mohammed.ahmed@example.com',
      date_of_birth: '2010-03-20',
      city_ar: 'جدة',
      city_en: 'Jeddah',
      gender: 'male',
      nationality: 'Saudi',
      guardian_name: 'أحمد محمد',
      guardian_phone: '+966501234568',
      guardian_email: 'guardian@example.com',
      medical_conditions: 'Autism Spectrum Disorder',
      allergies: 'None',
      medications: 'None',
      emergency_contact_name: 'فاطمة أحمد',
      emergency_contact_phone: '+966501234569',
      status: 'active',
      created_at: new Date().toISOString(),
      notes: 'Test student for webhook validation'
    }

    const response = await webhookService.triggerWebhook(
      WEBHOOK_EVENTS.STUDENT_CREATED,
      sampleStudentData,
      {
        test: true,
        workflow: 'student-creation',
        source: 'test-function'
      }
    )

    console.log('✅ Student creation webhook test completed:', response)
    return response

  } catch (error) {
    console.error('❌ Student creation webhook test failed:', error)
    throw error
  }
}

/**
 * Test the student enrollment webhook
 */
export const testStudentEnrollmentWebhook = async (testData?: any) => {
  try {
    console.log('🧪 Testing student enrollment webhook...')
    
    const sampleEnrollmentData = testData || {
      id: 'test-enrollment-' + Date.now(),
      student: {
        id: 'test-student-123',
        registration_number: 'STU2025001',
        first_name_ar: 'أحمد',
        last_name_ar: 'محمد',
        first_name_en: 'Ahmed',
        last_name_en: 'Mohammed',
        phone: '+966501234567',
        email: 'ahmed.mohammed@example.com',
        date_of_birth: '2010-05-15',
        city_ar: 'الرياض'
      },
      course: {
        id: 'test-course-456',
        course_code: 'ABA101',
        name_ar: 'برنامج تحليل السلوك التطبيقي',
        name_en: 'Applied Behavior Analysis Program',
        description_ar: 'برنامج علاج متقدم للأطفال ذوي اضطراب طيف التوحد',
        description_en: 'Advanced therapy program for children with autism spectrum disorder',
        start_date: '2025-09-01',
        end_date: '2026-05-30',
        schedule_time: '09:00-11:00',
        price: 2500,
        therapist_name: 'د. سارة أحمد',
        location: 'مركز أركان - الفرع الرئيسي'
      },
      enrollment_date: new Date().toISOString().split('T')[0],
      payment_status: 'paid',
      amount_paid: 2500,
      notes: 'Test enrollment for webhook validation',
      status: 'enrolled'
    }

    const response = await webhookService.triggerWebhook(
      WEBHOOK_EVENTS.ENROLLMENT_CREATED,
      sampleEnrollmentData,
      {
        test: true,
        workflow: 'student-enrollment-onboarding',
        source: 'test-function'
      }
    )

    console.log('✅ Webhook test completed:', response)
    return response

  } catch (error) {
    console.error('❌ Webhook test failed:', error)
    throw error
  }
}

/**
 * Get webhook status and configuration
 */
export const getWebhookStatus = () => {
  const enrollmentWebhooks = webhookService.getWebhooks(WEBHOOK_EVENTS.ENROLLMENT_CREATED)
  const studentWebhooks = webhookService.getWebhooks(WEBHOOK_EVENTS.STUDENT_CREATED)
  
  return {
    studentEnrollment: {
      configured: enrollmentWebhooks.length > 0,
      active: enrollmentWebhooks.some(w => w.active),
      webhooks: enrollmentWebhooks,
      url: N8N_CONFIG.studentEnrollment.url
    },
    studentCreation: {
      configured: studentWebhooks.length > 0,
      active: studentWebhooks.some(w => w.active),
      webhooks: studentWebhooks,
      url: N8N_CONFIG.studentCreation.url
    }
  }
}

/**
 * Remove all n8n webhook configurations
 */
export const removeN8nWebhooks = () => {
  try {
    webhookService.removeWebhook(
      WEBHOOK_EVENTS.ENROLLMENT_CREATED, 
      N8N_CONFIG.studentEnrollment.url
    )
    console.log('✅ N8n webhooks removed successfully')
  } catch (error) {
    console.error('❌ Failed to remove n8n webhooks:', error)
  }
}