import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { deleteBlockCascade } from '../../services/blockService'
import type { Block, Unit, AppUser } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  block: Block | null
  units: Unit[]   // all property units; filtered to this block for the preview
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  onClose: () => void
  onDeleted: () => void
}

export function DeleteBlockDialog({ block, units, actor, onClose, onDeleted }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)
  if (!block) return null

  const blockUnits = units.filter((u) => u.blockId === block.blockId)
  const occupied = blockUnits.filter((u) => u.status === 'OCCUPIED').length
  const canDelete = occupied === 0 && confirmText.trim() === block.name

  async function submit() {
    if (!block) return
    setBusy(true)
    try {
      const n = await deleteBlockCascade(block, actor)
      toast.success(`${block.name} and ${n} unit${n === 1 ? '' : 's'} deleted`)
      onDeleted()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete block')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      isOpen={!!block}
      onClose={onClose}
      title={`Delete ${block.name}`}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-danger" onClick={submit} disabled={!canDelete || busy}>
            {busy ? 'Deleting…' : 'Delete Block'}
          </button>
        </>
      }
    >
      {occupied > 0 ? (
        <p className="text-sm text-red-600">
          {block.name} has {occupied} occupied unit{occupied === 1 ? '' : 's'}. Move those tenants out before deleting.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This will permanently delete <span className="font-semibold">{block.name}</span> and its{' '}
            <span className="font-semibold">{blockUnits.length} unit{blockUnits.length === 1 ? '' : 's'}</span>. This cannot be undone.
          </p>
          <div>
            <label className="label">Type the block name to confirm</label>
            <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={block.name} />
          </div>
        </div>
      )}
    </Modal>
  )
}
