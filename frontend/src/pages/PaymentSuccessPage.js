import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId && user) {
      pollPaymentStatus(sessionId);
    } else if (!user) {
      navigate('/auth');
    }
  }, [searchParams, user]);

  const pollPaymentStatus = async (sessionId, attemptCount = 0) => {
    if (attemptCount >= 5) {
      setStatus('timeout');
      toast.error('Payment verification timed out. Please check your bookings.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/payments/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.payment_status === 'paid') {
        setStatus('success');
        toast.success('Payment successful!');
      } else if (res.data.status === 'expired') {
        setStatus('failed');
        toast.error('Payment session expired');
      } else {
        // Continue polling
        setTimeout(() => {
          setAttempts(attemptCount + 1);
          pollPaymentStatus(sessionId, attemptCount + 1);
        }, 2000);
      }
    } catch (error) {
      setStatus('error');
      toast.error('Failed to verify payment');
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {status === 'checking' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[hsl(var(--primary))] mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold mb-2">Verifying Payment</h2>
            <p className="text-[hsl(var(--muted))]">Please wait while we confirm your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-16 w-16 text-[hsl(var(--success))] mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Payment Successful!</h2>
            <p className="text-[hsl(var(--muted))] mb-6">Your booking has been confirmed. Thank you for your purchase.</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                View My Bookings
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Book Another Flight
              </Button>
            </div>
          </>
        )}

        {(status === 'failed' || status === 'error' || status === 'timeout') && (
          <>
            <div className="h-16 w-16 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Payment Issue</h2>
            <p className="text-[hsl(var(--muted))] mb-6">
              {status === 'timeout' 
                ? 'Payment verification timed out. Please check your email or contact support.'
                : 'There was an issue with your payment. Please try again.'}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                Check My Bookings
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
