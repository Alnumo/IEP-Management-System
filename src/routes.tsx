import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AuthGuard } from './components/auth/AuthGuard'
import { LoginForm } from './components/auth/LoginForm'
import { DashboardPage } from './pages/DashboardPage'
import { PlansPage } from './pages/PlansPage'
import { AddPlanPage } from './pages/AddPlanPage'
import { EditPlanPage } from './pages/EditPlanPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { AddCategoryPage } from './pages/AddCategoryPage'
import { EditCategoryPage } from './pages/EditCategoryPage'
import { StudentsPage } from './pages/StudentsPage'
import { AddStudentPage } from './pages/AddStudentPage'
import { EditStudentPage } from './pages/EditStudentPage'
import { StudentDetailsPage } from './pages/StudentDetailsPage'
import { CoursesPage } from './pages/CoursesPage'
import { AddCoursePage } from './pages/AddCoursePage'
import EditCoursePage from './pages/EditCoursePage'
import CourseDetailsPage from './pages/CourseDetailsPage'
import { SessionsPage } from './pages/SessionsPage'
import { AddSessionPage } from './pages/AddSessionPage'
import EditSessionPage from './pages/EditSessionPage'
import SessionDetailsPage from './pages/SessionDetailsPage'
import { SessionCalendarPage } from './pages/SessionCalendarPage'
import { TherapistsPage } from './pages/TherapistsPage'
import { AddTherapistPage } from './pages/AddTherapistPage'
import EditTherapistPage from './pages/EditTherapistPage'
import TherapistDetailsPage from './pages/TherapistDetailsPage'
import { EnrollmentsPage } from './pages/EnrollmentsPage'
import { AddEnrollmentPage } from './pages/AddEnrollmentPage'
import EditEnrollmentPage from './pages/EditEnrollmentPage'
import EnrollmentDetailsPage from './pages/EnrollmentDetailsPage'
import { MedicalRecordsPage } from './pages/MedicalRecordsPage'
import { TherapyProgramsPage } from './pages/TherapyProgramsPage'
import AddTherapyProgramPage from './pages/AddTherapyProgramPage'
import EditTherapyProgramPage from './pages/EditTherapyProgramPage'
import TherapyProgramDetailsPage from './pages/TherapyProgramDetailsPage'
import { AssessmentsPage } from './pages/AssessmentsPage'
import EditAssessmentPage from './pages/EditAssessmentPage'
import AssessmentDetailsPage from './pages/AssessmentDetailsPage'
import { QRAttendancePage } from './pages/QRAttendancePage'
import { WhatsAppPage } from './pages/WhatsAppPage'
import { InsurancePage } from './pages/InsurancePage'
import { UsersPage } from './pages/UsersPage'
import AddUserPage from './pages/AddUserPage'
import EditUserPage from './pages/EditUserPage'
import { SettingsPage } from './pages/SettingsPage'
import ParentLoginPage from './pages/ParentLoginPage'
import ParentRegisterPage from './pages/ParentRegisterPage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import ParentMessagesPage from './pages/ParentMessagesPage'
import ParentHomeProgramsPage from './pages/ParentHomeProgramsPage'
import ParentAppointmentsPage from './pages/ParentAppointmentsPage'
import ParentDocumentsPage from './pages/ParentDocumentsPage'
import AIAnalyticsPage from './pages/AIAnalyticsPage'
import EnterpriseAutomationPage from './pages/EnterpriseAutomationPage'
import MultiCenterManagementPage from './pages/MultiCenterManagementPage'
import TherapeuticGoalsPage from './pages/TherapeuticGoalsPage'
import ProgressTrackingPage from './pages/ProgressTrackingPage'
import AddMedicalRecordPage from './pages/AddMedicalRecordPage'
import EditMedicalRecordPage from './pages/EditMedicalRecordPage'
import MedicalRecordDetailsPage from './pages/MedicalRecordDetailsPage'
import { MedicalConsultantsPage } from './pages/MedicalConsultantsPage'
import AddMedicalConsultantPage from './pages/AddMedicalConsultantPage'
import EditMedicalConsultantPage from './pages/EditMedicalConsultantPage'
import MedicalConsultantDetailsPage from './pages/MedicalConsultantDetailsPage'
import ClinicalDocumentationPage from './pages/ClinicalDocumentationPage'
import AddClinicalDocumentationPage from './pages/AddClinicalDocumentationPage'
import EditClinicalDocumentationPage from './pages/EditClinicalDocumentationPage'
import ClinicalDocumentationDetailsPage from './pages/ClinicalDocumentationDetailsPage'
import AddAssessmentPage from './pages/AddAssessmentPage'
import { TherapyPlanEnrollmentsPage } from './pages/TherapyPlanEnrollmentsPage'
import AddTherapyPlanEnrollmentPage from './pages/AddTherapyPlanEnrollmentPage'
import { TherapyProgramEnrollmentsPage } from './pages/TherapyProgramEnrollmentsPage'
import AddTherapyProgramEnrollmentPage from './pages/AddTherapyProgramEnrollmentPage'
import ClinicalAnalyticsPage from './pages/ClinicalAnalyticsPage'
import OperationalAnalyticsPage from './pages/OperationalAnalyticsPage'
import BillingDashboardPage from './pages/BillingDashboardPage'
import PaymentPlanManagerPage from './pages/PaymentPlanManagerPage'
import FinancialAnalyticsPage from './pages/FinancialAnalyticsPage'
import DataManagementPage from './pages/DataManagementPage'
import ComplianceReportingPage from './pages/ComplianceReportingPage'
import { IEPDashboard } from './pages/IEPDashboard'
import { IEPListPage } from './pages/IEPListPage'
import { IEPDetailPage } from './pages/IEPDetailPage'

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Login Route - No Auth Guard */}
      <Route path="/login" element={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <LoginForm />
        </div>
      } />
      
      <Route path="/" element={
        <AuthGuard>
          <Layout />
        </AuthGuard>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/add" element={<AddPlanPage />} />
        <Route path="plans/edit/:id" element={<EditPlanPage />} />
        <Route path="plans/:id" element={<PlanDetailsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/add" element={<AddCategoryPage />} />
        <Route path="categories/edit/:id" element={<EditCategoryPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/add" element={<AddStudentPage />} />
        <Route path="students/edit/:id" element={<EditStudentPage />} />
        <Route path="students/:id" element={<StudentDetailsPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/add" element={<AddCoursePage />} />
        <Route path="courses/edit/:id" element={<EditCoursePage />} />
        <Route path="courses/:id" element={<CourseDetailsPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/add" element={<AddSessionPage />} />
        <Route path="sessions/edit/:id" element={<EditSessionPage />} />
        <Route path="sessions/:id" element={<SessionDetailsPage />} />
        <Route path="sessions/calendar" element={<SessionCalendarPage />} />
        <Route path="therapists" element={<TherapistsPage />} />
        <Route path="therapists/add" element={<AddTherapistPage />} />
        <Route path="therapists/edit/:id" element={<EditTherapistPage />} />
        <Route path="therapists/:id" element={<TherapistDetailsPage />} />
        <Route path="enrollments" element={<EnrollmentsPage />} />
        <Route path="enrollments/add" element={<AddEnrollmentPage />} />
        <Route path="enrollments/edit/:id" element={<EditEnrollmentPage />} />
        <Route path="enrollments/:id" element={<EnrollmentDetailsPage />} />
        <Route path="therapy-plan-enrollments" element={<TherapyPlanEnrollmentsPage />} />
        <Route path="therapy-plan-enrollments/add" element={<AddTherapyPlanEnrollmentPage />} />
        <Route path="therapy-program-enrollments" element={<TherapyProgramEnrollmentsPage />} />
        <Route path="therapy-program-enrollments/add" element={<AddTherapyProgramEnrollmentPage />} />
        <Route path="medical-records" element={<MedicalRecordsPage />} />
        <Route path="medical-records/add" element={<AddMedicalRecordPage />} />
        <Route path="medical-records/edit/:id" element={<EditMedicalRecordPage />} />
        <Route path="medical-records/:id" element={<MedicalRecordDetailsPage />} />
        <Route path="medical-consultants" element={<MedicalConsultantsPage />} />
        <Route path="medical-consultants/add" element={<AddMedicalConsultantPage />} />
        <Route path="medical-consultants/edit/:id" element={<EditMedicalConsultantPage />} />
        <Route path="medical-consultants/:id" element={<MedicalConsultantDetailsPage />} />
        <Route path="clinical-documentation" element={<ClinicalDocumentationPage />} />
        <Route path="clinical-documentation/add" element={<AddClinicalDocumentationPage />} />
        <Route path="clinical-documentation/edit/:id" element={<EditClinicalDocumentationPage />} />
        <Route path="clinical-documentation/:id" element={<ClinicalDocumentationDetailsPage />} />
        <Route path="therapy-programs" element={<TherapyProgramsPage />} />
        <Route path="therapy-programs/add" element={<AddTherapyProgramPage />} />
        <Route path="therapy-programs/edit/:id" element={<EditTherapyProgramPage />} />
        <Route path="therapy-programs/:id" element={<TherapyProgramDetailsPage />} />
        <Route path="assessments" element={<AssessmentsPage />} />
        <Route path="assessments/add" element={<AddAssessmentPage />} />
        <Route path="assessments/edit/:id" element={<EditAssessmentPage />} />
        <Route path="assessments/:id" element={<AssessmentDetailsPage />} />
        <Route path="therapeutic-goals" element={<TherapeuticGoalsPage />} />
        <Route path="progress-tracking" element={<ProgressTrackingPage />} />
        <Route path="qr-attendance" element={<QRAttendancePage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="insurance" element={<InsurancePage />} />
        <Route path="ai-analytics" element={<AIAnalyticsPage />} />
        <Route path="enterprise-automation" element={<EnterpriseAutomationPage />} />
        <Route path="multi-center-management" element={<MultiCenterManagementPage />} />
        
        {/* Phase 6: Financial Management & Billing */}
        <Route path="billing" element={<BillingDashboardPage />} />
        <Route path="payment-plans" element={<PaymentPlanManagerPage />} />
        <Route path="financial-analytics" element={<FinancialAnalyticsPage />} />
        
        {/* Phase 7: Analytics & Reporting */}
        <Route path="clinical-analytics" element={<ClinicalAnalyticsPage />} />
        <Route path="operational-analytics" element={<OperationalAnalyticsPage />} />
        <Route path="compliance-reporting" element={<ComplianceReportingPage />} />
        <Route path="data-management" element={<DataManagementPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/add" element={<AddUserPage />} />
        <Route path="users/edit/:id" element={<EditUserPage />} />
        <Route path="settings" element={<SettingsPage />} />
        
        {/* IEP Management Routes */}
        <Route path="iep-dashboard" element={<IEPDashboard />} />
        <Route path="ieps" element={<IEPListPage />} />
        <Route path="ieps/:id" element={<IEPDetailPage />} />
        <Route path="ieps/:id/edit" element={<IEPDetailPage />} />
        <Route path="ieps/create" element={<IEPDetailPage />} />
      </Route>
      
      {/* Parent Portal Routes */}
      <Route path="/parent-login" element={<ParentLoginPage />} />
      <Route path="/parent-register" element={<ParentRegisterPage />} />
      <Route path="/parent-dashboard" element={<ParentDashboardPage />} />
      <Route path="/parent-messages" element={<ParentMessagesPage />} />
      <Route path="/parent-home-programs" element={<ParentHomeProgramsPage />} />
      <Route path="/parent-appointments" element={<ParentAppointmentsPage />} />
      <Route path="/parent-documents" element={<ParentDocumentsPage />} />
    </Routes>
  )
}