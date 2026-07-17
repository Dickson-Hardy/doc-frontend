import { supabase } from '@/lib/supabase';
import { BASE_FEES, EARLY_REGISTRATION_DEADLINE, LATE_FEE } from '@/types/registration';

export interface AdminUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    return {
      access_token: data.session.access_token,
      user: {
        email: data.user.email!,
        firstName: data.user.user_metadata?.firstName || '',
        lastName: data.user.user_metadata?.lastName || '',
        role: data.user.user_metadata?.role || 'admin',
      },
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },
};

export const adminApi = {
  getStats: async () => {
    const [regCount, paidCount, pendingCount, abandonedCount] = await Promise.all([
      supabase.from('registrations').select('*', { count: 'exact', head: true }),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('paymentStatus', 'paid'),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('paymentStatus', 'pending'),
      supabase.from('registrations').select('*', { count: 'exact', head: true }).eq('paymentStatus', 'abandoned'),
    ]);

    const { data: paidRows } = await supabase
      .from('registrations')
      .select('totalAmount, splitCode')
      .eq('paymentStatus', 'paid');

    const revenue = (paidRows || []).reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const splitPayments = (paidRows || []).filter(r => r.splitCode).length;

    const categoryBreakdown = await supabase.from('registrations').select('category');
    const categories: Record<string, number> = {};
    (categoryBreakdown.data || []).forEach(r => {
      categories[r.category] = (categories[r.category] || 0) + 1;
    });

    return {
      total: regCount.count || 0,
      paid: paidCount.count || 0,
      pending: pendingCount.count || 0,
      abandoned: abandonedCount.count || 0,
      revenue,
      splitPayments,
      categories,
    };
  },

  getRegistrations: async (params: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
  } = {}) => {
    const { page = 1, limit = 20, status, category, search } = params;
    const offset = (page - 1) * limit;

    let query = supabase.from('registrations').select('*', { count: 'exact' });

    if (status && status !== 'all') {
      query = query.eq('paymentStatus', status);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`email.ilike.%${search}%,firstName.ilike.%${search}%,surname.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, count, error } = await query
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  requeryPayment: async (registrationId: string) => {
    const { data: reg, error: fetchError } = await supabase
      .from('registrations')
      .select('paymentReference')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg?.paymentReference) {
      throw new Error('No payment reference found');
    }

    const { data, error } = await supabase.functions.invoke('paystack-verify', {
      body: { reference: reg.paymentReference },
    });
    if (error) throw error;
    return data;
  },

  resendEmail: async (registrationId: string) => {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { registrationId },
    });
    if (error) throw error;
    return data;
  },

  getSpouseRegistrations: async () => {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('category', 'doctor-with-spouse')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  fixSpouseDetails: async (registrationId: string, updates: any) => {
    const { data, error } = await supabase
      .from('registrations')
      .update(updates)
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getEmailLogs: async (page = 1, limit = 50) => {
    const offset = (page - 1) * limit;
    const { data, count, error } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .order('sentAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return { data: data || [], total: count || 0 };
  },

  verifyAttendance: async (registrationId: string) => {
    const { data, error } = await supabase
      .from('registrations')
      .update({ attendanceVerified: true, verifiedAt: new Date().toISOString() })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getPricingAudit: async () => {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('paymentStatus', 'paid');
    if (error) throw error;

    return (data || []).map((reg: any) => {
      const baseFee = BASE_FEES[reg.category] || 0;
      const createdAt = new Date(reg.createdAt);
      const isVirtual = reg.category?.startsWith('virtual-');
      const lateFee = createdAt > EARLY_REGISTRATION_DEADLINE && !isVirtual ? LATE_FEE : 0;
      const expectedPrice = baseFee + lateFee;
      const dbAmount = reg.totalAmount || 0;
      const discrepancies: string[] = [];

      if (dbAmount !== expectedPrice) {
        discrepancies.push(`DB amount (₦${dbAmount.toLocaleString()}) differs from expected (₦${expectedPrice.toLocaleString()})`);
      }
      if (reg.baseFee !== baseFee) {
        discrepancies.push(`Base fee (₦${reg.baseFee?.toLocaleString()}) differs from category price (₦${baseFee.toLocaleString()})`);
      }

      return {
        registrationId: reg.id,
        name: `${reg.firstName} ${reg.surname}`,
        email: reg.email,
        category: reg.category,
        expectedPrice,
        dbAmount,
        paystackAmount: null,
        paidAt: reg.paidAt || null,
        createdAt: reg.createdAt,
        discrepancies,
        correctPrice: discrepancies.length === 0,
      };
    });
  },

  fixPricing: async (registrationId: string) => {
    const { data: reg, error: fetchError } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', registrationId)
      .single();

    if (fetchError || !reg) throw new Error('Registration not found');

    const { data, error } = await supabase
      .from('registrations')
      .update({ totalAmount: reg.baseFee + (reg.lateFee || 0) })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getSettings: async () => {
    const { data, error } = await supabase.from('app_settings').select('*');
    if (error) throw error;
    return data || [];
  },

  getPaystackStatus: async () => {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'paystack_split_code')
      .single();
    return {
      configured: !!settings?.value,
      splitCode: settings?.value || null,
    };
  },

  updateSettings: async (key: string, value: string) => {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  confirmPaymentManually: async (registrationId: string, amount: number) => {
    const { data, error } = await supabase
      .from('registrations')
      .update({
        paymentStatus: 'paid',
        totalAmount: amount,
        paidAt: new Date().toISOString(),
      })
      .eq('id', registrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  getRegistration: async (id: string) => {
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },
};
