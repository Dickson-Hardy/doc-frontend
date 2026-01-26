import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref');
    
    // Paystack returns either 'reference' or 'trxref'
    const paymentReference = reference || trxref;

    if (paymentReference) {
      // Redirect to success page with reference
      navigate(`/payment/success?reference=${paymentReference}`);
    } else {
      // No reference, redirect to home
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-16 h-16 mx-auto text-purple-600 animate-spin mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Processing payment...</h2>
        <p className="text-gray-600 mt-2">Please wait</p>
      </div>
    </div>
  );
};

export default PaymentCallback;
