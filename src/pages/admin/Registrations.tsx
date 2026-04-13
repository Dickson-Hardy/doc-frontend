import { useEffect, useState } from 'react';
import { Search, RefreshCw, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import axios from '@/lib/axios';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import {
  formatAdminCategory,
  formatAdminCurrency,
  formatAdminDate,
  formatAdminNumber,
} from '@/lib/admin-format';

interface Registration {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  category: string;
  totalAmount: number;
  paymentStatus: string;
  paymentReference: string;
  createdAt: string;
  paidAt: string;
  attendanceVerified: boolean;
  splitCode?: string;
}

const Registrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchRegistrations();
  }, [statusFilter, categoryFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const response = await axios.get(
        `/admin/registrations?${params}`
      );
      setRegistrations(response.data);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (registrationId: string, email: string) => {
    if (!confirm(`Resend confirmation email to ${email}?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await axios.post(`/admin/resend-email/${registrationId}`);
      alert('✅ Confirmation email resent successfully!');
    } catch (error: any) {
      console.error('Failed to resend email:', error);
      alert(`❌ Failed to resend email: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRequery = async (reference: string, registrationId: string) => {
    try {
      setLoading(true);
      const response = await axios.post('/admin/requery-payment', {
        reference,
      });
      
      if (response.data.status === 'success') {
        // Show success message
        alert(`✅ ${response.data.message}`);
        // Refresh the list
        await fetchRegistrations();
      } else {
        alert(`❌ ${response.data.message}`);
      }
    } catch (error: any) {
      console.error('Failed to requery payment:', error);
      alert(`❌ Failed to requery payment: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Category', 'Amount', 'Status', 'Date'];
    const rows = registrations.map((reg) => [
      `${reg.firstName} ${reg.surname}`,
      reg.email,
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
    a.download = `registrations-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registrations</h1>
          <p className="text-gray-600 mt-2">Manage conference registrations</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRegistrations()}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="junior-doctor">Junior Doctor</SelectItem>
                <SelectItem value="senior-doctor">Senior Doctor</SelectItem>
                <SelectItem value="doctor-with-spouse">Doctor with Spouse</SelectItem>
                <SelectItem value="doctor">Doctor (Legacy)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchRegistrations} className="w-full">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {formatAdminNumber(registrations.length)} Registration{registrations.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No registrations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Split</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {reg.firstName} {reg.surname}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{reg.email}</td>
                      <td className="py-3 px-4 text-sm">{formatAdminCategory(reg.category)}</td>
                      <td className="py-3 px-4 font-medium">
                        {formatAdminCurrency(reg.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={reg.paymentStatus} />
                      </td>
                      <td className="py-3 px-4">
                        {reg.splitCode ? (
                          <Badge variant="outline" className="text-purple-600 border-purple-300">
                            Split
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatAdminDate(reg.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {reg.paymentStatus === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRequery(reg.paymentReference, reg.id)}
                              disabled={loading}
                              title="Verify payment status with Paystack"
                            >
                              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                              Requery
                            </Button>
                          )}
                          {reg.paymentStatus === 'paid' && (
                            <>
                              <span className="text-green-600 text-sm flex items-center">
                                ✓ Verified
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResendEmail(reg.id, reg.email)}
                                disabled={loading}
                                title="Resend confirmation email"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Resend Email
                              </Button>
                            </>
                          )}
                        </div>
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

export default Registrations;
