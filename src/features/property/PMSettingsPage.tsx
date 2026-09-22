import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { propertyDoc, userDoc } from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/LoadingScreen'
import { Toggle } from '../../components/ui/Toggle'
import {
  Settings, Building2, Building, DoorOpen, Package, Shield,
  Clock, AlertTriangle, Bell, Users, Plug, User, ChevronRight,
  ArrowLeft, KeyRound
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Property, PropertySettings, NotificationPreferences } from '../../types'

const DEFAULT_SETTINGS: PropertySettings = {
  emergencyContact: '',
  timezone: 'Africa/Nairobi',
  visitorApprovalRequired: false,
  allowWalkInVisitors: true,
  requireVisitorId: true,
  requireVisitorPhoto: false,
  visitorApprovalTimeoutMins: 30,
  invitationExpiryHours: 24,
  enableDeliveryTracking: true,
  deliveryNotifications: true,
  requireCollectorName: true,
  requireDeliveryPhoto: false,
  dayShiftStart: '06:00',
  dayShiftEnd: '18:00',
  nightShiftStart: '18:00',
  nightShiftEnd: '06:00',
  shiftGracePeriodMins: 15,
}

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  visitor: true,
  delivery: true,
  incident: true,
  emergency: true,
  channels: { inApp: true, whatsapp: false },
}

const SECTIONS = [
  { id: 'property',       label: 'Property',           icon: Building2 },
  { id: 'structure',      label: 'Property Structure',  icon: Building },
  { id: 'visitors',       label: 'Visitor Settings',    icon: DoorOpen },
  { id: 'delivery',       label: 'Delivery Settings',   icon: Package },
  { id: 'security-team',  label: 'Security Team',       icon: Shield },
  { id: 'shifts',         label: 'Shift Management',    icon: Clock },
  { id: 'incidents',      label: 'Incident Settings',   icon: AlertTriangle },
  { id: 'notifications',  label: 'Notifications',       icon: Bell },
  { id: 'staff',          label: 'Staff & Permissions', icon: Users },
  { id: 'integrations',   label: 'Integrations',        icon: Plug },
  { id: 'account',        label: 'My Account',          icon: User },
]

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-lango-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5 text-lango-primary" style={{ width: '1.125rem', height: '1.125rem' }} />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange, disabled }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  )
}

