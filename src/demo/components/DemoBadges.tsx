import type { DemoDeliveryStatus, DemoIncidentStatus } from '../data/types'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'gray' | 'blue' | 'orange'

function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return <span className={`badge badge-${variant}`}>{label}</span>
}

export function DemoDeliveryBadge({ status }: { status: DemoDeliveryStatus }) {
  const map: Record<DemoDeliveryStatus, { variant: BadgeVariant; label: string }> = {
    EXPECTED:  { variant: 'gray',   label: 'Expected' },
    RECEIVED:  { variant: 'blue',   label: 'Received' },
    COLLECTED: { variant: 'green',  label: 'Collected' },
    HELD:      { variant: 'yellow', label: 'Held' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function DemoIncidentBadge({ status }: { status: DemoIncidentStatus }) {
  const map: Record<DemoIncidentStatus, { variant: BadgeVariant; label: string }> = {
    OPEN:          { variant: 'red',    label: 'Open' },
    INVESTIGATING: { variant: 'yellow', label: 'Investigating' },
    RESOLVED:      { variant: 'green',  label: 'Resolved' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}
