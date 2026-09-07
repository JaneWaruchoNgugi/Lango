import { Link } from 'react-router-dom'
import { Settings, User, ShieldCheck, KeyRound } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { SUBSCRIPTION_PLANS } from '../../types'

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const plans = Object.values(SUBSCRIPTION_PLANS)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your account and platform configuration.</p>
      </div>

      {/* Account */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-lango-primary" />
          <h3 className="section-title mb-0">Account</h3>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          <Row label="Name"  value={user?.profile?.name ?? '—'} />
          <Row label="Email" value={user?.email ?? '—'} />
          <Row label="Phone" value={user?.profile?.phone ?? '—'} />
          <Row label="Role"  value={(user?.role ?? '—').replace(/_/g, ' ')} />
        </dl>
        <div className="mt-4">
          <Link to="/change-password" className="btn-secondary text-sm inline-flex">
            <KeyRound className="w-3.5 h-3.5" /> Change Password
          </Link>
        </div>
      </div>

      {/* Plan catalog */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-lango-primary" />
          <h3 className="section-title mb-0">Subscription Plans</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map(p => (
            <div key={p.planId} className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
              <p className="text-sm font-semibold text-gray-900">{p.name}</p>
              <p className="text-lg font-bold text-lango-primary mt-1">KES {p.monthlyPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-500 mt-1">
                {p.maxUnits >= 99999 ? 'Unlimited units' : `Up to ${p.maxUnits} units`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Platform */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-lango-primary" />
          <h3 className="section-title mb-0">Platform</h3>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          <Row label="Product" value="Lango Gate Management" />
          <Row label="Environment" value={import.meta.env.MODE} />
        </dl>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 pb-2">
      <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-800 text-right break-all">{value}</dd>
    </div>
  )
}
