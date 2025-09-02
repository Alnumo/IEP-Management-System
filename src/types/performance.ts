/**
 * Performance Monitoring Type Definitions
 * 
 * @description TypeScript types for comprehensive performance monitoring system
 * Supports APM, RUM, and custom performance tracking
 */

// Core Performance Types
export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'web_vitals' | 'custom' | 'business' | 'database' | 'api' | 'navigation' | 'resource' | 'user_timing';
  metadata?: Record<string, any>;
}

export interface PerformanceAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric_name: string;
  threshold_value: number;
  actual_value: number;
  alert_data: Record<string, any>;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  created_by?: string;
}

// Web Vitals Types
export interface WebVitalsMetrics {
  cls: number | null; // Cumulative Layout Shift
  fcp: number | null; // First Contentful Paint  
  fid: number | null; // First Input Delay
  lcp: number | null; // Largest Contentful Paint
  ttfb: number | null; // Time to First Byte
}

export interface WebVitalsMeasurement {
  name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  entries: PerformanceEntry[];
  id: string;
  navigationType?: string;
}

// Database Performance Types
export interface DatabasePerformanceData {
  queryTime: number;
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'function' | 'rpc';
  tableName?: string;
  rowsAffected?: number;
  cached: boolean;
  connectionPoolStats?: {
    active: number;
    idle: number;
    waiting: number;
  };
}

export interface DatabasePerformanceStats {
  avg_query_time_ms: number;
  slow_queries_count: number;
  total_queries_count: number;
  cache_hit_ratio: number;
  active_connections: number;
  alert_count: number;
  top_slow_tables: Array<{
    table_name: string;
    avg_time: number;
    query_count: number;
  }>;
}

// API Performance Types
export interface APIPerformanceData {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  responseTime: number;
  statusCode: number;
  success: boolean;
  requestSize?: number;
  responseSize?: number;
  cacheStatus?: 'hit' | 'miss' | 'bypass';
}

export interface APIPerformanceStats {
  endpoint: string;
  method: string;
  avgResponseTime: number;
  totalRequests: number;
  successRate: number;
  errorRate: number;
  p50: number;
  p95: number;
  p99: number;
}

// User Experience Types
export interface UserSession {
  sessionId: string;
  userId?: string;
  userRole?: 'admin' | 'medical_consultant' | 'therapist_lead' | 'therapist' | 'receptionist' | 'parent';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browserInfo: BrowserInfo;
  screenResolution: ScreenResolution;
  language: 'ar' | 'en';
  connectionType?: string;
  startTime: number;
  endTime?: number;
  totalPageViews: number;
  totalInteractions: number;
  totalErrors: number;
  averagePageLoadTime?: number;
  bounceRate?: number;
}

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  userAgent: string;
  cookieEnabled: boolean;
  language: string;
  platform: string;
}

export interface ScreenResolution {
  width: number;
  height: number;
  colorDepth: number;
  pixelRatio: number;
}

export interface PageView {
  id: string;
  url: string;
  title: string;
  referrer?: string;
  startTime: number;
  endTime?: number;
  loadTime?: number;
  renderTime?: number;
  timeToInteractive?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  scrollDepth: number;
  exitType?: 'navigation' | 'close' | 'refresh' | 'unload' | 'back_forward';
  engagementTime?: number;
}

export interface UserInteraction {
  id: string;
  type: 'click' | 'scroll' | 'keyboard' | 'form_submit' | 'form_focus' | 'drag' | 'touch' | 'voice';
  target: string;
  timestamp: number;
  duration?: number;
  success?: boolean;
  metadata?: {
    elementType?: string;
    formName?: string;
    fieldName?: string;
    scrollDirection?: 'up' | 'down';
    keyPressed?: string;
    coordinates?: { x: number; y: number };
    touchType?: 'start' | 'move' | 'end';
    [key: string]: any;
  };
}

// Performance Monitoring Configuration Types
export interface PerformanceThresholds {
  pageLoadTime: number;
  apiResponseTime: number;
  databaseQueryTime: number;
  webVitalsLCP: number;
  webVitalsFID: number;
  webVitalsCLS: number;
  memoryUsage: number;
  cpuUsage: number;
  errorRate: number;
  slowResourceTime: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampling: {
    performance: number; // 0-1, percentage of sessions to monitor
    errors: number; // 0-1, percentage of errors to capture
    traces: number; // 0-1, percentage of traces to capture
  };
  thresholds: PerformanceThresholds;
  privacy: {
    scrubSensitiveData: boolean;
    allowedDataFields: string[];
    blockedDataFields: string[];
  };
  reporting: {
    realTime: boolean;
    batchSize: number;
    flushInterval: number; // milliseconds
  };
}

