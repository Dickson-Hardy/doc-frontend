import { 
  Category, 
  PriceBreakdown, 
  EARLY_REGISTRATION_DEADLINE, 
  LATE_FEE,
  BASE_FEES 
} from '@/types/registration';

export function calculatePrice(
  category: Category,
  currentDate: Date = new Date()
): PriceBreakdown {
  const isLateRegistration = currentDate > EARLY_REGISTRATION_DEADLINE;
  let baseFee = 0;
  let categoryLabel = '';

  switch (category) {
    case 'student':
      baseFee = BASE_FEES.student;
      categoryLabel = 'Student';
      break;
    case 'doctor':
      baseFee = BASE_FEES['doctor'];
      categoryLabel = 'Doctor';
      break;
    case 'doctor-with-spouse':
      baseFee = BASE_FEES['doctor-with-spouse'];
      categoryLabel = 'Doctor with Spouse Package';
      break;
  }

  const lateFee = isLateRegistration ? LATE_FEE : 0;
  const total = baseFee + lateFee;

  return {
    baseFee,
    lateFee,
    total,
    categoryLabel,
    isLateRegistration,
  };
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
