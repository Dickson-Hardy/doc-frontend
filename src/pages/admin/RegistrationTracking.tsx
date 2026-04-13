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
import axios from '@/lib/axios';
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
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const response = await axios.get(`/admin/registrations?${params}`);
      let data = response.data;

      // Filter by accommodation type if needed
      if (accommodationFilter !== 'all') {
        data = data.filter((reg: Registration) => {
          if (accommodationFilter === 'covenant') {
            return ['covenant', 'covenant-guest-house', 'pg-hostel', 'camp-a'].includes(
              reg.accommodationType,
            );
          }

          if (accommodationFilter === 'temperance') {
            return reg.accommodationType === 'temperance';
          }

          if (accommodationFilter === 'none') {
            return (
              !reg.accommodationType ||
              reg.accommodationType === 'no-accommodation' ||
              reg.accommodationType === 'student-free'
            );
          }

          return reg.accommodationType === accommodationFilter;
        });
      }

      setRegistrations(data);
    } catch (error) {
      console.error('Failed to fetch registrations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load registrations',
        variant: 'destructive',
      });
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
      'Name',
      'Email',
      'Phone',
      'Age',
      'Sex',
      'Chapter',
      'Category',
      'Current Post',
      'Previous Post',
      'Arrival Date',
      'Accommodation',
      'Room Type',
      'Room Sharing',
      'Roommate',
      'Has Abstract',
      'Presentation Title',
      'Base Fee',
      'Late Fee',
      'Total Amount',
      'Payment Status',
      'Payment Reference',
      'Split Code',
      'Paid At',
      'Attendance Verified',
      'Registered At',
    ];

    const rows = registrations.map((reg) => [
      `${reg.firstName} ${reg.surname} ${reg.otherNames || ''}`.trim(),
      reg.email,
      reg.phone,
      reg.age,
      reg.sex,
      reg.chapter,
      formatAdminCategory(reg.category),
      reg.currentLeadershipPost || '-',
      reg.previousLeadershipPost || '-',
      formatAdminDate(reg.dateOfArrival),
      formatAccommodation(reg.accommodationType),
      reg.covenantRoomType || reg.temperanceRoomType || '-',
      reg.roomSharing || '-',
      reg.roommateName || '-',
      reg.hasAbstract ? 'Yes' : 'No',
      reg.presentationTitle || '-',
      formatAdminCurrency(reg.baseFee),
      formatAdminCurrency(reg.lateFee),
      formatAdminCurrency(reg.totalAmount),
      reg.paymentStatus,
      reg.paymentReference,
      reg.splitCode || '-',
      formatAdminDateTime(reg.paidAt),
      reg.attendanceVerified ? 'Yes' : 'No',
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

    toast({
      title: 'Success',
      description: 'Registration data exported successfully',
    });
  };

  const downloadDocument = async (url: string, filename: string) => {
    try {
      toast({
        title: 'Downloading...',
        description: 'Please wait while we prepare your document',
      });

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

      toast({
        title: 'Success',
        description: 'Document downloaded successfully',
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: 'Error',
        description: 'Failed to download document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const downloadAllAbstracts = async () => {
    const abstractRegistrations = registrations.filter(
      (reg) => reg.hasAbstract && reg.abstractFileUrl
    );

    if (abstractRegistrations.length === 0) {
      toast({
        title: 'No Abstracts',
        description: 'No abstracts available to download',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Downloading Abstracts',
      description: `Preparing ${abstractRegistrations.length} abstract(s)...`,
    });

    for (const reg of abstractRegistrations) {
      await downloadDocument(
        reg.abstractFileUrl,
        `abstract-${reg.firstName}-${reg.surname}.pdf`
      );
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getAccommodationSummary = () => {
    const summary = {
      covenant: 0,
      temperance: 0,
      none: 0,
    };

    registrations.forEach((reg) => {
      if (['covenant', 'covenant-guest-house', 'pg-hostel', 'camp-a'].includes(reg.accommodationType)) {
        summary.covenant++;
      }
      else if (reg.accommodationType === 'temperance') summary.temperance++;
      else summary.none++;
    });

    return summary;
  };

  const getAbstractCount = () => {
    return registrations.filter((reg) => reg.hasAbstract).length;
  };

  const abstractCount = getAbstractCount();
  const accommodationSummary = getAccommodationSummary();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registration Tracking</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive view of all conference registrations with detailed information
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={downloadAllAbstracts} 
            variant="outline"
            disabled={abstractCount === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Download Abstracts ({abstractCount})
          </Button>
          <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Accommodation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Covenant University
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatAdminNumber(accommodationSummary.covenant)}
            </div>
            <p className="text-xs text-gray-500 mt-1">registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Temperance Hotel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {formatAdminNumber(accommodationSummary.temperance)}
            </div>
            <p className="text-xs text-gray-500 mt-1">registrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              No Accommodation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600">
              {formatAdminNumber(accommodationSummary.none)}
            </div>
            <p className="text-xs text-gray-500 mt-1">registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search..."
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
              </SelectContent>
            </Select>
            <Select value={accommodationFilter} onValueChange={setAccommodationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Accommodation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accommodation</SelectItem>
                <SelectItem value="covenant">Covenant University</SelectItem>
                <SelectItem value="temperance">Temperance Hotel</SelectItem>
                <SelectItem value="none">No Accommodation</SelectItem>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Phone</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Accommodation</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
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
                      <td className="py-3 px-4 text-sm">{reg.phone}</td>
                      <td className="py-3 px-4 text-sm">{formatAdminCategory(reg.category)}</td>
                      <td className="py-3 px-4">
                        {reg.accommodationType ? (
                          <Badge variant="outline">
                            {formatAccommodation(reg.accommodationType)}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <PaymentStatusBadge status={reg.paymentStatus} />
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewDetails(reg)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
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

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
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
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-base">
                      {selectedRegistration.firstName} {selectedRegistration.surname} {selectedRegistration.otherNames}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-base">{selectedRegistration.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-base">{selectedRegistration.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Age</label>
                    <p className="text-base">{selectedRegistration.age}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Sex</label>
                    <p className="text-base">{selectedRegistration.sex}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Category</label>
                    <p className="text-base">{formatAdminCategory(selectedRegistration.category)}</p>
                  </div>
                </div>

                {selectedRegistration.category === 'doctor-with-spouse' && (
                  <>
                    <hr className="my-4" />
                    <h3 className="font-semibold text-lg mb-3">Spouse Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Spouse Name</label>
                        <p className="text-base">
                          {selectedRegistration.spouseFirstName} {selectedRegistration.spouseSurname} {selectedRegistration.spouseOtherNames}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Spouse Email</label>
                        <p className="text-base">{selectedRegistration.spouseEmail || '-'}</p>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="cmda" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Chapter</label>
                    <p className="text-base">{selectedRegistration.chapter}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Chapter of Graduation</label>
                    <p className="text-base">{selectedRegistration.chapterOfGraduation || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Current Leadership Post</label>
                    <p className="text-base">{selectedRegistration.currentLeadershipPost || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Previous Leadership Post</label>
                    <p className="text-base">{selectedRegistration.previousLeadershipPost || '-'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="accommodation" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Date of Arrival</label>
                    <p className="text-base flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {formatAdminDate(selectedRegistration.dateOfArrival)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Accommodation Type</label>
                    <p className="text-base flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      {formatAccommodation(selectedRegistration.accommodationType)}
                    </p>
                  </div>
                  {selectedRegistration.accommodationType && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Room Type</label>
                        <p className="text-base">
                          {selectedRegistration.covenantRoomType || selectedRegistration.temperanceRoomType || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Room Sharing</label>
                        <p className="text-base">{selectedRegistration.roomSharing || '-'}</p>
                      </div>
                      {selectedRegistration.roommateName && (
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-600">Roommate Name</label>
                          <p className="text-base">{selectedRegistration.roommateName}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Status</label>
                    <div className="mt-1">
                      <PaymentStatusBadge status={selectedRegistration.paymentStatus} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Payment Reference</label>
                    <p className="text-base font-mono text-sm">{selectedRegistration.paymentReference}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Base Fee</label>
                    <p className="text-base">{formatAdminCurrency(selectedRegistration.baseFee)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Late Fee</label>
                    <p className="text-base">{formatAdminCurrency(selectedRegistration.lateFee)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Total Amount</label>
                    <p className="text-lg font-bold text-green-600">
                      {formatAdminCurrency(selectedRegistration.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Paid At</label>
                    <p className="text-base">
                      {formatAdminDateTime(selectedRegistration.paidAt)}
                    </p>
                  </div>
                  {selectedRegistration.splitCode && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Split Code Used</label>
                      <Badge variant="outline" className="text-purple-600 border-purple-300 ml-2">
                        {selectedRegistration.splitCode}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-600">Attendance Verified</label>
                    <p className="text-base">
                      {selectedRegistration.attendanceVerified ? (
                        <Badge variant="default">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Not Verified</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Registered At</label>
                    <p className="text-base">{formatAdminDateTime(selectedRegistration.createdAt)}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Abstract Submission</label>
                    <p className="text-base mb-2">
                      {selectedRegistration.hasAbstract ? (
                        <Badge variant="default">Submitted</Badge>
                      ) : (
                        <Badge variant="secondary">Not Submitted</Badge>
                      )}
                    </p>
                  </div>

                  {selectedRegistration.hasAbstract && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Presentation Title</label>
                        <p className="text-base">{selectedRegistration.presentationTitle || '-'}</p>
                      </div>

                      {selectedRegistration.abstractFileUrl && (
                        <div>
                          <label className="text-sm font-medium text-gray-600">Abstract Document</label>
                          <div className="mt-2">
                            <Button
                              onClick={() => downloadDocument(
                                selectedRegistration.abstractFileUrl,
                                `abstract-${selectedRegistration.firstName}-${selectedRegistration.surname}.pdf`
                              )}
                              variant="outline"
                              className="w-full"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Download Abstract
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!selectedRegistration.hasAbstract && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No documents uploaded</p>
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
