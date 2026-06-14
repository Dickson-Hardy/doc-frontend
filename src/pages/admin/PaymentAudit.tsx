import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Download, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/services/admin';
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
    try { setPaystackStatus(await adminApi.getPaystackStatus()); }
    catch (e) { console.error('Failed to fetch Paystack status:', e); }
  };

  const runAudit = async () => {
    setAuditing(true);
    setLoading(true);
    try { setAuditResults(await adminApi.getPricingAudit()); }
    catch (e) { console.error('Failed to run audit:', e); }
    finally { setLoading(false); setAuditing(false); }
  };

  const exportToCSV = () => {
    if (auditResults.length === 0) return;
    const headers = ['Name', 'Email', 'Category', 'Expected', 'DB Amount', 'Paystack', 'Registered', 'Paid At', 'Issues'];
    const rows = auditResults.map((r) => [
      r.name, r.email, r.category, r.expectedPrice, r.dbAmount,
      r.paystackAmount ?? 'N/A',
      new Date(r.createdAt).toLocaleDateString('en-NG'),
      r.paidAt || '-',
      r.discrepancies.join('; ') || 'None',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pricing-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const fixPricing = async (id: string) => {
    setFixingId(id);
    try { await adminApi.fixPricing(id); await runAudit(); }
    catch (e) { console.error('Fix failed:', e); }
    finally { setFixingId(null); }
  };

  const correctCount = auditResults.filter(r => r.correctPrice).length;
  const wrongCount = auditResults.filter(r => !r.correctPrice).length;
  const displayResults = showAll ? auditResults : auditResults.filter(r => !r.correctPrice);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Audit</h1>
          <p className="text-sm text-slate-500 mt-1">Verify registration pricing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAudit} disabled={auditing} size="sm" variant="outline">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${auditing ? 'animate-spin' : ''}`} />
            {auditing ? 'Checking...' : 'Re-check'}
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm" disabled={auditResults.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      {paystackStatus && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {paystackStatus.success ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-600" />
              )}
              <span className="text-sm text-slate-700">{paystackStatus.message}</span>
              {paystackStatus.keyType && (
                <Badge variant={paystackStatus.keyType === 'live' ? 'default' : 'secondary'} className="ml-auto">
                  {paystackStatus.keyType}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Paid</p>
            <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(auditResults.length)}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-100">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Correct Price</p>
            <p className="text-2xl font-bold text-emerald-600">{formatAdminNumber(correctCount)}</p>
          </CardContent>
        </Card>
        <Card className="border-rose-100">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Wrong Price</p>
            <p className="text-2xl font-bold text-rose-600">{formatAdminNumber(wrongCount)}</p>
          </CardContent>
        </Card>
      </div>

      {auditResults.length > 0 && (
        <div className="flex gap-2">
          <Button variant={!showAll ? 'default' : 'outline'} size="sm" onClick={() => setShowAll(false)}>
            Wrong Only ({wrongCount})
          </Button>
          <Button variant={showAll ? 'default' : 'outline'} size="sm" onClick={() => setShowAll(true)}>
            All ({auditResults.length})
          </Button>
        </div>
      )}

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          </div>
        ) : displayResults.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-emerald-700">All prices are correct</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Category</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Expected</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">DB Amount</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Paystack</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Issues</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Fix</th>
                </tr>
              </thead>
              <tbody>
                {displayResults.map((r) => (
                  <tr key={r.registrationId} className={`border-b border-slate-100 hover:bg-slate-50/50 ${!r.correctPrice ? 'bg-rose-50/30' : ''}`}>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">{r.email}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className="text-xs font-normal">{formatAdminCategory(r.category)}</Badge>
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-blue-700">{formatAdminCurrency(r.expectedPrice)}</td>
                    <td className={`py-2.5 px-4 text-right font-medium ${r.dbAmount !== r.expectedPrice ? 'text-rose-600' : 'text-slate-900'}`}>{formatAdminCurrency(r.dbAmount)}</td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      {r.paystackAmount !== null ? formatAdminCurrency(r.paystackAmount) : <span className="text-rose-500 text-xs">N/A</span>}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs">
                      {r.discrepancies.length > 0 ? (
                        <div className="space-y-1">
                          {r.discrepancies.map((d, i) => (
                            <div key={i} className="flex items-start gap-1 text-xs text-rose-700 bg-rose-50 rounded px-2 py-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {d}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">Correct</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {!r.correctPrice && (
                        <Button size="sm" variant="outline" onClick={() => fixPricing(r.registrationId)}
                          disabled={fixingId === r.registrationId}
                          className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50">
                          <Wrench className={`w-3 h-3 mr-1 ${fixingId === r.registrationId ? 'animate-spin' : ''}`} />
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
      </div>
    </div>
  );
};

export default PaymentAudit;
