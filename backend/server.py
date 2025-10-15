from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Stripe Configuration
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    password_hash: str
    role: str = "user"  # user or admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Flight(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    flight_number: str
    source: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    available_seats: int
    price: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FlightCreate(BaseModel):
    flight_number: str
    source: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    total_seats: int
    price: float

class FlightUpdate(BaseModel):
    flight_number: Optional[str] = None
    source: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    total_seats: Optional[int] = None
    available_seats: Optional[int] = None
    price: Optional[float] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    flight_id: str
    passenger_name: str
    passenger_contact: str
    seat_number: str
    status: str = "pending"  # pending, confirmed, cancelled
    price_paid: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    flight_id: str
    passenger_name: str
    passenger_contact: str
    seat_preference: Optional[str] = None

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    booking_id: str
    session_id: str
    amount: float
    method: str = "stripe"
    status: str = "pending"  # pending, success, failed
    transaction_reference: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Authorization header missing")
    token = authorization.split(' ')[1]
    payload = decode_token(token)
    user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0, 'password_hash': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Auth Routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({'email': user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="user"
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    token = create_token(user.id, user.email, user.role)
    return {"user_id": user.id, "token": token}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'], user['role'])
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role']
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Admin Flight Routes
@api_router.post("/admin/flights")
async def create_flight(flight_data: FlightCreate, admin: dict = Depends(get_admin_user)):
    flight = Flight(
        flight_number=flight_data.flight_number,
        source=flight_data.source,
        destination=flight_data.destination,
        departure_time=flight_data.departure_time,
        arrival_time=flight_data.arrival_time,
        total_seats=flight_data.total_seats,
        available_seats=flight_data.total_seats,
        price=flight_data.price
    )
    
    doc = flight.model_dump()
    doc['departure_time'] = doc['departure_time'].isoformat()
    doc['arrival_time'] = doc['arrival_time'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.flights.insert_one(doc)
    
    return {"flight_id": flight.id}

@api_router.put("/admin/flights/{flight_id}")
async def update_flight(flight_id: str, flight_data: FlightUpdate, admin: dict = Depends(get_admin_user)):
    flight = await db.flights.find_one({'id': flight_id}, {'_id': 0})
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    update_data = {k: v for k, v in flight_data.model_dump().items() if v is not None}
    if 'departure_time' in update_data:
        update_data['departure_time'] = update_data['departure_time'].isoformat()
    if 'arrival_time' in update_data:
        update_data['arrival_time'] = update_data['arrival_time'].isoformat()
    
    if update_data:
        await db.flights.update_one({'id': flight_id}, {'$set': update_data})
    
    return {"message": "Flight updated successfully"}

@api_router.delete("/admin/flights/{flight_id}")
async def delete_flight(flight_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.flights.delete_one({'id': flight_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flight not found")
    return {"message": "Flight deleted successfully"}

@api_router.get("/admin/flights")
async def get_all_flights_admin(admin: dict = Depends(get_admin_user)):
    flights = await db.flights.find({}, {'_id': 0}).to_list(1000)
    return {"flights": flights}

# Public Flight Search
@api_router.get("/flights/search")
async def search_flights(source: Optional[str] = None, destination: Optional[str] = None, date: Optional[str] = None):
    query = {}
    if source:
        query['source'] = {'$regex': source, '$options': 'i'}
    if destination:
        query['destination'] = {'$regex': destination, '$options': 'i'}
    if date:
        start = datetime.fromisoformat(date.replace('Z', '+00:00'))
        end = start + timedelta(days=1)
        query['departure_time'] = {'$gte': start.isoformat(), '$lt': end.isoformat()}
    
    flights = await db.flights.find(query, {'_id': 0}).to_list(1000)
    return {"flights": flights}

@api_router.get("/flights/{flight_id}")
async def get_flight(flight_id: str):
    flight = await db.flights.find_one({'id': flight_id}, {'_id': 0})
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    return flight

# Booking Routes
@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, current_user: dict = Depends(get_current_user)):
    flight = await db.flights.find_one({'id': booking_data.flight_id}, {'_id': 0})
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    
    if flight['available_seats'] <= 0:
        raise HTTPException(status_code=400, detail="No seats available")
    
    # Generate seat number
    seat_number = f"{flight['total_seats'] - flight['available_seats'] + 1}A"
    
    booking = Booking(
        user_id=current_user['id'],
        flight_id=booking_data.flight_id,
        passenger_name=booking_data.passenger_name,
        passenger_contact=booking_data.passenger_contact,
        seat_number=seat_number,
        status="pending",
        price_paid=flight['price']
    )
    
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bookings.insert_one(doc)
    
    # Decrease available seats
    await db.flights.update_one(
        {'id': booking_data.flight_id},
        {'$inc': {'available_seats': -1}}
    )
    
    return {
        "booking_id": booking.id,
        "payment_required": True,
        "amount": booking.price_paid
    }

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({'id': booking_id}, {'_id': 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied")
    
    flight = await db.flights.find_one({'id': booking['flight_id']}, {'_id': 0})
    booking['flight'] = flight
    
    return {"booking": booking}

@api_router.get("/bookings")
async def get_user_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({'user_id': current_user['id']}, {'_id': 0}).to_list(1000)
    
    # Enrich with flight data
    for booking in bookings:
        flight = await db.flights.find_one({'id': booking['flight_id']}, {'_id': 0})
        booking['flight'] = flight
    
    return {"bookings": bookings}

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({'id': booking_id}, {'_id': 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['user_id'] != current_user['id'] and current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Access denied")
    
    if booking['status'] == 'cancelled':
        raise HTTPException(status_code=400, detail="Booking already cancelled")
    
    # Update booking status
    await db.bookings.update_one(
        {'id': booking_id},
        {'$set': {'status': 'cancelled'}}
    )
    
    # Increase available seats
    await db.flights.update_one(
        {'id': booking['flight_id']},
        {'$inc': {'available_seats': 1}}
    )
    
    refund_amount = booking['price_paid'] * 0.8  # 80% refund
    
    return {
        "booking_id": booking_id,
        "status": "cancelled",
        "refund_amount": refund_amount
    }

# Payment Routes
@api_router.post("/payments/create-checkout")
async def create_checkout_session(request: Request, booking_id: str, origin_url: str, current_user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({'id': booking_id}, {'_id': 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Initialize Stripe
    host_url = origin_url
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{host_url}/payment-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{host_url}/payment-cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=booking['price_paid'],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "booking_id": booking_id,
            "user_id": current_user['id']
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    payment = Payment(
        booking_id=booking_id,
        session_id=session.session_id,
        amount=booking['price_paid'],
        method="stripe",
        status="pending",
        transaction_reference=session.session_id
    )
    
    payment_doc = payment.model_dump()
    payment_doc['created_at'] = payment_doc['created_at'].isoformat()
    await db.payment_transactions.insert_one(payment_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    # Initialize Stripe
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Get checkout status
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction
    payment = await db.payment_transactions.find_one({'session_id': session_id}, {'_id': 0})
    if payment:
        if status.payment_status == 'paid' and payment['status'] != 'success':
            await db.payment_transactions.update_one(
                {'session_id': session_id},
                {'$set': {'status': 'success', 'transaction_reference': session_id}}
            )
            
            # Update booking status
            await db.bookings.update_one(
                {'id': payment['booking_id']},
                {'$set': {'status': 'confirmed'}}
            )
    
    return status.model_dump()

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == 'paid':
            payment = await db.payment_transactions.find_one({'session_id': webhook_response.session_id}, {'_id': 0})
            if payment and payment['status'] != 'success':
                await db.payment_transactions.update_one(
                    {'session_id': webhook_response.session_id},
                    {'$set': {'status': 'success'}}
                )
                
                await db.bookings.update_one(
                    {'id': payment['booking_id']},
                    {'$set': {'status': 'confirmed'}}
                )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

# Admin Reports
@api_router.get("/admin/reports/bookings")
async def get_booking_reports(from_date: Optional[str] = None, to_date: Optional[str] = None, admin: dict = Depends(get_admin_user)):
    query = {}
    if from_date and to_date:
        query['created_at'] = {
            '$gte': from_date,
            '$lte': to_date
        }
    
    bookings = await db.bookings.find(query, {'_id': 0}).to_list(10000)
    
    total_bookings = len(bookings)
    revenue = sum(b['price_paid'] for b in bookings if b['status'] == 'confirmed')
    
    # Top routes
    route_counts = {}
    for booking in bookings:
        flight = await db.flights.find_one({'id': booking['flight_id']}, {'_id': 0})
        if flight:
            route = f"{flight['source']}-{flight['destination']}"
            route_counts[route] = route_counts.get(route, 0) + 1
    
    top_routes = [{'route': k, 'bookings': v} for k, v in sorted(route_counts.items(), key=lambda x: x[1], reverse=True)[:5]]
    
    return {
        "total_bookings": total_bookings,
        "revenue": revenue,
        "top_routes": top_routes
    }

@api_router.get("/admin/bookings")
async def get_all_bookings(admin: dict = Depends(get_admin_user)):
    bookings = await db.bookings.find({}, {'_id': 0}).to_list(1000)
    
    for booking in bookings:
        flight = await db.flights.find_one({'id': booking['flight_id']}, {'_id': 0})
        booking['flight'] = flight
        user = await db.users.find_one({'id': booking['user_id']}, {'_id': 0, 'password_hash': 0})
        booking['user'] = user
    
    return {"bookings": bookings}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()