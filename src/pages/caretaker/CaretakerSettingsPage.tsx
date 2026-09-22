import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { propertyDoc, userDoc } from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/LoadingScreen'
import { Toggle } from '../../components/ui/Toggle'
import {
  Settings, User, Bell, Building2, DoorOpen, Package,
  AlertTriangle, ShieldCheck, ChevronRight, ArrowLeft, KeyRound
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { Property, NotificationPreferences } from '../../types'

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  visitor: true,
  delivery: true,
  incident: true,
  emergency: true,
  channels: { inApp: true, whatsapp: false },
}

const SECTIONS = [
  { id: 'profile',        label: 'My Profile',            icon: User },
  { id: 'notifications',  label: 'Notifications',          icon: Bell },
  { id: 'property',       label: 'Property Information',   icon: Building2 },
  { id: 'visitor-prefs',  label: 'Visitor Preferences',    icon: DoorOpen },
  { id: 'delivery-prefs', label: 'Delivery Preferences',   icon: Package },
  { id: 'incident-prefs', label: 'Incident Preferences',   icon: AlertTriangle },
  { id: 'security',       label: 'Security',               icon: ShieldCheck },
]

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

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-lango-primary/10 flex items-center justify-center shrink-0">
        <Icon style={{ width: '1.125rem', height: '1.125rem' }} className="text-lango-primary" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </div>
  )
}

