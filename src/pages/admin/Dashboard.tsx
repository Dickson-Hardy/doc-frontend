import { useEffect, useState } from 'react';
import { Users, DollarSign, Clock, UserX, TrendingUp, ArrowUpRight, CreditCard, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/services/admin';
import { formatAdminCurrency, formatAdminNumber, formatAdminCategory } from '@/lib/admin-format';

interface Stats {
  total: number;
  paid: number;
  pending: number;
  abandoned: number;
  revenue: number;
  splitPayments: number;
  categories: Record<string, number>;
}

interface RecentReg {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  category: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentReg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminApi.getStats(),
      adminApi.getRegistrations({ limit: 5 }),
    ])
      .then(([s, r]) => { setStats(s); setRecent(r.data); })
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

  const paidPct = stats.total ? Math.round((stats.paid / stats.total) * 100) : 0;
  const pendingPct = stats.total ? Math.round((stats.pending / stats.total) * 100) : 0;
  const abandonedPct = stats.total ? Math.round((stats.abandoned / stats.total) * 100) : 0;
  const avgRevenue = stats.paid ? stats.revenue / stats.paid : 0;

  const categoryList = Object.entries(stats.categories)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, count]) => ({
      key: cat,
      label: formatAdminCategory(cat),
      count,
      pct: stats.total ? (count / stats.total) * 100 : 0,
    }));

  const categoryColors: Record<string, string> = {
    'student': 'from-blue-500 to-blue-600',
    'junior-doctor': 'from-emerald-500 to-emerald-600',
    'senior-doctor': 'from-violet-500 to-violet-600',
    'doctor-with-spouse': 'from-amber-500 to-orange-500',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">CMDA National Conference 2026 — Registration Overview</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{formatAdminNumber(stats.total)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Paid</p>
                <p className="text-3xl font-bold text-emerald-700 mt-1">{formatAdminNumber(stats.paid)}</p>
                <p className="text-xs text-emerald-600/70 mt-1">{paidPct}% conversion</p>
              </div>
              <div className="rounded-xl bg-emerald-100 p-3">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{formatAdminNumber(stats.pending)}</p>
                <p className="text-xs text-amber-600/70 mt-1">{pendingPct}% of total</p>
              </div>
              <div className="rounded-xl bg-amber-100 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Abandoned</p>
                <p className="text-3xl font-bold text-rose-700 mt-1">{formatAdminNumber(stats.abandoned)}</p>
                <p className="text-xs text-rose-600/70 mt-1">{abandonedPct}% drop-off</p>
              </div>
              <div className="rounded-xl bg-rose-100 p-3">
                <UserX className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">Revenue Overview</h3>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 p-6 text-white">
              <p className="text-sm font-medium text-emerald-100">Total Revenue</p>
              <p className="text-4xl font-bold mt-1">{formatAdminCurrency(stats.revenue)}</p>
              <div className="mt-4 flex items-center gap-6">
                <div>
                  <p className="text-xs text-emerald-200">Avg. per paid</p>
                  <p className="text-lg font-semibold">{formatAdminCurrency(avgRevenue)}</p>
                </div>
                <div className="h-8 w-px bg-emerald-500/30" />
                <div>
                  <p className="text-xs text-emerald-200">Paid registrations</p>
                  <p className="text-lg font-semibold">{formatAdminNumber(stats.paid)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-900">Status Breakdown</h3>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Paid', value: stats.paid, pct: paidPct, color: 'bg-emerald-500' },
                { label: 'Pending', value: stats.pending, pct: pendingPct, color: 'bg-amber-500' },
                { label: 'Abandoned', value: stats.abandoned, pct: abandonedPct, color: 'bg-rose-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatAdminNumber(item.value)}
                      <span className="text-slate-400 font-normal ml-1">({item.pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all duration-500`}
                      style={{ width: `${item.pct === 0 ? 0 : Math.max(4, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-900">Registration Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryList.map((cat) => (
                <div key={cat.key} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                    <span className="text-sm font-bold text-slate-900">{formatAdminNumber(cat.count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${categoryColors[cat.key] || 'from-slate-400 to-slate-500'} transition-all duration-500`}
                      style={{ width: `${cat.pct === 0 ? 0 : Math.max(4, cat.pct)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{cat.pct.toFixed(1)}% of registrations</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-900">Recent Registrations</CardTitle>
              <a href="/admin/registrations" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{r.firstName} {r.surname}</p>
                    <p className="text-xs text-slate-500 truncate">{r.email}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-semibold text-slate-900">{formatAdminCurrency(r.totalAmount)}</p>
                    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                      r.paymentStatus === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-rose-50 text-rose-700'
                    }`}>
                      {r.paymentStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
