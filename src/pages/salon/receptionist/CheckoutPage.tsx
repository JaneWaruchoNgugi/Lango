import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useAuth } from '../../../contexts/AuthContext'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ShoppingBag, CheckCircle, Search, Pencil, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { format, startOfDay } from 'date-fns'
import type { SalonClient, SalonService, SalonClientPricing, SalonCheckout, SalonPaymentMethod } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

interface ClientBundle {
  client: SalonClient
  services: SalonService[]
  pricing: SalonClientPricing | null
}

export default function CheckoutPage() {
  const { salonId }    = useParams<{ salonId: string }>()
  const [searchParams] = useSearchParams()
  const preselect      = searchParams.get('client')
  const { user }       = useAuth()

  const [activeClients, setActiveClients] = useState<SalonClient[]>([])
  const [search, setSearch]               = useState('')
  const [selected, setSelected]           = useState<ClientBundle | null>(null)
  const [loading, setLoading]             = useState(true)
  const [loadingClient, setLoadingClient] = useState(false)
  const [saving, setSaving]               = useState(false)

  const [paymentMethod, setPaymentMethod]       = useState<SalonPaymentMethod>('MPESA')
  const [mpesaCode, setMpesaCode]               = useState('')
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [hasComplaint, setHasComplaint]         = useState(false)
  const [complaintText, setComplaintText]       = useState('')
  const [satisfied, setSatisfied]               = useState<boolean | null>(null)

  const [editingPrices, setEditingPrices] = useState(false)
  const [draftPrices, setDraftPrices]     = useState<Record<string, string>>({})
  const [savingPrices, setSavingPrices]   = useState(false)

  const [history, setHistory]               = useState<SalonCheckout[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const fetchActiveClients = async (): Promise<SalonClient[]> => {
    if (!salonId) return []
    const snap = await getDocs(query(
      collection(db, 'salonClients'),
      where('salonId', '==', salonId),
      where('status', '==', 'ACTIVE'),
    ))
    return snap.docs.map(d => d.data() as SalonClient).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
  }

  const fetchHistory = async () => {
    if (!salonId) return
    try {
      const todayStart = Timestamp.fromDate(startOfDay(new Date()))
      const snap = await getDocs(query(
        collection(db, 'salonCheckouts'),
        where('salonId', '==', salonId),
        where('checkoutAt', '>=', todayStart),
        orderBy('checkoutAt', 'desc'),
      ))
      setHistory(snap.docs.map(d => d.data() as SalonCheckout))
    } catch (err) {
      console.error('[CheckoutHistory]', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (!salonId) return
    fetchActiveClients()
      .then(list => {
        setActiveClients(list)
        if (preselect) {
          const c = list.find(x => x.clientId === preselect)
          if (c) loadClient(c)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
    fetchHistory()
  }, [salonId, preselect])

  const loadClient = async (client: SalonClient) => {
    setLoadingClient(true)
    setEditingPrices(false)
    setDraftPrices({})
    try {
      const [servSnap, pricingSnap] = await Promise.all([
        getDocs(query(collection(db, 'salonServices'), where('salonId', '==', salonId), where('clientId', '==', client.clientId))),
        getDoc(doc(db, 'salonClientPricing', client.clientId)),
      ])
      const services = servSnap.docs.map(d => d.data() as SalonService)
      const pricing  = pricingSnap.exists() ? (pricingSnap.data() as SalonClientPricing) : null
      setSelected({ client, services, pricing })
      setPaymentMethod('MPESA'); setMpesaCode(''); setPaymentConfirmed(false)
      setHasComplaint(false); setComplaintText(''); setSatisfied(null)
    } catch (err) {
      console.error(err); toast.error('Could not load client data')
    } finally {
      setLoadingClient(false)
    }
  }

  const startEditPrices = () => {
    if (!selected?.pricing) return
    const draft: Record<string, string> = {}
    selected.pricing.servicesPricing.forEach(sp => { draft[sp.serviceId] = String(sp.price) })
    setDraftPrices(draft)
    setEditingPrices(true)
  }

  const handleSavePrices = async () => {
    if (!selected?.pricing) return
    setSavingPrices(true)
    try {
      const updated = selected.pricing.servicesPricing.map(sp => ({
        ...sp, price: Number(draftPrices[sp.serviceId] ?? sp.price),
      }))
      const newTotal = updated.reduce((s, sp) => s + sp.price, 0)
      await updateDoc(doc(db, 'salonClientPricing', selected.client.clientId), {
        servicesPricing: updated, totalAmount: newTotal, updatedAt: serverTimestamp(),
      })
      setSelected(prev => prev && prev.pricing
        ? { ...prev, pricing: { ...prev.pricing, servicesPricing: updated, totalAmount: newTotal } }
        : prev)
      setEditingPrices(false)
      toast.success('Prices updated')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update prices')
    } finally {
      setSavingPrices(false)
    }
  }

  const handleCheckout = async () => {
    if (!selected || !salonId || !user) return
    if (paymentMethod === 'MPESA' && !mpesaCode.trim()) {
      toast.error('Enter the M-Pesa transaction code'); return
    }
    if (paymentMethod !== 'MPESA' && !paymentConfirmed) {
      toast.error('Confirm that payment has been received'); return
    }
    if (satisfied === null) { toast.error('Record client satisfaction'); return }

    setSaving(true)
    try {
      const { client, services, pricing } = selected
      const batch       = writeBatch(db)
      const now         = serverTimestamp() as Timestamp
      const checkoutAt  = Timestamp.now()
      const checkoutRef = doc(collection(db, 'salonCheckouts'))
      const checkoutId  = checkoutRef.id

      const servicesSnapshot: SalonCheckout['servicesSnapshot'] = services.map(s => {
        const priceEntry = pricing?.servicesPricing.find(p => p.serviceId === s.serviceId)
        return {
          serviceId:    s.serviceId,
          serviceType:  s.serviceType,
          providerId:   s.providerId,
          providerName: s.providerName,
          providerCode: s.providerCode,
          price: priceEntry?.price ?? 0,
        }
      })

      batch.set(checkoutRef, {
        checkoutId, salonId,
        clientId: client.clientId, clientName: client.name,
        packageId: client.packageId ?? null,
        servicesSnapshot,
        totalAmount: pricing?.totalAmount ?? 0,
        paymentMethod,
        mpesaCode: paymentMethod === 'MPESA' ? mpesaCode.trim() : null,
        paymentConfirmed: paymentMethod !== 'MPESA' ? paymentConfirmed : true,
        hasComplaint, complaintText: hasComplaint ? complaintText.trim() : null,
        satisfied,
        receptionistId: user.uid,
        receptionistName: user.profile?.name ?? 'Receptionist',
        checkoutAt, createdAt: now,
      })
      batch.update(doc(db, 'salonClients', client.clientId), { status: 'CHECKED_OUT', checkoutId, updatedAt: now })
      services.forEach(s => batch.update(doc(db, 'salonServices', s.serviceId), { status: 'COMPLETED', updatedAt: now }))

      await batch.commit()
      toast.success('Checkout complete!')
      setSelected(null)
      const [list] = await Promise.all([fetchActiveClients(), fetchHistory()])
      setActiveClients(list)
    } catch (err: any) {
      console.error(err); toast.error(err?.message ?? 'Checkout failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  const draftTotal = Object.values(draftPrices).reduce((s, v) => s + (Number(v) || 0), 0)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Checkout</h1>
        <p className="page-subtitle">Select a client to check out</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Active clients list */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-1">Active Clients ({activeClients.length})</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name or phone..." className="input pl-8 text-sm py-1.5" />
            </div>
          </div>
          {activeClients.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No active clients" description="All clients have been checked out." />
          ) : (() => {
            const q        = search.trim().toLowerCase()
            const filtered = q ? activeClients.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q)) : activeClients
            return filtered.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">No clients match "{search}"</p>
            ) : (
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {filtered.map(c => (
                  <button key={c.clientId} onClick={() => loadClient(c)}
                    className={`w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors ${selected?.client.clientId === c.clientId ? 'bg-lango-light' : ''}`}>
                    <p className="text-sm font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone} · {format(c.createdAt.toDate(), 'h:mm a')}</p>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Checkout form */}
        {loadingClient ? (
          <div className="card p-8 flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-lango-primary border-t-transparent rounded-full" />
          </div>
        ) : selected ? (
          <div className="card space-y-0">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">{selected.client.name}</h3>
              <p className="text-xs text-gray-500">{selected.client.phone}</p>
            </div>

            {/* Services summary */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</p>
                {selected.pricing && !editingPrices && (
                  <button onClick={startEditPrices} className="flex items-center gap-1 text-xs text-lango-primary hover:underline">
                    <Pencil className="w-3 h-3" /> Edit prices
                  </button>
                )}
                {editingPrices && (
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditingPrices(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                    <button onClick={handleSavePrices} disabled={savingPrices}
                      className="text-xs text-lango-primary font-semibold hover:underline">
                      {savingPrices ? 'Saving...' : 'Save prices'}
                    </button>
                  </div>
                )}
              </div>
              {selected.services.map(s => {
                const price = selected.pricing?.servicesPricing.find(p => p.serviceId === s.serviceId)?.price ?? 0
                return (
                  <div key={s.serviceId} className="flex justify-between text-sm items-center gap-3">
                    <div className="min-w-0">
                      <span className="font-medium">{SALON_SERVICE_LABELS[s.serviceType]}</span>
                      {s.serviceName && <span className="text-gray-400 text-xs ml-1">({s.serviceName})</span>}
                      <span className="text-gray-400 text-xs ml-2">· {s.providerName} ({s.providerCode})</span>
                    </div>
                    {editingPrices ? (
                      <input type="number" min="0"
                        value={draftPrices[s.serviceId] ?? ''}
                        onChange={e => setDraftPrices(prev => ({ ...prev, [s.serviceId]: e.target.value }))}
                        className="input w-24 text-sm py-1 text-right shrink-0" />
                    ) : (
                      <span className="font-medium shrink-0">KES {price.toLocaleString()}</span>
                    )}
                  </div>
                )
              })}
              <div className="pt-2 border-t border-gray-100 flex justify-between font-semibold text-sm">
                <span>Total</span>
                <span>KES {(editingPrices ? draftTotal : (selected.pricing?.totalAmount ?? 0)).toLocaleString()}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
              <div className="flex gap-2">
                {(['MPESA', 'CASH', 'OTHER'] as SalonPaymentMethod[]).map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${paymentMethod === m ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>
                    {m}
                  </button>
                ))}
              </div>
              {paymentMethod === 'MPESA' ? (
                <div>
                  <label className="label">M-Pesa Transaction Code</label>
                  <input value={mpesaCode} onChange={e => setMpesaCode(e.target.value.toUpperCase())}
                    className="input font-mono" placeholder="e.g. QGH4K8PTYW" />
                </div>
              ) : (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={paymentConfirmed} onChange={e => setPaymentConfirmed(e.target.checked)} className="rounded" />
                  Payment confirmed / received
                </label>
              )}
            </div>

            {/* Feedback */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Feedback</p>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={hasComplaint} onChange={e => setHasComplaint(e.target.checked)} className="rounded" />
                Client has a complaint or issue
              </label>
              {hasComplaint && (
                <textarea value={complaintText} onChange={e => setComplaintText(e.target.value)}
                  className="input" rows={2} placeholder="Describe the issue..." />
              )}
              <div>
                <p className="text-xs text-gray-500 mb-2">Was the client satisfied?</p>
                <div className="flex gap-2">
                  {[true, false].map(val => (
                    <button key={String(val)} onClick={() => setSatisfied(val)}
                      className={`text-xs px-4 py-2 rounded-lg border ${satisfied === val ? (val ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500') : 'border-gray-200 text-gray-600'}`}>
                      {val ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-5 py-4">
              <button onClick={handleCheckout} disabled={saving || editingPrices} className="btn-primary w-full">
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Processing...' : 'Complete Checkout'}
              </button>
              {editingPrices && (
                <p className="text-xs text-center text-amber-600 mt-2">Save or cancel price edits before checking out</p>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-8 flex items-center justify-center text-gray-400 text-sm">
            Select a client to checkout
          </div>
        )}
      </div>

      {/* Today's checkout history */}
      {!loadingHistory && history.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Today's Checkouts ({history.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map(co => (
              <div key={co.checkoutId} className="px-5 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{co.clientName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {co.servicesSnapshot.map(s => `${SALON_SERVICE_LABELS[s.serviceType]} · ${s.providerName}`).join('  ·  ')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-gray-900">KES {co.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">
                      {co.paymentMethod}{co.mpesaCode ? ` · ${co.mpesaCode}` : ''}
                    </p>
                    <p className="text-xs text-gray-400">{format(co.checkoutAt.toDate(), 'h:mm a')}</p>
                  </div>
                </div>
                {co.hasComplaint && (
                  <p className="text-xs text-red-500 mt-1">⚠ {co.complaintText}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
