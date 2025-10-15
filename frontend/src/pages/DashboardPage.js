import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { ArrowLeft, Plane, Calendar, MapPin, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(res.data.bookings);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel booking');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-[hsl(var(--success))] text-white';
      case 'pending': return 'bg-[hsl(var(--warning))] text-white';
      case 'cancelled': return 'bg-[hsl(var(--destructive))] text-white';
      default: return 'bg-[hsl(var(--muted))]';
    }
  };

  const filterBookings = (status) => {
    const now = new Date();
    return bookings.filter(b => {
      if (status === 'upcoming') {
        return b.status === 'confirmed' && new Date(b.flight.departure_time) > now;
      } else if (status === 'past') {
        return b.status === 'confirmed' && new Date(b.flight.departure_time) <= now;
      } else if (status === 'cancelled') {
        return b.status === 'cancelled';
      }
      return true;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-semibold">My Bookings</h1>
            <p className="text-[hsl(var(--muted))]">{user?.name}</p>
          </div>
        </div>

        <Tabs defaultValue="upcoming" data-testid="dashboard-tabs">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          {['upcoming', 'past', 'cancelled'].map((status) => (
            <TabsContent key={status} value={status} className="mt-6">
              {filterBookings(status).length === 0 ? (
                <Card className="p-12 text-center">
                  <Plane className="h-12 w-12 mx-auto mb-4 text-[hsl(var(--muted))]" />
                  <p className="text-[hsl(var(--muted))]">No {status} bookings</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filterBookings(status).map((booking) => (
                    <Card key={booking.id} className="p-4 md:p-5" data-testid="ticket-card">
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-[hsl(var(--muted))]">Booking ID</div>
                          <div className="font-mono text-sm font-semibold">{booking.id.slice(0, 8)}</div>
                          <Badge className={`mt-2 ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </Badge>
                        </div>

                        <div>
                          <div className="text-sm text-[hsl(var(--muted))]">Flight</div>
                          <div className="font-semibold">{booking.flight?.flight_number}</div>
                          <div className="text-sm mt-1">
                            {booking.flight?.source} → {booking.flight?.destination}
                          </div>
                        </div>

                        <div>
                          <div className="text-sm text-[hsl(var(--muted))]">Departure</div>
                          <div className="font-semibold">
                            {format(new Date(booking.flight?.departure_time), 'PPp')}
                          </div>
                          <div className="text-sm text-[hsl(var(--muted))] mt-1">
                            Seat {booking.seat_number}
                          </div>
                        </div>

                        <div className="flex items-center md:justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedBooking(booking)}>
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Booking Details</DialogTitle>
                              </DialogHeader>
                              {selectedBooking && (
                                <div className="space-y-4 pt-4">
                                  <div>
                                    <div className="text-sm text-[hsl(var(--muted))]">Passenger Name</div>
                                    <div className="font-semibold">{selectedBooking.passenger_name}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-[hsl(var(--muted))]">Contact</div>
                                    <div className="font-semibold">{selectedBooking.passenger_contact}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-[hsl(var(--muted))]">Amount Paid</div>
                                    <div className="text-2xl font-bold">${selectedBooking.price_paid}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-[hsl(var(--muted))]">Booking Date</div>
                                    <div>{format(new Date(selectedBooking.created_at), 'PPpp')}</div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>

                          {booking.status === 'confirmed' && status === 'upcoming' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" data-testid="cancel-booking-button">
                                  Cancel
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking? You will receive 80% refund.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>No, keep it</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleCancelBooking(booking.id)}>
                                    Yes, cancel
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
