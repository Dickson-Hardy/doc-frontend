import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { EARLY_REGISTRATION_DEADLINE, LATE_FEE } from '@/types/registration';
import { formatNaira } from '@/lib/pricing';

const DeadlineNotice = () => {
  const now = new Date();
  const isLateRegistration = now > EARLY_REGISTRATION_DEADLINE;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLateRegistration) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-destructive">Late Registration Period</h4>
            <p className="text-sm text-destructive/80 mt-1">
              The early registration deadline has passed. A late fee of {formatNaira(LATE_FEE)} will be applied to all registrations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-success/10 border border-success/30 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-success">Early Bird Registration Open!</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Register by <strong className="text-foreground">{formatDate(EARLY_REGISTRATION_DEADLINE)}</strong> to avoid the {formatNaira(LATE_FEE)} late registration fee.
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Deadline: {formatDate(EARLY_REGISTRATION_DEADLINE)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeadlineNotice;
