import { supabase } from '@/lib/supabase';
import type { CheckInResult, ParticipationCheckIn } from '@/services/admin';

const SCANNER_SESSION_KEY = 'cmdaScannerSession';
const SCANNER_DEVICE_KEY = 'cmdaScannerDeviceId';

export interface ScannerSession {
  token: string;
  scannerId: string;
  name: string;
  email: string | null;
  expiresAt: string;
}

export interface ScannerAccessRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  codeHint: string;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  activeDevice: boolean;
  lastUsedAt: string | null;
}

interface ScannerCheckInRpcRow {
  id: string;
  registration_id: string;
  scanned_at: string;
  scanner_email: string | null;
  scanner_name: string | null;
  scan_source: ParticipationCheckIn['scanSource'];
  first_name: string;
  surname: string;
  participant_email: string;
  category: string;
  payment_status: string;
  total_count: number | string;
}

interface RawScannerSession {
  expires_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

interface RawScannerAccessRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  code_hint: string;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  scanner_sessions: RawScannerSession[] | null;
}

const getDeviceId = () => {
  let deviceId = localStorage.getItem(SCANNER_DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(SCANNER_DEVICE_KEY, deviceId);
  }
  return deviceId;
};

export const getScannerSession = (): ScannerSession | null => {
  try {
    const stored = localStorage.getItem(SCANNER_SESSION_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as ScannerSession;
    if (!session.token || new Date(session.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SCANNER_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SCANNER_SESSION_KEY);
    return null;
  }
};

export const clearScannerSession = () => {
  localStorage.removeItem(SCANNER_SESSION_KEY);
};

const requireLocalSession = () => {
  const session = getScannerSession();
  if (!session) throw new Error('Scanner session expired. Sign in again.');
  return session;
};

export const scannerApi = {
  login: async (code: string): Promise<ScannerSession> => {
    const { data, error } = await supabase.rpc('login_scanner_with_code', {
      p_code: code.trim().toUpperCase(),
      p_device_id: getDeviceId(),
    });
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('Scanner login failed');
    if (result.error_message) throw new Error(result.error_message);

    const session: ScannerSession = {
      token: result.session_token,
      scannerId: result.scanner_id,
      name: result.scanner_name,
      email: result.scanner_email,
      expiresAt: result.expires_at,
    };
    localStorage.setItem(SCANNER_SESSION_KEY, JSON.stringify(session));
    return session;
  },

  logout: async () => {
    const session = getScannerSession();
    if (session) {
      await supabase.rpc('logout_scanner_session', {
        p_session_token: session.token,
        p_device_id: getDeviceId(),
      });
    }
    clearScannerSession();
  },

  verifyAttendance: async (
    registrationId: string,
    scanSource: 'qr' | 'image_upload' | 'manual' = 'qr',
  ): Promise<CheckInResult> => {
    const session = requireLocalSession();
    const { data, error } = await supabase.rpc('check_in_registration_with_scanner_session', {
      p_session_token: session.token,
      p_device_id: getDeviceId(),
      p_registration_id: registrationId,
      p_scan_source: scanSource,
    });
    if (error) throw error;
    const checkIn = data?.[0];
    if (!checkIn) throw new Error('Check-in was not recorded');

    return {
      checkInId: checkIn.check_in_id,
      alreadyCheckedIn: checkIn.already_checked_in,
      scannedAt: checkIn.scanned_at,
      firstName: checkIn.first_name,
      surname: checkIn.surname,
      email: checkIn.email,
      category: checkIn.category,
      paymentStatus: checkIn.payment_status,
    };
  },

  getParticipationCheckIns: async (page = 1, limit = 25) => {
    const session = requireLocalSession();
    const { data, error } = await supabase.rpc('get_scanner_participation_check_ins', {
      p_session_token: session.token,
      p_device_id: getDeviceId(),
      p_page: page,
      p_limit: limit,
    });
    if (error) throw error;

    const rows = data || [];
    const checkIns: ParticipationCheckIn[] = (rows as ScannerCheckInRpcRow[]).map((row) => ({
      id: row.id,
      registrationId: row.registration_id,
      scannedAt: row.scanned_at,
      scannerEmail: row.scanner_email,
      scannerName: row.scanner_name,
      scanSource: row.scan_source,
      participant: {
        firstName: row.first_name,
        surname: row.surname,
        email: row.participant_email,
        category: row.category,
        paymentStatus: row.payment_status,
      },
    }));

    return {
      data: checkIns,
      total: Number(rows[0]?.total_count || 0),
    };
  },
};

export const scannerAccessAdminApi = {
  list: async (): Promise<ScannerAccessRecord[]> => {
    const { data, error } = await supabase
      .from('scanner_access_codes')
      .select(`
        id,
        name,
        email,
        phone,
        code_hint,
        is_active,
        expires_at,
        created_at,
        scanner_sessions (
          expires_at,
          last_used_at,
          revoked_at
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return ((data || []) as RawScannerAccessRecord[]).map((row) => {
      const sessions = Array.isArray(row.scanner_sessions) ? row.scanner_sessions : [];
      const activeSessions = sessions.filter(
        (session) => !session.revoked_at && new Date(session.expires_at).getTime() > Date.now(),
      );
      const lastUsedAt = sessions.reduce<string | null>((latest, session) => {
        if (!session.last_used_at) return latest;
        return !latest || session.last_used_at > latest ? session.last_used_at : latest;
      }, null);

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        codeHint: row.code_hint,
        isActive: row.is_active,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        activeDevice: activeSessions.length > 0,
        lastUsedAt,
      };
    });
  },

  create: async (input: {
    name: string;
    email?: string;
    phone?: string;
    expiresAt: string;
  }) => {
    const { data, error } = await supabase.rpc('create_scanner_access', {
      p_name: input.name,
      p_email: input.email || null,
      p_phone: input.phone || null,
      p_expires_at: input.expiresAt,
    });
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('Scanner access was not created');
    return { id: result.access_id, code: result.access_code };
  },

  rotateCode: async (id: string) => {
    const { data, error } = await supabase.rpc('rotate_scanner_access_code', {
      p_access_id: id,
    });
    if (error) throw error;
    const result = data?.[0];
    if (!result) throw new Error('Scanner code was not regenerated');
    return result.access_code as string;
  },

  setStatus: async (id: string, isActive: boolean) => {
    const { error } = await supabase.rpc('set_scanner_access_status', {
      p_access_id: id,
      p_is_active: isActive,
    });
    if (error) throw error;
  },

  resetDevice: async (id: string) => {
    const { error } = await supabase.rpc('reset_scanner_access_device', {
      p_access_id: id,
    });
    if (error) throw error;
  },
};
