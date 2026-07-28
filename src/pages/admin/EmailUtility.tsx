import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  Send,
} from 'lucide-react';
import { adminApi } from '@/services/admin';
import type { BulkEmailResult, EmailRecipient } from '@/services/admin';
import { formatAdminCategory, formatAdminDateTime, formatAdminNumber } from '@/lib/admin-format';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PAGE_SIZE = 50;
const MAX_SELECTION = 100;

const EmailUtility = () => {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<EmailRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sendResult, setSendResult] = useState<BulkEmailResult | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedCount = selectedIds.size;
  const allVisibleSelected = recipients.length > 0
    && recipients.every((recipient) => selectedIds.has(recipient.id));

  const failedResults = useMemo(
    () => sendResult?.results.filter((result) => result.status === 'failed') || [],
    [sendResult],
  );

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getEmailRecipients({
        page,
        limit: PAGE_SIZE,
        category,
        search: appliedSearch,
      });
      setRecipients(response.data);
      setTotal(response.total);
    } catch (error: any) {
      toast({
        title: 'Could not load recipients',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, category, page, toast]);

  useEffect(() => {
    void fetchRecipients();
  }, [fetchRecipients]);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const toggleRecipient = (registrationId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(registrationId)) {
        next.delete(registrationId);
      } else if (next.size < MAX_SELECTION) {
        next.add(registrationId);
      } else {
        toast({
          title: 'Selection limit reached',
          description: `Send to at most ${MAX_SELECTION} people at a time.`,
          variant: 'destructive',
        });
      }
      return next;
    });
  };

  const toggleVisibleRecipients = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        recipients.forEach((recipient) => next.delete(recipient.id));
        return next;
      }

      for (const recipient of recipients) {
        if (next.size >= MAX_SELECTION) break;
        next.add(recipient.id);
      }
      return next;
    });
  };

  const sendConfirmations = async () => {
    if (selectedCount === 0) return;

    setSending(true);
    setSendResult(null);
    try {
      const result = await adminApi.sendConfirmationEmails(Array.from(selectedIds));
      setSendResult(result);
      setSelectedIds(new Set(
        result.results
          .filter((item) => item.status === 'failed')
          .map((item) => item.registrationId),
      ));
      toast({
        title: `${formatAdminNumber(result.sent)} emails sent`,
        description: result.failed > 0
          ? `${formatAdminNumber(result.failed)} failed and remain selected for retry.`
          : 'All confirmation emails were sent successfully.',
        variant: result.failed > 0 ? 'destructive' : 'default',
      });
    } catch (error: any) {
      toast({
        title: 'Emails were not sent',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Send Confirmation Emails</h1>
          <p className="text-sm text-slate-500 mt-1">
            Resend the existing registration confirmation to paid participants
          </p>
        </div>
        <Button
          onClick={() => setConfirmOpen(true)}
          disabled={selectedCount === 0 || sending}
        >
          <Send className="w-4 h-4 mr-2" />
          {sending ? 'Sending...' : `Send to ${formatAdminNumber(selectedCount)}`}
        </Button>
      </div>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          This utility uses the existing confirmation template and only lists registrations with confirmed payment.
          You can send to a maximum of {MAX_SELECTION} recipients at once.
        </AlertDescription>
      </Alert>

      {sendResult && (
        <Card className={sendResult.failed > 0 ? 'border-amber-300' : 'border-emerald-300'}>
          <CardContent className="pt-5">
            <div className="flex items-start gap-3">
              {sendResult.failed > 0
                ? <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                : <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />}
              <div>
                <p className="font-semibold text-slate-900">
                  {formatAdminNumber(sendResult.sent)} sent
                  {sendResult.failed > 0 && ` · ${formatAdminNumber(sendResult.failed)} failed`}
                </p>
                {failedResults.length > 0 && (
                  <div className="mt-2 space-y-1 text-sm text-rose-700">
                    {failedResults.map((failure) => (
                      <p key={failure.registrationId}>
                        {failure.email || failure.registrationId}: {failure.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Paid Recipients</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applySearch();
                }}
                placeholder="Search name or email..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={applySearch}>Search</Button>
            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="junior-doctor">Junior Doctor</SelectItem>
                <SelectItem value="senior-doctor">Senior Doctor</SelectItem>
                <SelectItem value="doctor-with-spouse">Doctor with Spouse</SelectItem>
                <SelectItem value="virtual-student">Virtual Student</SelectItem>
                <SelectItem value="virtual-junior-doctor">Virtual Junior Doctor</SelectItem>
                <SelectItem value="virtual-senior-doctor">Virtual Senior Doctor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={toggleVisibleRecipients}
                aria-label="Select all visible recipients"
              />
              Select this page
            </label>
            <p className="text-sm text-slate-500">
              {formatAdminNumber(selectedCount)} selected · {formatAdminNumber(total)} paid registrations
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            </div>
          ) : recipients.length === 0 ? (
            <div className="text-center py-14 text-slate-500">No paid recipients found</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="w-12 py-2.5 px-4" aria-label="Selection" />
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Participant</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Category</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Payment Confirmed</th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((recipient) => (
                    <tr key={recipient.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 px-4">
                        <Checkbox
                          checked={selectedIds.has(recipient.id)}
                          onCheckedChange={() => toggleRecipient(recipient.id)}
                          aria-label={`Select ${recipient.firstName} ${recipient.surname}`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">
                          {recipient.firstName} {recipient.surname}
                        </p>
                        <p className="text-xs text-slate-500">{recipient.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-normal">
                          {formatAdminCategory(recipient.category)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {formatAdminDateTime(recipient.paidAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend confirmation emails?</AlertDialogTitle>
            <AlertDialogDescription>
              The existing confirmation email will be sent to {formatAdminNumber(selectedCount)} paid
              participant{selectedCount === 1 ? '' : 's'}. This action will create new email log entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={sendConfirmations} disabled={sending}>
              {sending ? 'Sending...' : 'Send Emails'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmailUtility;
