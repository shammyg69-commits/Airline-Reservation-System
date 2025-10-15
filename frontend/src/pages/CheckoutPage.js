import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState(1);
  const [passengerData, setPassengerData] = useState({
    name: user?.name || '',
    contact: ''
  });

  useEffect(() => {
    fetchFlight();
  }, [flightId]);

  const fetchFlight = async () => {
    try {
      const res = await axios.get(`${API}/flights/${flightId}`);
      setFlight(res.data);
    } catch (error) {
      toast.error('Failed to load flight details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handlePassengerSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // Create booking
      const bookingRes = await axios.post(
        `${API}/bookings`,
        {
          flight_id: flightId,
          passenger_name: passengerData.name,
          passenger_contact: passengerData.contact
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const bookingId = bookingRes.data.booking_id;
      
      // Create Stripe checkout session
      const originUrl = window.location.origin;
      const paymentRes = await axios.post(
        `${API}/payments/create-checkout?booking_id=${bookingId}&origin_url=${originUrl}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Redirect to Stripe
      window.location.href = paymentRes.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Booking failed');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (!flight) return null;

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      <div className="mx-auto max-w-[1000px] px-4 sm:px-6 md:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(`/flight/${flightId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Passenger Details</span>
            <span className="text-sm font-medium">Payment</span>
          </div>
          <Progress value={step * 50} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <Card className="p-6" data-testid="checkout-form">
              <h2 className="text-2xl font-semibold mb-6">Passenger Information</h2>
              
              <form onSubmit={handlePassengerSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="passenger-name">Full Name</Label>
                  <Input
                    id="passenger-name"
                    type="text"
                    placeholder="John Doe"
                    value={passengerData.name}
                    onChange={(e) => setPassengerData({ ...passengerData, name: e.target.value })}
                    required
                    data-testid="passenger-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passenger-contact">Contact Number</Label>
                  <Input
                    id="passenger-contact"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={passengerData.contact}
                    onChange={(e) => setPassengerData({ ...passengerData, contact: e.target.value })}
                    required
                    data-testid="passenger-contact-input"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted))] bg-[hsl(var(--surface-2))] p-4 rounded-lg mt-6">
                  <Lock className="h-4 w-4" />
                  <span>Payments are securely processed by Stripe. We never store your card details.</span>
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  disabled={processing}
                  data-testid="pay-now-button"
                >
                  {processing ? (
                    'Processing...'
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Proceed to Payment
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl font-semibold mb-4">Booking Summary</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-[hsl(var(--muted))]">Flight</div>
                  <div className="font-semibold">{flight.flight_number}</div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="text-sm text-[hsl(var(--muted))]">Route</div>
                  <div className="font-semibold">{flight.source} → {flight.destination}</div>
                </div>
                
                <Separator />
                
                <div>
                  <div className="text-sm text-[hsl(var(--muted))]">Departure</div>
                  <div className="font-semibold">
                    {new Date(flight.departure_time).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                
                <Separator />
                
                <div className="pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[hsl(var(--muted))]">Base Fare</span>
                    <span>${flight.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[hsl(var(--muted))]">Taxes</span>
                    <span>${(flight.price * 0.1).toFixed(2)}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold">${(flight.price * 1.1).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
