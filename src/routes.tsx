import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
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
import { SessionsPage } from './pages/SessionsPage'
import { AddSessionPage } from './pages/AddSessionPage'
import { SessionCalendarPage } from './pages/SessionCalendarPage'
import { TherapistsPage } from './pages/TherapistsPage'
import { AddTherapistPage } from './pages/AddTherapistPage'
import { EnrollmentsPage } from './pages/EnrollmentsPage'
import { AddEnrollmentPage } from './pages/AddEnrollmentPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/add" element={<AddSessionPage />} />
        <Route path="sessions/calendar" element={<SessionCalendarPage />} />
        <Route path="therapists" element={<TherapistsPage />} />
        <Route path="therapists/add" element={<AddTherapistPage />} />
        <Route path="enrollments" element={<EnrollmentsPage />} />
        <Route path="enrollments/add" element={<AddEnrollmentPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}