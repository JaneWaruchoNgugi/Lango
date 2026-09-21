import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/LoadingScreen'
import { recognizeIdCard, type IdScanResult, type DocType } from '../../services/idOcr'

interface Props {
  /** When non-null, the dialog is open and this blob is scanned. */
  photo: Blob | null
  onConfirm: (result: IdScanResult) => void
  onClose: () => void
  /** Injectable scanner for demo/test usage — defaults to the real Cloud Function call. */
  scanner?: (blob: Blob) => Promise<IdScanResult>
}

const DOC_LABEL: Partial<Record<DocType, string>> = {
  national_id: 'National ID',
  passport: 'Passport',
  driver_license: "Driver's License",
}

function ConfidenceBadge({ score }: { score: number | undefined }) {
  if (score === undefined || score === 0) return null
  if (score >= 0.9) return <span className="badge badge-green ml-1.5 text-xs">High</span>
  if (score >= 0.7) return <span className="badge badge-yellow ml-1.5 text-xs">Medium</span>
  return <span className="badge badge-red ml-1.5 text-xs">Low</span>
}

function EditableField({
  label, value, onChange, confidence,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  confidence?: number
}) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        {label}
        <ConfidenceBadge score={confidence} />
      </label>
      <input className="input" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function ReadOnlyField({
  label, value, confidence,
}: {
  label: string
  value: string | undefined
  confidence?: number
}) {
  if (!value) return null
  return (
    <div>
      <label className="label flex items-center gap-1">
        {label}
        <ConfidenceBadge score={confidence} />
      </label>
      <div className="input bg-gray-50 text-gray-500 cursor-default select-text">{value}</div>
    </div>
  )
}

export function IdScanConfirmDialog({ photo, onConfirm, onClose, scanner }: Props) {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<IdScanResult | null>(null)
  // Editable mirror — only for fields the guard should be able to correct.
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [nationality, setNationality] = useState('')

  useEffect(() => {
    if (!photo) return
    let cancelled = false
    setScanning(true)
    setResult(null)
    setName('')
    setIdNumber('')
    setNationality('')

    const scan = scanner ?? recognizeIdCard
    scan(photo).then(res => {
      if (cancelled) return
      setResult(res)
      setName(res.name ?? '')
      setIdNumber(res.idNumber ?? '')
      setNationality(res.nationality ?? '')
      setScanning(false)
    })
    return () => { cancelled = true }
  }, [photo, scanner])

  if (!photo) return null

  const detected = Boolean(result && (result.name || result.idNumber))
  const fc = result?.fieldConfidence
  const docLabel = result ? DOC_LABEL[result.docType] : undefined
  const title = docLabel ? `Scan ${docLabel}` : 'Scan ID / Passport'

  function handleConfirm() {
    onConfirm({
      ...(result ?? { docType: 'unknown' }),
      name: name || undefined,
      idNumber: idNumber || undefined,
      nationality: nationality || undefined,
    })
  }

  return (
    <Modal
      isOpen={!!photo}
      onClose={onClose}
      title={title}
      size="md"
      footer={scanning ? undefined : (
        <>
          <button className="btn-secondary" onClick={onClose}>Skip</button>
          <button className="btn-primary" onClick={handleConfirm}>Use these details</button>
        </>
      )}
    >
      {scanning ? (
        <div className="py-8 flex flex-col items-center gap-3 text-gray-600">
          <Spinner size="md" />
          <p className="text-sm">Reading document…</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Status */}
          {detected ? (
            docLabel && (
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-lango-primary/10 text-lango-primary">
                {docLabel}
              </span>
            )
          ) : (
            <p className="text-sm text-amber-600">
              Couldn't read the document — enter details manually.
            </p>
          )}

          {/* Warnings */}
          {(result?.warnings?.length ?? 0) > 0 && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <ul className="text-xs text-yellow-800 space-y-0.5">
                {result!.warnings!.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {/* Editable fields — guard can correct these */}
          <EditableField
            label="Full Name"
            value={name}
            onChange={setName}
            confidence={fc?.name}
          />
          <EditableField
            label="ID / Passport Number"
            value={idNumber}
            onChange={setIdNumber}
            confidence={fc?.idNumber}
          />
          <EditableField
            label="Nationality"
            value={nationality}
            onChange={setNationality}
            confidence={fc?.nationality}
          />

          {/* Read-only reference fields — displayed for manual verification only */}
          <ReadOnlyField label="Date of Birth" value={result?.dateOfBirth} confidence={fc?.dateOfBirth} />
          <ReadOnlyField label="Sex" value={result?.sex} confidence={fc?.sex} />
          <ReadOnlyField label="Expiry Date" value={result?.expiryDate} confidence={fc?.expiryDate} />
          <ReadOnlyField label="Issue Date" value={result?.issueDate} confidence={fc?.issueDate} />
          <ReadOnlyField label="Address" value={result?.address} confidence={fc?.address} />
        </div>
      )}
    </Modal>
  )
}
