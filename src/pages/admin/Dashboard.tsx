import { useEffect, useState } from 'react';
import { Users, DollarSign, Clock, UserX, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/services/admin';
import { formatAdminCurrency, formatAdminNumber } from '@/lib/admin-format';

interface Stats {
  total: number;
  paid: number;
  pending: number;
  abandoned: number;
  revenue: number;
  splitPayments: number;
  categories: Record<string, number>;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-12 text-slate-500">Failed to load dashboard</div>;
  }

  const paidPct = stats.total ? (stats.paid / stats.total) * 100 : 0;
  const pendingPct = stats.total ? (stats.pending / stats.total) * 100 : 0;
  const abandonedPct = stats.total ? (stats.abandoned / stats.total) * 100 : 0;
  const avgRevenue = stats.paid ? stats.revenue / stats.paid : 0;

  const categoryList = Object.entries(stats.categories)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({
      label: cat === 'doctor-with-spouse' ? 'Doctor with Spouse'
        : cat === 'junior-doctor' ? 'Junior Doctor'
        : cat === 'senior-doctor' ? 'Senior Doctor'
        : cat.charAt(0).toUpperCase() + cat.slice(1),
      count,
      pct: stats.total ? (count / stats.total) * 100 : 0,
    }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Conference registration overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(stats.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(stats.paid)}</p>
                <p className="text-xs text-slate-400">{paidPct.toFixed(1)}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(stats.pending)}</p>
                <p className="text-xs text-slate-400">{pendingPct.toFixed(1)}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-rose-50 p-2.5">
                <UserX className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Abandoned</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(stats.abandoned)}</p>
                <p className="text-xs text-slate-400">{abandonedPct.toFixed(1)}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Total Revenue</p>
              <p className="text-3xl font-bold text-emerald-700 mt-1">{formatAdminCurrency(stats.revenue)}</p>
              <p className="text-sm text-emerald-600/80 mt-1">
                Average per paid: {formatAdminCurrency(avgRevenue)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Paid registrations</p>
                <p className="text-lg font-semibold text-slate-900">{formatAdminNumber(stats.paid)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs text-slate-500">Split payments</p>
                <p className="text-lg font-semibold text-slate-900">{formatAdminNumber(stats.splitPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">Registration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Paid', value: stats.paid, pct: paidPct, color: 'bg-emerald-500' },
              { label: 'Pending', value: stats.pending, pct: pendingPct, color: 'bg-amber-500' },
              { label: 'Abandoned', value: stats.abandoned, pct: abandonedPct, color: 'bg-rose-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {formatAdminNumber(item.value)} ({item.pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all`}
                    style={{ width: `${item.pct === 0 ? 0 : Math.max(4, item.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {categoryList.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-900">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categoryList.map((cat) => (
                <div key={cat.label} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500 truncate">{cat.label}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{formatAdminNumber(cat.count)}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                      style={{ width: `${cat.pct === 0 ? 0 : Math.max(4, cat.pct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{cat.pct.toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
