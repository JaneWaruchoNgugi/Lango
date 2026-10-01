import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, setDoc, doc, serverTimestamp, collection, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { CreditCard, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { UnitPayment, PaymentStatus, PaymentMethod } from '../../types'
import { useTenants } from '../../hooks/useTenants'

const schema = z.object({
  status:        z.enum(['PAID', 'PENDING', 'OVERDUE']),
  amount:        z.coerce.number().optional(),
  paymentMethod: z.enum(['CASH', 'MPESA', 'BANK', 'OTHER']).optional(),
  mpesaCode:     z.string().optional(),
  notes:         z.string().optional(),
})
type FormData = z.infer<typeof schema>

const STATUS_BADGE: Record<PaymentStatus, string> = {
  PAID:    'badge badge-green',
  PENDING: 'bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full',
  OVERDUE: 'bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full',
}

function monthKey(d: Date): string { return format(d, 'yyyy-MM') }
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return format(new Date(y, m - 1, 1), 'MMMM yyyy')
}
function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return monthKey(d)
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''
  const isPM = user?.role === 'PROPERTY_MANAGER'

  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()))
  const [payments, setPayments] = useState<UnitPayment[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showEdit, setShowEdit] = useState<string | null>(null) // unitNumber
  const [saving,   setSaving]   = useState(false)

  const { tenants } = useTenants(pid)

  const { register, handleSubmit, reset, watch } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PENDING' },
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'payments'), where('propertyId', '==', pid), where('month', '==', selectedMonth)))
      .then(snap => setPayments(snap.docs.map(d => ({ ...d.data(), id: d.id } as UnitPayment))))
      .catch(e => console.error('[Payments]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid, selectedMonth])

  // Build display rows: all active tenants + merge in any payment record
  const rows = useMemo(() => {
    const activeTenants = tenants.filter(t => t.status === 'ACTIVE')
    return activeTenants.map(t => {
      const pmt = payments.find(p => p.unitNumber === t.unitNumber)
      return { tenant: t, payment: pmt ?? null }
    }).sort((a, b) => a.tenant.unitNumber.localeCompare(b.tenant.unitNumber))
  }, [tenants, payments])

  const stats = useMemo(() => ({
    total:    rows.length,
    paid:     rows.filter(r => r.payment?.status === 'PAID').length,
    pending:  rows.filter(r => !r.payment || r.payment.status === 'PENDING').length,
    overdue:  rows.filter(r => r.payment?.status === 'OVERDUE').length,
  }), [rows])

  const openEdit = (unitNumber: string, existing: UnitPayment | null) => {
    reset({
      status:        existing?.status ?? 'PAID',
      amount:        existing?.amount ?? undefined,
      paymentMethod: existing?.paymentMethod ?? 'MPESA',
      mpesaCode:     existing?.mpesaCode ?? '',
      notes:         existing?.notes ?? '',
    })
    setShowEdit(unitNumber)
  }

  const onSubmit = async (data: FormData) => {
    if (!showEdit) return
    setSaving(true)
    const row = rows.find(r => r.tenant.unitNumber === showEdit)
    if (!row) { setSaving(false); return }

    try {
      const docId = `${pid}_${showEdit.replace(/\s/g, '_')}_${selectedMonth}`
      await setDoc(doc(collection(db, 'payments'), docId), {
        propertyId:    pid,
        unitNumber:    showEdit,
        tenantName:    row.tenant.fullName,
        month:         selectedMonth,
        status:        data.status,
        amount:        data.amount ?? null,
        paymentMethod: data.paymentMethod ?? null,
        mpesaCode:     data.mpesaCode || null,
        notes:         data.notes || null,
        paidAt:        data.status === 'PAID' ? Timestamp.now() : null,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
        recordedBy:    user?.uid ?? '',
      }, { merge: true })

      toast.success('Payment recorded')
      setShowEdit(null)
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const exportCsv = () => {
    const header = 'Unit,Tenant,Status,Amount,Method,M-Pesa Code,Notes'
    const csv = rows.map(r =>
      [r.tenant.unitNumber, r.tenant.fullName, r.payment?.status ?? 'PENDING',
       r.payment?.amount ?? '', r.payment?.paymentMethod ?? '', r.payment?.mpesaCode ?? '', r.payment?.notes ?? ''].join(',')
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[header, ...csv].join('\n')], { type: 'text/csv' }))
    a.download = `payments-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const watchMethod = watch('status')

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isPM ? 'Financials' : 'Payments'}</h1>
            <p className="text-sm text-gray-500">Rent payment tracker</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Month selector */}
          <div className="flex items-center gap-1 card px-3 py-2">
            <button onClick={() => setSelectedMonth(m => addMonths(m, -1))} className="text-gray-400 hover:text-gray-700">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-[110px] text-center">{monthLabel(selectedMonth)}</span>
            <button onClick={() => setSelectedMonth(m => addMonths(m, 1))} className="text-gray-400 hover:text-gray-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button onClick={exportCsv} className="btn-secondary gap-2">
            <Download className="w-4 h-4" /> CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Units',   value: stats.total,   color: 'text-gray-700' },
          { label: 'Paid',          value: stats.paid,    color: 'text-green-600' },
          { label: 'Pending',       value: stats.pending, color: 'text-yellow-600' },
          { label: 'Overdue',       value: stats.overdue, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Tenant</th>
                <th>Status</th>
                <th>Amount (KES)</th>
                <th>Method</th>
                <th>M-Pesa Code</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tenant, payment }) => (
                <tr key={tenant.tenantId} className={payment?.status === 'OVERDUE' ? 'bg-red-50/40' : ''}>
                  <td className="font-medium text-gray-900">{tenant.unitNumber}</td>
                  <td className="text-gray-600">{tenant.fullName}</td>
                  <td>
                    <span className={STATUS_BADGE[payment?.status ?? 'PENDING']}>
                      {payment?.status ?? 'PENDING'}
                    </span>
                  </td>
                  <td className="text-gray-600">{payment?.amount ? payment.amount.toLocaleString() : '—'}</td>
                  <td className="text-gray-500">{payment?.paymentMethod ?? '—'}</td>
                  <td className="text-gray-500 font-mono text-xs">{payment?.mpesaCode ?? '—'}</td>
                  <td>
                    <button onClick={() => openEdit(tenant.unitNumber, payment ?? null)} className="btn-secondary text-xs px-2.5 py-1">
                      {payment ? 'Edit' : 'Record'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!showEdit} onClose={() => setShowEdit(null)} title={`Record Payment — Unit ${showEdit}`} size="sm"
        footer={
          <>
            <button onClick={() => setShowEdit(null)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="pmtForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Save
            </button>
          </>
        }
      >
        <form id="pmtForm" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Status *</label>
            <select {...register('status')} className="input">
              <option value="PAID">PAID</option>
              <option value="PENDING">PENDING</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          </div>
          {watchMethod === 'PAID' && (
            <>
              <div>
                <label className="label">Amount (KES)</label>
                <input type="number" {...register('amount')} className="input" placeholder="e.g. 18000" />
              </div>
              <div>
                <label className="label">Payment Method</label>
                <select {...register('paymentMethod')} className="input">
                  {(['CASH','MPESA','BANK','OTHER'] as PaymentMethod[]).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">M-Pesa Code</label>
                <input {...register('mpesaCode')} className="input font-mono" placeholder="e.g. QGX3Y8ABCD" />
              </div>
            </>
          )}
          <div>
            <label className="label">Notes</label>
            <input {...register('notes')} className="input" placeholder="Optional notes" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
