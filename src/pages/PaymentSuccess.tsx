import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle, Download, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from '@/lib/axios';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const reference = searchParams.get('reference');
    
    if (!reference) {
      setStatus('error');
      setErrorMessage('No payment reference provided');
      return;
    }

    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await axios.post('/payment/verify', { reference });
      
      if (response.data.status === 'success') {
        setStatus('success');
        setPaymentData(response.data.data);
      } else {
        setStatus('error');
        setErrorMessage(response.data.message || 'Payment verification failed');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.response?.data?.message || 'Failed to verify payment');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="w-16 h-16 mx-auto text-purple-600 animate-spin mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verifying Payment...</h2>
              <p className="text-gray-600">Please wait while we confirm your payment</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-red-600 mb-4" />
            <CardTitle className="text-2xl text-red-900">Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-700">{errorMessage}</p>
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/')}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Return to Home
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'mailto:conference@cmdanigeria.org'}
                className="w-full"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-green-200">
        <CardHeader className="text-center bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg">
          <CheckCircle className="w-20 h-20 mx-auto mb-4" />
          <CardTitle className="text-3xl">Payment Successful! 🎉</CardTitle>
          <p className="text-green-50 mt-2">Your registration is confirmed</p>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4 text-green-900">
              Registration Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Reference:</span>
                <span className="font-mono font-semibold">{paymentData?.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Paid:</span>
                <span className="font-semibold text-green-700">
                  ₦{paymentData?.amount?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Date:</span>
                <span className="font-semibold">
                  {paymentData?.paidAt ? new Date(paymentData.paidAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-blue-900 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Check Your Email
            </h3>
            <p className="text-gray-700 mb-4">
              We've sent a confirmation email with your conference pass and QR code. 
              Please check your inbox and spam folder.
            </p>
            <div className="bg-white rounded p-4 border border-blue-100">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Important:</strong> Save the QR code from your email
              </p>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Present QR code at registration desk</li>
                <li>Keep your registration ID for reference</li>
                <li>Arrive early on conference day</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-3 text-purple-900">
              Conference Details
            </h3>
            <div className="space-y-2 text-gray-700">
              <p><strong>Event:</strong> CMDA National Conference 2026</p>
              <p><strong>Theme:</strong> Pursuing Excellence in Faith, Conduct and Practice</p>
              <p><strong>Date:</strong> 30th July – 2nd August, 2026</p>
              <p><strong>Venue:</strong> Covenant University, Ota</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate('/')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Return to Home
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Print Receipt
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>Need help? Contact us at{' '}
              <a 
                href="mailto:conference@cmdanigeria.org" 
                className="text-purple-600 hover:underline"
              >
                conference@cmdanigeria.org
              </a>
            </p>
            <p className="mt-2">
              Didn't receive confirmation?{' '}
              <a 
                href="/verify-payment" 
                className="text-purple-600 hover:underline font-semibold"
              >
                Verify your payment here
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
