import { useState } from 'react';
import { Search, CreditCard, Loader2, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';

interface PendingRegistration {
  registrationId: string;
  email: string;
  firstName: string;
  surname: string;
  category: string;
  totalAmount: number;
  paymentReference: string;
  createdAt: string;
}

const ResumePayment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registration, setRegistration] = useState<PendingRegistration | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: 'Email Required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    setError('');
    setRegistration(null);

    try {
      const response = await axios.get(`/registrations/check/${encodeURIComponent(email.trim())}`);
      
      if (response.data.exists) {
        if (response.data.status === 'paid') {
          setError('Your registration is already paid. Check your email for confirmation.');
        } else if (response.data.status === 'pending') {
          // Use the data from check endpoint directly
          setRegistration({
            registrationId: response.data.registrationId,
            email: email.trim(),
            firstName: '', // Will be filled from backend
            surname: '', // Will be filled from backend
            category: '', // Will be filled from backend
            totalAmount: 0, // Will be filled from backend
            paymentReference: response.data.paymentReference,
            createdAt: new Date().toISOString(),
          });
          
          // Fetch full details from a public endpoint
          try {
            const detailsResponse = await axios.get(`/registrations/${response.data.registrationId}`);
            if (detailsResponse.data) {
              setRegistration({
                registrationId: detailsResponse.data.id,
                email: detailsResponse.data.email,
                firstName: detailsResponse.data.firstName,
                surname: detailsResponse.data.surname,
                category: detailsResponse.data.category,
                totalAmount: detailsResponse.data.totalAmount,
                paymentReference: detailsResponse.data.paymentReference,
                createdAt: detailsResponse.data.createdAt,
              });
            }
          } catch (detailsError) {
            console.error('Failed to fetch details:', detailsError);
            // Continue with basic info from check endpoint
          }
        } else {
          setError(`Registration status: ${response.data.status}. Please contact support.`);
        }
      } else {
        setError('No registration found with this email. Please register first.');
      }
    } catch (error: any) {
      console.error('Failed to search registration:', error);
      setError(error.response?.data?.message || 'Failed to search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePayment = async () => {
    if (!registration) return;

    setIsProcessing(true);

    try {
      const response = await axios.post('/payment/initialize', {
        email: registration.email,
        amount: registration.totalAmount,
        reference: registration.paymentReference,
        metadata: {
          custom_fields: [
            {
              display_name: 'Registration ID',
              variable_name: 'registration_id',
              value: registration.registrationId,
            },
            {
              display_name: 'Full Name',
              variable_name: 'full_name',
              value: `${registration.firstName} ${registration.surname}`,
            },
            {
              display_name: 'Category',
              variable_name: 'category',
              value: registration.category,
            },
          ],
        },
      });

      const authorizationUrl = response?.data?.data?.authorization_url;
      if (!authorizationUrl) {
        throw new Error('Payment initialization failed: no authorization URL returned');
      }

      window.location.href = authorizationUrl;
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: error.message || 'Failed to initialize payment',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-3xl mb-2">Resume Payment</CardTitle>
            <CardDescription className="text-purple-50">
              Already registered but didn't complete payment? Continue here.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {!registration ? (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Enter the email you used to register</li>
                    <li>We'll find your pending registration</li>
                    <li>Complete your payment securely with Paystack</li>
                    <li>Receive your confirmation email immediately</li>
                  </ul>
                </div>

                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-semibold">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-10 text-lg"
                        disabled={isSearching}
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      Use the same email you registered with
                    </p>
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={isSearching || !email.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5 mr-2" />
                        Find My Registration
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="space-y-6">
                <Alert className="bg-green-50 border-green-200">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Registration found! Complete your payment below.
                  </AlertDescription>
                </Alert>

                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Registration Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-semibold">{registration.firstName} {registration.surname}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-semibold text-sm">{registration.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Category</p>
                        <p className="font-semibold">{getCategoryLabel(registration.category)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Registration Date</p>
                        <p className="font-semibold text-sm">
                          {new Date(registration.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200 bg-purple-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                      <span className="text-3xl font-bold text-purple-600">
                        ₦{registration.totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Payment Reference: <span className="font-mono">{registration.paymentReference}</span>
                    </p>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRegistration(null);
                      setEmail('');
                      setError('');
                    }}
                    className="flex-1"
                  >
                    Search Again
                  </Button>
                  <Button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-8 text-center text-sm text-gray-600">
              <p className="mb-2">Need help?</p>
              <a 
                href="mailto:conference@cmdanigeria.org" 
                className="text-purple-600 hover:underline font-semibold"
              >
                conference@cmdanigeria.org
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResumePayment;
