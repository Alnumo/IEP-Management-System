/**
 * Automated Report Generation Service
 * Handles PDF, Excel, and other report formats with templates
 */

import { supabase } from '@/lib/supabase'
import { analyticsService } from './analytics-service'
import { notificationService } from './notification-service'
import { errorMonitoring } from '@/lib/error-monitoring'
import type { ProgressReport, ReportOptions } from '@/types/progress-analytics'

export interface ReportTemplate {
  id: string
  name: string
  type: 'student_progress' | 'therapy_program' | 'financial' | 'attendance' | 'custom'
  format: 'pdf' | 'html' | 'excel' | 'csv' | 'json'
  template_content: string
  variables: string[]
  settings: ReportTemplateSettings
  created_at: string
  updated_at: string
}

export interface ReportTemplateSettings {
  language: 'ar' | 'en' | 'both'
  include_charts: boolean
  include_photos: boolean
  include_raw_data: boolean
  page_orientation: 'portrait' | 'landscape'
  font_family: string
  font_size: number
  color_scheme: string
  branding: {
    logo_url?: string
    header_text?: string
    footer_text?: string
    contact_info?: string
  }
}

export interface ReportGenerationJob {
  id: string
  report_type: string
  template_id: string
  parameters: Record<string, any>
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  output_files: string[]
  error_message?: string
  created_at: string
  completed_at?: string
  requested_by: string
}

export interface ScheduledReport {
  id: string
  name: string
  template_id: string
  parameters: Record<string, any>
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually'
    day_of_week?: number
    day_of_month?: number
    time: string
    timezone: string
  }
  recipients: ReportRecipient[]
  is_active: boolean
  next_run: string
  last_run?: string
  created_at: string
}

export interface ReportRecipient {
  type: 'email' | 'portal' | 'download_link'
  address: string
  name?: string
  role?: string
}

class ReportGeneratorService {
  private static instance: ReportGeneratorService
  private processingQueue: Map<string, ReportGenerationJob> = new Map()

  private constructor() {}

  static getInstance(): ReportGeneratorService {
    if (!ReportGeneratorService.instance) {
      ReportGeneratorService.instance = new ReportGeneratorService()
    }
    return ReportGeneratorService.instance
  }

  // =====================================================
  // REPORT GENERATION
  // =====================================================

