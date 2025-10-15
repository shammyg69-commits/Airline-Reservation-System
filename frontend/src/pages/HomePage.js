import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { CalendarIcon, Search, Plane, Clock, MapPin, User, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const airports = [
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy International' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles International' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare International" },
  { code: 'DFW', city: 'Dallas', name: 'Dallas/Fort Worth International' },
  { code: 'ATL', city: 'Atlanta', name: 'Hartsfield-Jackson Atlanta International' },
  { code: 'MIA', city: 'Miami', name: 'Miami International' },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco International' },
  { code: 'BOS', city: 'Boston', name: 'Logan International' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma International' },
  { code: 'LAS', city: 'Las Vegas', name: 'Harry Reid International' }
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState(null);
  const [flights, setFlights] = useState([]);
  const [searching, setSearching] = useState(false);
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      const params = {};
      if (from) params.source = from;
      if (to) params.destination = to;
      if (date) params.date = format(date, 'yyyy-MM-dd');
      
      const res = await axios.get(`${API}/flights/search`, { params });
      setFlights(res.data.flights);
      if (res.data.flights.length === 0) {
        toast.info('No flights found for your search criteria');
      }
    } catch (error) {
      toast.error('Failed to search flights');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[hsl(var(--surface))]/80 border-b border-[hsl(var(--border))]">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Plane className="h-6 w-6 text-[hsl(var(--primary))]" />
              <h1 className="text-2xl font-semibold">AeroFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-sm text-[hsl(var(--muted))]">{user.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} data-testid="dashboard-button">
                    <User className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                  {user.role === 'admin' && (
                    <Button variant="ghost" size="sm" onClick={() => navigate('/admin')} data-testid="admin-button">
                      Admin
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout} data-testid="logout-button">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate('/auth')} data-testid="login-button">
                  Login
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-[radial-gradient(1200px_600px_at_80%_-10%,hsl(186_60%_96%),transparent)]">
        <div className="noise-overlay"></div>
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-10 md:py-16">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Search Form */}
            <Card className="bg-[hsl(var(--surface))] shadow-[var(--shadow-soft)] border border-[hsl(var(--border))]">
              <div className="p-5 md:p-6">
                <h2 className="text-2xl md:text-3xl font-semibold mb-6">Find Your Flight</h2>
                <form onSubmit={handleSearch} data-testid="flight-search-form" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* From */}
                    <div className="space-y-2">
                      <Label>From</Label>
                      <Popover open={openFrom} onOpenChange={setOpenFrom}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="from-airport-input"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            {from || 'Select airport'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search airport..." />
                            <CommandList>
                              <CommandEmpty>No airport found.</CommandEmpty>
                              <CommandGroup>
                                {airports.map((airport) => (
                                  <CommandItem
                                    key={airport.code}
                                    onSelect={() => {
                                      setFrom(airport.city);
                                      setOpenFrom(false);
                                    }}
                                  >
                                    <span className="font-mono font-medium mr-2">{airport.code}</span>
                                    {airport.city}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* To */}
                    <div className="space-y-2">
                      <Label>To</Label>
                      <Popover open={openTo} onOpenChange={setOpenTo}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                            data-testid="to-airport-input"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            {to || 'Select airport'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0">
                          <Command>
                            <CommandInput placeholder="Search airport..." />
                            <CommandList>
                              <CommandEmpty>No airport found.</CommandEmpty>
                              <CommandGroup>
                                {airports.map((airport) => (
                                  <CommandItem
                                    key={airport.code}
                                    onSelect={() => {
                                      setTo(airport.city);
                                      setOpenTo(false);
                                    }}
                                  >
                                    <span className="font-mono font-medium mr-2">{airport.code}</span>
                                    {airport.city}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label>Departure Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="date-picker-input"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={searching}
                    data-testid="search-submit-button"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {searching ? 'Searching...' : 'Search Flights'}
                  </Button>
                </form>
              </div>
            </Card>

            {/* Hero Image */}
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1651924607898-1b0a7f53cc52?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxhaXJwbGFuZSUyMHdpbmclMjBhYm92ZSUyMGNsb3VkcyUyMHN1bnJpc2V8ZW58MHx8fHwxNzYwNTQ5MzA2fDA&ixlib=rb-4.1.0&q=85"
                alt="Airplane wing above clouds"
                className="rounded-xl shadow-[var(--shadow-hard)] w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Flight Results */}
      {flights.length > 0 && (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 py-10">
          <h3 className="text-2xl font-semibold mb-6">Available Flights</h3>
          <div className="space-y-4">
            {flights.map((flight) => (
              <Card 
                key={flight.id} 
                className="p-4 card-hover cursor-pointer" 
                onClick={() => navigate(`/flight/${flight.id}`)}
                data-testid="flight-result-card"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-12 md:col-span-3">
                    <div className="font-mono text-sm text-[hsl(var(--muted))]">Flight {flight.flight_number}</div>
                    <div className="text-lg font-semibold">{flight.source}</div>
                  </div>
                  <div className="col-span-12 md:col-span-2 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--muted))]" />
                    <div className="text-sm">
                      {new Date(flight.departure_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-2 flex items-center justify-center">
                    <div className="w-full h-[2px] bg-[hsl(var(--border))] relative">
                      <Plane className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[hsl(var(--surface))] text-[hsl(var(--primary))]" />
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-2 text-center">
                    <Clock className="h-4 w-4 mx-auto mb-1 text-[hsl(var(--muted))]" />
                    <div className="text-sm">
                      {new Date(flight.arrival_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3">
                    <div className="text-lg font-semibold text-right">{flight.destination}</div>
                    <div className="text-sm text-[hsl(var(--muted))] text-right">
                      {flight.available_seats} seats left
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-12 lg:col-span-12 flex items-center justify-between mt-4 pt-4 border-t border-[hsl(var(--border))]">
                    <Badge variant="secondary">{flight.available_seats > 10 ? 'Available' : 'Limited'}</Badge>
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-semibold">${flight.price}</div>
                      <Button size="sm" data-testid="select-fare-button">
                        Select
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
