export type Category = 'student' | 'doctor' | 'doctor-with-spouse';

export type AccommodationType = 
  | 'covenant-guest-house' 
  | 'pg-hostel' 
  | 'camp-a' 
  | 'temperance' 
  | 'student-free';

export type CovenantRoomType = 'standard' | 'elite' | 'mini-suite';
export type TemperanceRoomType = 'executive-chalet' | 'sapphire';
export type RoomSharing = 'shared' | 'private';

export interface MemberData {
  email: string;
  surname: string;
  firstName: string;
  otherNames?: string;
  age: number;
  sex: 'male' | 'female';
  phone: string;
  chapter: string;
  currentLeadershipPost?: string;
  previousLeadershipPost?: string;
  category: Category;
  chapterOfGraduation?: string;
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
  currentLeadershipPost?: string;
  previousLeadershipPost?: string;

  // Section 3: Category & Professional Details (auto-populated from database)
  category: Category;
  chapterOfGraduation?: string;

  // Section 3b: Spouse Details (only if doctor-with-spouse)
  spouseSurname?: string;
  spouseFirstName?: string;
  spouseOtherNames?: string;
  spouseEmail?: string;

  // Section 4: Conference Logistics
  dateOfArrival: Date;

  // Section 4b: Accommodation Details
  accommodationType?: AccommodationType;
  covenantRoomType?: CovenantRoomType;
  temperanceRoomType?: TemperanceRoomType;
  roomSharing?: RoomSharing;
  roommateName?: string;

  // Section 5: Academic Contribution
  hasAbstract: boolean;
  presentationTitle?: string;
  abstractFileUrl?: string;
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
  'doctor': 40000,
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
