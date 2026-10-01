import { useEffect, useState } from 'react'
import { deleteDoc, doc, getDocs, query, setDoc, where, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { tenantInvitesCol } from '../../firebase/collections'
import { useTenants } from '../../hooks/useTenants'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { Link2, Copy, Trash2, RefreshCw, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import type { TenantInvite, Tenant } from '../../types'

function makeToken(): string {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return Array.from(buf, b => b.toString(16).padStart(2, '0')).join('')
}

function inviteUrl(token: string): string {
  return `${window.location.origin}/tenant/register?token=${token}`
}

function inviteStatus(inv: TenantInvite): 'used' | 'expired' | 'active' {
  if (inv.used) return 'used'
  if (inv.expiresAt.toDate() < new Date()) return 'expired'
  return 'active'
}

export default function TenantPortalPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? null
  const { tenants, loading } = useTenants(pid)
  const [invites, setInvites] = useState<TenantInvite[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const active = tenants.filter(t => t.status === 'ACTIVE')

  const loadInvites = async () => {
    if (!pid) return
    const snap = await getDocs(query(tenantInvitesCol, where('propertyId', '==', pid)))
    setInvites(snap.docs.map(d => ({ ...d.data(), id: d.id })))
  }

  useEffect(() => { loadInvites() }, [pid]) // eslint-disable-line react-hooks/exhaustive-deps

  const getInviteForTenant = (tenantId: string) =>
    invites.filter(i => i.tenantId === tenantId).sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0]

  const generateInvite = async (tenant: Tenant) => {
    if (!pid || !user?.uid) return
    setBusy(tenant.tenantId)
    try {
      // Revoke any existing invites for this tenant
      const existing = invites.filter(i => i.tenantId === tenant.tenantId)
      await Promise.all(existing.map(i => deleteDoc(doc(db, 'tenantInvites', i.id))))

      const token = makeToken()
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
      const data: Omit<TenantInvite, 'id'> = {
        propertyId: pid,
        tenantId: tenant.tenantId,
        tenantName: tenant.fullName,
        unitNumber: tenant.unitNumber,
        token,
        expiresAt,
        used: false,
        usedAt: null,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
      }
      // Store with token as doc ID for O(1) lookup on registration side
      const ref = doc(db, 'tenantInvites', token)
      await setDoc(ref, { ...data, id: token })
      toast.success('Invite link generated')
      await loadInvites()
    } catch { toast.error('Failed to generate invite') }
    finally { setBusy(null) }
  }

  const revokeInvite = async (inv: TenantInvite) => {
    setBusy(inv.tenantId)
    try {
      await deleteDoc(doc(db, 'tenantInvites', inv.id))
      toast.success('Invite revoked')
      setInvites(prev => prev.filter(i => i.id !== inv.id))
    } catch { toast.error('Failed to revoke') }
    finally { setBusy(null) }
  }

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(inviteUrl(token))
    toast.success('Link copied to clipboard')
  }

  if (loading) return <PageLoader />

  const shown = search
    ? active.filter(t => t.fullName.toLowerCase().includes(search.toLowerCase()) || t.unitNumber.toLowerCase().includes(search.toLowerCase()))
    : active

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <Link2 className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="page-title">Tenant Portal Invites</h1>
            <p className="page-subtitle">Generate registration links for tenants to set up their portal access.</p>
          </div>
        </div>
      </div>

      <div className="card p-4 bg-blue-50 border-blue-100">
        <p className="text-sm text-blue-800">
          Each link is valid for <strong>7 days</strong> and can only be used once. Share it with the tenant directly — the link lets them register their own portal account.
        </p>
      </div>

      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name or unit…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {shown.length === 0 ? (
        <div className="empty-state"><p className="empty-state-title">No active tenants found</p></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Invite Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(tenant => {
                const inv = getInviteForTenant(tenant.tenantId)
                const status = inv ? inviteStatus(inv) : null
                const isBusy = busy === tenant.tenantId
                return (
                  <tr key={tenant.tenantId} className="group">
                    <td>
                      <p className="font-medium text-gray-900">{tenant.fullName}</p>
                      <p className="text-xs text-gray-400">{tenant.phoneNumber}</p>
                    </td>
                    <td>
                      <span className="badge badge-blue">{tenant.unitNumber}</span>
                    </td>
                    <td>
                      {!inv && <span className="badge badge-gray">No invite</span>}
                      {status === 'active' && (
                        <div className="space-y-0.5">
                          <span className="badge badge-green">Active</span>
                          <p className="text-xs text-gray-400">
                            Expires {formatDistanceToNow(inv!.expiresAt.toDate(), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                      {status === 'expired' && <span className="badge badge-yellow">Expired</span>}
                      {status === 'used' && (
                        <div className="space-y-0.5">
                          <span className="badge badge-gray">Used</span>
                          {inv?.usedAt && (
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(inv.usedAt.toDate(), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {status === 'active' && (
                          <button
                            className="btn-secondary py-1 px-2 text-xs"
                            onClick={() => copyLink(inv!.token)}
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </button>
                        )}
                        <button
                          className="btn-primary py-1 px-2 text-xs"
                          disabled={isBusy}
                          onClick={() => generateInvite(tenant)}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                          {inv ? 'Regenerate' : 'Generate'}
                        </button>
                        {inv && status !== 'used' && (
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity btn-danger py-1 px-2 text-xs"
                            disabled={isBusy}
                            onClick={() => revokeInvite(inv)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
