import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  KeyRound,
  Loader2,
  MonitorSmartphone,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldOff,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-format';
import {
  scannerAccessAdminApi,
  type ScannerAccessRecord,
} from '@/services/scanner';

const getErrorMessage = (error: unknown, fallback = 'Try again.') => {
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
};

const getDefaultExpiry = () => {
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  expiry.setMinutes(expiry.getMinutes() - expiry.getTimezoneOffset());
  return expiry.toISOString().slice(0, 16);
};

const ScannerAccess = () => {
  const [records, setRecords] = useState<ScannerAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [secretOpen, setSecretOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedFor, setGeneratedFor] = useState('');
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    expiresAt: getDefaultExpiry(),
  });
  const { toast } = useToast();

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await scannerAccessAdminApi.list());
    } catch (error: unknown) {
      toast({
        title: 'Could not load scanner access',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const activeCount = useMemo(
    () => records.filter((record) => record.isActive && new Date(record.expiresAt) > new Date()).length,
    [records],
  );
  const activeDeviceCount = useMemo(
    () => records.filter((record) => record.activeDevice).length,
    [records],
  );

  const showCode = (name: string, code: string) => {
    setGeneratedFor(name);
    setGeneratedCode(code);
    setCopied(false);
    setSecretOpen(true);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionId('create');
    try {
      const result = await scannerAccessAdminApi.create({
        ...form,
        expiresAt: new Date(form.expiresAt).toISOString(),
      });
      setCreateOpen(false);
      showCode(form.name.trim(), result.code);
      setForm({ name: '', email: '', phone: '', expiresAt: getDefaultExpiry() });
      await loadRecords();
    } catch (error: unknown) {
      toast({
        title: 'Scanner access not created',
        description: getErrorMessage(error, 'Check the details and try again.'),
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      toast({ title: 'Code copied', description: 'Send it privately to the assigned scanner.' });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Select and copy the code manually.',
        variant: 'destructive',
      });
    }
  };

  const handleStatus = async (record: ScannerAccessRecord) => {
    setActionId(record.id);
    try {
      await scannerAccessAdminApi.setStatus(record.id, !record.isActive);
      toast({
        title: record.isActive ? 'Scanner disabled' : 'Scanner enabled',
        description: record.isActive
          ? `${record.name} can no longer access the scanner.`
          : `${record.name} can use their current code again.`,
      });
      await loadRecords();
    } catch (error: unknown) {
      toast({ title: 'Update failed', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleResetDevice = async (record: ScannerAccessRecord) => {
    setActionId(record.id);
    try {
      await scannerAccessAdminApi.resetDevice(record.id);
      toast({
        title: 'Device reset',
        description: `${record.name} can now sign in on another device.`,
      });
      await loadRecords();
    } catch (error: unknown) {
      toast({ title: 'Reset failed', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleRotate = async (record: ScannerAccessRecord) => {
    setActionId(record.id);
    try {
      const code = await scannerAccessAdminApi.rotateCode(record.id);
      showCode(record.name, code);
      await loadRecords();
    } catch (error: unknown) {
      toast({
        title: 'Code not regenerated',
        description: getErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Scanner Access</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and control scanner-only access for conference volunteers.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create scanner code
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Total scanners</p>
              <p className="text-xl font-bold text-slate-900">{formatAdminNumber(records.length)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs text-slate-500">Active codes</p>
              <p className="text-xl font-bold text-slate-900">{formatAdminNumber(activeCount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="flex items-center gap-3 p-4">
            <MonitorSmartphone className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-xs text-slate-500">Devices signed in</p>
              <p className="text-xl font-bold text-slate-900">{formatAdminNumber(activeDeviceCount)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Volunteer access</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadRecords()}
            disabled={loading}
            aria-label="Refresh scanner access list"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center">
              <KeyRound className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-700">No scanner codes yet</p>
              <p className="mt-1 text-sm text-slate-500">Create one when a volunteer is ready.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {records.map((record) => {
                const expired = new Date(record.expiresAt).getTime() <= Date.now();
                const busy = actionId === record.id;
                return (
                  <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-slate-900">{record.name}</h2>
                        <p className="break-all text-sm text-slate-500">
                          {record.email || record.phone || 'No contact supplied'}
                        </p>
                      </div>
                      <Badge
                        variant={record.isActive && !expired ? 'default' : 'secondary'}
                        className={record.isActive && !expired ? 'bg-emerald-600' : ''}
                      >
                        {expired ? 'Expired' : record.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-slate-500">Code</dt>
                        <dd className="font-mono font-medium text-slate-800">••••-••••-{record.codeHint}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Device</dt>
                        <dd className="font-medium text-slate-800">
                          {record.activeDevice ? 'Signed in' : 'Available'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Expires</dt>
                        <dd className="text-slate-700">{formatAdminDateTime(record.expiresAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-500">Last used</dt>
                        <dd className="text-slate-700">
                          {record.lastUsedAt ? formatAdminDateTime(record.lastUsedAt) : 'Never'}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetDevice(record)}
                        disabled={busy || !record.activeDevice}
                      >
                        <RotateCcw className="mr-1.5 h-4 w-4" />
                        Reset device
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRotate(record)}
                        disabled={busy || expired}
                      >
                        <KeyRound className="mr-1.5 h-4 w-4" />
                        New code
                      </Button>
                      <Button
                        variant={record.isActive ? 'destructive' : 'default'}
                        size="sm"
                        onClick={() => handleStatus(record)}
                        disabled={busy || expired}
                      >
                        {record.isActive
                          ? <ShieldOff className="mr-1.5 h-4 w-4" />
                          : <ShieldCheck className="mr-1.5 h-4 w-4" />}
                        {record.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create scanner code</DialogTitle>
            <DialogDescription>
              The code will be shown once. Send it privately to the assigned volunteer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scanner-name">Volunteer name</Label>
              <Input
                id="scanner-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="John Okon"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scanner-email">Email (optional)</Label>
                <Input
                  id="scanner-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scanner-phone">Phone (optional)</Label>
                <Input
                  id="scanner-phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="080…"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scanner-expiry">Access expires</Label>
              <Input
                id="scanner-expiry"
                type="datetime-local"
                value={form.expiresAt}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionId === 'create' || form.name.trim().length < 2}>
                {actionId === 'create' ? 'Creating…' : 'Generate code'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={secretOpen} onOpenChange={setSecretOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Code for {generatedFor}</DialogTitle>
            <DialogDescription>
              This code cannot be viewed again. A new code can be generated if it is lost.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertDescription className="break-all font-mono text-base font-semibold tracking-wide">
              {generatedCode}
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
              {copied ? 'Copied' : 'Copy code'}
            </Button>
            <Button type="button" onClick={() => setSecretOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScannerAccess;
