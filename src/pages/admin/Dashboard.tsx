import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  UserX,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import axiosInstance from '@/lib/axios';
import { formatAdminCurrency, formatAdminNumber } from '@/lib/admin-format';

interface Stats {
  total: number;
  paid: number;
  pending: number;
  abandoned: number;
  revenue: number;
  splitPayments?: number;
}

interface FunnelMetric {
  label: string;
  value: number;
  percentage: number;
  barClassName: string;
  valueClassName: string;
}

interface StatCard {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Users;
  iconClassName: string;
  barClassName: string;
  percentage: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axiosInstance.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRegistrations = stats?.total || 0;
  const paidRegistrations = stats?.paid || 0;
  const pendingRegistrations = stats?.pending || 0;
  const abandonedRegistrations = stats?.abandoned || 0;
  const splitPayments = stats?.splitPayments || 0;
  const totalRevenue = stats?.revenue || 0;

  const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

  const paidPercentage = totalRegistrations
    ? (paidRegistrations / totalRegistrations) * 100
    : 0;
  const pendingPercentage = totalRegistrations
    ? (pendingRegistrations / totalRegistrations) * 100
    : 0;
  const abandonedPercentage = totalRegistrations
    ? (abandonedRegistrations / totalRegistrations) * 100
    : 0;
  const splitAdoptionPercentage = paidRegistrations
    ? (splitPayments / paidRegistrations) * 100
    : 0;

  const averageRevenuePerPaid = paidRegistrations
    ? totalRevenue / paidRegistrations
    : 0;

  const statCards = useMemo<StatCard[]>(
    () => [
      {
        title: 'Total Registrations',
        value: totalRegistrations,
        subtitle: 'All submitted entries',
        icon: Users,
        iconClassName: 'bg-blue-100 text-blue-700',
        barClassName: 'from-blue-500 to-cyan-500',
        percentage: totalRegistrations > 0 ? 100 : 0,
      },
      {
        title: 'Paid',
        value: paidRegistrations,
        subtitle: `${paidPercentage.toFixed(1)}% conversion`,
        icon: DollarSign,
        iconClassName: 'bg-green-100 text-green-700',
        barClassName: 'from-emerald-500 to-green-500',
        percentage: clampPercentage(paidPercentage),
      },
      {
        title: 'Pending',
        value: pendingRegistrations,
        subtitle: 'Needs payment completion',
        icon: Clock,
        iconClassName: 'bg-amber-100 text-amber-700',
        barClassName: 'from-amber-500 to-yellow-500',
        percentage: clampPercentage(pendingPercentage),
      },
      {
        title: 'Abandoned',
        value: abandonedRegistrations,
        subtitle: 'Likely dropped sessions',
        icon: UserX,
        iconClassName: 'bg-rose-100 text-rose-700',
        barClassName: 'from-rose-500 to-red-500',
        percentage: clampPercentage(abandonedPercentage),
      },
    ],
    [
      abandonedPercentage,
      abandonedRegistrations,
      paidPercentage,
      paidRegistrations,
      pendingPercentage,
      pendingRegistrations,
      totalRegistrations,
    ],
  );

  const funnelMetrics = useMemo<FunnelMetric[]>(
    () => [
      {
        label: 'Paid',
        value: paidRegistrations,
        percentage: clampPercentage(paidPercentage),
        barClassName: 'bg-gradient-to-r from-emerald-500 to-green-500',
        valueClassName: 'text-emerald-700',
      },
      {
        label: 'Pending',
        value: pendingRegistrations,
        percentage: clampPercentage(pendingPercentage),
        barClassName: 'bg-gradient-to-r from-amber-500 to-yellow-500',
        valueClassName: 'text-amber-700',
      },
      {
        label: 'Abandoned',
        value: abandonedRegistrations,
        percentage: clampPercentage(abandonedPercentage),
        barClassName: 'bg-gradient-to-r from-rose-500 to-red-500',
        valueClassName: 'text-rose-700',
      },
    ],
    [
      abandonedPercentage,
      abandonedRegistrations,
      paidPercentage,
      paidRegistrations,
      pendingPercentage,
      pendingRegistrations,
    ],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Conference Admin
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Real-time overview of registration volume, payment conversion, and revenue.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[340px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Revenue</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatAdminCurrency(totalRevenue)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Conversion</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {paidPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Pending</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatAdminNumber(pendingRegistrations)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Abandoned</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatAdminNumber(abandonedRegistrations)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          const barWidth = card.percentage === 0 ? 0 : Math.max(6, card.percentage);

          return (
            <Card key={card.title} className="border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">
                      {formatAdminNumber(card.value)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${card.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${card.barClassName}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-slate-900">
              Revenue Pulse
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Total Revenue
              </p>
              <p className="mt-1 text-3xl font-bold text-emerald-700">
                {formatAdminCurrency(totalRevenue)}
              </p>
              <p className="mt-1 text-sm text-emerald-900/80">
                Average per paid registration: {formatAdminCurrency(averageRevenuePerPaid)}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Split payment adoption</span>
                <span className="font-semibold text-slate-900">
                  {splitAdoptionPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  style={{
                    width: `${
                      splitAdoptionPercentage === 0
                        ? 0
                        : Math.max(6, clampPercentage(splitAdoptionPercentage))
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formatAdminNumber(splitPayments)} split payments out of{' '}
                {formatAdminNumber(paidRegistrations)} successful payments.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-slate-900">
              Payment Funnel
              <Activity className="h-5 w-5 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelMetrics.map((metric) => {
              const width = metric.percentage === 0 ? 0 : Math.max(6, metric.percentage);

              return (
                <div key={metric.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{metric.label}</span>
                    <span className={`font-semibold ${metric.valueClassName}`}>
                      {formatAdminNumber(metric.value)} ({metric.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${metric.barClassName}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Based on {formatAdminNumber(totalRegistrations)} total registrations.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
