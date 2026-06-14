import { useEffect, useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Edit2, Download, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { adminApi } from '@/services/admin';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import { formatAdminCurrency, formatAdminNumber } from '@/lib/admin-format';

interface Registration {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  chapter: string;
  sex: string;
  category: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  spouseFirstName?: string;
  spouseSurname?: string;
  spouseOtherNames?: string;
  spouseEmail?: string;
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

  useEffect(() => { fetchRegistrations(); }, []);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSpouseRegistrations();
      setRegistrations(data);
    } catch (error) {
      console.error('Failed to fetch spouse registrations:', error);
    } finally { setLoading(false); }
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

  const saveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await adminApi.fixSpouseDetails(editTarget.id, editForm);
      setRegistrations(prev => prev.map(reg =>
        reg.id === editTarget.id ? { ...reg, ...editForm } : reg
      ));
      setEditTarget(null);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally { setSaving(false); }
  };

  const exportToCSV = () => {
    const headers = ['Doctor Name', 'Doctor Email', 'Chapter', 'Sex', 'Spouse Name', 'Spouse Email', 'Amount', 'Status'];
    const rows = filteredRegistrations.map((reg) => [
      `${reg.firstName} ${reg.surname}`,
      reg.email,
      reg.chapter,
      reg.sex,
      `${reg.spouseFirstName || ''} ${reg.spouseSurname || ''}`.trim() || '-',
      reg.spouseEmail || '-',
      reg.totalAmount,
      reg.paymentStatus,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spouse-registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredRegistrations = registrations.filter(reg => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [reg.firstName, reg.surname, reg.email, reg.spouseFirstName, reg.spouseSurname, reg.spouseEmail]
      .some(f => f?.toLowerCase().includes(q));
  });

  const spouseMissing = registrations.filter(r => !r.spouseFirstName && !r.spouseSurname);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Spouse Registrations</h1>
          <p className="text-sm text-slate-500 mt-1">Doctor with Spouse registrations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchRegistrations} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(registrations.length)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Spouse details missing</p>
            <p className="text-2xl font-bold text-amber-600">{formatAdminNumber(spouseMissing.length)}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Spouse details provided</p>
            <p className="text-2xl font-bold text-emerald-600">{formatAdminNumber(registrations.length - spouseMissing.length)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Search name, email, spouse name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardContent>
      </Card>

      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No spouse registrations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Doctor</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Spouse Name</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Spouse Email</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Amount</th>
                  <th className="text-center py-2.5 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${!reg.spouseFirstName && !reg.spouseSurname ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{reg.firstName} {reg.surname}</p>
                      <p className="text-xs text-slate-500">{reg.email}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      {(reg.spouseFirstName || reg.spouseSurname) ? (
                        <span className="font-medium text-slate-900">
                          {reg.spouseFirstName} {reg.spouseSurname}
                        </span>
                      ) : (
                        <span className="text-slate-400">Not provided</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {reg.spouseEmail || <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900">
                      {formatAdminCurrency(reg.totalAmount)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <PaymentStatusBadge status={reg.paymentStatus} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(reg)} className="h-7 text-xs">
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Spouse Details</DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{editTarget.firstName} {editTarget.surname}</p>
                <p className="text-slate-500">{editTarget.email}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Spouse First Name</Label>
                  <Input value={editForm.spouseFirstName} onChange={(e) => setEditForm(p => ({ ...p, spouseFirstName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Spouse Surname</Label>
                  <Input value={editForm.spouseSurname} onChange={(e) => setEditForm(p => ({ ...p, spouseSurname: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Spouse Other Names</Label>
                <Input value={editForm.spouseOtherNames} onChange={(e) => setEditForm(p => ({ ...p, spouseOtherNames: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Spouse Email</Label>
                <Input value={editForm.spouseEmail} onChange={(e) => setEditForm(p => ({ ...p, spouseEmail: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>
              <X className="h-4 w-4 mr-1.5" /> Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpouseRegistrations;
