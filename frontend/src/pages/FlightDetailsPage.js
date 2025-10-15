import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, Plane, Clock, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function FlightDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState(null);

  useEffect(() => {
    fetchFlight();
  }, [id]);

  const fetchFlight = async () => {
    try {
      const res = await axios.get(`${API}/flights/${id}`);
      setFlight(res.data);
    } catch (error) {
      toast.error('Failed to load flight details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const generateSeatMap = () => {
    if (!flight) return [];
    const rows = 10;
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const seats = [];
    const occupiedCount = flight.total_seats - flight.available_seats;

    for (let row = 1; row <= rows; row++) {
      for (let col of cols) {
        const seatId = `${row}${col}`;
        const seatIndex = (row - 1) * cols.length + cols.indexOf(col);
        seats.push({
          id: seatId,
          state: seatIndex < occupiedCount ? 'occupied' : 'available'
        });
      }
    }
    return seats;
  };

  const handleSeatSelect = (seat) => {
    if (seat.state === 'occupied') return;
    setSelectedSeat(seat.id);
  };

  const handleContinue = () => {
    if (!user) {
      toast.error('Please login to continue');
      navigate('/auth');
      return;
    }
    if (!selectedSeat) {
      toast.error('Please select a seat');
      return;
    }
    navigate(`/checkout/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  if (!flight) return null;

  const seats = generateSeatMap();

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Flight Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold">Flight Details</h2>
                <Badge>{flight.available_seats} seats left</Badge>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-[hsl(var(--muted))]">Flight Number</div>
                    <div className="text-lg font-mono font-semibold">{flight.flight_number}</div>
                  </div>
                  <Plane className="h-6 w-6 text-[hsl(var(--primary))]" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[hsl(var(--border))]">
                  <div>
                    <div className="text-sm text-[hsl(var(--muted))]">Departure</div>
                    <div className="text-xl font-semibold">{flight.source}</div>
                    <div className="text-sm text-[hsl(var(--muted))] flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(flight.departure_time), 'PPpp')}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[hsl(var(--muted))]">Arrival</div>
                    <div className="text-xl font-semibold">{flight.destination}</div>
                    <div className="text-sm text-[hsl(var(--muted))] flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(flight.arrival_time), 'PPpp')}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Seat Map */}
            <Card className="p-6" data-testid="seat-map-container">
              <h3 className="text-xl font-semibold mb-4">Select Your Seat</h3>
              
              {/* Legend */}
              <div className="flex items-center gap-6 mb-6 pb-4 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md border border-[hsl(var(--border))] bg-white"></div>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--primary))] text-white flex items-center justify-center text-xs"></div>
                  <span className="text-sm">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] flex items-center justify-center text-xs"></div>
                  <span className="text-sm">Occupied</span>
                </div>
              </div>

              {/* Seat Grid */}
              <div className="grid grid-cols-6 gap-2 max-w-md mx-auto">
                {seats.map((seat) => (
                  <button
                    key={seat.id}
                    onClick={() => handleSeatSelect(seat)}
                    disabled={seat.state === 'occupied'}
                    data-testid={`seat-button-${seat.id}`}
                    className={
                      `w-full aspect-square rounded-md text-xs font-medium flex items-center justify-center border transition-all
                      ${seat.state === 'occupied' 
                        ? 'bg-[hsl(var(--surface-2))] text-[hsl(var(--muted))] line-through cursor-not-allowed' 
                        : selectedSeat === seat.id
                        ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                        : 'bg-white text-[hsl(var(--fg))] hover:bg-[hsl(var(--surface-2))] border-[hsl(var(--border))]'
                      }`
                    }
                  >
                    {seat.id}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Price Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h3 className="text-xl font-semibold mb-4">Fare Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-[hsl(var(--border))]">
                  <span className="text-[hsl(var(--muted))]">Base Fare</span>
                  <span className="font-semibold">${flight.price.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center pb-4 border-b border-[hsl(var(--border))]">
                  <span className="text-[hsl(var(--muted))]">Taxes & Fees</span>
                  <span className="font-semibold">${(flight.price * 0.1).toFixed(2)}</span>
                </div>
                
                {selectedSeat && (
                  <div className="flex justify-between items-center pb-4 border-b border-[hsl(var(--border))]">
                    <span className="text-[hsl(var(--muted))]">Selected Seat</span>
                    <Badge variant="secondary">{selectedSeat}</Badge>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-4">
                  <span className="text-lg font-semibold">Total</span>
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-2xl font-bold">{(flight.price * 1.1).toFixed(2)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-6" 
                  onClick={handleContinue}
                  disabled={!selectedSeat}
                  data-testid="continue-to-checkout-button"
                >
                  Continue to Checkout
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
