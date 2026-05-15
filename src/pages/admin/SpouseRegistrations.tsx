import { useEffect, useState } from 'react';
import { Search, RefreshCw, AlertTriangle, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from '@/lib/axios';
import {
  formatAdminCategory,
  formatAdminCurrency,
  formatAdminDate,
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

interface EditingState {
  [key: string]: {
    spouseFirstName: string;
    spouseSurname: string;
    spouseOtherNames: string;
    spouseEmail: string;
  };
}

const SpouseRegistrations = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditingState>({});
  const [saving, setSaving] = useState<string | null>(null);

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

  const startEditing = (reg: Registration) => {
    setEditing(prev => ({
      ...prev,
      [reg.id]: {
        spouseFirstName: reg.spouseFirstName || '',
        spouseSurname: reg.spouseSurname || '',
        spouseOtherNames: reg.spouseOtherNames || '',
        spouseEmail: reg.spouseEmail || '',
      },
    }));
  };

  const cancelEditing = (id: string) => {
    setEditing(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveEditing = async (id: string) => {
    setSaving(id);
    try {
      const updates = editing[id];
      const response = await axios.post(`/admin/fix-spouse-details/${id}`, updates);
      setRegistrations(prev =>
        prev.map(reg => (reg.id === id ? response.data.registration : reg))
      );
      cancelEditing(id);
    } catch (error) {
      console.error('Failed to save spouse details:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(null);
    }
  };

  const updateEditField = (id: string, field: string, value: string) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Doctor with Spouse Registrations</h1>
        <p className="text-gray-600 mt-2">Review spouse details and spot inconsistencies</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spouse Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{registrations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">With Inconsistencies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{totalWithInconsistencies}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Clean Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{registrations.length - totalWithInconsistencies}</p>
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
            {filteredRegistrations.length} Registration{filteredRegistrations.length !== 1 ? 's' : ''}
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Doctor Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Spouse Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Spouse Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Inconsistencies</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistrations.map((reg) => {
                    const isEditing = editing[reg.id] !== undefined;
                    return (
                      <tr key={reg.id} className={`border-b hover:bg-gray-50 ${reg.inconsistencies.length > 0 ? 'bg-amber-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{reg.firstName} {reg.surname}</p>
                            <p className="text-xs text-gray-500">{reg.chapter} | {reg.sex}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{reg.email}</td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="space-y-1">
                              <Input
                                size="sm"
                                value={editing[reg.id].spouseFirstName}
                                onChange={(e) => updateEditField(reg.id, 'spouseFirstName', e.target.value)}
                                placeholder="First name"
                                className="h-7 text-sm"
                              />
                              <Input
                                size="sm"
                                value={editing[reg.id].spouseSurname}
                                onChange={(e) => updateEditField(reg.id, 'spouseSurname', e.target.value)}
                                placeholder="Surname"
                                className="h-7 text-sm"
                              />
                              <Input
                                size="sm"
                                value={editing[reg.id].spouseOtherNames}
                                onChange={(e) => updateEditField(reg.id, 'spouseOtherNames', e.target.value)}
                                placeholder="Other names (optional)"
                                className="h-7 text-sm"
                              />
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">
                                {reg.spouseFirstName || '-'} {reg.spouseSurname || ''}
                              </p>
                              {reg.spouseOtherNames && (
                                <p className="text-xs text-gray-500">{reg.spouseOtherNames}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input
                              size="sm"
                              value={editing[reg.id].spouseEmail}
                              onChange={(e) => updateEditField(reg.id, 'spouseEmail', e.target.value)}
                              placeholder="Spouse email"
                              className="h-7 text-sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-600">{reg.spouseEmail || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {formatAdminCurrency(reg.totalAmount)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={reg.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                            {reg.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          {reg.inconsistencies.length > 0 ? (
                            <div className="space-y-1">
                              {reg.inconsistencies.map((issue, idx) => (
                                <div key={idx} className="flex items-start gap-1 text-xs text-amber-700">
                                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>{issue}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">No issues</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => saveEditing(reg.id)}
                                disabled={saving === reg.id}
                                className="h-7 px-2"
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => cancelEditing(reg.id)}
                                disabled={saving === reg.id}
                                className="h-7 px-2"
                              >
                                <X className="w-3 h-3 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(reg)}
                              className="h-7 px-2"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpouseRegistrations;
