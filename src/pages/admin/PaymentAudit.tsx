import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Download, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from '@/lib/axios';
import { formatAdminCurrency, formatAdminNumber, formatAdminCategory } from '@/lib/admin-format';

interface PricingResult {
  registrationId: string;
  name: string;
  email: string;
  category: string;
  expectedPrice: number;
  dbAmount: number;
  paystackAmount: number | null;
  paidAt: string | null;
  createdAt: string;
  discrepancies: string[];
  correctPrice: boolean;
}

interface PaystackStatus {
  success: boolean;
  message: string;
  keyType: string;
}

const PaymentAudit = () => {
  const [paystackStatus, setPaystackStatus] = useState<PaystackStatus | null>(null);
  const [auditResults, setAuditResults] = useState<PricingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPaystackStatus();
    runAudit();
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
      const response = await axios.get('/admin/pricing-audit');
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
    const headers = ['Name', 'Email', 'Category', 'Expected Price', 'DB Amount', 'Paystack Amount', 'Registered', 'Paid At', 'Issues'];
    const rows = auditResults.map((r) => [
      r.name,
      r.email,
      r.category,
      r.expectedPrice,
      r.dbAmount,
      r.paystackAmount ?? 'N/A',
      new Date(r.createdAt).toLocaleDateString('en-NG'),
      r.paidAt || '-',
      r.discrepancies.join('; ') || 'None',
    ]);
    const csv = [headers, ...rows].map((row) => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pricing-audit-${new Date().toISOString()}.csv`;
    a.click();
  };

  const fixPricing = async (registrationId: string) => {
    setFixingId(registrationId);
    try {
      await axios.post(`/admin/fix-pricing/${registrationId}`);
      await runAudit();
    } catch (error) {
      console.error('Failed to fix pricing:', error);
    } finally {
      setFixingId(null);
    }
  };

  const correctCount = auditResults.filter(r => r.correctPrice).length;
  const wrongCount = auditResults.filter(r => !r.correctPrice).length;
  const displayResults = showAll ? auditResults : auditResults.filter(r => !r.correctPrice);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pricing Audit</h1>
          <p className="text-gray-600 mt-2">Verify every registration was charged the correct price</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={auditing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${auditing ? 'animate-spin' : ''}`} />
            {auditing ? 'Checking...' : 'Re-check All'}
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
                  <p className="text-sm font-medium text-slate-500">Total Paid</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">{formatAdminNumber(auditResults.length)}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-blue-100 text-blue-700">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">Correct Price</p>
                  <p className="mt-1 text-3xl font-bold text-green-600">{formatAdminNumber(correctCount)}</p>
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
                  <p className="text-sm font-medium text-slate-500">Wrong Price</p>
                  <p className="mt-1 text-3xl font-bold text-red-600">{formatAdminNumber(wrongCount)}</p>
                </div>
                <div className="rounded-lg p-2.5 bg-red-100 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toggle */}
      {auditResults.length > 0 && (
        <div className="flex gap-2">
          <Button
            variant={!showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAll(false)}
          >
            Show Wrong Only ({wrongCount})
          </Button>
          <Button
            variant={showAll ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowAll(true)}
          >
            Show All ({auditResults.length})
          </Button>
        </div>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {auditResults.length > 0
              ? `Showing ${displayResults.length} of ${auditResults.length} registrations`
              : 'Checking prices...'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : displayResults.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-medium text-green-700">All prices are correct!</p>
              <p className="text-sm text-gray-500 mt-1">Every paid registration was charged the expected amount.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Expected</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">DB Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Paystack</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Registered</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Issues</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {displayResults.map((r) => (
                    <tr key={r.registrationId} className={`border-b hover:bg-gray-50 ${!r.correctPrice ? 'bg-red-50/40' : ''}`}>
                      <td className="py-3 px-4">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.email}</p>
                      </td>
                      <td className="py-3 px-4 text-sm">{formatAdminCategory(r.category)}</td>
                      <td className="py-3 px-4 font-medium text-blue-700">{formatAdminCurrency(r.expectedPrice)}</td>
                      <td className="py-3 px-4 font-medium">{formatAdminCurrency(r.dbAmount)}</td>
                      <td className="py-3 px-4 font-medium">
                        {r.paystackAmount !== null ? formatAdminCurrency(r.paystackAmount) : <span className="text-red-500">Not found</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(r.createdAt).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 max-w-md">
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
                          <span className="text-xs text-green-600 font-medium">Correct</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {!r.correctPrice && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fixPricing(r.registrationId)}
                            disabled={fixingId === r.registrationId}
                            className="h-8 px-3 text-amber-700 border-amber-300 hover:bg-amber-50"
                          >
                            <Wrench className={`w-3.5 h-3.5 mr-1.5 ${fixingId === r.registrationId ? 'animate-spin' : ''}`} />
                            {fixingId === r.registrationId ? 'Fixing...' : 'Fix'}
                          </Button>
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
