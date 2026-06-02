import Badge from './Badge';

export function ServiceStatusBadge({ status }) {
  const map = {
    ACTIVE: { color: 'green', label: 'Active' },
    PENDING: { color: 'yellow', label: 'Pending' },
    DRAFT: { color: 'slate', label: 'Draft' },
    INACTIVE: { color: 'red', label: 'Inactive' },
    DECOMMISSIONED: { color: 'slate', label: 'Decommissioned' },
  };
  const { color, label } = map[status] ?? { color: 'slate', label: status ?? 'Unknown' };
  return <Badge color={color} dot>{label}</Badge>;
}

export function IncidentStatusBadge({ status }) {
  const map = {
    OPEN:        { color: 'red',    label: 'Open' },
    IN_PROGRESS: { color: 'blue',   label: 'In Progress' },
    RESOLVED:    { color: 'green',  label: 'Resolved' },
    CLOSED:      { color: 'slate',  label: 'Closed' },
  };
  const { color, label } = map[status] ?? { color: 'slate', label: status ?? 'Unknown' };
  return <Badge color={color} dot>{label}</Badge>;
}

export function SlaStatusBadge({ status }) {
  return <Badge color={status === 'ACTIVE' ? 'green' : 'slate'} dot>{status}</Badge>;
}

export function SeverityBadge({ severity }) {
  const map = {
    CRITICAL: { color: 'red' },
    HIGH: { color: 'orange' },
    MEDIUM: { color: 'yellow' },
    LOW: { color: 'blue' },
  };
  const { color } = map[severity] ?? { color: 'blue' };
  return <Badge color={color}>{severity}</Badge>;
}

export function ServiceTypeBadge({ type }) {
  const map = {
    VOICE: 'blue',
    VIDEO: 'purple',
    MESSAGING: 'cyan',
  };
  return <Badge color={map[type] ?? 'slate'}>{type}</Badge>;
}
