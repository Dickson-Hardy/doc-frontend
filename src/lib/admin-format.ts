const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-NG');

export function formatAdminCurrency(amount?: number | null): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return currencyFormatter.format(0);
  }

  return currencyFormatter.format(amount);
}

export function formatAdminNumber(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return numberFormatter.format(0);
  }

  return numberFormatter.format(value);
}

export function formatAdminDate(value?: string | Date | null): string {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatAdminDateTime(value?: string | Date | null): string {
  if (!value) {
    return '-';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const categoryLabels: Record<string, string> = {
  student: 'Student',
  doctor: 'Doctor',
  'junior-doctor': 'Junior Doctor',
  'senior-doctor': 'Senior Doctor',
  'doctor-with-spouse': 'Doctor with Spouse',
};

export function formatAdminCategory(category?: string | null): string {
  if (!category) {
    return '-';
  }

  return categoryLabels[category] || category;
}

const accommodationLabels: Record<string, string> = {
  covenant: 'Covenant University',
  'covenant-guest-house': 'Covenant Guest House',
  'pg-hostel': 'PG Hostel',
  'camp-a': 'Camp A',
  temperance: 'Temperance Hotel',
  'student-free': 'Student Accommodation (Free)',
  'no-accommodation': 'No Accommodation',
};

export function formatAccommodation(accommodationType?: string | null): string {
  if (!accommodationType) {
    return 'No Accommodation';
  }

  return accommodationLabels[accommodationType] || accommodationType;
}
