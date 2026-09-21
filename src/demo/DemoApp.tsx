import { Routes, Route } from 'react-router-dom'
import DemoEntry from './pages/DemoEntry'
import { DemoShell } from './components/DemoShell'
import { DemoPlaceholder } from './components/DemoPlaceholder'
import DemoManagerDashboard from './pages/manager/DemoManagerDashboard'
import DemoTenantsPage from './pages/manager/DemoTenantsPage'
import DemoUnitsPage from './pages/manager/DemoUnitsPage'
import DemoStaffPage from './pages/manager/DemoStaffPage'
import DemoVisitorsPage from './pages/manager/DemoVisitorsPage'
import DemoDeliveriesPage from './pages/manager/DemoDeliveriesPage'
import DemoIncidentsPage from './pages/manager/DemoIncidentsPage'
import DemoGuardDashboard from './pages/guard/DemoGuardDashboard'
import DemoCaretakerDashboard from './pages/caretaker/DemoCaretakerDashboard'
import DemoRegisterVisitorPage from './components/DemoRegisterVisitorPage'
import DemoInsidePage from './components/DemoInsidePage'
import DemoShiftPage from './components/DemoShiftPage'
import { GUARD_STAFF_ID } from './data/personas'
import { DemoTourProvider } from './tour/DemoTourContext'
import { DemoTourCard } from './tour/DemoTourCard'

export default function DemoApp() {
  return (
    <div className="h-screen overflow-y-auto">
      <DemoTourProvider>
      <Routes>
        <Route index element={<DemoEntry />} />

        <Route path="manager" element={<DemoShell role="MANAGER" />}>
          <Route index element={<DemoManagerDashboard />} />
          <Route path="visitors" element={<DemoVisitorsPage />} />
          <Route path="tenants" element={<DemoTenantsPage />} />
          <Route path="units" element={<DemoUnitsPage />} />
          <Route path="staff" element={<DemoStaffPage />} />
          <Route path="deliveries" element={<DemoDeliveriesPage />} />
          <Route path="incidents" element={<DemoIncidentsPage />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>

        <Route path="guard" element={<DemoShell role="GUARD" />}>
          <Route index element={<DemoGuardDashboard />} />
          <Route path="register" element={<DemoRegisterVisitorPage />} />
          <Route path="inside" element={<DemoInsidePage />} />
          <Route path="shift" element={<DemoShiftPage staffId={GUARD_STAFF_ID} />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>

        <Route path="caretaker" element={<DemoShell role="CARETAKER" />}>
          <Route index element={<DemoCaretakerDashboard />} />
          <Route path="register" element={<DemoRegisterVisitorPage />} />
          <Route path="inside" element={<DemoInsidePage />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>
      </Routes>
      <DemoTourCard />
      </DemoTourProvider>
    </div>
  )
}
