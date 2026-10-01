import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { Settings, User, ShieldCheck, KeyRound, Plus, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { platformSettingsDoc } from '../../firebase/collections'
import { SUBSCRIPTION_PLANS } from '../../types'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'

type PlanKey = 'SMALL' | 'MEDIUM' | 'LARGE' | 'ESTATE'
const PLAN_KEYS: PlanKey[] = ['SMALL', 'MEDIUM', 'LARGE', 'ESTATE']

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const plans     = Object.values(SUBSCRIPTION_PLANS)

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [pricing, setPricing]                 = useState<Record<PlanKey, number>>({
    SMALL:  SUBSCRIPTION_PLANS.SMALL.monthlyPrice,
    MEDIUM: SUBSCRIPTION_PLANS.MEDIUM.monthlyPrice,
    LARGE:  SUBSCRIPTION_PLANS.LARGE.monthlyPrice,
    ESTATE: SUBSCRIPTION_PLANS.ESTATE.monthlyPrice,
  })
  const [posts, setPosts]     = useState<string[]>([])
  const [newPost, setNewPost] = useState('')

  useEffect(() => {
    getDoc(platformSettingsDoc).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        if (data.subscriptionPricing) setPricing(data.subscriptionPricing as Record<PlanKey, number>)
        if (data.defaultSecurityPosts) setPosts(data.defaultSecurityPosts)
      }
    }).catch(console.error).finally(() => setLoadingSettings(false))
  }, [])

  const onSave = async () => {
    setSaving(true)
    try {
      await setDoc(platformSettingsDoc, {
        subscriptionPricing:  pricing,
        defaultSecurityPosts: posts,
        updatedAt:            serverTimestamp(),
      }, { merge: true })
      toast.success('Platform settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addPost = () => {
    const v = newPost.trim()
    if (!v || posts.includes(v)) return
    setPosts(prev => [...prev, v])
    setNewPost('')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Your account and platform configuration.</p>
        </div>
        <button className="btn-primary text-sm" onClick={onSave} disabled={saving || loadingSettings}>
          {saving && <Spinner size="sm" className="text-white" />}
          Save changes
        </button>
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

      {/* Subscription Pricing */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-lango-primary" />
          <h3 className="section-title mb-0">Subscription Pricing</h3>
        </div>
        {loadingSettings ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLAN_KEYS.map(key => (
              <div key={key}>
                <label className="label">{SUBSCRIPTION_PLANS[key].name} <span className="text-gray-400 font-normal">(KES/mo)</span></label>
                <input
                  type="number"
                  min={0}
                  step={100}
                  className="input"
                  value={pricing[key]}
                  onChange={e => setPricing(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {plans.map(p => (
            <div key={p.planId} className="p-3 rounded-lg border border-gray-100 bg-gray-50/60 text-xs text-gray-500">
              {p.maxUnits >= 99999 ? 'Unlimited units' : `Up to ${p.maxUnits} units`}
            </div>
          ))}
        </div>
      </div>

      {/* Default Security Posts */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-lango-primary" />
          <h3 className="section-title mb-0">Default Security Posts</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">Posts pre-populated when registering a new guard shift.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {posts.map(post => (
            <span key={post} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lango-light text-lango-primary text-xs font-medium">
              {post}
              <button onClick={() => setPosts(prev => prev.filter(p => p !== post))} className="hover:text-red-600 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {posts.length === 0 && <p className="text-xs text-gray-400 italic">No default posts defined.</p>}
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. Main Gate"
            value={newPost}
            onChange={e => setNewPost(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addPost()}
          />
          <button className="btn-secondary text-sm" onClick={addPost} disabled={!newPost.trim()}>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Platform info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-lango-primary" />
          <h3 className="section-title mb-0">Platform</h3>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
          <Row label="Product"     value="Lango Gate Management" />
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
