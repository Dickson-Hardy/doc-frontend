import { useState } from 'react';
import { Search, CheckCircle, XCircle, Loader2, Mail, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import axios from '@/lib/axios';
import { useToast } from '@/hooks/use-toast';

const VerifyPayment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reference, setReference] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    status: 'success' | 'error' | null;
    message: string;
    data?: any;
  }>({ status: null, message: '' });

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reference.trim()) {
      toast({
        title: 'Reference Required',
        description: 'Please enter your payment reference',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationResult({ status: null, message: '' });

    try {
      const response = await axios.post('/payment/verify', { reference: reference.trim() });
      
      if (response.data.status === 'success') {
        setVerificationResult({
          status: 'success',
          message: 'Payment verified successfully! Check your email for confirmation.',
          data: response.data.data,
        });
        
        toast({
          title: 'Payment Verified!',
          description: 'Your registration is confirmed. Check your email.',
        });
      } else {
        setVerificationResult({
          status: 'error',
          message: response.data.message || 'Payment verification failed',
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to verify payment. Please try again.';
      setVerificationResult({
        status: 'error',
        message: errorMessage,
      });
      
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
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
            <CardTitle className="text-3xl mb-2">Verify Your Payment</CardTitle>
            <CardDescription className="text-purple-50">
              Already paid but didn't receive confirmation? Verify your payment here.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">How to find your payment reference:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Check your email from Paystack</li>
                <li>Look for the transaction reference (starts with CMDA-)</li>
                <li>Or check your bank statement for the reference</li>
              </ul>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reference" className="text-base font-semibold">
                  Payment Reference
                </Label>
                <div className="relative">
                  <Input
                    id="reference"
                    type="text"
                    placeholder="e.g., CMDA-1234567890-abc123"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="pr-10 text-lg"
                    disabled={isVerifying}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">
                  Enter the payment reference from your transaction
                </p>
              </div>

              <Button
                type="submit"
                disabled={isVerifying || !reference.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-lg py-6"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Verifying Payment...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Verify Payment
                  </>
                )}
              </Button>
            </form>

            {verificationResult.status === 'success' && (
              <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-lg p-6 animate-fade-in">
                <div className="flex items-start gap-4">
                  <CheckCircle className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-900 text-lg mb-2">
                      Payment Verified Successfully! 🎉
                    </h3>
                    <p className="text-green-800 mb-4">{verificationResult.message}</p>
                    
                    {verificationResult.data && (
                      <div className="bg-white rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Reference:</span>
                          <span className="font-mono font-semibold">{verificationResult.data.reference}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-semibold text-green-700">
                            ₦{verificationResult.data.amount?.toLocaleString()}
                          </span>
                        </div>
                        {verificationResult.data.paidAt && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-semibold">
                              {new Date(verificationResult.data.paidAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex gap-3">
                      <Button
                        onClick={() => navigate('/')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        Return to Home
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = 'mailto:conference@cmdanigeria.org'}
                        className="flex-1"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {verificationResult.status === 'error' && (
              <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-lg p-6 animate-fade-in">
                <div className="flex items-start gap-4">
                  <XCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 text-lg mb-2">
                      Verification Failed
                    </h3>
                    <p className="text-red-800 mb-4">{verificationResult.message}</p>
                    
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-2">What to do next:</h4>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        <li>Double-check your payment reference</li>
                        <li>Ensure the payment was successful on Paystack</li>
                        <li>Wait a few minutes and try again</li>
                        <li>Contact support if the issue persists</li>
                      </ul>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => window.location.href = 'mailto:conference@cmdanigeria.org'}
                      className="w-full"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
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

export default VerifyPayment;