export default function PMSettingsPage() {
  const { user, refreshProfile } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [activeSection, setActiveSection] = useState('property')
  const [mobileView, setMobileView] = useState<'list' | 'content'>('list')

  // Per-section form state
  const [propForm, setPropForm] = useState({ name: '', primaryContact: '', phone: '', email: '', address: '', county: '', city: '' })
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_SETTINGS)
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })

  useEffect(() => {
    if (!user?.propertyId) { setLoading(false); return }
    getDoc(propertyDoc(user.propertyId)).then(snap => {
      if (!snap.exists()) return
      const p = snap.data() as Property & { settings?: PropertySettings; notificationPreferences?: NotificationPreferences }
      setProperty(p)
      setPropForm({ name: p.name ?? '', primaryContact: p.primaryContact ?? '', phone: p.phone ?? '', email: p.email ?? '', address: p.address ?? '', county: p.county ?? '', city: p.city ?? '' })
      if (p.settings) setSettings({ ...DEFAULT_SETTINGS, ...p.settings })
    }).finally(() => setLoading(false))
    if (user.profile) {
      setProfileForm({ name: user.profile.name ?? '', phone: user.profile.phone ?? '' })
      if ((user.profile as unknown as { notificationPreferences?: NotificationPreferences }).notificationPreferences) {
        setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...(user.profile as unknown as { notificationPreferences?: NotificationPreferences }).notificationPreferences })
      }
    }
  }, [user?.propertyId, user?.profile])

  const savePropertyInfo = async () => {
    if (!user?.propertyId) return
    setBusy(true)
    try {
      await updateDoc(propertyDoc(user.propertyId), { ...propForm, updatedAt: serverTimestamp() })
      toast.success('Property info saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const saveSettings = async () => {
    if (!user?.propertyId) return
    setBusy(true)
    try {
      await updateDoc(propertyDoc(user.propertyId), { settings, updatedAt: serverTimestamp() })
      toast.success('Settings saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const saveNotifPrefs = async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await updateDoc(userDoc(user.uid), { notificationPreferences: notifPrefs, updatedAt: serverTimestamp() })
      await refreshProfile()
      toast.success('Notification preferences saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const saveProfile = async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await updateDoc(userDoc(user.uid), { ...profileForm, updatedAt: serverTimestamp() })
      await refreshProfile()
      toast.success('Profile saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const openSection = (id: string) => { setActiveSection(id); setMobileView('content') }

  if (loading) return (
    <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
  )

  const renderSection = () => {
    switch (activeSection) {
      case 'property': return (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Building2} title="Property" description="Core property details visible to staff." />
          <div><label className="label">Property Name</label><input className="input" value={propForm.name} onChange={e => setPropForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Primary Contact</label><input className="input" value={propForm.primaryContact} onChange={e => setPropForm(f => ({ ...f, primaryContact: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" type="tel" value={propForm.phone} onChange={e => setPropForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div><label className="label">Email</label><input className="input" type="email" value={propForm.email} onChange={e => setPropForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div><label className="label">Address</label><input className="input" value={propForm.address} onChange={e => setPropForm(f => ({ ...f, address: e.target.value }))} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={propForm.city} onChange={e => setPropForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className="label">County</label><input className="input" value={propForm.county} onChange={e => setPropForm(f => ({ ...f, county: e.target.value }))} /></div>
          </div>
          <div><label className="label">Emergency Contact</label><input className="input" placeholder="e.g. +254 700 000 000" value={settings.emergencyContact} onChange={e => setSettings(s => ({ ...s, emergencyContact: e.target.value }))} /></div>
          <div><label className="label">Timezone</label>
            <select className="input" value={settings.timezone} onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-primary" disabled={busy} onClick={async () => { await savePropertyInfo(); await saveSettings() }}>
              {busy && <Spinner size="sm" className="text-white" />}Save
            </button>
          </div>
        </div>
      )

      case 'structure': return (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Building} title="Property Structure" description="Read-only overview. Edit blocks and units from the Blocks & Units page." />
          <dl className="divide-y divide-gray-50">
            {[
              ['Property Type', property?.type?.replace(/_/g, ' ') ?? '—'],
              ['Structure Type', property?.structureType?.replace(/_/g, ' ') ?? 'Blocks'],
              ['Total Units', String(property?.totalUnits ?? '—')],
              ['Number of Blocks', String(property?.numberOfBlocks ?? '—')],
              ['Occupied Units', String(property?.occupiedUnits ?? '—')],
              ['Vacant Units', String(property?.vacantUnits ?? '—')],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3">
                <dt className="text-sm text-gray-500">{k}</dt>
                <dd className="text-sm font-medium text-gray-800">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="pt-1">
            <Link to="/property/units" className="btn-secondary inline-flex text-sm">
              Manage Blocks & Units <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )

      case 'visitors': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={DoorOpen} title="Visitor Settings" />
          <ToggleRow label="Visitor Approval Required" description="Gate must get PM approval before letting visitor in." checked={settings.visitorApprovalRequired} onChange={v => setSettings(s => ({ ...s, visitorApprovalRequired: v }))} />
          <ToggleRow label="Allow Walk-in Visitors" description="Visitors without prior registration can be admitted." checked={settings.allowWalkInVisitors} onChange={v => setSettings(s => ({ ...s, allowWalkInVisitors: v }))} />
          <ToggleRow label="Require Visitor ID" description="Guard must capture visitor national ID number." checked={settings.requireVisitorId} onChange={v => setSettings(s => ({ ...s, requireVisitorId: v }))} />
          <ToggleRow label="Require Visitor Photo" description="Guard must capture visitor photo at entry." checked={settings.requireVisitorPhoto} onChange={v => setSettings(s => ({ ...s, requireVisitorPhoto: v }))} />
          <div className="py-3 border-b border-gray-50">
            <label className="label">Approval Timeout (minutes)</label>
            <input className="input mt-1" type="number" min={5} max={120} value={settings.visitorApprovalTimeoutMins} onChange={e => setSettings(s => ({ ...s, visitorApprovalTimeoutMins: Number(e.target.value) }))} />
          </div>
          <div className="py-3">
            <label className="label">Invitation Expiry (hours)</label>
            <input className="input mt-1" type="number" min={1} max={168} value={settings.invitationExpiryHours} onChange={e => setSettings(s => ({ ...s, invitationExpiryHours: Number(e.target.value) }))} />
          </div>
          <div className="flex justify-end pt-2">
            <button className="btn-primary" disabled={busy} onClick={saveSettings}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'delivery': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={Package} title="Delivery Settings" />
          <ToggleRow label="Enable Delivery Tracking" checked={settings.enableDeliveryTracking} onChange={v => setSettings(s => ({ ...s, enableDeliveryTracking: v }))} />
          <ToggleRow label="Delivery Notifications" description="Notify tenants when their delivery arrives." checked={settings.deliveryNotifications} onChange={v => setSettings(s => ({ ...s, deliveryNotifications: v }))} />
          <ToggleRow label="Require Collector Name" description="Name of person collecting the delivery." checked={settings.requireCollectorName} onChange={v => setSettings(s => ({ ...s, requireCollectorName: v }))} />
          <ToggleRow label="Require Delivery Photo" checked={settings.requireDeliveryPhoto} onChange={v => setSettings(s => ({ ...s, requireDeliveryPhoto: v }))} />
          <div className="flex justify-end pt-3">
            <button className="btn-primary" disabled={busy} onClick={saveSettings}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'security-team': return (
        <div className="card p-5">
          <SectionHeader icon={Shield} title="Security Team" description="Manage guards, activate/deactivate, and assign posts." />
          <p className="text-sm text-gray-600 mb-4">Guard management is handled in the Staff page where you can activate, deactivate, and manage all security personnel.</p>
          <Link to="/property/staff" className="btn-primary inline-flex">
            Go to Staff <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )

      case 'shifts': return (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={Clock} title="Shift Management" description="Configure day and night shift times and grace periods." />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Day Shift</p>
              <div className="space-y-2">
                <div><label className="label">Start Time</label><input className="input" type="time" value={settings.dayShiftStart} onChange={e => setSettings(s => ({ ...s, dayShiftStart: e.target.value }))} /></div>
                <div><label className="label">End Time</label><input className="input" type="time" value={settings.dayShiftEnd} onChange={e => setSettings(s => ({ ...s, dayShiftEnd: e.target.value }))} /></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Night Shift</p>
              <div className="space-y-2">
                <div><label className="label">Start Time</label><input className="input" type="time" value={settings.nightShiftStart} onChange={e => setSettings(s => ({ ...s, nightShiftStart: e.target.value }))} /></div>
                <div><label className="label">End Time</label><input className="input" type="time" value={settings.nightShiftEnd} onChange={e => setSettings(s => ({ ...s, nightShiftEnd: e.target.value }))} /></div>
              </div>
            </div>
          </div>
          <div><label className="label">Grace Period (minutes)</label><input className="input" type="number" min={0} max={60} value={settings.shiftGracePeriodMins} onChange={e => setSettings(s => ({ ...s, shiftGracePeriodMins: Number(e.target.value) }))} /></div>
          <div className="flex justify-end">
            <button className="btn-primary" disabled={busy} onClick={saveSettings}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'incidents': return (
        <div className="card p-5">
          <SectionHeader icon={AlertTriangle} title="Incident Settings" description="Available incident types are configured in the system." />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Incident Categories</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Suspicious Visitor', 'Unauthorized Entry', 'Dispute', 'Theft', 'Emergency', 'Other'].map(c => (
              <span key={c} className="badge badge-blue">{c}</span>
            ))}
          </div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Severity Levels</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {['Low', 'Medium', 'High', 'Critical'].map(s => (
              <span key={s} className="badge badge-gray">{s}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500">Incident categories and severity levels are system-defined. Notification escalation happens automatically on High and Critical incidents.</p>
        </div>
      )

      case 'notifications': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={Bell} title="Notifications" description="Control which alerts you receive and how." />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1 pb-2">Alert Types</p>
          <ToggleRow label="Visitor Alerts" description="When a visitor arrives or is denied." checked={notifPrefs.visitor} onChange={v => setNotifPrefs(p => ({ ...p, visitor: v }))} />
          <ToggleRow label="Delivery Alerts" description="When a delivery is registered or uncollected." checked={notifPrefs.delivery} onChange={v => setNotifPrefs(p => ({ ...p, delivery: v }))} />
          <ToggleRow label="Incident Alerts" checked={notifPrefs.incident} onChange={v => setNotifPrefs(p => ({ ...p, incident: v }))} />
          <ToggleRow label="Emergency Alerts" description="Cannot be disabled." checked={notifPrefs.emergency} onChange={() => {}} disabled />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-4 pb-2">Channels</p>
          <ToggleRow label="In-App" checked={notifPrefs.channels.inApp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, inApp: v } }))} />
          <ToggleRow label="WhatsApp" description="Requires WhatsApp integration." checked={notifPrefs.channels.whatsapp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, whatsapp: v } }))} />
          <div className="flex justify-end pt-3">
            <button className="btn-primary" disabled={busy} onClick={saveNotifPrefs}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'staff': return (
        <div className="card p-5">
          <SectionHeader icon={Users} title="Staff & Permissions" description="View and manage staff roles and permissions." />
          <p className="text-sm text-gray-600 mb-4">Staff management, role assignments, and permission configuration are available in the Staff page.</p>
          <Link to="/property/staff" className="btn-primary inline-flex">
            Go to Staff <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )

      case 'integrations': return (
        <div className="card p-5 space-y-3">
          <SectionHeader icon={Plug} title="Integrations" description="Active integrations in this property." />
          {[
            { name: 'WhatsApp Notifications', desc: 'Visitor and delivery alerts via WhatsApp', status: 'Mock (Dev)', color: 'badge-yellow' },
            { name: 'ID OCR', desc: 'Automatic ID scanning at the gate via Cloud Run', status: 'Active', color: 'badge-green' },
          ].map(item => (
            <div key={item.name} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
              <span className={`badge ${item.color}`}>{item.status}</span>
            </div>
          ))}
        </div>
      )

      case 'account': return (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={User} title="My Account" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div><label className="label">Name</label><input className="input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="label">Phone</label><input className="input" type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={user?.email ?? ''} disabled title="Email cannot be changed here" />
            <p className="text-xs text-gray-400 mt-1">Email is managed by your administrator.</p>
          </div>
          <div>
            <label className="label">Role</label>
            <p className="text-sm text-gray-800 font-medium py-2">Property Manager</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <Link to="/change-password" className="btn-secondary inline-flex text-sm">
              <KeyRound className="w-3.5 h-3.5" /> Change Password
            </Link>
            <button className="btn-primary" disabled={busy} onClick={saveProfile}>{busy && <Spinner size="sm" className="text-white" />}Save Profile</button>
          </div>
        </div>
      )

      default: return null
    }
  }

  const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label ?? 'Settings'

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Property configuration and preferences.</p>
        </div>
      </div>

      {/* Mobile: list view */}
      {mobileView === 'list' && (
        <div className="lg:hidden space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => openSection(s.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-lango-primary/10 flex items-center justify-center shrink-0">
                <s.icon className="w-4 h-4 text-lango-primary" />
              </div>
              <span className="flex-1 text-sm font-medium text-gray-800">{s.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      )}

      {/* Mobile: content view */}
      {mobileView === 'content' && (
        <div className="lg:hidden">
          <button onClick={() => setMobileView('list')} className="flex items-center gap-1.5 text-sm text-lango-primary mb-4 font-medium">
            <ArrowLeft className="w-4 h-4" /> {activeLabel}
          </button>
          {renderSection()}
        </div>
      )}

      {/* Desktop: sidebar + content */}
      <div className="hidden lg:flex gap-6 items-start">
        <nav className="w-52 shrink-0 card p-2 sticky top-6">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                activeSection === s.id ? 'bg-lango-primary/10 text-lango-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <s.icon className="w-4 h-4 shrink-0" />
              {s.label}
            </button>
          ))}
        </nav>
        <div className="flex-1 min-w-0">{renderSection()}</div>
      </div>
    </div>
  )
}
