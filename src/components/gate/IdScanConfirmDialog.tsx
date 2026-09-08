import { useEffect, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Spinner } from '../ui/LoadingScreen'
import { recognizeIdCard, type DocType } from '../../services/idOcr'

interface Props {
  /** When non-null, the dialog is open and this blob is scanned. */
  photo: Blob | null
  onConfirm: (fields: { name?: string; idNumber?: string }) => void
  onClose: () => void
}

const DOC_LABEL: Partial<Record<DocType, string>> = { national_id: 'National ID', passport: 'Passport' }

export function IdScanConfirmDialog({ photo, onConfirm, onClose }: Props) {
  const [scanning, setScanning] = useState(false)
  const [name, setName] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [docType, setDocType] = useState<DocType>('unknown')
  const [detected, setDetected] = useState(false)

  useEffect(() => {
    if (!photo) return
    let cancelled = false
    setScanning(true)
    setName(''); setIdNumber(''); setDocType('unknown'); setDetected(false)
    recognizeIdCard(photo).then(res => {
      if (cancelled) return
      setName(res.name ?? '')
      setIdNumber(res.idNumber ?? '')
      setDocType(res.docType)
      setDetected(Boolean(res.name || res.idNumber))
      setScanning(false)
    })
    return () => { cancelled = true }
  }, [photo])

  if (!photo) return null

  return (
    <Modal
      isOpen={!!photo}
      onClose={onClose}
      title="Scan ID / Passport"
      size="sm"
      footer={scanning ? undefined : (
        <>
          <button className="btn-secondary" onClick={onClose}>Skip</button>
          <button
            className="btn-primary"
            onClick={() => onConfirm({ name: name || undefined, idNumber: idNumber || undefined })}
          >
            Use these details
          </button>
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
          {detected ? (
            DOC_LABEL[docType] && (
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-lango-primary/10 text-lango-primary">
                {DOC_LABEL[docType]}
              </span>
            )
          ) : (
            <p className="text-sm text-amber-600">Couldn't read the document — enter details manually.</p>
          )}
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">ID / Passport Number</label>
            <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
          </div>
        </div>
      )}
    </Modal>
  )
}
