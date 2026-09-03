import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  collection, query, where, getDocs, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp, addDoc, Timestamp,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import {
  UserPlus, Package, Users, AlertTriangle, Clock, LogIn, LogOut,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Visitor, Shift } from '../../types'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export default function GateDashboard() {
  const { user }                = useAuth()
  const [visitors, setVisitors]   = useState<Visitor[]>([])
  const [shift, setShift]         = useState<Shift | null>(null)
  const [todayCount, setTodayCount] = useState(0)
  const [loading, setLoading]     = useState(true)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [shiftLoading, setShiftLoading] = useState(false)
  const [confirmCheckout, setConfirmCheckout] = useState<Visitor | null>(null)

  const propertyId = user?.propertyId
  const guardId    = user?.uid

  // Real-time listener for current visitors
  useEffect(() => {
    if (!propertyId) return
    const q = query(
      collection(db, 'visitors'),
      where('propertyId', '==', propertyId),
      where('status', '==', 'INSIDE'),
      orderBy('checkInTime', 'desc')
    )
    const unsub = onSnapshot(q, snap => {
      setVisitors(snap.docs.map(d => d.data() as Visitor))
      setLoading(false)
    }, err => {
      console.error(err)
      setLoading(false)
    })
    return unsub
  }, [propertyId])

  // Today's count
  useEffect(() => {
    if (!propertyId) return
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)
    getDocs(query(
      collection(db, 'visitors'),
      where('propertyId', '==', propertyId),
      where('checkInTime', '>=', Timestamp.fromDate(todayStart))
    )).then(snap => setTodayCount(snap.size)).catch(console.error)
  }, [propertyId])

  // Active shift
  useEffect(() => {
    if (!guardId || !propertyId) return
    getDocs(query(
      collection(db, 'shifts'),
      where('guardId', '==', guardId),
      where('status', '==', 'ACTIVE'),
    )).then(snap => {
      if (!snap.empty) setShift(snap.docs[0].data() as Shift)
    }).catch(console.error)
  }, [guardId, propertyId])

  const startShift = async () => {
    setShiftLoading(true)
    try {
      const ref = await addDoc(collection(db, 'shifts'), {
        shiftId: '', guardId, guardName: user?.profile?.name ?? 'Guard',
        propertyId, status: 'ACTIVE',
        startTime: serverTimestamp(), endTime: null,
        visitorsRegistered: 0, deliveriesRegistered: 0, incidentsReported: 0,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      await updateDoc(ref, { shiftId: ref.id })
      const snap = await getDocs(query(collection(db, 'shifts'), where('guardId', '==', guardId), where('status', '==', 'ACTIVE')))
      if (!snap.empty) setShift(snap.docs[0].data() as Shift)
      toast.success('Shift started')
    } catch { toast.error('Failed to start shift') }
    finally { setShiftLoading(false) }
  }

  const endShift = async () => {
    if (!shift) return
    setShiftLoading(true)
    try {
      await updateDoc(doc(db, 'shifts', shift.shiftId), {
        status: 'ENDED', endTime: serverTimestamp(), updatedAt: serverTimestamp(),
      })
      setShift(null)
      toast.success('Shift ended')
    } catch { toast.error('Failed to end shift') }
    finally { setShiftLoading(false) }
  }

  const checkOut = async (visitor: Visitor) => {
    setCheckingOut(visitor.visitorId)
    try {
      const now       = new Date()
      const checkIn   = visitor.checkInTime.toDate()
      const duration  = Math.round((now.getTime() - checkIn.getTime()) / 60000)
      await updateDoc(doc(db, 'visitors', visitor.visitorId), {
        status: 'CHECKED_OUT',
        checkOutTime: serverTimestamp(),
        durationMinutes: duration,
        updatedAt: serverTimestamp(),
      })
      toast.success(`${visitor.visitorName} checked out`)
    } catch { toast.error('Checkout failed') }
    finally { setCheckingOut(null); setConfirmCheckout(null) }
  }

  if (loading) return <PageLoader />

  const now = new Date()

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Time & property */}
      <div className="text-center">
        <p className="text-3xl font-bold text-gray-900 tabular-nums">{format(now, 'HH:mm')}</p>
        <p className="text-sm text-gray-500">{format(now, 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Shift banner */}
      <div className={`rounded-xl p-4 flex items-center justify-between ${
        shift ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${shift ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {shift ? 'On Shift' : 'Not on Shift'}
            </p>
            {shift && (
              <p className="text-xs text-gray-500">
                Started {format(shift.startTime.toDate(), 'h:mm a')}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={shift ? endShift : startShift}
          disabled={shiftLoading}
          className={shift ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
        >
          {shiftLoading ? '...' : shift ? (
            <><LogOut className="w-3.5 h-3.5" /> End Shift</>
          ) : (
            <><LogIn className="w-3.5 h-3.5" /> Start Shift</>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{todayCount}</p>
          <p className="text-xs text-gray-500 mt-1">Visitors Today</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-bold text-lango-primary">{visitors.length}</p>
          <p className="text-xs text-gray-500 mt-1">Currently Inside</p>
        </div>
      </div>

      {/* Action buttons - large, touch-friendly */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/gate/register-visitor"
          className="flex flex-col items-center gap-2 p-5 bg-lango-primary text-white rounded-2xl hover:bg-lango-secondary transition-colors active:scale-95"
        >
          <UserPlus className="w-7 h-7" />
          <span className="text-sm font-semibold">Register Visitor</span>
        </Link>
        <Link
          to="/gate/register-delivery"
          className="flex flex-col items-center gap-2 p-5 bg-white border-2 border-lango-primary text-lango-primary rounded-2xl hover:bg-lango-light transition-colors active:scale-95"
        >
          <Package className="w-7 h-7" />
          <span className="text-sm font-semibold">Register Delivery</span>
        </Link>
        <Link
          to="/gate/current-visitors"
          className="flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors active:scale-95"
        >
          <Users className="w-6 h-6" />
          <span className="text-sm font-semibold">Current Visitors</span>
        </Link>
        <Link
          to="/gate/incidents/new"
          className="flex flex-col items-center gap-2 p-5 bg-white border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors active:scale-95"
        >
          <AlertTriangle className="w-6 h-6" />
          <span className="text-sm font-semibold">Report Incident</span>
        </Link>
      </div>

      {/* Currently inside - quick view */}
      {visitors.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="text-sm font-semibold text-gray-900">Currently Inside</h3>
            <Link to="/gate/current-visitors" className="text-xs text-lango-primary">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {visitors.slice(0, 5).map(v => {
              const duration = Math.round((Date.now() - v.checkInTime.toDate().getTime()) / 60000)
              const hrs = Math.floor(duration / 60)
              const mins = duration % 60
              return (
                <div key={v.visitorId} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.visitorName}</p>
                    <p className="text-xs text-gray-500">
                      {v.unitNumber} · {hrs > 0 ? `${hrs}h ` : ''}{mins}m ago
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmCheckout(v)}
                    disabled={checkingOut === v.visitorId}
                    className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"
                  >
                    <Clock className="w-3 h-3" />
                    Check Out
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {visitors.length === 0 && (
        <EmptyState
          icon={Users}
          title="No visitors inside"
          description="Register a visitor using the button above."
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmCheckout}
        onClose={() => setConfirmCheckout(null)}
        onConfirm={() => confirmCheckout && checkOut(confirmCheckout)}
        title="Check Out Visitor"
        message={`Check out ${confirmCheckout?.visitorName}?`}
        confirmLabel="Check Out"
        loading={!!checkingOut}
      />
    </div>
  )
}
