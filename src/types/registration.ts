export type Category = 'student' | 'doctor' | 'doctor-with-spouse';

export type YearsInPractice = 'less-than-5' | '5-and-above';

export type AccommodationOption = 'on-campus' | 'off-campus' | 'no-accommodation';

export interface MemberData {
  email: string;
  surname: string;
  firstName: string;
  otherNames?: string;
  age: number;
  sex: 'male' | 'female';
  phone: string;
  chapter: string;
  isCmdaMember: boolean;
  currentLeadershipPost?: string;
  previousLeadershipPost?: string;
  category: Category;
  chapterOfGraduation?: string;
  yearsInPractice?: YearsInPractice;
}

export interface SpouseDetails {
  spouseSurname: string;
  spouseFirstName: string;
  spouseOtherNames?: string;
  spouseEmail: string;
}

export interface RegistrationFormData {
  // Section 0: Email Lookup
  email: string;

  // Section 1: Personal Information (auto-populated from database)
  surname: string;
  firstName: string;
  otherNames?: string;
  age: number;
  sex: 'male' | 'female';
  phone: string;

  // Section 2: CMDA Information (auto-populated from database)
  chapter: string;
  isCmdaMember: boolean;
  currentLeadershipPost?: string;
  previousLeadershipPost?: string;

  // Section 3: Category & Professional Details (auto-populated from database)
  category: Category;
  chapterOfGraduation?: string;
  yearsInPractice?: YearsInPractice;

  // Section 3b: Spouse Details (only if doctor-with-spouse)
  spouseSurname?: string;
  spouseFirstName?: string;
  spouseOtherNames?: string;
  spouseEmail?: string;

  // Section 4: Conference Logistics
  dateOfArrival: Date;
  accommodationOption: AccommodationOption;

  // Section 5: Academic Contribution
  hasAbstract: boolean;
  presentationTitle?: string;
  abstractFile?: File;
}

export interface PriceBreakdown {
  baseFee: number;
  lateFee: number;
  total: number;
  categoryLabel: string;
  isLateRegistration: boolean;
}

export const EARLY_REGISTRATION_DEADLINE = new Date('2026-04-30T23:59:59');
export const LATE_FEE = 10000;

export const BASE_FEES: Record<string, number> = {
  student: 11000,
  'junior-doctor': 30000,
  'senior-doctor': 50000,
  'doctor-with-spouse': 85000,
};

export interface PaystackConfig {
  publicKey: string;
  email: string;
  amount: number; // in kobo (multiply by 100)
  reference: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string;
    }>;
  };
  onSuccess: (reference: string) => void;
  onClose: () => void;
}
