import { useCallback, useEffect, useState } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Scanner from '@/pages/admin/Scanner';
import {
  clearScannerSession,
  getScannerSession,
  scannerApi,
  type ScannerSession,
} from '@/services/scanner';

const ScannerPortal = () => {
  const [session] = useState<ScannerSession | null>(() => getScannerSession());
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();

  const returnToLogin = useCallback(() => {
    clearScannerSession();
    navigate('/scanner/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!session) returnToLogin();
  }, [returnToLogin, session]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await scannerApi.logout();
    } finally {
      returnToLogin();
    }
  };

  if (!session) return null;

  return (
    <div className="min-h-screen bg-slate-100/80">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
              <p className="truncate font-semibold text-slate-900">Scanning as {session.name}</p>
            </div>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              Scanner-only access · expires {new Date(session.expiresAt).toLocaleString()}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="shrink-0"
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            <span className="hidden sm:inline">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
            <span className="sm:hidden">Exit</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6">
        <Scanner accessMode onSessionInvalid={returnToLogin} />
      </main>
    </div>
  );
};

export default ScannerPortal;
