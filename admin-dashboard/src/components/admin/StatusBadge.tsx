import { cn } from "@/lib/utils";

type StatusType = 'draft' | 'pending' | 'published' | 'approved' | 'rejected' | 'active' | 'inactive' | 'expired' | 'filled';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-muted text-muted-foreground',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning',
  },
  published: {
    label: 'Published',
    className: 'bg-success/10 text-success',
  },
  approved: {
    label: 'Approved',
    className: 'bg-success/10 text-success',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-destructive/10 text-destructive',
  },
  active: {
    label: 'Active',
    className: 'bg-primary/10 text-primary',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-muted text-muted-foreground',
  },
  expired: {
    label: 'Expired',
    className: 'bg-destructive/10 text-destructive',
  },
  filled: {
    label: 'Filled',
    className: 'bg-muted text-muted-foreground',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  if (!config) {
    return (
      <span className={cn('badge-status', 'bg-muted text-muted-foreground', className)}>
        Unknown
      </span>
    );
  }
  
  return (
    <span className={cn('badge-status', config.className, className)}>
      {config.label}
    </span>
  );
}
