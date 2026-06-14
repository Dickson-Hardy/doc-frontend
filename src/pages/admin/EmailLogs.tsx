import { useEffect, useState } from 'react';
import { Mail, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/services/admin';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-format';

const PAGE_SIZE = 50;

interface EmailLog {
  id: string;
  recipientEmail: string;
  subject: string;
  status: string;
  errorMessage: string;
  registrationId: string;
  sentAt: string;
}

const EmailLogs = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, total: count } = await adminApi.getEmailLogs(page, PAGE_SIZE);
      setLogs(data);
      setTotal(count);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email Logs</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${formatAdminNumber(total)} total emails`}
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-900 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No email logs found</div>
          ) : (
            <>
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="mt-0.5">
                      {log.status === 'sent' ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-rose-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-slate-900 truncate">{log.recipientEmail}</span>
                        <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className="text-[10px] h-5">
                          {log.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 truncate">{log.subject}</p>
                      {log.errorMessage && (
                        <p className="text-xs text-rose-600 mt-1">{log.errorMessage}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {formatAdminDateTime(log.sentAt)}
                        {log.registrationId && <> &middot; ID: {log.registrationId.slice(0, 8)}</>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Page {page} of {totalPages} ({formatAdminNumber(total)} total)
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailLogs;
