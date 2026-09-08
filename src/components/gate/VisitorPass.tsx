import { QRCodeSVG } from 'qrcode.react'
import { Building2, Clock, Home, Car } from 'lucide-react'

interface Props {
  passId: string
  propertyName: string
  visitorName: string
  subtitle: string
  validUntil: string
  visiting?: string
  vehicle?: string
  qrValue: string
}

/** The QR access pass a registered visitor presents at the gate. */
export function VisitorPass({ passId, propertyName, visitorName, subtitle, validUntil, visiting, vehicle, qrValue }: Props) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-lango-dark text-white px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{propertyName}</p>
          <p className="text-xs text-white/60">Visitor Pass</p>
        </div>
        <p className="text-xs text-white/60 shrink-0">ID: {passId}</p>
      </div>

      <div className="px-6 py-6 text-center">
        <h3 className="text-xl font-bold text-gray-900">{visitorName}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        <div className="flex justify-center my-6">
          <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-card">
            <QRCodeSVG value={qrValue} size={180} level="M" />
          </div>
        </div>
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" /> Valid until <span className="font-medium text-gray-700">{validUntil}</span>
        </div>
      </div>

      {(visiting || vehicle) && (
        <div className="bg-lango-light/70 px-6 py-4 space-y-2 text-sm">
          {visiting && (
            <div className="flex items-center gap-2 text-gray-600">
              <Home className="w-4 h-4 text-lango-primary" /> Visiting <span className="font-medium text-gray-900">{visiting}</span>
            </div>
          )}
          {vehicle && (
            <div className="flex items-center gap-2 text-gray-600">
              <Car className="w-4 h-4 text-lango-primary" /> Vehicle <span className="font-medium text-gray-900">{vehicle}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-lango-dark text-center text-xs text-white/70 py-3">Please present this pass at the gate</div>
    </div>
  )
}
