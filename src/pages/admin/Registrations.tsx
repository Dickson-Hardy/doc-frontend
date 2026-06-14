import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/services/admin';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import {
  formatAdminCategory,
  formatAdminCurrency,
  formatAdminDate,
  formatAdminNumber,
  formatAccommodation,
} from '@/lib/admin-format';

interface Registration {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  phone: string;
  chapter: string;
  state?: string;
  accommodationType?: string;
  category: string;
  totalAmount: number;
  paymentStatus: string;
  paymentReference: string;
  createdAt: string;
  paidAt: string;
  attendanceVerified: boolean;
  splitCode?: string;
}

const PAGE_SIZES = [25, 50, 100, 200];

const Registrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / pageSize);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: pageSize };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search.trim()) params.search = search.trim();

      const response = await adminApi.getRegistrations(params);
      setRegistrations(response.data);
      setTotal(response.total);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, categoryFilter, search]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleSearchSubmit = () => {
    setPage(1);
    fetchRegistrations();
  };

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(1);
  };

  const handleResendEmail = async (registrationId: string, email: string) => {
    if (!confirm(`Resend confirmation email to ${email}?`)) return;
    try {
      await adminApi.resendEmail(registrationId);
      alert('Confirmation email resent!');
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    }
  };

  const handleRequery = async (registrationId: string) => {
    try {
      const response = await adminApi.requeryPayment(registrationId);
      if (response.data.status === 'success') {
        alert(`${response.data.message}`);
        await fetchRegistrations();
      } else {
        alert(`${response.data.message}`);
      }
    } catch (error: any) {
      alert(`Failed: ${error.message}`);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Chapter', 'State', 'Category', 'Amount', 'Status', 'Date'];
    const rows = registrations.map((reg) => [
      `${reg.firstName} ${reg.surname}`,
      reg.email,
      reg.phone || '-',
      reg.chapter || '-',
      reg.state || '-',
      formatAdminCategory(reg.category),
      formatAdminCurrency(reg.totalAmount),
      reg.paymentStatus,
      formatAdminDate(reg.createdAt),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const startRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, total);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registrations</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${formatAdminNumber(total)} total registrations`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger className="w-full md:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={handleFilterChange(setCategoryFilter)}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="junior-doctor">Junior Doctor</SelectItem>
                <SelectItem value="senior-doctor">Senior Doctor</SelectItem>
                <SelectItem value="doctor-with-spouse">Doctor with Spouse</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No registrations found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600 w-12">#</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Name</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Email</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Category</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Amount</th>
                    <th className="text-center py-2.5 px-4 font-semibold text-slate-600">Status</th>
                    <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Date</th>
                    <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg, idx) => (
                    <tr key={reg.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400 text-xs">{startRow + idx}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {reg.firstName} {reg.surname}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 max-w-[220px] truncate" title={reg.email}>
                        {reg.email}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge variant="outline" className="text-xs font-normal">
                          {formatAdminCategory(reg.category)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                        {formatAdminCurrency(reg.totalAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <PaymentStatusBadge status={reg.paymentStatus} />
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatAdminDate(reg.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {reg.paymentStatus === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequery(reg.id)}
                              className="h-7 text-xs"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Requery
                            </Button>
                          )}
                          {reg.paymentStatus === 'paid' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleResendEmail(reg.id, reg.email)}
                              className="h-7 text-xs text-blue-600 hover:text-blue-700"
                            >
                              Resend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Showing {formatAdminNumber(startRow)}-{formatAdminNumber(endRow)} of {formatAdminNumber(total)}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm font-medium text-slate-700">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={page >= totalPages}
                    onClick={() => setPage(totalPages)}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Registrations;
