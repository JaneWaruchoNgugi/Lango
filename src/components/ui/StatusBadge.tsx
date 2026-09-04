import type {
  PropertyStatus,
  UnitStatus,
  TenantStatus,
  VisitorStatus,
  VisitType,
  DeliveryStatus,
  IncidentSeverity,
  StaffStatus,
  SubscriptionStatus,
  ShiftStatus,
} from '../../types'

type BadgeVariant = 'green' | 'red' | 'yellow' | 'gray' | 'blue' | 'orange'

function Badge({ variant, label }: { variant: BadgeVariant; label: string }) {
  return <span className={`badge badge-${variant}`}>{label}</span>
}

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  const map: Record<PropertyStatus, { variant: BadgeVariant; label: string }> = {
    ACTIVE:    { variant: 'green',  label: 'Active' },
    TRIAL:     { variant: 'blue',   label: 'Trial' },
    SUSPENDED: { variant: 'red',    label: 'Suspended' },
    ARCHIVED:  { variant: 'gray',   label: 'Archived' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  const map: Record<UnitStatus, { variant: BadgeVariant; label: string }> = {
    OCCUPIED:    { variant: 'green',  label: 'Occupied' },
    VACANT:      { variant: 'gray',   label: 'Vacant' },
    RESERVED:    { variant: 'blue',   label: 'Reserved' },
    MAINTENANCE: { variant: 'yellow', label: 'Maintenance' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function TenantStatusBadge({ status }: { status: TenantStatus }) {
  const map: Record<TenantStatus, { variant: BadgeVariant; label: string }> = {
    ACTIVE:    { variant: 'green', label: 'Active' },
    MOVED_OUT: { variant: 'gray',  label: 'Moved Out' },
    INACTIVE:  { variant: 'red',   label: 'Inactive' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function VisitorStatusBadge({ status }: { status: VisitorStatus }) {
  const map: Record<VisitorStatus, { variant: BadgeVariant; label: string }> = {
    INSIDE:       { variant: 'green',  label: 'Inside' },
    CHECKED_OUT:  { variant: 'gray',   label: 'Checked Out' },
    DENIED:       { variant: 'red',    label: 'Denied' },
    CANCELLED:    { variant: 'yellow', label: 'Cancelled' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function VisitTypeBadge({ type }: { type: VisitType }) {
  const map: Record<VisitType, { variant: BadgeVariant; label: string }> = {
    FRIENDLY_VISIT:   { variant: 'blue',   label: 'Friendly Visit' },
    WORK:             { variant: 'yellow', label: 'Work' },
    DELIVERY:         { variant: 'orange', label: 'Delivery' },
    SERVICE_PROVIDER: { variant: 'green',  label: 'Service Provider' },
  }
  const { variant, label } = map[type]
  return <Badge variant={variant} label={label} />
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const map: Record<DeliveryStatus, { variant: BadgeVariant; label: string }> = {
    RECEIVED:  { variant: 'blue',   label: 'Received' },
    COLLECTED: { variant: 'green',  label: 'Collected' },
    HELD:      { variant: 'yellow', label: 'Held' },
    RETURNED:  { variant: 'gray',   label: 'Returned' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const map: Record<IncidentSeverity, { variant: BadgeVariant; label: string }> = {
    LOW:      { variant: 'green',  label: 'Low' },
    MEDIUM:   { variant: 'yellow', label: 'Medium' },
    HIGH:     { variant: 'orange', label: 'High' },
    CRITICAL: { variant: 'red',    label: 'Critical' },
  }
  const { variant, label } = map[severity]
  return <Badge variant={variant} label={label} />
}

export function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const map: Record<StaffStatus, { variant: BadgeVariant; label: string }> = {
    ACTIVE:    { variant: 'green', label: 'Active' },
    INACTIVE:  { variant: 'gray',  label: 'Inactive' },
    SUSPENDED: { variant: 'red',   label: 'Suspended' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const map: Record<SubscriptionStatus, { variant: BadgeVariant; label: string }> = {
    TRIAL:     { variant: 'blue',   label: 'Trial' },
    ACTIVE:    { variant: 'green',  label: 'Active' },
    PAST_DUE:  { variant: 'orange', label: 'Past Due' },
    SUSPENDED: { variant: 'red',    label: 'Suspended' },
    CANCELLED: { variant: 'gray',   label: 'Cancelled' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}

export function ShiftStatusBadge({ status }: { status: ShiftStatus }) {
  const map: Record<ShiftStatus, { variant: BadgeVariant; label: string }> = {
    ACTIVE: { variant: 'green', label: 'On Shift' },
    ENDED:  { variant: 'gray',  label: 'Ended' },
  }
  const { variant, label } = map[status]
  return <Badge variant={variant} label={label} />
}
