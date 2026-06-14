import { useEffect, useState } from 'react';
import { Search, Download, Eye, FileText, Home, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminApi } from '@/services/admin';
import { useToast } from '@/hooks/use-toast';
import { PaymentStatusBadge } from '@/components/admin/PaymentStatusBadge';
import {
  formatAccommodation,
  formatAdminCategory,
  formatAdminCurrency,
  formatAdminDate,
  formatAdminDateTime,
  formatAdminNumber,
} from '@/lib/admin-format';

interface Registration {
  id: string;
  email: string;
  firstName: string;
  surname: string;
  otherNames: string;
  age: number;
  sex: string;
  phone: string;
  chapter: string;
  state: string;
  currentLeadershipPost: string;
  previousLeadershipPost: string;
  category: string;
  chapterOfGraduation: string;
  spouseSurname: string;
  spouseFirstName: string;
  spouseOtherNames: string;
  spouseEmail: string;
  dateOfArrival: string;
  accommodationType: string;
  covenantRoomType: string;
  temperanceRoomType: string;
  roomSharing: string;
  roommateName: string;
  hasAbstract: boolean;
  presentationTitle: string;
  abstractFileUrl: string;
  baseFee: number;
  lateFee: number;
  totalAmount: number;
  paymentStatus: string;
  paymentReference: string;
  paidAt: string;
  splitCode: string;
  attendanceVerified: boolean;
  createdAt: string;
}

