import { Routes, Route } from 'react-router-dom'
import DemoEntry from './pages/DemoEntry'
import { DemoShell } from './components/DemoShell'
import { DemoPlaceholder } from './components/DemoPlaceholder'
import DemoManagerDashboard from './pages/manager/DemoManagerDashboard'
import DemoTenantsPage from './pages/manager/DemoTenantsPage'
import DemoUnitsPage from './pages/manager/DemoUnitsPage'
import DemoStaffPage from './pages/manager/DemoStaffPage'
import DemoVisitorsPage from './pages/manager/DemoVisitorsPage'

export default function DemoApp() {
  return (
    <div className="h-screen overflow-y-auto">
      <Routes>
        <Route index element={<DemoEntry />} />

        <Route path="manager" element={<DemoShell role="MANAGER" />}>
          <Route index element={<DemoManagerDashboard />} />
          <Route path="visitors" element={<DemoVisitorsPage />} />
          <Route path="tenants" element={<DemoTenantsPage />} />
          <Route path="units" element={<DemoUnitsPage />} />
          <Route path="staff" element={<DemoStaffPage />} />
          <Route path="*" element={<DemoPlaceholder />} />
        </Route>

        <Route path="guard" element={<DemoShell role="GUARD" />}>
          <Route index element={<DemoPlaceholder title="Security Guard demo — coming up" />} />
          <Route path="*" element={<DemoPlaceholder title="Security Guard demo — coming up" />} />
        </Route>

        <Route path="caretaker" element={<DemoShell role="CARETAKER" />}>
          <Route index element={<DemoPlaceholder title="Caretaker demo — coming up" />} />
          <Route path="*" element={<DemoPlaceholder title="Caretaker demo — coming up" />} />
        </Route>

        <Route path="resident" element={<DemoShell role="RESIDENT" />}>
          <Route index element={<DemoPlaceholder title="Resident demo — coming up" />} />
          <Route path="*" element={<DemoPlaceholder title="Resident demo — coming up" />} />
        </Route>
      </Routes>
    </div>
  )
}
