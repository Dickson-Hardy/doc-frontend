import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PaymentStatus = 'paid' | 'pending' | 'abandoned' | string;

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const statusConfig = {
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50',
  },
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
  },
  abandoned: {
    label: 'Abandoned',
    icon: XCircle,
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
  },
} as const;

function normalizeStatus(status: string): keyof typeof statusConfig {
  if (status in statusConfig) {
    return status as keyof typeof statusConfig;
  }

  return 'pending';
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  const normalizedStatus = normalizeStatus(status);
  const config = statusConfig[normalizedStatus];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('inline-flex items-center gap-1.5', config.className, className)}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}