  /**
   * Generate a report based on template and parameters
   */
  async generateReport(
    templateId: string,
    parameters: Record<string, any>,
    options: ReportOptions = {
      format: 'pdf',
      template: 'standard',
      language: 'ar',
      include_charts: true,
      include_raw_data: false,
      delivery_method: 'download'
    }
  ): Promise<ReportGenerationJob> {
    try {
      console.log('📄 Starting report generation:', templateId)

      // Get template
      const template = await this.getTemplate(templateId)
      if (!template) {
        throw new Error(`Template not found: ${templateId}`)
      }

      // Create generation job
      const job: ReportGenerationJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        report_type: template.type,
        template_id: templateId,
        parameters,
        status: 'queued',
        progress_percentage: 0,
        output_files: [],
        created_at: new Date().toISOString(),
        requested_by: parameters.user_id || 'system'
      }

      // Save job to database
      await this.saveJob(job)

      // Add to processing queue
      this.processingQueue.set(job.id, job)

      // Process job asynchronously
      this.processJob(job.id, template, options)

      return job
    } catch (error) {
      console.error('Error generating report:', error)
      errorMonitoring.reportError(error as Error, {
        component: 'ReportGeneratorService',
        action: 'generateReport',
        metadata: { templateId, parameters }
      })
      throw error
    }
  }

  /**
   * Generate student progress report
   */
  async generateStudentProgressReport(
    studentId: string,
    periodStart: string,
    periodEnd: string,
    options: ReportOptions
  ): Promise<string> {
    try {
      // Get student progress data
      const progressData = await analyticsService.getStudentProgressSummary(
        studentId,
        periodStart,
        periodEnd
      )

      // Get report template
      const template = await this.getTemplate('student_progress_standard')

      if (!template) {
        // Create default template
        const templateId = await this.createDefaultStudentProgressTemplate()
        return await this.generateStudentProgressReport(studentId, periodStart, periodEnd, options)
      }

      // Generate report content
      const reportContent = await this.generateReportContent(template, {
        student_id: studentId,
        progress_data: progressData,
        period_start: periodStart,
        period_end: periodEnd,
        ...options
      })

      // Convert to requested format
      const outputFile = await this.convertToFormat(reportContent, options.format, options)

      // Handle delivery
      await this.handleReportDelivery(outputFile, options)

      return outputFile
    } catch (error) {
      console.error('Error generating student progress report:', error)
      throw error
    }
  }

  /**
   * Generate batch reports for multiple students
   */
  async generateBatchReports(
    templateId: string,
    studentIds: string[],
    options: ReportOptions & { batch_settings?: { parallel_limit?: number } }
  ): Promise<{ successful: string[]; failed: Array<{ studentId: string; error: string }> }> {
    try {
      console.log(`📊 Generating batch reports for ${studentIds.length} students`)

      const results = {
        successful: [] as string[],
        failed: [] as Array<{ studentId: string; error: string }>
      }

      const batchSize = options.batch_settings?.parallel_limit || 3
      const batches = this.chunkArray(studentIds, batchSize)

      for (const batch of batches) {
        const batchPromises = batch.map(async (studentId) => {
          try {
            const job = await this.generateReport(templateId, {
              student_id: studentId,
              period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              period_end: new Date().toISOString().split('T')[0]
            }, options)

            // Wait for job completion
            await this.waitForJobCompletion(job.id)
            results.successful.push(studentId)
          } catch (error) {
            results.failed.push({
              studentId,
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        })

        await Promise.allSettled(batchPromises)
      }

      console.log(`📊 Batch report generation completed: ${results.successful.length} successful, ${results.failed.length} failed`)
      return results
    } catch (error) {
      console.error('Error in batch report generation:', error)
      throw error
    }
  }

  // =====================================================
  // SCHEDULED REPORTS
  // =====================================================

  /**
   * Create scheduled report
   */
  async createScheduledReport(scheduledReport: Omit<ScheduledReport, 'id' | 'created_at' | 'next_run'>): Promise<string> {
    try {
      const nextRun = this.calculateNextRunTime(scheduledReport.schedule)
      
      const report: ScheduledReport = {
        id: `scheduled_${Date.now()}`,
        ...scheduledReport,
        next_run: nextRun,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('scheduled_reports')
        .insert(report)

      if (error) throw error

      console.log('📅 Scheduled report created:', report.id)
      return report.id
    } catch (error) {
      console.error('Error creating scheduled report:', error)
      throw error
    }
  }

  /**
   * Process due scheduled reports
   */
  async processDueScheduledReports(): Promise<{ processed: number; failed: number }> {
    try {
      const now = new Date().toISOString()
      
      const { data: dueReports, error } = await supabase
        .from('scheduled_reports')
        .select('*')
        .eq('is_active', true)
        .lte('next_run', now)

      if (error) throw error

      let processed = 0
      let failed = 0

      for (const report of dueReports || []) {
        try {
          await this.executeScheduledReport(report)
          
          // Update next run time
          const nextRun = this.calculateNextRunTime(report.schedule)
          await supabase
            .from('scheduled_reports')
            .update({ 
              next_run: nextRun,
              last_run: now
            })
            .eq('id', report.id)

          processed++
        } catch (error) {
          console.error(`Failed to execute scheduled report ${report.id}:`, error)
          failed++
        }
      }

      console.log(`📅 Processed ${processed} scheduled reports, ${failed} failed`)
      return { processed, failed }
    } catch (error) {
      console.error('Error processing scheduled reports:', error)
      return { processed: 0, failed: 0 }
    }
  }

  // =====================================================
  // TEMPLATE MANAGEMENT
  // =====================================================

  /**
   * Create report template
   */
  async createTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const newTemplate: ReportTemplate = {
        id: `template_${Date.now()}`,
        ...template,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('report_templates')
        .insert(newTemplate)

      if (error) throw error

      console.log('📋 Report template created:', newTemplate.id)
      return newTemplate.id
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<ReportTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('Error getting template:', error)
      return null
    }
  }

  /**
   * List templates by type
   */
  async getTemplatesByType(type: ReportTemplate['type']): Promise<ReportTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('type', type)
        .order('updated_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error getting templates by type:', error)
      return []
    }
  }

  // =====================================================
  // REPORT EXPORT & DELIVERY
  // =====================================================

  /**
   * Export report data to various formats
   */
  async exportReportData(
    data: any,
    format: 'csv' | 'excel' | 'json' | 'xml',
    options: { filename?: string; sheets?: Record<string, any[]> } = {}
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = options.filename || `report_${timestamp}`

      switch (format) {
        case 'csv':
          return await this.exportToCSV(data, filename)
        case 'excel':
          return await this.exportToExcel(data, filename, options.sheets)
        case 'json':
          return await this.exportToJSON(data, filename)
        case 'xml':
          return await this.exportToXML(data, filename)
        default:
          throw new Error(`Unsupported export format: ${format}`)
      }
    } catch (error) {
      console.error('Error exporting report data:', error)
      throw error
    }
  }

  /**
   * Email report to recipients
   */
  async emailReport(
    reportFile: string,
    recipients: ReportRecipient[],
    subject: string,
    message: string
  ): Promise<void> {
    try {
      for (const recipient of recipients) {
        if (recipient.type === 'email') {
          // Send email with attachment
          await this.sendEmailWithAttachment({
            to: recipient.address,
            subject,
            html: message,
            attachments: [reportFile]
          })

          // Send notification about report delivery
          await notificationService.sendNotification(
            recipient.address,
            'parent', // or determine from recipient.role
            'document_required',
            {
              document_type: 'progress_report',
              recipient_name: recipient.name || 'Parent/Guardian'
            },
            {
              priority: 'medium',
              channels: ['in_app'],
              language: 'ar'
            }
          )
        }
      }

      console.log(`📧 Report emailed to ${recipients.length} recipients`)
    } catch (error) {
      console.error('Error emailing report:', error)
      throw error
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  private async processJob(jobId: string, template: ReportTemplate, options: ReportOptions): Promise<void> {
    try {
      const job = this.processingQueue.get(jobId)
      if (!job) throw new Error('Job not found in queue')

      // Update status to processing
      job.status = 'processing'
      job.progress_percentage = 10
      await this.updateJob(job)

      // Generate report content
      job.progress_percentage = 30
      await this.updateJob(job)
      
      const reportContent = await this.generateReportContent(template, job.parameters)

      // Convert to format
      job.progress_percentage = 60
      await this.updateJob(job)
      
      const outputFile = await this.convertToFormat(reportContent, options.format, options)

      // Handle delivery
      job.progress_percentage = 90
      await this.updateJob(job)
      
      await this.handleReportDelivery(outputFile, options)

      // Complete job
      job.status = 'completed'
      job.progress_percentage = 100
      job.output_files = [outputFile]
      job.completed_at = new Date().toISOString()
      await this.updateJob(job)

      // Remove from processing queue
      this.processingQueue.delete(jobId)

      console.log('📄 Report generation completed:', jobId)
    } catch (error) {
      const job = this.processingQueue.get(jobId)
      if (job) {
        job.status = 'failed'
        job.error_message = error instanceof Error ? error.message : 'Unknown error'
        await this.updateJob(job)
        this.processingQueue.delete(jobId)
      }
      console.error('Error processing report job:', error)
    }
  }

  private async generateReportContent(template: ReportTemplate, parameters: Record<string, any>): Promise<string> {
    try {
      let content = template.template_content

      // Replace variables in template
      for (const variable of template.variables) {
        const value = this.getNestedValue(parameters, variable) || ''
        const regex = new RegExp(`{{${variable}}}`, 'g')
        content = content.replace(regex, String(value))
      }

      // Process special content blocks
      content = await this.processSpecialBlocks(content, parameters)

      return content
    } catch (error) {
      console.error('Error generating report content:', error)
      throw error
    }
  }

  private async processSpecialBlocks(content: string, parameters: Record<string, any>): Promise<string> {
    // Process chart blocks
    content = content.replace(/{{chart:([^}]+)}}/g, (match, chartType) => {
      return this.generateChartHTML(chartType, parameters)
    })

    // Process table blocks
    content = content.replace(/{{table:([^}]+)}}/g, (match, tableType) => {
      return this.generateTableHTML(tableType, parameters)
    })

    // Process conditional blocks
    content = content.replace(/{{if:([^}]+)}}(.*?){{\/if}}/gs, (match, condition, block) => {
      return this.evaluateCondition(condition, parameters) ? block : ''
    })

    return content
  }

  private generateChartHTML(chartType: string, parameters: Record<string, any>): string {
    // Generate chart HTML/placeholder
    return `<div class="chart-placeholder" data-chart-type="${chartType}">Chart: ${chartType}</div>`
  }

  private generateTableHTML(tableType: string, parameters: Record<string, any>): string {
    // Generate table HTML
    return `<table class="report-table"><tr><td>Table: ${tableType}</td></tr></table>`
  }

  private evaluateCondition(condition: string, parameters: Record<string, any>): boolean {
    // Simple condition evaluation
    try {
      const value = this.getNestedValue(parameters, condition)
      return !!value
    } catch {
      return false
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async convertToFormat(content: string, format: string, options: ReportOptions): Promise<string> {
    // This would integrate with libraries like Puppeteer for PDF, ExcelJS for Excel, etc.
    const filename = `report_${Date.now()}.${format}`
    
    switch (format) {
      case 'pdf':
        return await this.generatePDF(content, filename, options)
      case 'html':
        return await this.saveHTML(content, filename)
      case 'excel':
        return await this.generateExcel(content, filename, options)
      default:
        return await this.saveHTML(content, filename)
    }
  }

  private async generatePDF(content: string, filename: string, options: ReportOptions): Promise<string> {
    // Mock PDF generation - integrate with actual PDF library
    console.log('🔄 Generating PDF:', filename)
    return `/reports/${filename}`
  }

  private async saveHTML(content: string, filename: string): Promise<string> {
    // Mock HTML save - integrate with file system
    console.log('🔄 Saving HTML:', filename)
    return `/reports/${filename}`
  }

  private async generateExcel(content: string, filename: string, options: ReportOptions): Promise<string> {
    // Mock Excel generation - integrate with ExcelJS
    console.log('🔄 Generating Excel:', filename)
    return `/reports/${filename}`
  }

  private async handleReportDelivery(outputFile: string, options: ReportOptions): Promise<void> {
    switch (options.delivery_method) {
      case 'email':
        if (options.recipients) {
          await this.emailReport(
            outputFile,
            options.recipients.map(email => ({ type: 'email' as const, address: email })),
            'Progress Report',
            'Please find attached your progress report.'
          )
        }
        break
      case 'portal':
        // Save to user portal
        console.log('📋 Report saved to portal:', outputFile)
        break
      case 'download':
      default:
        // File ready for download
        console.log('⬇️ Report ready for download:', outputFile)
        break
    }
  }

  private calculateNextRunTime(schedule: ScheduledReport['schedule']): string {
    const now = new Date()
    let nextRun = new Date(now)

    switch (schedule.frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1)
        break
      case 'weekly':
        const daysDiff = (schedule.day_of_week || 0) - now.getDay()
        nextRun.setDate(now.getDate() + (daysDiff > 0 ? daysDiff : daysDiff + 7))
        break
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1)
        nextRun.setDate(schedule.day_of_month || 1)
        break
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3)
        break
      case 'annually':
        nextRun.setFullYear(nextRun.getFullYear() + 1)
        break
    }

    // Set time
    const [hours, minutes] = schedule.time.split(':').map(Number)
    nextRun.setHours(hours, minutes, 0, 0)

    return nextRun.toISOString()
  }

  private async executeScheduledReport(report: ScheduledReport): Promise<void> {
    try {
      const job = await this.generateReport(
        report.template_id,
        report.parameters,
        {
          format: 'pdf',
          template: 'standard',
          language: 'ar',
          include_charts: true,
          include_raw_data: false,
          delivery_method: 'email',
          recipients: report.recipients.map(r => r.address)
        }
      )

      await this.waitForJobCompletion(job.id)
      console.log('📅 Scheduled report executed:', report.id)
    } catch (error) {
      console.error('Error executing scheduled report:', error)
      throw error
    }
  }

  private async waitForJobCompletion(jobId: string, timeout: number = 300000): Promise<void> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const job = await this.getJob(jobId)
      
      if (job?.status === 'completed') {
        return
      }
      
      if (job?.status === 'failed') {
        throw new Error(job.error_message || 'Job failed')
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    throw new Error('Job timeout')
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  // Database operations
  private async saveJob(job: ReportGenerationJob): Promise<void> {
    const { error } = await supabase
      .from('report_generation_jobs')
      .insert(job)
    if (error) throw error
  }

  private async updateJob(job: ReportGenerationJob): Promise<void> {
    const { error } = await supabase
      .from('report_generation_jobs')
      .update({
        status: job.status,
        progress_percentage: job.progress_percentage,
        output_files: job.output_files,
        error_message: job.error_message,
        completed_at: job.completed_at
      })
      .eq('id', job.id)
    if (error) throw error
  }

  private async getJob(jobId: string): Promise<ReportGenerationJob | null> {
    const { data, error } = await supabase
      .from('report_generation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  // Export helpers
  private async exportToCSV(data: any[], filename: string): Promise<string> {
    // CSV export implementation
    return `/exports/${filename}.csv`
  }

  private async exportToExcel(data: any[], filename: string, sheets?: Record<string, any[]>): Promise<string> {
    // Excel export implementation
    return `/exports/${filename}.xlsx`
  }

  private async exportToJSON(data: any, filename: string): Promise<string> {
    // JSON export implementation
    return `/exports/${filename}.json`
  }

  private async exportToXML(data: any, filename: string): Promise<string> {
    // XML export implementation
    return `/exports/${filename}.xml`
  }

  private async sendEmailWithAttachment(options: {
    to: string
    subject: string
    html: string
    attachments: string[]
  }): Promise<void> {
    // Email service integration
    console.log('📧 Sending email with attachment to:', options.to)
  }

  private async createDefaultStudentProgressTemplate(): Promise<string> {
    const template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at'> = {
      name: 'Student Progress Report - Standard',
      type: 'student_progress',
      format: 'pdf',
      template_content: `
        <div class="report-header">
          <h1>{{student_name}} - Progress Report</h1>
          <p>Period: {{period_start}} to {{period_end}}</p>
        </div>
        <div class="report-body">
          <h2>Overall Progress: {{overall_progress_score}}%</h2>
          {{chart:progress_trends}}
          {{table:goal_metrics}}
        </div>
      `,
      variables: ['student_name', 'period_start', 'period_end', 'overall_progress_score'],
      settings: {
        language: 'ar',
        include_charts: true,
        include_photos: false,
        include_raw_data: false,
        page_orientation: 'portrait',
        font_family: 'Arial',
        font_size: 12,
        color_scheme: 'blue',
        branding: {
          header_text: 'Arkan Growth Center',
          footer_text: 'Confidential Progress Report'
        }
      }
    }

    return await this.createTemplate(template)
  }
}

export const reportGenerator = ReportGeneratorService.getInstance()
export default reportGenerator