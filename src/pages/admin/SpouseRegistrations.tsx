import { useEffect, useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Edit2, Download, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import axios from '@/lib/axios';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import {
  formatAdminCurrency,
  formatAdminNumber,
  formatAdminDateTime,
} from '@/lib/admin-format';

interface Registration {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  phone: string;
  chapter: string;
  state?: string;
  sex: string;
  category: string;
  totalAmount: number;
  paymentStatus: string;
  paymentReference: string;
  createdAt: string;
  paidAt: string;
  spouseFirstName?: string;
  spouseSurname?: string;
  spouseOtherNames?: string;
  spouseEmail?: string;
  inconsistencies: string[];
}

const SpouseRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState<Registration | null>(null);
  const [editForm, setEditForm] = useState({
    spouseFirstName: '',
    spouseSurname: '',
    spouseOtherNames: '',
    spouseEmail: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/admin/spouse-registrations');
      setRegistrations(response.data);
    } catch (error) {
      console.error('Failed to fetch spouse registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (reg: Registration) => {
    setEditTarget(reg);
    setEditForm({
      spouseFirstName: reg.spouseFirstName || '',
      spouseSurname: reg.spouseSurname || '',
      spouseOtherNames: reg.spouseOtherNames || '',
      spouseEmail: reg.spouseEmail || '',
    });
  };

  const closeEdit = () => {
    setEditTarget(null);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const response = await axios.post(`/admin/fix-spouse-details/${editTarget.id}`, editForm);
      setRegistrations(prev =>
        prev.map(reg => (reg.id === editTarget.id ? response.data.registration : reg))
      );
      setEditTarget(null);
    } catch (error) {
      console.error('Failed to save spouse details:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Doctor Name', 'Doctor Email', 'Chapter', 'Sex', 'Spouse Name', 'Spouse Email', 'Amount', 'Status', 'Registered', 'Inconsistencies'];
    const rows = filteredRegistrations.map((reg) => [
      `${reg.firstName} ${reg.surname}`,
      reg.email,
      reg.chapter,
      reg.sex,
      `${reg.spouseFirstName || ''} ${reg.spouseSurname || ''}`.trim() || '-',
      reg.spouseEmail || '-',
      reg.totalAmount,
      reg.paymentStatus,
      formatAdminDateTime(reg.createdAt),
      reg.inconsistencies.join('; ') || 'None',
    ]);

    const csv = [headers, ...rows].map((row) => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spouse-registrations-${new Date().toISOString()}.csv`;
    a.click();
  };

  const filteredRegistrations = registrations.filter(reg => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      reg.firstName.toLowerCase().includes(searchLower) ||
      reg.surname.toLowerCase().includes(searchLower) ||
      reg.email.toLowerCase().includes(searchLower) ||
      (reg.spouseFirstName || '').toLowerCase().includes(searchLower) ||
      (reg.spouseSurname || '').toLowerCase().includes(searchLower) ||
      (reg.spouseEmail || '').toLowerCase().includes(searchLower)
    );
  });

  const totalWithInconsistencies = registrations.filter(r => r.inconsistencies.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Doctor with Spouse Registrations</h1>
          <p className="text-gray-600 mt-2">Review spouse details and spot inconsistencies</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRegistrations} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Spouse Registrations</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">
                  {formatAdminNumber(registrations.length)}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-100 text-blue-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">With Inconsistencies</p>
                <p className="mt-1 text-3xl font-bold text-amber-600">
                  {formatAdminNumber(totalWithInconsistencies)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {registrations.length > 0 ? ((totalWithInconsistencies / registrations.length) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500"
                style={{ width: registrations.length > 0 ? `${Math.max(6, (totalWithInconsistencies / registrations.length) * 100)}%` : '0%' }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">Clean Records</p>
                <p className="mt-1 text-3xl font-bold text-green-600">
                  {formatAdminNumber(registrations.length - totalWithInconsistencies)}
                </p>
                <p className="mt-1 text-xs text-slate-500">No issues detected</p>
              </div>
              <div className="rounded-lg p-2.5 bg-green-100 text-green-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                style={{ width: registrations.length > 0 ? `${Math.max(6, ((registrations.length - totalWithInconsistencies) / registrations.length) * 100)}%` : '0%' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by doctor name, email, spouse name, or spouse email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {formatAdminNumber(filteredRegistrations.length)} Registration{filteredRegistrations.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No spouse registrations found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Doctor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Spouse Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Spouse Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Issues</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Registered</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => (
                    <tr key={reg.id} className={`border-b hover:bg-gray-50 ${reg.inconsistencies.length > 0 ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{reg.firstName} {reg.surname}</p>
                          <p className="text-xs text-gray-500">{reg.email}</p>
                          <p className="text-xs text-gray-400">{reg.chapter} &middot; {reg.sex}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(reg.spouseFirstName || reg.spouseSurname) ? (
                          <div>
                            <p className="font-medium">
                              {reg.spouseFirstName} {reg.spouseSurname}
                            </p>
                            {reg.spouseOtherNames && (
                              <p className="text-xs text-gray-500">{reg.spouseOtherNames}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">Not provided</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {reg.spouseEmail || <span className="text-gray-400">Not provided</span>}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {formatAdminCurrency(reg.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={reg.paymentStatus} />
                      </td>
                      <td className="py-3 px-4">
                        {reg.inconsistencies.length > 0 ? (
                          <div className="space-y-1">
                            {reg.inconsistencies.map((issue, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">Clean</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatAdminDateTime(reg.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(reg)}
                          className="h-8 px-3"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Edit Spouse Details
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-700">{editTarget.firstName} {editTarget.surname}</p>
                <p className="text-slate-500">{editTarget.email}</p>
              </div>

              {editTarget.inconsistencies.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-medium text-amber-800 mb-2">Detected Issues:</p>
                  <ul className="space-y-1">
                    {editTarget.inconsistencies.map((issue, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-xs text-amber-700">
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spouseFirstName">Spouse First Name</Label>
                  <Input
                    id="spouseFirstName"
                    value={editForm.spouseFirstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, spouseFirstName: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spouseSurname">Spouse Surname</Label>
                  <Input
                    id="spouseSurname"
                    value={editForm.spouseSurname}
                    onChange={(e) => setEditForm(prev => ({ ...prev, spouseSurname: e.target.value }))}
                    placeholder="Surname"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouseOtherNames">Spouse Other Names <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input
                  id="spouseOtherNames"
                  value={editForm.spouseOtherNames}
                  onChange={(e) => setEditForm(prev => ({ ...prev, spouseOtherNames: e.target.value }))}
                  placeholder="Middle names or other names"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouseEmail">Spouse Email</Label>
                <Input
                  id="spouseEmail"
                  type="email"
                  value={editForm.spouseEmail}
                  onChange={(e) => setEditForm(prev => ({ ...prev, spouseEmail: e.target.value }))}
                  placeholder="spouse@example.com"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpouseRegistrations;
