import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { PriceBreakdown } from '@/types/registration';
import { formatNaira } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface PriceSummaryProps {
  priceBreakdown: PriceBreakdown | null;
  className?: string;
}

const PriceSummary = ({ priceBreakdown, className }: PriceSummaryProps) => {
  if (!priceBreakdown) {
    return (
      <div className={cn('form-section', className)}>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            ₦
          </span>
          Payment Summary
        </h3>
        <p className="text-muted-foreground text-sm">
          Select your category to see the registration fee breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('form-section border-l-4 border-l-primary', className)}>
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          ₦
        </span>
        Payment Summary
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Category</span>
          <span className="font-medium text-foreground">{priceBreakdown.categoryLabel}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Base Registration Fee</span>
          <span className="font-medium text-foreground">{formatNaira(priceBreakdown.baseFee)}</span>
        </div>

        {priceBreakdown.isLateRegistration && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-destructive flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Late Registration Fee
            </span>
            <span className="font-medium text-destructive">{formatNaira(priceBreakdown.lateFee)}</span>
          </div>
        )}

        <div className="h-px bg-border my-3" />

        <div className="flex justify-between items-center">
          <span className="text-foreground font-semibold">Total Amount</span>
          <span className="text-xl font-bold text-primary">{formatNaira(priceBreakdown.total)}</span>
        </div>

        {!priceBreakdown.isLateRegistration && (
          <div className="mt-4 p-3 bg-success/10 rounded-lg">
            <p className="text-sm text-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Early bird registration – no additional fees!
            </p>
          </div>
        )}

        {priceBreakdown.isLateRegistration && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Late registration fee of {formatNaira(LATE_FEE)} applied
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const LATE_FEE = 10000;

export default PriceSummary;