// Therapy-specific Performance Types
export interface TherapyWorkflowPerformance {
  workflowName: 'student_enrollment' | 'session_scheduling' | 'iep_creation' | 'progress_tracking' | 'assessment_completion' | 'therapy_session' | 'parent_communication';
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  language: 'ar' | 'en';
  userRole: string;
  steps: WorkflowStep[];
  errors?: PerformanceError[];
  metadata?: {
    studentId?: string;
    sessionId?: string;
    iepId?: string;
    assessmentType?: string;
    communicationType?: 'whatsapp' | 'email' | 'sms' | 'in_app';
    [key: string]: any;
  };
}

export interface WorkflowStep {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface PerformanceError {
  id: string;
  type: 'javascript' | 'network' | 'resource' | 'csp' | 'unhandled_rejection' | 'validation' | 'auth' | 'database';
  message: string;
  stack?: string;
  url?: string;
  line?: number;
  column?: number;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  context?: {
    userId?: string;
    sessionId?: string;
    workflowName?: string;
    component?: string;
    action?: string;
    medicalDataInvolved?: boolean;
    complianceImpact?: boolean;
    [key: string]: any;
  };
}

// Medical Compliance Performance Types
export interface CompliancePerformanceMetric {
  metricName: 'hipaa_audit_log_write' | 'pdpl_consent_verification' | 'emergency_access_time' | 'data_encryption_time' | 'backup_completion_time';
  value: number;
  unit: string;
  timestamp: number;
  complianceStandard: 'HIPAA' | 'PDPL' | 'FERPA' | 'ISO_27001';
  criticalPath: boolean;
  metadata?: {
    dataType?: 'medical_record' | 'iep_document' | 'assessment_data' | 'session_notes';
    encryptionMethod?: string;
    backupType?: 'full' | 'incremental' | 'differential';
    accessLevel?: 'emergency' | 'routine' | 'administrative';
    auditEventType?: string;
    [key: string]: any;
  };
}

// Arabic/RTL Performance Types
export interface BilingualPerformanceMetrics {
  language: 'ar' | 'en';
  renderingTime: {
    fontLoading: number;
    layoutShift: number;
    textRender: number;
    formRender: number;
  };
  interactionTime: {
    formSubmission: number;
    navigation: number;
    dataEntry: number;
    searchQuery: number;
  };
  searchPerformance: {
    arabicTextSearch: number;
    englishTextSearch: number;
    mixedLanguageSearch: number;
  };
  accessibilityMetrics: {
    screenReaderCompatibility: boolean;
    keyboardNavigation: number;
    tabOrder: boolean;
    aria: boolean;
  };
}

// Performance Dashboard Types
export interface PerformanceDashboardData {
  realTimeMetrics: {
    activeUsers: number;
    currentLoadTime: number;
    errorRate: number;
    successfulTransactions: number;
  };
  webVitals: WebVitalsMetrics;
  systemHealth: {
    databaseHealth: 'healthy' | 'warning' | 'critical';
    apiHealth: 'healthy' | 'warning' | 'critical';
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
  recentAlerts: PerformanceAlert[];
  topSlowPages: Array<{
    url: string;
    averageLoadTime: number;
    views: number;
    bounceRate: number;
  }>;
  userExperience: {
    satisfactionScore: number; // 0-100
    taskCompletionRate: number; // 0-100
    averageSessionDuration: number;
    pageViewsPerSession: number;
  };
  complianceMetrics: {
    auditTrailCompleteness: number; // 0-100
    dataEncryptionCoverage: number; // 0-100
    backupSuccess: number; // 0-100
    emergencyAccessResponseTime: number;
  };
}

// Export utility types
export type PerformanceRating = 'excellent' | 'good' | 'fair' | 'poor';

export type MetricCategory = PerformanceMetric['category'];

export type AlertSeverity = PerformanceAlert['severity'];

export type WorkflowName = TherapyWorkflowPerformance['workflowName'];

export type ComplianceStandard = CompliancePerformanceMetric['complianceStandard'];

// Performance monitoring hook return type
export interface UsePerformanceMetricsReturn {
  // State
  webVitals: WebVitalsMetrics;
  customMetrics: PerformanceMetric[];
  summary: DatabasePerformanceStats;
  recentAlerts: PerformanceAlert[];
  isLoading: boolean;
  isLoadingStats: boolean;
  error: string | null;
  databaseStats: DatabasePerformanceStats | null;

  // Actions
  trackPagePerformance: (pageName: string) => { end: () => number };
  trackUserInteraction: (
    interactionType: string, 
    elementType?: string,
    metadata?: Record<string, any>
  ) => { end: (success?: boolean) => number };
  trackFormSubmission: (
    formName: string,
    formData?: Record<string, any>
  ) => { end: (success: boolean, errorMessage?: string) => number };
  refreshMetrics: () => Promise<void>;
  exportPerformanceData: (timeRange?: '1h' | '24h' | '7d' | '30d') => Promise<any>;
  
  // Utils
  getPerformanceRating: (
    metricName: keyof PerformanceThresholds,
    value: number,
    thresholds?: PerformanceThresholds
  ) => PerformanceRating;
  
  // Constants
  thresholds: PerformanceThresholds;
}