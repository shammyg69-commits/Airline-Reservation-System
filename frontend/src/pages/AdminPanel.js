import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API, AuthContext } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ArrowLeft, Plus, TrendingUp, Users, Plane, DollarSign, Edit, Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightForm, setFlightForm] = useState({
    flight_number: '',
    source: '',
    destination: '',
    departure_time: '',
    arrival_time: '',
    total_seats: '',
    price: ''
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [flightsRes, bookingsRes, reportsRes] = await Promise.all([
        axios.get(`${API}/admin/flights`, { headers }),
        axios.get(`${API}/admin/bookings`, { headers }),
        axios.get(`${API}/admin/reports/bookings`, { headers })
      ]);

      setFlights(flightsRes.data.flights);
      setBookings(bookingsRes.data.bookings);
      setReports(reportsRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlight = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/flights`, {
        ...flightForm,
        departure_time: new Date(flightForm.departure_time).toISOString(),
        arrival_time: new Date(flightForm.arrival_time).toISOString(),
        total_seats: parseInt(flightForm.total_seats),
        price: parseFloat(flightForm.price)
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast.success('Flight created successfully');
      setShowCreateDialog(false);
      setFlightForm({
        flight_number: '',
        source: '',
        destination: '',
        departure_time: '',
        arrival_time: '',
        total_seats: '',
        price: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create flight');
    }
  };

  const handleUpdateFlight = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const updateData = {
        ...flightForm,
        total_seats: flightForm.total_seats ? parseInt(flightForm.total_seats) : undefined,
        price: flightForm.price ? parseFloat(flightForm.price) : undefined
      };
      
      if (flightForm.departure_time) {
        updateData.departure_time = new Date(flightForm.departure_time).toISOString();
      }
      if (flightForm.arrival_time) {
        updateData.arrival_time = new Date(flightForm.arrival_time).toISOString();
      }

      await axios.put(`${API}/admin/flights/${selectedFlight.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Flight updated successfully');
      setShowEditDialog(false);
      setSelectedFlight(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update flight');
    }
  };

  const handleDeleteFlight = async (flightId) => {
    if (!window.confirm('Are you sure you want to delete this flight?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/flights/${flightId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Flight deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete flight');
    }
  };

  const openEditDialog = (flight) => {
    setSelectedFlight(flight);
    setFlightForm({
      flight_number: flight.flight_number,
      source: flight.source,
      destination: flight.destination,
      departure_time: flight.departure_time ? new Date(flight.departure_time).toISOString().slice(0, 16) : '',
      arrival_time: flight.arrival_time ? new Date(flight.arrival_time).toISOString().slice(0, 16) : '',
      total_seats: flight.total_seats?.toString() || '',
      price: flight.price?.toString() || ''
    });
    setShowEditDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]"></div>
      </div>
    );
  }

  // Prepare chart data
  const statusData = [
    { name: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, fill: 'hsl(var(--chart-1))' },
    { name: 'Pending', value: bookings.filter(b => b.status === 'pending').length, fill: 'hsl(var(--chart-3))' },
    { name: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, fill: 'hsl(var(--chart-4))' }
  ];

  const routeData = reports?.top_routes?.map(r => ({
    name: r.route,
    bookings: r.bookings
  })) || [];

  return (
    <div className="min-h-screen bg-[hsl(var(--bg))]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Button variant="ghost" onClick={() => navigate('/')} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-3xl font-semibold">Admin Panel</h1>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="flights">Flights</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card data-testid="admin-kpi-card-bookings">
                <CardHeader className="pb-2">
                  <CardDescription>Total Bookings</CardDescription>
                  <CardTitle className="text-3xl">{reports?.total_bookings || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-[hsl(var(--success))]">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span className="text-sm">Active system</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="admin-kpi-card-revenue">
                <CardHeader className="pb-2">
                  <CardDescription>Total Revenue</CardDescription>
                  <CardTitle className="text-3xl">${reports?.revenue?.toFixed(2) || '0.00'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-[hsl(var(--chart-1))]">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span className="text-sm">From confirmed bookings</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="admin-kpi-card-flights">
                <CardHeader className="pb-2">
                  <CardDescription>Active Flights</CardDescription>
                  <CardTitle className="text-3xl">{flights.length}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-[hsl(var(--chart-2))]">
                    <Plane className="h-4 w-4 mr-1" />
                    <span className="text-sm">In system</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="admin-kpi-card-load-factor">
                <CardHeader className="pb-2">
                  <CardDescription>Avg Load Factor</CardDescription>
                  <CardTitle className="text-3xl">
                    {flights.length > 0 
                      ? Math.round((flights.reduce((sum, f) => sum + (f.total_seats - f.available_seats), 0) / flights.reduce((sum, f) => sum + f.total_seats, 0)) * 100)
                      : 0}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-[hsl(var(--chart-5))]">
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-sm">Seat occupancy</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Routes by Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={routeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="bookings" fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Flights Tab */}
          <TabsContent value="flights" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Flight Management</h2>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="create-flight-button">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Flight
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Flight</DialogTitle>
                    <DialogDescription>Add a new flight to the system</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateFlight} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="flight_number">Flight Number</Label>
                        <Input
                          id="flight_number"
                          value={flightForm.flight_number}
                          onChange={(e) => setFlightForm({ ...flightForm, flight_number: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={flightForm.price}
                          onChange={(e) => setFlightForm({ ...flightForm, price: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="source">Source</Label>
                        <Input
                          id="source"
                          value={flightForm.source}
                          onChange={(e) => setFlightForm({ ...flightForm, source: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destination">Destination</Label>
                        <Input
                          id="destination"
                          value={flightForm.destination}
                          onChange={(e) => setFlightForm({ ...flightForm, destination: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="departure_time">Departure Time</Label>
                        <Input
                          id="departure_time"
                          type="datetime-local"
                          value={flightForm.departure_time}
                          onChange={(e) => setFlightForm({ ...flightForm, departure_time: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="arrival_time">Arrival Time</Label>
                        <Input
                          id="arrival_time"
                          type="datetime-local"
                          value={flightForm.arrival_time}
                          onChange={(e) => setFlightForm({ ...flightForm, arrival_time: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="total_seats">Total Seats</Label>
                      <Input
                        id="total_seats"
                        type="number"
                        value={flightForm.total_seats}
                        onChange={(e) => setFlightForm({ ...flightForm, total_seats: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Flight</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight #</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flights.map((flight) => (
                    <TableRow key={flight.id}>
                      <TableCell className="font-mono font-semibold">{flight.flight_number}</TableCell>
                      <TableCell>{flight.source} → {flight.destination}</TableCell>
                      <TableCell>{format(new Date(flight.departure_time), 'PPp')}</TableCell>
                      <TableCell>
                        {flight.available_seats}/{flight.total_seats}
                      </TableCell>
                      <TableCell>${flight.price}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(flight)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteFlight(flight.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Flight</DialogTitle>
                  <DialogDescription>Update flight information</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateFlight} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_flight_number">Flight Number</Label>
                      <Input
                        id="edit_flight_number"
                        value={flightForm.flight_number}
                        onChange={(e) => setFlightForm({ ...flightForm, flight_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_price">Price ($)</Label>
                      <Input
                        id="edit_price"
                        type="number"
                        step="0.01"
                        value={flightForm.price}
                        onChange={(e) => setFlightForm({ ...flightForm, price: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_source">Source</Label>
                      <Input
                        id="edit_source"
                        value={flightForm.source}
                        onChange={(e) => setFlightForm({ ...flightForm, source: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_destination">Destination</Label>
                      <Input
                        id="edit_destination"
                        value={flightForm.destination}
                        onChange={(e) => setFlightForm({ ...flightForm, destination: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_departure_time">Departure Time</Label>
                      <Input
                        id="edit_departure_time"
                        type="datetime-local"
                        value={flightForm.departure_time}
                        onChange={(e) => setFlightForm({ ...flightForm, departure_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_arrival_time">Arrival Time</Label>
                      <Input
                        id="edit_arrival_time"
                        type="datetime-local"
                        value={flightForm.arrival_time}
                        onChange={(e) => setFlightForm({ ...flightForm, arrival_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_total_seats">Total Seats</Label>
                    <Input
                      id="edit_total_seats"
                      type="number"
                      value={flightForm.total_seats}
                      onChange={(e) => setFlightForm({ ...flightForm, total_seats: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Update Flight</Button>
                </form>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <h2 className="text-2xl font-semibold">All Bookings</h2>
            <Card data-testid="admin-bookings-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Seat</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-mono text-sm">{booking.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div>{booking.passenger_name}</div>
                        <div className="text-sm text-[hsl(var(--muted))]">{booking.user?.email}</div>
                      </TableCell>
                      <TableCell className="font-mono">{booking.flight?.flight_number}</TableCell>
                      <TableCell>
                        {booking.flight?.source} → {booking.flight?.destination}
                      </TableCell>
                      <TableCell>{booking.seat_number}</TableCell>
                      <TableCell>${booking.price_paid}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            booking.status === 'confirmed'
                              ? 'bg-[hsl(var(--success))]'
                              : booking.status === 'pending'
                              ? 'bg-[hsl(var(--warning))]'
                              : 'bg-[hsl(var(--destructive))]'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
