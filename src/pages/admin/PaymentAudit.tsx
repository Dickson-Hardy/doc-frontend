import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from '@/lib/axios';
import { formatAdminCurrency, formatAdminNumber } from '@/lib/admin-format';

interface AuditResult {
  registrationId: string;
  name: string;
  email: string;
  dbAmount: number;
  paystackAmount: number | null;
  dbStatus: string;
  paystackStatus: string;
  paidAt: string | null;
  discrepancies: string[];
  healthy: boolean;
}

interface PaystackStatus {
  success: boolean;
  message: string;
  keyType: string;
}

const PaymentAudit = () => {
  const [paystackStatus, setPaystackStatus] = useState<PaystackStatus | null>(null);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    fetchPaystackStatus();
  }, []);

  const fetchPaystackStatus = async () => {
    try {
      const response = await axios.get('/admin/paystack-status');
      setPaystackStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Paystack status:', error);
    }
  };

  const runAudit = async () => {
    setAuditing(true);
    setLoading(true);
    try {
      const response = await axios.get('/admin/payment-audit');
      setAuditResults(response.data);
    } catch (error) {
      console.error('Failed to run audit:', error);
    } finally {
      setLoading(false);
      setAuditing(false);
    }
  };

  const exportToCSV = () => {
    if (auditResults.length === 0) return;
    const headers = ['Name', 'Email', 'DB Amount', 'Paystack Amount', 'DB Status', 'Paystack Status', 'Paid At', 'Discrepancies'];
    const rows = auditResults.map((r) => [
      r.name,
      r.email,
      r.dbAmount,
      r.paystackAmount ?? 'N/A',
      r.dbStatus,
      r.paystackStatus,
      r.paidAt || '-',
      r.discrepancies.join('; ') || 'None',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-audit-${new Date().toISOString()}.csv`;
    a.click();
  };

  const healthyCount = auditResults.filter(r => r.healthy).length;
  const unhealthyCount = auditResults.filter(r => !r.healthy).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Audit</h1>
          <p className="text-gray-600 mt-2">Cross-check registrations against Paystack</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={auditing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${auditing ? 'animate-spin' : ''}`} />
            {auditing ? 'Auditing...' : 'Run Audit'}
          </Button>
          <Button onClick={exportToCSV} variant="outline" disabled={auditResults.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Paystack Connection Status */}
      {paystackStatus && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paystack Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {paystackStatus.success ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span className="font-medium">{paystackStatus.message}</span>
              {paystackStatus.keyType && (
                <Badge variant={paystackStatus.keyType === 'live' ? 'default' : 'secondary'}>
                  {paystackStatus.keyType}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {auditResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Verified</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{formatAdminNumber(auditResults.length)}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-blue-100 text-blue-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Matching</p>
                  <p className="mt-1 text-3xl font-bold text-green-600">{formatAdminNumber(healthyCount)}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-green-100 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Discrepancies</p>
                  <p className="mt-1 text-3xl font-bold text-red-600">{formatAdminNumber(unhealthyCount)}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-red-100 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {auditResults.length > 0
              ? `${formatAdminNumber(auditResults.length)} Payment${auditResults.length !== 1 ? 's' : ''} Checked`
              : 'Click "Run Audit" to verify payments against Paystack'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : auditResults.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No paid registrations to audit
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">DB Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Paystack Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Paystack Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Paid At</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {auditResults.map((r) => (
                    <tr key={r.registrationId} className={`border-b hover:bg-gray-50 ${!r.healthy ? 'bg-red-50/30' : ''}`}>
                      <td className="py-3 px-4 font-medium">{r.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{r.email}</td>
                      <td className="py-3 px-4 font-medium">{formatAdminCurrency(r.dbAmount)}</td>
                      <td className="py-3 px-4 font-medium">
                        {r.paystackAmount !== null ? formatAdminCurrency(r.paystackAmount) : <span className="text-red-500">Not found</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={r.paystackStatus === 'success' ? 'default' : 'destructive'}>
                          {r.paystackStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {r.paidAt ? new Date(r.paidAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        {r.discrepancies.length > 0 ? (
                          <div className="space-y-1">
                            {r.discrepancies.map((d, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded px-2 py-1">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{d}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">Match</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentAudit;
