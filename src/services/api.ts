import { supabase } from '@/lib/supabase';
import { MemberData, RegistrationFormData } from '@/types/registration';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export const memberApi = {
  lookupByEmail: async (email: string): Promise<MemberData | null> => {
    const { data, error } = await supabase.functions.invoke('member-lookup', {
      body: { email },
    });
    if (error || !data?.member) return null;
    return data.member as MemberData;
  },
};

export const registrationApi = {
  submit: async (data: RegistrationFormData) => {
    const payload: any = {
      ...data,
      dateOfArrival: data.dateOfArrival instanceof Date
        ? data.dateOfArrival.toISOString().split('T')[0]
        : data.dateOfArrival,
    };
    delete payload.abstractFile;

    const { data: result, error } = await supabase.functions.invoke('submit-registration', {
      body: payload,
    });
    if (error) throw new ApiError(400, error.message);
    return result as { reference: string; registrationId: string };
  },

  verifyPayment: async (reference: string) => {
    const { data, error } = await supabase.functions.invoke('paystack-verify', {
      body: { reference },
    });
    if (error) throw new ApiError(400, error.message);
    return data as { status: string; message: string; data: any };
  },

  checkRegistration: async (email: string) => {
    const { data, error } = await supabase.functions.invoke('check-registration', {
      body: { email },
    });
    if (error) throw new ApiError(400, error.message);
    return data as { exists: boolean; status?: string; registrationId?: string; paymentReference?: string; registration?: any };
  },

  initializePayment: async (data: {
    email: string;
    amount: number;
    reference: string;
    metadata?: any;
  }) => {
    const { data: result, error } = await supabase.functions.invoke('paystack-init', {
      body: data,
    });
    if (error) throw new ApiError(400, error.message);
    return result as {
      status: boolean;
      message: string;
      data: { authorization_url: string; access_code: string; reference: string };
    };
  },
};
