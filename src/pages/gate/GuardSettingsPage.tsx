import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { updateDoc, serverTimestamp } from 'firebase/firestore'
import { userDoc } from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { Spinner } from '../../components/ui/LoadingScreen'
import { Toggle } from '../../components/ui/Toggle'
import {
  Settings, User, Clock, Bell, ShieldCheck, Sliders, HelpCircle,
  ChevronRight, ArrowLeft, KeyRound
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
import type { NotificationPreferences, UserPreferences } from '../../types'

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  visitor: true,
  delivery: true,
  incident: true,
  emergency: true,
  channels: { inApp: true, whatsapp: false },
}

const DEFAULT_PREFS: UserPreferences = {
  soundEnabled: true,
  vibrationEnabled: true,
  use24HourTime: false,
  language: 'en',
  darkMode: false,
}

const SECTIONS = [
  { id: 'profile',        label: 'My Profile',       icon: User },
  { id: 'shift',          label: 'Shift Preferences', icon: Clock },
  { id: 'notifications',  label: 'Notifications',     icon: Bell },
  { id: 'security',       label: 'Security',          icon: ShieldCheck },
  { id: 'preferences',    label: 'App Preferences',   icon: Sliders },
  { id: 'help',           label: 'Help & Support',    icon: HelpCircle },
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

const HELP_TOPICS = [
  { title: 'Visitor Registration', desc: 'How to register a visitor at the gate, capture ID via OCR, and approve entry.' },
  { title: 'ID OCR Scanning', desc: 'Tips for using the ID scanner: good lighting, flat surface, keep ID steady.' },
  { title: 'Delivery Check-in', desc: 'How to log incoming deliveries and notify tenants.' },
  { title: 'Incident Reporting', desc: 'When and how to report security incidents and assign severity.' },
  { title: 'Shift Management', desc: 'How to start and end your shift, and view your shift history.' },
]

export default function GuardSettingsPage() {
  const { user, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [activeSection, setActiveSection] = useState('profile')
  const [mobileView, setMobileView] = useState<'list' | 'content'>('list')
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null)

  const [profileForm, setProfileForm] = useState({ name: '', phone: '' })
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS)
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS)

  useEffect(() => {
    if (!user?.profile) return
    setProfileForm({ name: user.profile.name ?? '', phone: user.profile.phone ?? '' })
    const stored = user.profile as unknown as { notificationPreferences?: NotificationPreferences; preferences?: UserPreferences }
    if (stored.notificationPreferences) setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...stored.notificationPreferences })
    if (stored.preferences) {
      const merged = { ...DEFAULT_PREFS, ...stored.preferences }
      setPrefs(merged)
      document.documentElement.classList.toggle('dark', merged.darkMode ?? false)
      if (merged.language && merged.language !== 'en') {
        i18n.changeLanguage(merged.language)
      }
    }
  }, [user?.profile])

  const applyDarkMode = (enabled: boolean) => {
    document.documentElement.classList.toggle('dark', enabled)
    setPrefs(p => ({ ...p, darkMode: enabled }))
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

  const saveNotifPrefs = async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await updateDoc(userDoc(user.uid), { notificationPreferences: notifPrefs, updatedAt: serverTimestamp() })
      await refreshProfile()
      toast.success('Preferences saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const savePrefs = async () => {
    if (!user?.uid) return
    setBusy(true)
    try {
      await updateDoc(userDoc(user.uid), { preferences: prefs, updatedAt: serverTimestamp() })
      await refreshProfile()
      toast.success('Preferences saved')
    } catch { toast.error('Save failed') } finally { setBusy(false) }
  }

  const openSection = (id: string) => { setActiveSection(id); setMobileView('content') }

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
          <div>
            <label className="label">Role</label>
            <p className="text-sm text-gray-800 font-medium py-1.5">Security Guard</p>
          </div>
          <div>
            <label className="label">Status</label>
            <span className={`badge ${user?.profile?.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
              {user?.profile?.status ?? '—'}
            </span>
          </div>
          <div className="flex justify-end pt-2">
            <button className="btn-primary" disabled={busy} onClick={saveProfile}>{busy && <Spinner size="sm" className="text-white" />}Save</button>
          </div>
        </div>
      )

      case 'shift': return (
        <div className="card p-5">
          <SectionHeader icon={Clock} title="Shift Preferences" description="View your current shift status and history." />
          <div className="space-y-3 mb-4">
            {[
              ['Assigned Property', user?.profile ? '—' : '—'],
              ['Guard ID', user?.uid ? user.uid.slice(0, 8).toUpperCase() : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-gray-50">
                <dt className="text-sm text-gray-500">{k}</dt>
                <dd className="text-sm font-medium text-gray-800 font-mono">{v}</dd>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 mb-4">To start or end a shift, view your shift history, and see your assigned post, go to My Shift.</p>
          <Link to="/gate/shift" className="btn-primary inline-flex">
            Go to My Shift <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )

      case 'notifications': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={Bell} title="Notifications" />
          <ToggleRow label="Visitor Alerts" description="When a visitor is registered or denied." checked={notifPrefs.visitor} onChange={v => setNotifPrefs(p => ({ ...p, visitor: v }))} />
          <ToggleRow label="Delivery Alerts" description="When a delivery is registered." checked={notifPrefs.delivery} onChange={v => setNotifPrefs(p => ({ ...p, delivery: v }))} />
          <ToggleRow label="Incident Alerts" checked={notifPrefs.incident} onChange={v => setNotifPrefs(p => ({ ...p, incident: v }))} />
          <ToggleRow label="Shift Alerts" description="Shift start reminders and handover notifications." checked={true} onChange={() => {}} disabled />
          <ToggleRow label="Emergency Alerts" description="Cannot be disabled." checked={notifPrefs.emergency} onChange={() => {}} disabled />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-4 pb-2">Channels</p>
          <ToggleRow label="In-App" checked={notifPrefs.channels.inApp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, inApp: v } }))} />
          <ToggleRow label="WhatsApp" checked={notifPrefs.channels.whatsapp} onChange={v => setNotifPrefs(p => ({ ...p, channels: { ...p.channels, whatsapp: v } }))} />
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
            <p className="text-xs text-gray-500 mb-2">You are currently signed in on this device.</p>
          </div>
        </div>
      )

      case 'preferences': return (
        <div className="card p-5 space-y-1">
          <SectionHeader icon={Sliders} title={t('settings.preferences')} />
          <ToggleRow label={t('settings.soundEffects')} description="Play sounds for alerts and actions." checked={prefs.soundEnabled} onChange={v => setPrefs(p => ({ ...p, soundEnabled: v }))} />
          <ToggleRow label={t('settings.vibration')} description="Vibrate on alerts (mobile)." checked={prefs.vibrationEnabled} onChange={v => setPrefs(p => ({ ...p, vibrationEnabled: v }))} />
          <ToggleRow label={t('settings.use24Hour')} description="Display time in 24-hour format." checked={prefs.use24HourTime} onChange={v => setPrefs(p => ({ ...p, use24HourTime: v }))} />
          <ToggleRow
            label={t('settings.darkMode')}
            description="Switch the app to a dark colour scheme."
            checked={prefs.darkMode ?? false}
            onChange={applyDarkMode}
          />
          <div className="py-3">
            <label className="label">{t('settings.language')}</label>
            <select
              className="input"
              value={prefs.language}
              onChange={e => {
                const lang = e.target.value
                setPrefs(p => ({ ...p, language: lang }))
                i18n.changeLanguage(lang)
              }}
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button className="btn-primary" disabled={busy} onClick={savePrefs}>{busy && <Spinner size="sm" className="text-white" />}{t('common.save')}</button>
          </div>
        </div>
      )

      case 'help': return (
        <div className="card p-5 space-y-2">
          <SectionHeader icon={HelpCircle} title="Help & Support" description="Quick guides for common tasks." />
          {HELP_TOPICS.map(topic => (
            <div key={topic.title} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedHelp(expandedHelp === topic.title ? null : topic.title)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 text-left"
              >
                {topic.title}
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedHelp === topic.title ? 'rotate-90' : ''}`} />
              </button>
              {expandedHelp === topic.title && (
                <div className="px-4 pb-3 text-xs text-gray-600 bg-gray-50/50">{topic.desc}</div>
              )}
            </div>
          ))}
          <div className="pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-500 mb-2">Need more help? Contact your supervisor or Property Manager.</p>
          </div>
        </div>
      )

      default: return null
    }
  }

  const activeLabel = SECTIONS.find(s => s.id === activeSection)?.label ?? 'Settings'

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-subtitle">Your profile and app preferences.</p>
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
        <nav className="w-44 shrink-0 card p-2 sticky top-6">
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
