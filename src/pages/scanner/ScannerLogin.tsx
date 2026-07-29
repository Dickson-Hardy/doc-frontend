import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, QrCode, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import cmdaLogo from '@/assets/cmda-logo.png';
import { getScannerSession, scannerApi } from '@/services/scanner';

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return 'Unable to sign in with this scanner code.';
};

const ScannerLogin = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (getScannerSession()) navigate('/scanner', { replace: true });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await scannerApi.login(code);
      navigate('/scanner', { replace: true });
    } catch (loginError: unknown) {
      setError(getErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_32%)]" />
      <Card className="relative w-full max-w-md border-white/10 shadow-2xl">
        <CardHeader className="space-y-4 pb-4 text-center">
          <img
            src={cmdaLogo}
            alt="CMDA Nigeria"
            className="mx-auto h-16 w-16 rounded-full bg-white object-contain p-1 shadow-sm"
          />
          <div>
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-slate-900">
              <QrCode className="h-6 w-6 text-emerald-600" />
              Scanner Access
            </CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              Enter the unique code provided by the conference administrator.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="scanner-code">Scanner code</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="scanner-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  placeholder="CMDA-XXXX-XXXX-XXXX"
                  className="h-12 pl-10 font-mono uppercase tracking-wider"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  autoFocus
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full" disabled={loading || code.trim().length < 8}>
              {loading ? 'Checking code…' : 'Open Scanner'}
            </Button>

            <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                This code gives scanner-only access and is restricted to one device.
              </p>
            </div>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Conference administrator?{' '}
            <Link to="/admin/login" className="font-medium text-slate-800 underline-offset-4 hover:underline">
              Admin login
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default ScannerLogin;
