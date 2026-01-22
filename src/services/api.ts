import { MemberData, RegistrationFormData } from '@/types/registration';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new ApiError(response.status, error.message || 'Request failed');
  }

  return response.json();
}

export const memberApi = {
  // Lookup member by email
  lookupByEmail: async (email: string): Promise<MemberData | null> => {
    try {
      return await fetchApi<MemberData>(`/members/lookup?email=${encodeURIComponent(email)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
};

export const registrationApi = {
  // Submit registration
  submit: async (data: RegistrationFormData) => {
    return await fetchApi<{ reference: string; registrationId: string }>('/registrations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Verify payment
  verifyPayment: async (reference: string) => {
    return await fetchApi<{ status: string; data: any }>(`/registrations/verify-payment/${reference}`);
  },
};
