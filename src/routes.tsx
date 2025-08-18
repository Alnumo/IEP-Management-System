import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PlansPage } from './pages/PlansPage'
import { AddPlanPage } from './pages/AddPlanPage'
import { EditPlanPage } from './pages/EditPlanPage'
import { PlanDetailsPage } from './pages/PlanDetailsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { AddCategoryPage } from './pages/AddCategoryPage'
import { EditCategoryPage } from './pages/EditCategoryPage'

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/plans" replace />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="plans/add" element={<AddPlanPage />} />
        <Route path="plans/edit/:id" element={<EditPlanPage />} />
        <Route path="plans/:id" element={<PlanDetailsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/add" element={<AddCategoryPage />} />
        <Route path="categories/edit/:id" element={<EditCategoryPage />} />
      </Route>
    </Routes>
  )
}