export default function CaretakerSettingsPage() {
  const { user, refreshProfile } = useAuth()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [mobileView, setMobileView] = useState<'list' | 'content'>('list')

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS)

  // Visitor & delivery sub-prefs (stored with notification prefs)
  const [visitorAlerts, setVisitorAlerts] = useState({ pendingAlerts: true, photoVisible: true })
  const [deliveryAlerts, setDeliveryAlerts] = useState({ newDelivery: true, uncollectedReminder: true })
  const [incidentCategories, setIncidentCategories] = useState({ suspiciousVisitor: true, unauthorizedEntry: true, dispute: true, theft: true, emergency: true, other: true })

  useEffect(() => {
    if (!user?.propertyId) { setLoading(false); return }
    getDoc(propertyDoc(user.propertyId)).then(snap => {
      if (snap.exists()) setProperty(snap.data() as Property)
    }).finally(() => setLoading(false))
    if (user.profile) {
      setProfileForm({ name: user.profile.name ?? '', phone: user.profile.phone ?? '' })
      const stored = (user.profile as unknown as { notificationPreferences?: NotificationPreferences }).notificationPreferences
      if (stored) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...stored })
    }
  }, [user?.propertyId, user?.profile])

  const saveProfile = async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await updateDoc(userDoc(user.uid), { ...profileForm, updatedAt: serverTimestamp() })
      await refreshProfile()
      toast.success('Profile saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const saveNotifPrefs = async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await updateDoc(userDoc(user.uid), { notificationPreferences: notifPrefs, updatedAt: serverTimestamp() })
      await refreshProfile()
      toast.success('Preferences saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const openSection = (id: string) => { setActiveSection(id); setMobileView('content') }

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={User} title="My Profile" />
          <div><label className="label">Name</label><input className="input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div><label className="label">Phone</label><input className="input" type="tel" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} /></div>
          <div>
            <label className="label">Email</label>
            <input className="input bg-gray-50" value={user?.email ?? ''} disabled />
            <p className="text-xs text-gray-400 mt-1">Email is managed by your administrator.</p>
          </div>
          <div className="flex justify-end pt-2">
            <button className="btn-primary" disabled={busy} onClick={saveProfile}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'notifications': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={Bell} title="Notifications" />
          <ToggleRow label="Visitor Alerts" checked={notifPrefs.visitor} onChange={v => setNotifPrefs(p => ({ ...p, visitor: v }))} />
          <ToggleRow label="Delivery Alerts" checked={notifPrefs.delivery} onChange={v => setNotifPrefs(p => ({ ...p, delivery: v }))} />
          <ToggleRow label="Incident Alerts" checked={notifPrefs.incident} onChange={v => setNotifPrefs(p => ({ ...p, incident: v }))} />
          <ToggleRow label="Emergency Alerts" description="Cannot be disabled." checked={notifPrefs.emergency} onChange={() => {}} disabled />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-4 pb-2">Channels</p>
          <ToggleRow label="In-App" checked={notifPrefs.channels.inApp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, inApp: v } }))} />
          <ToggleRow label="WhatsApp" checked={notifPrefs.channels.whatsapp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, whatsapp: v } }))} />
          <div className="flex justify-end pt-3">
            <button className="btn-primary" disabled={busy} onClick={saveNotifPrefs}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'property': return (
        <div className="card p-5">
          <SectionHeader icon={Building2} title="Property Information" description="Read-only. Contact your Property Manager to make changes." />
          <dl className="divide-y divide-gray-50">
            {[
              ['Property Name', property?.name ?? '—'],
              ['Address', property?.address ?? '—'],
              ['City', property?.city ?? '—'],
              ['County', property?.county ?? '—'],
              ['Phone', property?.phone ?? '—'],
              ['Email', property?.email ?? '—'],
              ['Primary Contact', property?.primaryContact ?? '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 py-3">
                <dt className="text-sm text-gray-500 shrink-0">{k}</dt>
                <dd className="text-sm font-medium text-gray-800 text-right break-all">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )

      case 'visitor-prefs': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={DoorOpen} title="Visitor Preferences" />
          <ToggleRow label="Visitor Notifications" description="Receive alerts when visitors arrive." checked={notifPrefs.visitor} onChange={v => setNotifPrefs(p => ({ ...p, visitor: v }))} />
          <ToggleRow label="Pending Visitor Alerts" description="Alert for visitors awaiting approval." checked={visitorAlerts.pendingAlerts} onChange={v => setVisitorAlerts(s => ({ ...s, pendingAlerts: v }))} />
          <ToggleRow label="Show Visitor Photo" description="Display captured visitor photos in the visitor list." checked={visitorAlerts.photoVisible} onChange={v => setVisitorAlerts(s => ({ ...s, photoVisible: v }))} />
          <div className="flex justify-end pt-3">
            <button className="btn-primary" disabled={busy} onClick={saveNotifPrefs}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'delivery-prefs': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={Package} title="Delivery Preferences" />
          <ToggleRow label="New Delivery Notifications" checked={deliveryAlerts.newDelivery} onChange={v => setDeliveryAlerts(s => ({ ...s, newDelivery: v }))} />
          <ToggleRow label="Uncollected Delivery Reminders" description="Reminder for deliveries held more than 24 hours." checked={deliveryAlerts.uncollectedReminder} onChange={v => setDeliveryAlerts(s => ({ ...s, uncollectedReminder: v }))} />
          <div className="flex justify-end pt-3">
            <button className="btn-primary" disabled={busy} onClick={saveNotifPrefs}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'incident-prefs': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={AlertTriangle} title="Incident Preferences" description="Choose which incident types trigger notifications." />
          {Object.entries({
            suspiciousVisitor: 'Suspicious Visitor',
            unauthorizedEntry: 'Unauthorized Entry',
            dispute: 'Dispute',
            theft: 'Theft',
            emergency: 'Emergency',
            other: 'Other',
          }).map(([key, label]) => (
            <ToggleRow
              key={key}
              label={label}
              checked={incidentCategories[key as keyof typeof incidentCategories]}
              onChange={v => setIncidentCategories(s => ({ ...s, [key]: v }))}
              disabled={key === 'emergency'}
              description={key === 'emergency' ? 'Cannot be disabled.' : undefined}
            />
          ))}
          <div className="flex justify-end pt-3">
            <button className="btn-primary" disabled={busy} onClick={saveNotifPrefs}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'security': return (
        <div className="card p-5 space-y-4">
          <SectionHeader icon={ShieldCheck} title="Security" />
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">Password</p>
              <p className="text-xs text-gray-500">Change your login password</p>
            </div>
            <Link to="/change-password" className="btn-secondary text-sm inline-flex">
              <KeyRound className="w-3.5 h-3.5" /> Change
            </Link>
          </div>
          <div className="py-2">
            <p className="text-sm font-medium text-gray-800 mb-1">Active Sessions</p>
            <p className="text-xs text-gray-500">You are currently signed in on this device. Session management is handled automatically.</p>
          </div>
        </div>
      )

      default: return null
    }
  }

  const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label ?? 'Settings'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Your profile and notification preferences.</p>
        </div>
      </div>

      {/* Mobile: list view */}
      {mobileView === 'list' && (
        <div className="lg:hidden space-y-1">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => openSection(s.id)} className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50 transition-colors text-left">
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
        <nav className="w-48 shrink-0 card p-2 sticky top-6">
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${activeSection === s.id ? 'bg-lango-primary/10 text-lango-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'}`}>
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
