import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))] flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <XCircle className="h-16 w-16 text-[hsl(var(--warning))] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Payment Cancelled</h2>
        <p className="text-[hsl(var(--muted))] mb-6">
          Your payment was cancelled. No charges have been made to your account.
        </p>
        <div className="space-y-2">
          <Button className="w-full" onClick={() => navigate('/dashboard')}>
            View My Bookings
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
            Search Flights
          </Button>
        </div>
      </Card>
    </div>
  );
}
