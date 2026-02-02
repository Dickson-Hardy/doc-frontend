import { UseFormReturn } from 'react-hook-form';
import { RegistrationFormData } from '@/types/registration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, User, Building2, Calendar, Hotel, FileText, Users } from 'lucide-react';

interface ReviewStepProps {
  form: UseFormReturn<RegistrationFormData>;
  totalAmount: number;
}

const ReviewStep = ({ form, totalAmount }: ReviewStepProps) => {
const formData = form.getValues();



  const formatDate = (date: Date | string) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'student': 'Student',
      'junior-doctor': 'Junior Doctor',
      'senior-doctor': 'Senior Doctor',
      'doctor-with-spouse': 'Doctor with Spouse',
    };
    return labels[category] || category;
  };

  const getAccommodationLabel = () => {
    switch (formData.accommodationType) {
      case 'covenant-guest-house':
        return `Covenant Guest House - ${formData.covenantRoomType?.replace('-', ' ').toUpperCase()}`;
      case 'pg-hostel':
        return 'PG Hostel - Standard Room';
      case 'camp-a':
        return 'Camp A - Standard Bed';
      case 'temperance':
        return `Temperance (Bells University) - ${formData.temperanceRoomType?.replace('-', ' ').toUpperCase()}`;
      case 'student-free':
        return 'Student Accommodation (Free)';
      case 'no-accommodation':
        return 'No Accommodation Needed (Own Arrangement)';
      default:
        return 'Not selected';
    }
  };

  const getRoomSharingLabel = () => {
    if (formData.accommodationType === 'student-free' || formData.accommodationType === 'no-accommodation') return 'N/A';
    if (formData.accommodationType === 'camp-a') {
      return formData.roommateName ? `Pairing with: ${formData.roommateName}` : 'Auto-pairing';
    }
    if (formData.roomSharing === 'shared') {
      return formData.roommateName ? `Shared - Pairing with: ${formData.roommateName}` : 'Shared - Auto-pairing';
    }
    if (formData.roomSharing === 'private') return 'Private Room';
    return 'Not specified';
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Review Your Registration</h3>
        <p className="text-muted-foreground">
          Please review all information carefully before proceeding to payment
        </p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{formData.surname} {formData.firstName} {formData.otherNames}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{formData.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{formData.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Age & Gender</p>
              <p className="font-medium">{formData.age} years, {formData.sex}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CMDA Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            CMDA Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <Badge variant="secondary" className="mt-1">
                {getCategoryLabel(formData.category)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chapter</p>
              <p className="font-medium">{formData.chapter}</p>
            </div>
            {formData.chapterOfGraduation && (
              <div>
                <p className="text-sm text-muted-foreground">Chapter of Graduation</p>
                <p className="font-medium">{formData.chapterOfGraduation}</p>
              </div>
            )}
            {formData.currentLeadershipPost && (
              <div>
                <p className="text-sm text-muted-foreground">Current Leadership Post</p>
                <p className="font-medium">{formData.currentLeadershipPost}</p>
              </div>
            )}
            {formData.previousLeadershipPost && (
              <div>
                <p className="text-sm text-muted-foreground">Previous Leadership Post</p>
                <p className="font-medium">{formData.previousLeadershipPost}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Spouse Details (if applicable) */}
      {formData.category === 'doctor-with-spouse' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Spouse Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Spouse Name</p>
                <p className="font-medium">
                  {formData.spouseSurname} {formData.spouseFirstName} {formData.spouseOtherNames}
                </p>
              </div>
              {formData.spouseEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Spouse Email</p>
                  <p className="font-medium">{formData.spouseEmail}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Logistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <p className="text-sm text-muted-foreground">Date of Arrival</p>
            <p className="font-medium">{formatDate(formData.dateOfArrival)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Accommodation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hotel className="w-5 h-5" />
            Accommodation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Accommodation Type</p>
            <p className="font-medium">{getAccommodationLabel()}</p>
          </div>
          {formData.accommodationType && formData.accommodationType !== 'student-free' && (
            <div>
              <p className="text-sm text-muted-foreground">Room Arrangement</p>
              <p className="font-medium">{getRoomSharingLabel()}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Abstract Submission */}
      {formData.hasAbstract && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Abstract Submission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Presentation Title</p>
              <p className="font-medium">{formData.presentationTitle}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Abstract File</p>
              <Badge variant="outline" className="mt-1">
                <FileText className="w-3 h-3 mr-1" />
                File uploaded
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Registration Fee</span>
              <span className="font-medium">₦{totalAmount.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-primary">₦{totalAmount.toLocaleString()}</span>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You will be redirected to Paystack to complete your payment securely.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="space-y-2 text-sm text-amber-900">
            <p className="font-semibold">Before you proceed:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Ensure all information above is correct</li>
              <li>You can use the "Previous" button to make changes</li>
              <li>After payment, you will receive a confirmation email</li>
              <li>Keep your payment reference for future correspondence</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewStep;