const RegistrationTracking = () => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accommodationFilter, setAccommodationFilter] = useState('all');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRegistrations();
  }, [statusFilter, categoryFilter, accommodationFilter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (search) params.search = search;

      let { data: rowData } = await adminApi.getRegistrations({ ...params, limit: 1000 });

      if (accommodationFilter !== 'all') {
        rowData = rowData.filter((reg: Registration) => {
          if (accommodationFilter === 'covenant') {
            return ['covenant', 'covenant-guest-house', 'pg-hostel', 'camp-a'].includes(reg.accommodationType);
          }
          if (accommodationFilter === 'temperance') {
            return reg.accommodationType === 'temperance';
          }
          if (accommodationFilter === 'none') {
            return !reg.accommodationType || reg.accommodationType === 'no-accommodation' || reg.accommodationType === 'student-free';
          }
          return reg.accommodationType === accommodationFilter;
        });
      }

      setRegistrations(rowData);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
      toast({ title: 'Error', description: 'Failed to load registrations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (registration: Registration) => {
    setSelectedRegistration(registration);
    setDetailsOpen(true);
  };

  const exportToCSV = () => {
    const headers = [
      'Name', 'Email', 'Phone', 'Chapter', 'State', 'Age', 'Sex', 'Category',
      'Current Post', 'Previous Post', 'Arrival Date', 'Accommodation', 'Room Type',
      'Room Sharing', 'Roommate', 'Has Abstract', 'Presentation Title', 'Base Fee',
      'Late Fee', 'Total Amount', 'Payment Status', 'Payment Reference', 'Split Code',
      'Paid At', 'Attendance Verified', 'Registered At',
    ];

    const rows = registrations.map((reg) => [
      `${reg.firstName} ${reg.surname} ${reg.otherNames || ''}`.trim(),
      reg.email, reg.phone, reg.chapter, reg.state || '-', reg.age, reg.sex,
      formatAdminCategory(reg.category), reg.currentLeadershipPost || '-',
      reg.previousLeadershipPost || '-', formatAdminDate(reg.dateOfArrival),
      formatAccommodation(reg.accommodationType), reg.covenantRoomType || reg.temperanceRoomType || '-',
      reg.roomSharing || '-', reg.roommateName || '-', reg.hasAbstract ? 'Yes' : 'No',
      reg.presentationTitle || '-', formatAdminCurrency(reg.baseFee),
      formatAdminCurrency(reg.lateFee), formatAdminCurrency(reg.totalAmount),
      reg.paymentStatus, reg.paymentReference, reg.splitCode || '-',
      formatAdminDateTime(reg.paidAt), reg.attendanceVerified ? 'Yes' : 'No',
      formatAdminDateTime(reg.createdAt),
    ]);

    const csv = [headers, ...rows].map((row) => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registration-tracking-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'Registration data exported successfully' });
  };

  const downloadDocument = async (url: string, filename: string) => {
    try {
      toast({ title: 'Downloading...', description: 'Please wait while we prepare your document' });
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast({ title: 'Success', description: 'Document downloaded successfully' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to download document. Please try again.', variant: 'destructive' });
    }
  };

  const downloadAllAbstracts = async () => {
    const abstractRegistrations = registrations.filter((reg) => reg.hasAbstract && reg.abstractFileUrl);
    if (abstractRegistrations.length === 0) {
      toast({ title: 'No Abstracts', description: 'No abstracts available to download', variant: 'destructive' });
      return;
    }
    toast({ title: 'Downloading Abstracts', description: `Preparing ${abstractRegistrations.length} abstract(s)...` });
    for (const reg of abstractRegistrations) {
      await downloadDocument(reg.abstractFileUrl, `abstract-${reg.firstName}-${reg.surname}.pdf`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const accommodationSummary = {
    covenant: registrations.filter(r => ['covenant', 'covenant-guest-house', 'pg-hostel', 'camp-a'].includes(r.accommodationType)).length,
    temperance: registrations.filter(r => r.accommodationType === 'temperance').length,
    none: registrations.filter(r => !r.accommodationType || r.accommodationType === 'no-accommodation' || r.accommodationType === 'student-free').length,
  };

  const abstractCount = registrations.filter((reg) => reg.hasAbstract && reg.abstractFileUrl).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registration Tracking</h1>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Loading...' : `${formatAdminNumber(registrations.length)} registrations`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={downloadAllAbstracts} variant="outline" size="sm" disabled={abstractCount === 0}>
            <FileText className="w-4 h-4 mr-1.5" />
            Abstracts ({abstractCount})
          </Button>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Home className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Covenant University</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(accommodationSummary.covenant)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-50 p-2.5">
                <Home className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Temperance Hotel</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(accommodationSummary.temperance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-50 p-2.5">
                <Home className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">No Accommodation</p>
                <p className="text-2xl font-bold text-slate-900">{formatAdminNumber(accommodationSummary.none)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchRegistrations()}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
            <Select value={accommodationFilter} onValueChange={setAccommodationFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Accommodation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accommodation</SelectItem>
                <SelectItem value="covenant">Covenant University</SelectItem>
                <SelectItem value="temperance">Temperance Hotel</SelectItem>
                <SelectItem value="none">No Accommodation</SelectItem>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Name</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Email</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Phone</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Category</th>
                  <th className="text-left py-2.5 px-4 font-semibold text-slate-600">Accommodation</th>
                  <th className="text-center py-2.5 px-4 font-semibold text-slate-600">Status</th>
                  <th className="text-right py-2.5 px-4 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => (
                  <tr key={reg.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{reg.firstName} {reg.surname}</p>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-[200px] truncate">{reg.email}</td>
                    <td className="py-2.5 px-4 text-slate-600">{reg.phone}</td>
                    <td className="py-2.5 px-4">
                      <Badge variant="outline" className="text-xs font-normal">{formatAdminCategory(reg.category)}</Badge>
                    </td>
                    <td className="py-2.5 px-4">
                      {reg.accommodationType ? (
                        <Badge variant="outline" className="text-xs font-normal">{formatAccommodation(reg.accommodationType)}</Badge>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <PaymentStatusBadge status={reg.paymentStatus} />
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {reg.hasAbstract && reg.abstractFileUrl && (
                          <Button size="sm" variant="ghost" onClick={() => downloadDocument(reg.abstractFileUrl, `abstract-${reg.firstName}-${reg.surname}.pdf`)} className="h-7 text-xs text-slate-600">
                            <FileText className="w-3 h-3 mr-1" />
                            Abstract
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => viewDetails(reg)} className="h-7 text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base text-slate-900">Registration Details</DialogTitle>
          </DialogHeader>
          {selectedRegistration && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="cmda">CMDA Info</TabsTrigger>
                <TabsTrigger value="accommodation">Accommodation</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Full Name</label>
                    <p className="text-base text-slate-900">{selectedRegistration.firstName} {selectedRegistration.surname} {selectedRegistration.otherNames}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <p className="text-base text-slate-900">{selectedRegistration.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Phone</label>
                    <p className="text-base text-slate-900">{selectedRegistration.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Age</label>
                    <p className="text-base text-slate-900">{selectedRegistration.age}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Sex</label>
                    <p className="text-base text-slate-900">{selectedRegistration.sex}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Category</label>
                    <p className="text-base text-slate-900">{formatAdminCategory(selectedRegistration.category)}</p>
                  </div>
                </div>
                {selectedRegistration.category === 'doctor-with-spouse' && (
                  <>
                    <hr className="border-slate-200" />
                    <h3 className="font-semibold text-base text-slate-900">Spouse Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600">Spouse Name</label>
                        <p className="text-base text-slate-900">{selectedRegistration.spouseFirstName} {selectedRegistration.spouseSurname} {selectedRegistration.spouseOtherNames}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Spouse Email</label>
                        <p className="text-base text-slate-900">{selectedRegistration.spouseEmail || '-'}</p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="cmda" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Chapter</label>
                    <p className="text-base text-slate-900">{selectedRegistration.chapter}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Chapter of Graduation</label>
                    <p className="text-base text-slate-900">{selectedRegistration.chapterOfGraduation || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Current Leadership Post</label>
                    <p className="text-base text-slate-900">{selectedRegistration.currentLeadershipPost || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Previous Leadership Post</label>
                    <p className="text-base text-slate-900">{selectedRegistration.previousLeadershipPost || '-'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="accommodation" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Date of Arrival</label>
                    <p className="text-base text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatAdminDate(selectedRegistration.dateOfArrival)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Accommodation Type</label>
                    <p className="text-base text-slate-900 flex items-center gap-2">
                      <Home className="w-4 h-4 text-slate-400" />
                      {formatAccommodation(selectedRegistration.accommodationType)}
                    </p>
                  </div>
                  {selectedRegistration.accommodationType && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Room Type</label>
                        <p className="text-base text-slate-900">{selectedRegistration.covenantRoomType || selectedRegistration.temperanceRoomType || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Room Sharing</label>
                        <p className="text-base text-slate-900">{selectedRegistration.roomSharing || '-'}</p>
                      </div>
                      {selectedRegistration.roommateName && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-slate-600">Roommate Name</label>
                          <p className="text-base text-slate-900">{selectedRegistration.roommateName}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Payment Status</label>
                    <div className="mt-1"><PaymentStatusBadge status={selectedRegistration.paymentStatus} /></div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Payment Reference</label>
                    <p className="text-sm font-mono text-slate-900">{selectedRegistration.paymentReference}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Base Fee</label>
                    <p className="text-base text-slate-900">{formatAdminCurrency(selectedRegistration.baseFee)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Late Fee</label>
                    <p className="text-base text-slate-900">{formatAdminCurrency(selectedRegistration.lateFee)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Total Amount</label>
                    <p className="text-lg font-bold text-emerald-600">{formatAdminCurrency(selectedRegistration.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Paid At</label>
                    <p className="text-base text-slate-900">{formatAdminDateTime(selectedRegistration.paidAt)}</p>
                  </div>
                  {selectedRegistration.splitCode && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-slate-600">Split Code Used</label>
                      <Badge variant="outline" className="text-xs font-normal ml-2">{selectedRegistration.splitCode}</Badge>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-slate-600">Attendance Verified</label>
                    <p className="text-base text-slate-900">
                      {selectedRegistration.attendanceVerified ? (
                        <Badge variant="default" className="bg-emerald-600">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Not Verified</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Registered At</label>
                    <p className="text-base text-slate-900">{formatAdminDateTime(selectedRegistration.createdAt)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Abstract Submission</label>
                    <p className="text-base text-slate-900 mb-2">
                      {selectedRegistration.hasAbstract ? (
                        <Badge variant="default" className="bg-emerald-600">Submitted</Badge>
                      ) : (
                        <Badge variant="secondary">Not Submitted</Badge>
                      )}
                    </p>
                  </div>
                  {selectedRegistration.hasAbstract && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Presentation Title</label>
                        <p className="text-base text-slate-900">{selectedRegistration.presentationTitle || '-'}</p>
                      </div>
                      {selectedRegistration.abstractFileUrl && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">Abstract Document</label>
                          <div className="mt-2">
                            <Button onClick={() => downloadDocument(selectedRegistration.abstractFileUrl, `abstract-${selectedRegistration.firstName}-${selectedRegistration.surname}.pdf`)} variant="outline" className="w-full">
                              <FileText className="w-4 h-4 mr-2" />
                              Download Abstract
                            </Button>
                          </div>
                        </div>
                      )}
                      {!selectedRegistration.abstractFileUrl && (
                        <div>
                          <label className="text-sm font-medium text-slate-600">Abstract Document</label>
                          <p className="text-sm text-amber-600 mt-1">This registration has a presentation topic but no uploaded file.</p>
                        </div>
                      )}
                    </>
                  )}
                  {!selectedRegistration.hasAbstract && (
                    <div className="text-center py-8 text-slate-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No documents uploaded</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RegistrationTracking;
