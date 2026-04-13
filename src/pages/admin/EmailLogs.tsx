import { useEffect, useState } from 'react';
import { Mail, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from '@/lib/axios';
import { formatAdminDateTime, formatAdminNumber } from '@/lib/admin-format';

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

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/email-logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'sent' ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'sent' ? 'default' : 'destructive'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Email Logs</h1>
          <p className="text-gray-600 mt-2">Track all sent confirmation emails</p>
        </div>
        <Button onClick={fetchLogs} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email History ({formatAdminNumber(logs.length)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No email logs found
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="mt-1">{getStatusIcon(log.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{log.recipientEmail}</p>
                      {getStatusBadge(log.status)}
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{log.subject}</p>
                    {log.errorMessage && (
                      <p className="text-sm text-red-600 mt-2">
                        Error: {log.errorMessage}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>
                        {formatAdminDateTime(log.sentAt)}
                      </span>
                      {log.registrationId && (
                        <span className="font-mono">
                          ID: {log.registrationId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailLogs;
