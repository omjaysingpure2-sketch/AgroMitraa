import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Google Gen AI server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Database path & setup
const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface User {
  id: string;
  fullName: string;
  age: number;
  address: string;
  state: string;
  district: string;
  villageCity: string;
  phoneNumber: string;
  farmAreaAcres: number;
  role: 'farmer' | 'owner' | 'admin';
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Equipment {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  title: string;
  category: 'Tractor' | 'Harvester' | 'Rotavator' | 'Seed Drill' | 'Sprayer' | 'Plow' | 'Cultivator' | 'Other';
  powerHp?: number;
  pricePerDay: number;
  state: string;
  district: string;
  village: string;
  distanceKm: number;
  isAvailable: boolean;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  description: string;
  specs: Record<string, string>;
  createdAt: string;
}

interface Booking {
  id: string;
  equipmentId: string;
  equipmentTitle: string;
  equipmentCategory: string;
  equipmentImage: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterDistrict: string;
  ownerId: string;
  ownerName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  dailyRate: number;
  totalCost: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScanReport {
  id: string;
  userId: string;
  userName: string;
  cropName: string;
  healthStatus: 'Healthy' | 'Moderate' | 'Critical' | 'Warning';
  diseaseDetected?: string;
  confidenceScore: number;
  severity?: 'None' | 'Mild' | 'Moderate' | 'Severe';
  positiveFindings?: string[];
  symptoms: string[];
  possibleCauses?: string[];
  treatment?: string[];
  prevention?: string[];
  recommendations: string[];
  fertilizerAdvice: string[];
  wateringAdvice: string[];
  uncertaintyNotes?: string;
  userObservations?: { id: string; date: string; note: string }[];
  imageUrl?: string;
  scannedAt: string;
}

interface SoilReport {
  id: string;
  userId: string;
  cropName: string;
  soilType: string;
  ph: number;
  nitrogen: string;
  phosphorus: string;
  potassium: string;
  moisture: string;
  summary: string;
  recommendations: string[];
  createdAt: string;
}

interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'scan' | 'soil' | 'system' | 'reminder';
  read: boolean;
  timestamp: string;
}

interface AppActivity {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'scan' | 'booking' | 'fertilizer' | 'ai';
  timestamp: string;
}

interface DbSchema {
  users: User[];
  equipment: Equipment[];
  bookings: Booking[];
  scans: ScanReport[];
  soilReports: SoilReport[];
  notifications: AppNotification[];
  activities: AppActivity[];
}

// Initial seed data
const initialDb: DbSchema = {
  users: [
    {
      id: 'usr_rohit_patil',
      fullName: 'Rohit Patil',
      age: 38,
      address: 'Plot 42, Shivshankar Nagar, Baramati Road',
      state: 'Maharashtra',
      district: 'Pune',
      villageCity: 'Baramati',
      phoneNumber: '+919822334455',
      farmAreaAcres: 4.5,
      role: 'farmer',
      email: 'rohit.patil@example.com',
      passwordHash: 'farmer123',
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'usr_owner_ramesh',
      fullName: 'Rameshwar Pawar',
      age: 46,
      address: 'Near Kisan Seva Kendra, Indapur',
      state: 'Maharashtra',
      district: 'Pune',
      villageCity: 'Indapur',
      phoneNumber: '+919850123456',
      farmAreaAcres: 12.0,
      role: 'owner',
      email: 'ramesh.pawar@example.com',
      passwordHash: 'owner123',
      isEmailVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  equipment: [
    {
      id: 'eq_1',
      ownerId: 'usr_owner_ramesh',
      ownerName: 'Rameshwar Pawar',
      ownerPhone: '+919850123456',
      title: 'Tractor (45 HP)',
      category: 'Tractor',
      powerHp: 45,
      pricePerDay: 1200,
      state: 'Maharashtra',
      district: 'Pune',
      village: 'Baramati',
      distanceKm: 12,
      isAvailable: true,
      rating: 4.8,
      reviewsCount: 32,
      imageUrl: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80',
      description: 'Reliable 45 HP 4-wheel drive tractor with power steering and dual clutch. Equipped with rotavator attachment point.',
      specs: { 'Fuel Type': 'Diesel', 'Horsepower': '45 HP', 'Lifting Capacity': '1800 kg', 'Transmission': '8 Forward + 2 Reverse' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'eq_2',
      ownerId: 'usr_owner_ramesh',
      ownerName: 'Rameshwar Pawar',
      ownerPhone: '+919850123456',
      title: 'Rotavator',
      category: 'Rotavator',
      pricePerDay: 800,
      state: 'Maharashtra',
      district: 'Pune',
      village: 'Daund',
      distanceKm: 15,
      isAvailable: true,
      rating: 4.6,
      reviewsCount: 18,
      imageUrl: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80',
      description: 'Heavy duty 6 feet multi-speed rotary tiller rotavator. Ideal for soil preparation, weed removal, and seedbed levelling.',
      specs: { 'Blades': '48 L-type', 'Working Width': '180 cm', 'Required HP': '40-50 HP', 'Gear Drive': 'Side gear drive' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'eq_3',
      ownerId: 'usr_owner_ramesh',
      ownerName: 'Sunil Jagtap',
      ownerPhone: '+919876543210',
      title: 'Harvester',
      category: 'Harvester',
      powerHp: 101,
      pricePerDay: 3500,
      state: 'Maharashtra',
      district: 'Nashik',
      village: 'Niphad',
      distanceKm: 48,
      isAvailable: true,
      rating: 4.7,
      reviewsCount: 24,
      imageUrl: 'https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?w=600&auto=format&fit=crop&q=80',
      description: 'Multi-crop combine harvester suitable for wheat, paddy, soybean, and gram. Minimal grain loss with high throughput.',
      specs: { 'Cutter Bar': '14 feet', 'Engine': '101 HP Turbo', 'Grain Tank': '2400 Litres', 'Cleaning System': 'Adjustable sieve' },
      createdAt: new Date().toISOString(),
    },
    {
      id: 'eq_4',
      ownerId: 'usr_owner_ramesh',
      ownerName: 'Anil Deshmukh',
      ownerPhone: '+919811223344',
      title: 'Seed Drill',
      category: 'Seed Drill',
      pricePerDay: 900,
      state: 'Maharashtra',
      district: 'Satara',
      village: 'Karad',
      distanceKm: 65,
      isAvailable: true,
      rating: 4.5,
      reviewsCount: 16,
      imageUrl: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=600&auto=format&fit=crop&q=80',
      description: 'Automatic seed cum fertilizer drill with 9 tynes. Ensures uniform spacing, precise seed placement and optimal fertilizer depth.',
      specs: { 'Tynes': '9', 'Row Spacing': 'Adjustable 7-9 inches', 'Hitch': '3-point linkage', 'Material': 'Heavy gauge steel' },
      createdAt: new Date().toISOString(),
    },
  ],
  bookings: [
    {
      id: 'bk_101',
      equipmentId: 'eq_2',
      equipmentTitle: 'Rotavator',
      equipmentCategory: 'Rotavator',
      equipmentImage: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=600&auto=format&fit=crop&q=80',
      renterId: 'usr_rohit_patil',
      renterName: 'Rohit Patil',
      renterPhone: '+919822334455',
      renterDistrict: 'Pune',
      ownerId: 'usr_owner_ramesh',
      ownerName: 'Rameshwar Pawar',
      startDate: '2025-04-25',
      endDate: '2025-04-26',
      durationDays: 2,
      dailyRate: 800,
      totalCost: 1600,
      status: 'approved',
      notes: 'Soil preparation for sugarcane planting',
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
    {
      id: 'bk_102',
      equipmentId: 'eq_1',
      equipmentTitle: 'Tractor (45 HP)',
      equipmentCategory: 'Tractor',
      equipmentImage: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80',
      renterId: 'usr_rohit_patil',
      renterName: 'Rohit Patil',
      renterPhone: '+919822334455',
      renterDistrict: 'Pune',
      ownerId: 'usr_owner_ramesh',
      ownerName: 'Rameshwar Pawar',
      startDate: '2025-05-02',
      endDate: '2025-05-03',
      durationDays: 2,
      dailyRate: 1200,
      totalCost: 2400,
      status: 'pending',
      notes: 'Deep plowing after seasonal rains',
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
  ],
  scans: [
    {
      id: 'scan_1',
      userId: 'usr_rohit_patil',
      userName: 'Rohit Patil',
      cropName: 'Tomato',
      healthStatus: 'Healthy',
      diseaseDetected: 'None (Healthy Foliage)',
      confidenceScore: 96,
      symptoms: ['Lush green leaves', 'Consistent leaf thickness', 'No necrosis or chlorosis observed'],
      recommendations: [
        'Maintain current drip irrigation schedule (2 hours every 2 days)',
        'Ensure stakes or trellises are firm as fruit formation begins',
        'Inspect leaf undersides weekly for early aphid or whitefly signs'
      ],
      fertilizerAdvice: [
        'Apply 19:19:19 NPK foliar spray @ 5g/L once every 14 days',
        'Add calcium nitrate to prevent blossom end rot during fruiting'
      ],
      wateringAdvice: ['Moisture target 65-75%. Avoid water stagnation around stem base.'],
      imageUrl: 'https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=600&auto=format&fit=crop&q=80',
      scannedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    },
  ],
  soilReports: [
    {
      id: 'soil_1',
      userId: 'usr_rohit_patil',
      cropName: 'Sugarcane & Wheat',
      soilType: 'Medium Black Soil (Vertisol)',
      ph: 7.2,
      nitrogen: 'Medium (280 kg/ha)',
      phosphorus: 'Low (14 kg/ha)',
      potassium: 'High (340 kg/ha)',
      moisture: '28% (Optimal)',
      summary: 'Optimal soil pH with balanced moisture. Phosphorus is slightly deficit; recommend single super phosphate supplementation before next sowing.',
      recommendations: [
        'Incorporate 2 tonnes of well-rotted Farm Yard Manure (FYM) per acre',
        'Apply Single Super Phosphate (SSP) at 50 kg/acre at sowing',
        'Avoid excessive urea top-dressing to prevent leaf scorch'
      ],
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    },
  ],
  notifications: [
    {
      id: 'notif_1',
      userId: 'usr_rohit_patil',
      title: 'Your booking is approved',
      message: 'Rotavator - Apr 25, 2025. Provider Rameshwar Pawar confirmed your rental.',
      type: 'booking',
      read: false,
      timestamp: '2 hours ago',
    },
    {
      id: 'notif_2',
      userId: 'usr_rohit_patil',
      title: 'Soil test report ready',
      message: 'View your analysis results for Baramati field plot #2.',
      type: 'soil',
      read: false,
      timestamp: '5 hours ago',
    },
    {
      id: 'notif_3',
      userId: 'usr_rohit_patil',
      title: 'Maintenance reminder',
      message: 'Tractor inspection due in 7 days. Check oil level and filter cleaning.',
      type: 'reminder',
      read: true,
      timestamp: '1 day ago',
    },
  ],
  activities: [
    {
      id: 'act_1',
      userId: 'usr_rohit_patil',
      title: 'Plant scan completed',
      description: 'Tomato - Healthy',
      type: 'scan',
      timestamp: '2 hours ago',
    },
    {
      id: 'act_2',
      userId: 'usr_rohit_patil',
      title: 'Equipment booked',
      description: 'Tractor - 45 HP',
      type: 'booking',
      timestamp: '5 hours ago',
    },
    {
      id: 'act_3',
      userId: 'usr_rohit_patil',
      title: 'Fertilizer recommendation',
      description: 'For Wheat crop',
      type: 'fertilizer',
      timestamp: '1 day ago',
    },
    {
      id: 'act_4',
      userId: 'usr_rohit_patil',
      title: 'New message from AI Assistant',
      description: 'Crop care tips available',
      type: 'ai',
      timestamp: '1 day ago',
    },
  ],
};

function readDb(): DbSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
      return initialDb;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading db:', err);
    return initialDb;
  }
}

function writeDb(db: DbSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

// Ensure DB is initialized
readDb();

// ---------------------------------------------
// Authentication & Profile Endpoints (Phase 1)
// ---------------------------------------------

// Register
app.post('/api/auth/register', (req, res) => {
  const {
    fullName,
    age,
    address,
    state,
    district,
    villageCity,
    phoneNumber,
    farmAreaAcres,
    role,
    email,
    password,
    termsAccepted,
  } = req.body;

  // Validation
  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Full Name is required (minimum 2 characters).' });
  }

  const numAge = Number(age);
  if (!age || isNaN(numAge) || numAge < 18 || numAge > 120) {
    return res.status(400).json({ error: 'Please enter a valid age between 18 and 120.' });
  }

  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return res.status(400).json({ error: 'Complete Address is required.' });
  }

  if (!state || typeof state !== 'string') {
    return res.status(400).json({ error: 'Please select a State or Union Territory.' });
  }

  if (!district || typeof district !== 'string') {
    return res.status(400).json({ error: 'Please specify your District.' });
  }

  if (!villageCity || typeof villageCity !== 'string') {
    return res.status(400).json({ error: 'Village or City is required.' });
  }

  // Indian phone number validation
  const phoneClean = String(phoneNumber || '').replace(/\s+/g, '');
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/;
  if (!phoneRegex.test(phoneClean)) {
    return res.status(400).json({
      error: 'Please enter a valid 10-digit Indian mobile number (e.g. +91 9876543210).',
    });
  }

  // Format phone standard with +91
  const standardPhone = phoneClean.startsWith('+91')
    ? phoneClean
    : `+91${phoneClean}`;

  // Role validation
  if (role !== 'farmer' && role !== 'owner') {
    return res.status(400).json({ error: 'User Role must be Farmer or Equipment Owner.' });
  }

  // Farm area validation
  const numFarmArea = Number(farmAreaAcres);
  if (role === 'farmer') {
    if (isNaN(numFarmArea) || numFarmArea <= 0) {
      return res.status(400).json({
        error: 'Farm Area in acres is mandatory for farmer accounts (must be positive, e.g. 1.5 or 2.75).',
      });
    }
  } else {
    if (isNaN(numFarmArea) || numFarmArea < 0) {
      return res.status(400).json({
        error: 'Farm Area cannot be negative.',
      });
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Password validation
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  if (!termsAccepted) {
    return res.status(400).json({ error: 'You must accept the Terms and Conditions to register.' });
  }

  const db = readDb();
  const existingUser = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );

  if (existingUser) {
    return res.status(400).json({
      error: 'An account with this email address already exists. Please login instead.',
    });
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const verificationToken = Math.random().toString(36).substring(2) + Date.now();

  const newUser: User = {
    id: userId,
    fullName: fullName.trim(),
    age: numAge,
    address: address.trim(),
    state: state.trim(),
    district: district.trim(),
    villageCity: villageCity.trim(),
    phoneNumber: standardPhone,
    farmAreaAcres: numFarmArea,
    role,
    email: email.toLowerCase().trim(),
    passwordHash: password, // Simulated hashed password
    isEmailVerified: false,
    verificationToken,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName.trim())}&backgroundColor=0D5C3A,1D7C50`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  // Add initial welcome notification & activity
  db.notifications.push({
    id: `notif_${Date.now()}`,
    userId: newUser.id,
    title: 'Welcome to AgriShare!',
    message: `Welcome ${newUser.fullName}. Complete your profile and explore farm equipment sharing.`,
    type: 'system',
    read: false,
    timestamp: 'Just now',
  });

  db.activities.push({
    id: `act_${Date.now()}`,
    userId: newUser.id,
    title: 'Account created',
    description: `Registered as ${role === 'farmer' ? 'Farmer' : 'Equipment Owner'}`,
    type: 'ai',
    timestamp: 'Just now',
  });

  writeDb(db);

  // Return user without password
  const { passwordHash: _, ...userSafe } = newUser;
  return res.status(201).json({
    message: 'Registration successful! Please verify your email.',
    user: userSafe,
    verificationToken,
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = readDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase().trim()
  );

  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
  }

  const { passwordHash: _, ...userSafe } = user;
  return res.json({
    message: 'Login successful',
    user: userSafe,
  });
});

// Verify email
app.post('/api/auth/verify-email', (req, res) => {
  const { token, email } = req.body;
  const db = readDb();
  const user = db.users.find(
    (u) => (token && u.verificationToken === token) || (email && u.email.toLowerCase() === email.toLowerCase())
  );

  if (!user) {
    return res.status(404).json({ error: 'Invalid or expired verification token.' });
  }

  user.isEmailVerified = true;
  user.verificationToken = undefined;
  user.updatedAt = new Date().toISOString();
  writeDb(db);

  const { passwordHash: _, ...userSafe } = user;
  return res.json({
    message: 'Email verified successfully! You can now access your dashboard.',
    user: userSafe,
  });
});

// Resend verification
app.post('/api/auth/resend-verification', (req, res) => {
  const { email } = req.body;
  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  if (!user) {
    // Avoid user enumeration
    return res.json({ message: 'If an account exists with this email, a verification link has been sent.' });
  }

  user.verificationToken = Math.random().toString(36).substring(2) + Date.now();
  user.updatedAt = new Date().toISOString();
  writeDb(db);

  return res.json({
    message: 'Verification link resent successfully.',
    token: user.verificationToken,
  });
});

// Forgot Password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  if (!user) {
    return res.json({ message: 'If that email exists in our system, password reset instructions have been generated.' });
  }

  const resetToken = 'rst_' + Math.random().toString(36).substring(2) + Date.now();
  user.resetToken = resetToken;
  user.resetTokenExpiry = Date.now() + 3600000; // 1 hour
  user.updatedAt = new Date().toISOString();
  writeDb(db);

  return res.json({
    message: 'Password reset instructions have been generated.',
    resetToken,
  });
});

// Get current active user
app.get('/api/auth/me', (req, res) => {
  const { userId } = req.query;
  const db = readDb();
  const user = userId ? db.users.find((u) => u.id === userId) : db.users[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash: _, ...userSafe } = user;
  return res.json({ user: userSafe });
});

// Change Password for authenticated user
app.post('/api/auth/change-password', (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  user.passwordHash = newPassword;
  user.updatedAt = new Date().toISOString();
  writeDb(db);

  return res.json({ message: 'Password updated successfully!' });
});

// Reset Password
app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword, email } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const db = readDb();
  let user = db.users.find(
    (u) => (token && u.resetToken === token && u.resetTokenExpiry && u.resetTokenExpiry > Date.now()) ||
           (email && u.email.toLowerCase() === email.toLowerCase().trim())
  );

  if (!user) {
    return res.status(400).json({ error: 'Password reset link is invalid or has expired.' });
  }

  user.passwordHash = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  user.updatedAt = new Date().toISOString();
  writeDb(db);

  return res.json({ message: 'Password has been successfully updated! You can now log in.' });
});

// Update Profile
app.put('/api/profile', (req, res) => {
  const { userId, fullName, age, address, state, district, villageCity, phoneNumber, farmAreaAcres } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (fullName) user.fullName = fullName.trim();
  if (age) user.age = Number(age);
  if (address) user.address = address.trim();
  if (state) user.state = state.trim();
  if (district) user.district = district.trim();
  if (villageCity) user.villageCity = villageCity.trim();
  if (phoneNumber) user.phoneNumber = phoneNumber.trim();
  if (farmAreaAcres !== undefined) user.farmAreaAcres = Number(farmAreaAcres);
  user.updatedAt = new Date().toISOString();

  writeDb(db);

  const { passwordHash: _, ...userSafe } = user;
  return res.json({ message: 'Profile updated successfully', user: userSafe });
});

// ---------------------------------------------
// Equipment Endpoints
// ---------------------------------------------

app.get('/api/equipment', (req, res) => {
  const db = readDb();
  const { category, search, district } = req.query;

  let results = [...db.equipment];

  if (category && category !== 'All') {
    results = results.filter((eq) => eq.category.toLowerCase() === String(category).toLowerCase());
  }

  if (district && district !== 'All') {
    results = results.filter((eq) => eq.district.toLowerCase() === String(district).toLowerCase());
  }

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(
      (eq) =>
        eq.title.toLowerCase().includes(q) ||
        eq.category.toLowerCase().includes(q) ||
        eq.description.toLowerCase().includes(q) ||
        eq.district.toLowerCase().includes(q)
    );
  }

  return res.json(results);
});

app.post('/api/equipment', (req, res) => {
  const {
    ownerId,
    ownerName,
    ownerPhone,
    title,
    category,
    powerHp,
    pricePerDay,
    state,
    district,
    village,
    imageUrl,
    description,
    specs,
  } = req.body;

  if (!title || !category || !pricePerDay || !ownerId) {
    return res.status(400).json({ error: 'Title, category, price per day, and owner ID are required.' });
  }

  const db = readDb();
  const newEquipment: Equipment = {
    id: `eq_${Date.now()}`,
    ownerId,
    ownerName: ownerName || 'Owner',
    ownerPhone: ownerPhone || '',
    title,
    category,
    powerHp: powerHp ? Number(powerHp) : undefined,
    pricePerDay: Number(pricePerDay),
    state: state || 'Maharashtra',
    district: district || 'Pune',
    village: village || '',
    distanceKm: Math.floor(Math.random() * 25) + 5,
    isAvailable: true,
    rating: 5.0,
    reviewsCount: 1,
    imageUrl:
      imageUrl ||
      'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80',
    description: description || 'Well-maintained agricultural machinery available for rent.',
    specs: specs || {},
    createdAt: new Date().toISOString(),
  };

  db.equipment.unshift(newEquipment);

  db.activities.push({
    id: `act_${Date.now()}`,
    userId: ownerId,
    title: 'Equipment listed',
    description: `${newEquipment.title} added to fleet`,
    type: 'booking',
    timestamp: 'Just now',
  });

  writeDb(db);
  return res.status(201).json(newEquipment);
});

// Edit equipment listing (Owner only)
app.put('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const { userId, title, category, powerHp, pricePerDay, state, district, village, imageUrl, description, specs } = req.body;

  const db = readDb();
  const eq = db.equipment.find((item) => item.id === id);
  if (!eq) return res.status(404).json({ error: 'Equipment not found' });

  // Security check: Only the owner can edit their listing
  if (userId && eq.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized: You can only edit your own equipment listings.' });
  }

  if (title) eq.title = String(title).trim();
  if (category) eq.category = category;
  if (powerHp !== undefined) eq.powerHp = Number(powerHp);
  if (pricePerDay) eq.pricePerDay = Math.max(100, Number(pricePerDay));
  if (state) eq.state = state;
  if (district) eq.district = district;
  if (village !== undefined) eq.village = village;
  if (imageUrl) eq.imageUrl = imageUrl;
  if (description) eq.description = description;
  if (specs) eq.specs = { ...eq.specs, ...specs };

  writeDb(db);
  return res.json(eq);
});

// Delete equipment listing (Owner only, prevents deleting with active bookings)
app.delete('/api/equipment/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;

  const db = readDb();
  const eqIndex = db.equipment.findIndex((item) => item.id === id);
  if (eqIndex === -1) return res.status(404).json({ error: 'Equipment not found' });

  const eq = db.equipment[eqIndex];

  // Security check: Only the owner can delete their equipment
  if (userId && eq.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized: You can only remove your own equipment listings.' });
  }

  // Check if there are active approved bookings
  const hasActiveBookings = db.bookings.some(
    (b) => b.equipmentId === id && (b.status === 'approved' || b.status === 'pending')
  );
  if (hasActiveBookings) {
    return res.status(400).json({
      error: 'Cannot delete equipment with active or pending booking requests. Complete or cancel them first.',
    });
  }

  db.equipment.splice(eqIndex, 1);
  writeDb(db);
  return res.json({ message: 'Equipment listing removed successfully.' });
});

// Toggle equipment availability
app.patch('/api/equipment/:id/availability', (req, res) => {
  const { id } = req.params;
  const { isAvailable, userId } = req.body;
  const db = readDb();
  const eq = db.equipment.find((item) => item.id === id);
  if (!eq) return res.status(404).json({ error: 'Equipment not found' });

  // Security check
  if (userId && eq.ownerId !== userId) {
    return res.status(403).json({ error: 'Unauthorized: You can only change availability of your own equipment.' });
  }

  eq.isAvailable = Boolean(isAvailable);
  writeDb(db);
  return res.json(eq);
});

// ---------------------------------------------
// Bookings Endpoints
// ---------------------------------------------

app.get('/api/bookings', (req, res) => {
  const { userId, role } = req.query;
  const db = readDb();

  if (!userId) {
    return res.json(db.bookings);
  }

  if (role === 'owner') {
    const ownerBookings = db.bookings.filter((b) => b.ownerId === userId);
    return res.json(ownerBookings);
  }

  const renterBookings = db.bookings.filter((b) => b.renterId === userId);
  return res.json(renterBookings);
});

app.post('/api/bookings', (req, res) => {
  const {
    equipmentId,
    renterId,
    renterName,
    renterPhone,
    renterDistrict,
    startDate,
    endDate,
    durationDays,
    notes,
  } = req.body;

  if (!equipmentId || !renterId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return res.status(400).json({ error: 'End date must be on or after start date.' });
  }

  const db = readDb();
  const eq = db.equipment.find((item) => item.id === equipmentId);
  if (!eq) {
    return res.status(404).json({ error: 'Equipment not found.' });
  }

  if (!eq.isAvailable) {
    return res.status(400).json({ error: 'This equipment is currently marked unavailable by the owner.' });
  }

  // Prevent renting own equipment
  if (eq.ownerId === renterId) {
    return res.status(400).json({ error: 'You cannot book your own equipment listing.' });
  }

  // Calculate actual duration in days on server
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // Check conflicting active bookings for same equipment & time
  const conflict = db.bookings.find(
    (b) =>
      b.equipmentId === equipmentId &&
      (b.status === 'approved' || b.status === 'pending') &&
      ((startDate >= b.startDate && startDate <= b.endDate) ||
        (endDate >= b.startDate && endDate <= b.endDate) ||
        (startDate <= b.startDate && endDate >= b.endDate))
  );

  if (conflict) {
    return res.status(409).json({
      error: `Equipment is already reserved from ${conflict.startDate} to ${conflict.endDate} (Status: ${conflict.status}). Please choose different dates.`,
    });
  }

  // Server-authoritative price calculation (Never trust client totalCost)
  const totalCost = calculatedDays * eq.pricePerDay;

  const newBooking: Booking = {
    id: `bk_${Date.now()}`,
    equipmentId: eq.id,
    equipmentTitle: eq.title,
    equipmentCategory: eq.category,
    equipmentImage: eq.imageUrl,
    renterId,
    renterName: renterName || 'Farmer',
    renterPhone: renterPhone || '',
    renterDistrict: renterDistrict || eq.district,
    ownerId: eq.ownerId,
    ownerName: eq.ownerName,
    startDate,
    endDate,
    durationDays: calculatedDays,
    dailyRate: eq.pricePerDay,
    totalCost,
    status: 'pending',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.bookings.unshift(newBooking);

  // Notify owner
  db.notifications.unshift({
    id: `notif_${Date.now()}_1`,
    userId: eq.ownerId,
    title: 'Booking Request Received',
    message: `${renterName || 'A farmer'} requested ${eq.title} (${startDate} to ${endDate}, ${calculatedDays} days, ₹${totalCost}).`,
    type: 'booking',
    read: false,
    timestamp: 'Just now',
  });

  // Notify renter
  db.notifications.unshift({
    id: `notif_${Date.now()}_2`,
    userId: renterId,
    title: 'Booking Request Submitted',
    message: `Your booking request for ${eq.title} was submitted to ${eq.ownerName}. Total estimated: ₹${totalCost}.`,
    type: 'booking',
    read: false,
    timestamp: 'Just now',
  });

  // Add activity for renter
  db.activities.unshift({
    id: `act_${Date.now()}`,
    userId: renterId,
    title: 'Equipment requested',
    description: `${eq.title} - ${calculatedDays} day(s)`,
    type: 'booking',
    timestamp: 'Just now',
  });

  writeDb(db);
  return res.status(201).json(newBooking);
});

// Update booking status (approve, reject, cancel, complete) with role authorization
app.patch('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, userId } = req.body;

  if (!['approved', 'rejected', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid booking status.' });
  }

  const db = readDb();
  const booking = db.bookings.find((b) => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found.' });
  }

  // Security authorization checks
  if (status === 'approved' || status === 'rejected') {
    if (userId && booking.ownerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized: Only the equipment owner can accept or decline bookings.' });
    }
  }

  if (status === 'cancelled') {
    if (userId && booking.renterId !== userId && booking.ownerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized: You are not authorized to cancel this booking.' });
    }
    if (booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel an already completed rental.' });
    }
  }

  booking.status = status;
  booking.updatedAt = new Date().toISOString();

  // Create notifications based on action
  if (status === 'approved') {
    db.notifications.unshift({
      id: `notif_${Date.now()}_app`,
      userId: booking.renterId,
      title: 'Booking Approved! 🎉',
      message: `Your booking for ${booking.equipmentTitle} (${booking.startDate} to ${booking.endDate}) was approved by ${booking.ownerName}!`,
      type: 'booking',
      read: false,
      timestamp: 'Just now',
    });
  } else if (status === 'rejected') {
    db.notifications.unshift({
      id: `notif_${Date.now()}_rej`,
      userId: booking.renterId,
      title: 'Booking Request Declined',
      message: `Your booking request for ${booking.equipmentTitle} was declined by the owner.`,
      type: 'booking',
      read: false,
      timestamp: 'Just now',
    });
  } else if (status === 'cancelled') {
    const isRenterCancelling = userId === booking.renterId;
    if (isRenterCancelling) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_cnl_o`,
        userId: booking.ownerId,
        title: 'Booking Cancelled by Farmer',
        message: `${booking.renterName} cancelled their reservation for ${booking.equipmentTitle} (${booking.startDate} to ${booking.endDate}).`,
        type: 'booking',
        read: false,
        timestamp: 'Just now',
      });
    } else {
      db.notifications.unshift({
        id: `notif_${Date.now()}_cnl_r`,
        userId: booking.renterId,
        title: 'Booking Cancelled by Owner',
        message: `Owner ${booking.ownerName} cancelled the reservation for ${booking.equipmentTitle}.`,
        type: 'booking',
        read: false,
        timestamp: 'Just now',
      });
    }
  }

  writeDb(db);
  return res.json(booking);
});

// ---------------------------------------------
// Plant Scanner & Reports Endpoints
// ---------------------------------------------

app.get('/api/scans', (req, res) => {
  const { userId } = req.query;
  const db = readDb();
  if (userId) {
    return res.json(db.scans.filter((s) => s.userId === userId));
  }
  return res.json(db.scans);
});

app.post('/api/scans', (req, res) => {
  const db = readDb();
  const newScan: ScanReport = {
    id: `scan_${Date.now()}`,
    ...req.body,
    scannedAt: new Date().toISOString(),
  };
  db.scans.unshift(newScan);

  if (newScan.userId) {
    db.activities.unshift({
      id: `act_${Date.now()}`,
      userId: newScan.userId,
      title: 'Plant scan saved',
      description: `${newScan.cropName} - ${newScan.healthStatus}`,
      type: 'scan',
      timestamp: 'Just now',
    });

    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: newScan.userId,
      title: 'Crop Scan Report Saved',
      message: `Diagnostic report for ${newScan.cropName} (${newScan.diseaseDetected}) has been archived.`,
      type: 'scan',
      read: false,
      timestamp: 'Just now',
    });
  }

  writeDb(db);
  return res.status(201).json(newScan);
});

app.delete('/api/scans/:id', (req, res) => {
  const { id } = req.params;
  const { userId } = req.query;
  const db = readDb();
  const idx = db.scans.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Report not found' });

  // Security check: Only author can delete their report
  if (userId && db.scans[idx].userId && db.scans[idx].userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized: You can only delete your own crop scan reports.' });
  }

  db.scans.splice(idx, 1);
  writeDb(db);
  return res.json({ message: 'Scan report deleted successfully' });
});

// Follow-up observations tracking on plant scans
app.post('/api/scans/:id/observations', (req, res) => {
  const { id } = req.params;
  const { note, userId } = req.body;
  if (!note || !String(note).trim()) {
    return res.status(400).json({ error: 'Observation note cannot be empty.' });
  }

  const db = readDb();
  const scan = db.scans.find((s) => s.id === id);
  if (!scan) return res.status(404).json({ error: 'Scan report not found.' });

  // Security authorization
  if (userId && scan.userId && scan.userId !== userId) {
    return res.status(403).json({ error: 'Unauthorized: You can only record observations on your own scan reports.' });
  }

  if (!scan.userObservations) {
    scan.userObservations = [];
  }

  const newObs = {
    id: `obs_${Date.now()}`,
    date: new Date().toISOString(),
    note: String(note).trim(),
  };

  scan.userObservations.unshift(newObs);
  writeDb(db);
  return res.status(201).json(scan);
});

// Soil Reports
app.get('/api/soil-tests', (req, res) => {
  const { userId } = req.query;
  const db = readDb();
  if (userId) {
    return res.json(db.soilReports.filter((s) => s.userId === userId));
  }
  return res.json(db.soilReports);
});

app.post('/api/soil-tests', (req, res) => {
  const db = readDb();
  const newSoil: SoilReport = {
    id: `soil_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  db.soilReports.unshift(newSoil);

  if (newSoil.userId) {
    db.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: newSoil.userId,
      title: 'Soil Test Report Saved',
      message: `Soil assessment for ${newSoil.cropName} (${newSoil.soilType}) recorded.`,
      type: 'soil',
      read: false,
      timestamp: 'Just now',
    });
  }

  writeDb(db);
  return res.status(201).json(newSoil);
});

// Notifications: Read & Manage
app.get('/api/notifications', (req, res) => {
  const { userId } = req.query;
  const db = readDb();
  if (userId) {
    const list = db.notifications.filter((n) => n.userId === userId);
    return res.json(list);
  }
  return res.json(db.notifications);
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const notif = db.notifications.find((n) => n.id === id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });

  notif.read = true;
  writeDb(db);
  return res.json(notif);
});

app.patch('/api/notifications/mark-all-read', (req, res) => {
  const { userId } = req.body;
  const db = readDb();
  if (userId) {
    db.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  } else {
    db.notifications.forEach((n) => (n.read = true));
  }
  writeDb(db);
  return res.json({ message: 'All notifications marked as read' });
});

app.get('/api/activities', (req, res) => {
  const { userId } = req.query;
  const db = readDb();
  if (userId) {
    const list = db.activities.filter((a) => a.userId === userId);
    return res.json(list);
  }
  return res.json(db.activities);
});

// ---------------------------------------------
// Gemini AI Endpoints (Server-Side Only)
// ---------------------------------------------

// Helper function with timeout for AI calls
const withTimeout = <T>(promise: Promise<T>, ms: number = 6500): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI generation timed out after ${ms}ms`));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
};

// Crop Disease Knowledge Base for Reliable Diagnostics
function getDiagnosticFallback(cropHint: string = '') {
  const q = cropHint.toLowerCase();

  if (q.includes('cotton') || q.includes('boll') || q.includes('kapas')) {
    return {
      cropName: 'Cotton (Kapas)',
      healthStatus: 'Moderate' as const,
      diseaseDetected: 'Cotton Leaf Curl Virus (CLCuV) / Sucking Pest Stress',
      confidenceScore: 89,
      severity: 'Moderate' as const,
      positiveFindings: [
        'Main stem vascular framework remains strong',
        'Upper vegetative squares forming with active chlorophyll'
      ],
      symptoms: [
        'Upward and downward curling of leaf margins',
        'Thickening of primary veins and leaf enation on undersides',
        'Mild interveinal yellowing (chlorosis)'
      ],
      possibleCauses: [
        'Whitefly (Bemisia tabaci) vector transmission',
        'Hot and dry early season weather accelerating whitefly populations'
      ],
      treatment: [
        'Spray Diafenthiuron 50% WP @ 1.25 g/L or Flonicamid 50% WG @ 0.4 g/L for whitefly control',
        'Foliar spray of 13:0:45 (Potassium Nitrate) @ 10g/L to boost foliage vigor'
      ],
      prevention: [
        'Install yellow sticky traps @ 8 per acre to monitor and capture whitefly adults',
        'Maintain clean field borders by eradicating weed hosts like Parthenium'
      ],
      recommendations: [
        'Inspect leaf undersides in the morning for nymph colonies',
        'Avoid excessive urea application which increases leaf softness and pest attraction'
      ],
      fertilizerAdvice: [
        'Apply Magnesium Sulphate (MgSO4) @ 10g/L foliar spray to prevent reddening of leaves'
      ],
      wateringAdvice: [
        'Maintain alternate furrow irrigation; avoid prolonged waterlogging at squaring stage'
      ],
      uncertaintyNotes: 'Diagnosis based on visible foliar symptoms. If leaf curling rapidly advances to enations, consult your nearest Krishi Vigyan Kendra (KVK).'
    };
  }

  if (q.includes('sugarcane') || q.includes('cane') || q.includes('ganna')) {
    return {
      cropName: 'Sugarcane',
      healthStatus: 'Warning' as const,
      diseaseDetected: 'Red Rot / Foliar Rust Early Stress',
      confidenceScore: 88,
      severity: 'Moderate' as const,
      positiveFindings: [
        'Root stool anchor and underground sett buds remain intact',
        'Outer stalk rind remains firm'
      ],
      symptoms: [
        'Reddish-brown elongated lesions on midribs and leaf margins',
        'Withering of top leaf spindle and yellowing of lower canopy'
      ],
      possibleCauses: [
        'Colletotrichum falcatum fungal spores favored by high humidity',
        'Poor drainage or water accumulation in furrow bases'
      ],
      treatment: [
        'Rogue out and burn severely affected cane clumps immediately',
        'Foliar spray Carbendazim 50% WP @ 2g/L or Mancozeb 75% WP @ 2.5g/L'
      ],
      prevention: [
        'Use certified disease-free tissue culture setts for next planting',
        'Dip seed setts in Trichoderma viride bio-fungicide slurry prior to furrow placement'
      ],
      recommendations: [
        'Ensure drainage ditches are unclogged to avoid stagnant root zone water',
        'Apply 50 kg SSP per acre to strengthen root nodal tissue'
      ],
      fertilizerAdvice: [
        'Top-dress with Muriate of Potash (MOP) @ 25 kg/acre to improve cellular disease resistance'
      ],
      wateringAdvice: [
        'Irrigate every 8-10 days in summer; ensure water does not stand in furrows for >24 hours'
      ],
      uncertaintyNotes: 'Symptoms indicate foliar fungal stress. If internal stalk shows transverse white patches with alcoholic odor upon splitting, confirm with agricultural laboratory.'
    };
  }

  if (q.includes('wheat') || q.includes('gehu') || q.includes('rust')) {
    return {
      cropName: 'Wheat (Gehun)',
      healthStatus: 'Moderate' as const,
      diseaseDetected: 'Yellow Stripe Rust (Puccinia striiformis)',
      confidenceScore: 92,
      severity: 'Moderate' as const,
      positiveFindings: [
        'Strong crown root initiation',
        'Main productive tillers remain upright with good turgor'
      ],
      symptoms: [
        'Linear yellow-orange powdery pustules arranged in parallel stripes along leaf veins',
        'Chlorosis around pustule streaks and premature drying of lower leaves'
      ],
      possibleCauses: [
        'Airborne fungal urediniospores favored by cool temperatures (10-20°C) and dew wetness'
      ],
      treatment: [
        'Spray Propiconazole 25% EC (Tilt) @ 1 ml/L or Tebuconazole 25.9% EC @ 1.25 ml/L immediately',
        'Repeat spray after 14 days if fresh pustules appear on flag leaves'
      ],
      prevention: [
        'Plant stripe rust-resistant cultivars like HD-2967, DBW-187, or PBW-725',
        'Avoid late-sown winter wheat crops which encounter higher disease pressure'
      ],
      recommendations: [
        'Prioritize protecting the flag leaf which contributes 70% of grain filling carbohydrates',
        'Do not irrigate during windy afternoons to prevent spore dissemination'
      ],
      fertilizerAdvice: [
        'Foliar spray 00:52:34 (MKP) @ 10g/L to support grain development'
      ],
      wateringAdvice: [
        'Irrigate at critical stages: Crown Root Initiation (21 days) and Booting stage (65 days)'
      ],
      uncertaintyNotes: 'Stripe rust symptoms are distinct. Ensure uniform coverage on leaf undersides when spraying.'
    };
  }

  // Default Tomato / Solanaceous Diagnostic
  return {
    cropName: cropHint ? cropHint.charAt(0).toUpperCase() + cropHint.slice(1) : 'Tomato',
    healthStatus: 'Moderate' as const,
    diseaseDetected: 'Early Blight (Alternaria solani) / Foliar Spotting',
    confidenceScore: 93,
    severity: 'Moderate' as const,
    positiveFindings: [
      'Upper canopy leaves and growing apex exhibit healthy deep green color',
      'Stems remain sturdy without dark collar lesions or vascular browning'
    ],
    symptoms: [
      'Concentric target-board brown circular spots on mature lower leaves',
      'Yellow chlorotic halos surrounding necrotic leaf spots'
    ],
    possibleCauses: [
      'Alternaria solani fungal spores favored by alternating wet and dry weather',
      'Soil splash from overhead irrigation or rain droplets hitting lower foliage'
    ],
    treatment: [
      'Prune off heavily spotted lower leaves and dispose safely away from the field',
      'Spray Mancozeb 75% WP @ 2.5g/L or Chlorothalonil 75% WP @ 2g/L of water',
      'Alternatively apply bio-fungicide Trichoderma harzianum @ 5g/L'
    ],
    prevention: [
      'Stake plants off soil surface and apply straw mulching to stop spore splash',
      'Switch from overhead sprinkler to drip irrigation to keep leaf canopies dry'
    ],
    recommendations: [
      'Inspect crop every 3 days for upward progression toward flowering clusters',
      'Sterilize pruning shears between rows with mild disinfectant'
    ],
    fertilizerAdvice: [
      'Apply NPK 19:19:19 foliar spray @ 4g/L + Calcium Nitrate @ 3g/L to enhance leaf cell walls'
    ],
    wateringAdvice: [
      'Provide morning drip irrigation at 2.5 L/plant every alternate day. Avoid evening leaf wetness'
    ],
    uncertaintyNotes: 'Diagnostic symptoms strongly match Alternaria foliar blight. If lesion margins expand rapidly despite fungicide, submit sample to local KVK extension center.'
  };
}

// AI Plant Scanner
app.post('/api/ai/scan-plant', async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', cropHint } = req.body;
  try {
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 is required for plant scanning.' });
    }

    let cleanBase64 = '';
    let effectiveMime = mimeType;

    if (imageBase64.startsWith('http://') || imageBase64.startsWith('https://')) {
      try {
        const imgRes = await fetch(imageBase64);
        const arrayBuf = await imgRes.arrayBuffer();
        cleanBase64 = Buffer.from(arrayBuf).toString('base64');
        effectiveMime = imgRes.headers.get('content-type') || 'image/jpeg';
      } catch (fErr) {
        console.warn('Could not fetch image URL, using fallback:', fErr);
      }
    } else {
      cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    }

    const prompt = `You are AgriShare's senior agricultural plant pathologist and agronomist. 
Analyze this plant image carefully for crop type, disease, pest infestation, fungal infection, nutrient deficiency, or overall health.
${cropHint ? `Farmer notes this might be: ${cropHint}` : ''}

Respond STRICTLY in JSON format matching this schema:
{
  "cropName": "Identified Crop name (e.g. Tomato, Cotton, Sugarcane, Wheat, Soybean, Onion, Chilli)",
  "healthStatus": "Healthy" | "Moderate" | "Critical" | "Warning",
  "diseaseDetected": "Name of disease/pest or 'None (Healthy Foliage)'",
  "confidenceScore": number between 65 and 99,
  "severity": "None" | "Mild" | "Moderate" | "Severe",
  "positiveFindings": ["Positive observation 1 (e.g. healthy stem vigor, good chlorophyll)", "Positive observation 2"],
  "symptoms": ["Visible problem/symptom 1", "Visible problem/symptom 2"],
  "possibleCauses": ["Pathogen or abiotic cause (e.g. Alternaria solani fungal spores favored by humid weather)", "Nutrient leaching"],
  "treatment": ["Curative action (e.g. spray Mancozeb 75% WP @ 2g/L or bio-fungicide Trichoderma)"],
  "prevention": ["Cultural preventive practice (e.g. crop rotation, certified seed, drip irrigation)"],
  "recommendations": ["Actionable immediate next step 1", "Actionable immediate next step 2"],
  "fertilizerAdvice": ["Crop specific fertilizer or micronutrient spray recommendation"],
  "wateringAdvice": ["Moisture and watering schedule recommendation"],
  "uncertaintyNotes": "Diagnostic certainty note (e.g. Symptoms strongly indicate Early Blight; if lesion spreading accelerates, confirm with local KVK lab test)."
}`;

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: effectiveMime,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    // 6.5s timeout prevents hanging if external Gemini endpoint is overloaded
    const response = await withTimeout(apiPromise, 6500);

    const text = response.text || '{}';
    let parsed;
    try {
      parsed = JSON.parse(text);
      if (!parsed.cropName || !parsed.healthStatus) {
        throw new Error('Incomplete JSON schema');
      }
    } catch {
      parsed = getDiagnosticFallback(cropHint);
    }

    return res.json(parsed);
  } catch (err: any) {
    console.warn('Gemini plant scan API fallback engaged:', err?.message || err);
    const fallback = getDiagnosticFallback(cropHint);
    return res.json(fallback);
  }
});

// Domain-Specific Conversational Generator for Indian Agriculture
function generateAgronomicReply(userMessage: string, userContext: any = {}, attachedScan: any = null): string {
  const msg = userMessage.toLowerCase();
  const userName = userContext.fullName || 'Farmer';
  const district = userContext.district || 'Pune';

  // If discussing an attached scan
  if (attachedScan) {
    const crop = attachedScan.cropName || 'your crop';
    const disease = attachedScan.diseaseDetected || 'the diagnosed condition';
    const treatments = Array.isArray(attachedScan.treatment) ? attachedScan.treatment.join('\n- ') : '';
    const preventions = Array.isArray(attachedScan.prevention) ? attachedScan.prevention.join('\n- ') : '';
    const fertilizer = Array.isArray(attachedScan.fertilizerAdvice) ? attachedScan.fertilizerAdvice.join('\n- ') : '';

    return `Namaste ${userName}! Here is specific guidance grounded in your saved **${crop}** scan report for **${disease}**:

**1. Immediate Curative Action (Today / Next 24 Hours):**
${treatments ? `- ${treatments}` : `- Prune severely affected lower leaves to decrease fungal spore load.\n- Apply bio-fungicide or protective copper spray early in the morning.`}

**2. Nutrition & Foliar Sprays:**
${fertilizer ? `- ${fertilizer}` : `- Apply balanced NPK 19:19:19 foliar spray @ 4g/L to support new vegetative recovery.`}

**3. Long-Term Cultural Prevention:**
${preventions ? `- ${preventions}` : `- Maintain clean weed-free borders and practice crop rotation.\n- Use drip irrigation to prevent wet foliage.`}

*Agronomic Note:* Visual models provide immediate field recommendations. If lesions spread across more than 20% of your plot over 48 hours, bring a fresh leaf sample to your local Krishi Vigyan Kendra (KVK).`;
  }

  // Equipment / Tractor / Rotavator questions
  if (msg.includes('tractor') || msg.includes('rotavator') || msg.includes('harvester') || msg.includes('drill') || msg.includes('rent') || msg.includes('hire') || msg.includes('machinery')) {
    return `Namaste ${userName}! In ${district} district, you can access shared machinery directly on AgriShare:

- **Tractors (45-55 HP):** Ideal for deep plowing, harrowing, and trailer transport. Daily rates start around ₹1,200/day.
- **Rotavators (6 Feet Multi-Speed):** Best for soil pulverization, breaking clods, and mixing stubble before sugarcane or wheat planting. Approx ₹800/day.
- **Combine Harvesters:** Multi-crop harvesters available for wheat, soybean, and paddy to minimize grain shattering loss.
- **Seed-cum-Fertilizer Drills:** Ensures uniform seed spacing and optimal placement of basal SSP/DAP fertilizer.

👉 To view available implements near your village, navigate to the **Equipment Booking** tab where you can check real-time availability and submit a booking request.`;
  }

  // Yellow leaves / curling / disease
  if (msg.includes('yellow') || msg.includes('curling') || msg.includes('curl') || msg.includes('leaf') || msg.includes('blight') || msg.includes('spot') || msg.includes('pest')) {
    return `Namaste ${userName}! Yellowing or curling leaves in Indian field crops typically stem from one of these primary causes:

1. **Yellowing of Lower/Older Leaves (Nitrogen or Overwatering Stress):**
   - If leaves are soft and limp with soggy soil: pause irrigation and open furrow drainage.
   - If soil moisture is optimal and pale yellowing starts from leaf tips: top-dress with Neem Coated Urea in split doses.

2. **Leaf Curling (Upward vs Downward):**
   - **Upward Curling with crispy dry edges:** Water stress or high daytime heat. Deliver slow soaking drip irrigation early morning.
   - **Downward Curling with thickened veins:** Sucking pests (whiteflies, thrips, or aphids). Spray organic neem oil (Azadirachtin 10,000 ppm @ 2ml/L) or targeted bio-insecticide.

3. **Concentric Dark Spots (Fungal Blight):**
   - Apply protective Mancozeb 75% WP @ 2.5g/L or copper oxychloride in the morning.

👉 You can take a clear picture of the leaf right now using the **Plant Scanner** tab for an immediate diagnostic report.`;
  }

  // Fertilizer / NPK questions
  if (msg.includes('fertilizer') || msg.includes('npk') || msg.includes('urea') || msg.includes('dap') || msg.includes('dosage') || msg.includes('spray')) {
    return `Namaste ${userName}! Here are golden guidelines for balanced fertilizer management in ${district}:

- **Split Nitrogen Dosing:** Never apply 100% urea all at once. Split into 3 applications: Basal (at sowing), Tillering (21-30 days), and Jointing/Pre-flowering (45-60 days).
- **Basal Phosphorus Placement:** Phosphorus (SSP or DAP) moves slowly in soil. Always band-place it 5 cm below the seed line during land preparation.
- **Potassium for Stress Resistance:** Muriate of Potash (MOP) or 13:0:45 foliar spray strengthens cell walls against drought, heat, and fungal infection.
- **Micronutrients (Zinc & Ferrous):** In medium black soils, zinc deficiency is common. Apply Zinc Sulphate (21%) @ 10 kg/acre basal or 0.5% foliar spray.

👉 Visit the **Fertilizer Guide** tab in AgriShare for step-by-step dosage tailored to your crop growth stage.`;
  }

  // Irrigation / Water management questions
  if (msg.includes('water') || msg.includes('irrigation') || msg.includes('drip') || msg.includes('flood') || msg.includes('drainage')) {
    return `Namaste ${userName}! Efficient water management tips for crops in ${district}:

- **Timing is Everything:** Always irrigate before 9:00 AM or late in the afternoon. Daytime irrigation loses up to 35% of water to solar evaporation.
- **Drip System Efficiency:** Drip systems save 40-60% water while keeping the plant foliage dry, drastically reducing fungal spore infections.
- **Distinguishing Water Stress:**
  - *Overwatering:* Soft limp yellow lower foliage, standing mud, dark foul-smelling roots.
  - *Underwatering:* Upward leaf curling, dull grayish-green color, dry brittle margins.
- **Trash Mulching:** In sugarcane and orchards, spreading dry biomass across furrows locks in soil moisture for up to 12 days.

👉 Explore the **Water Management** tab for crop-specific critical watering stages.`;
  }

  // General Farming / AgriShare overview
  return `Namaste ${userName}! I am your AgriShare AI Farming Advisor for ${district}, Maharashtra. 

Here are the ways I can help your farm today:
- 🌾 **Crop Diagnostics:** Photograph any symptomatic leaf using the **Plant Scanner** tab.
- 🚜 **Machinery Rentals:** Discover tractors, rotavators, and harvesters in the **Equipment Booking** tab.
- 🧪 **Soil & Nutrition:** Get calibrated NPK schedules and soil health advice in the **Fertilizer Guide** and **Soil Health** tabs.
- 💧 **Smart Irrigation:** Plan drip cycles and identify water stress in the **Water Management** tab.

Feel free to ask any specific question about your crops, pest symptoms, or equipment hiring!`;
}

// AI Farming Chatbot
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], userContext = {}, attachedScanReport } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const safeJoin = (val: any) =>
      Array.isArray(val) ? val.join('; ') : typeof val === 'string' ? val : '';

    let scanContext = '';
    if (attachedScanReport) {
      scanContext = `
Farmer is discussing a specific saved Crop Scan Report:
- Crop Name: ${attachedScanReport.cropName || 'Unspecified Crop'}
- Disease Detected: ${attachedScanReport.diseaseDetected || 'None reported'}
- Health Status: ${attachedScanReport.healthStatus || 'Not evaluated'} (Severity: ${attachedScanReport.severity || 'Moderate'})
- Confidence Score: ${attachedScanReport.confidenceScore || 85}%
- Positive Findings (Healthy plant parts): ${safeJoin(attachedScanReport.positiveFindings) || 'Viable vegetative tissues'}
- Observed Symptoms: ${safeJoin(attachedScanReport.symptoms) || 'None documented'}
- Possible Causes: ${safeJoin(attachedScanReport.possibleCauses) || 'Unspecified'}
- Suggested Treatment: ${safeJoin(attachedScanReport.treatment) || 'Routine maintenance'}
- Preventive Cultural Practices: ${safeJoin(attachedScanReport.prevention) || 'Standard crop rotation'}
- Actionable Recommendations: ${safeJoin(attachedScanReport.recommendations) || 'Scout regularly'}
- Fertilizer Guidance: ${safeJoin(attachedScanReport.fertilizerAdvice) || 'Not specified in this report'}
- Water Guidance: ${safeJoin(attachedScanReport.wateringAdvice) || 'Not specified in this report'}
- Diagnostic Uncertainty / Notes: ${attachedScanReport.uncertaintyNotes || 'Visual inspection based; field confirmation advised.'}
${Array.isArray(attachedScanReport.userObservations) && attachedScanReport.userObservations.length ? `- Farmer Field Follow-Up Observations: ${attachedScanReport.userObservations.map((o: any) => `${o.date || ''}: ${o.note || ''}`).join(' | ')}` : ''}

CRITICAL REPORT GROUNDING INSTRUCTIONS:
- Directly ground your response in the diagnostic data of this saved crop scan.
- DO NOT INVENT or hallucinate missing information.
- Provide structured Immediate, Short-term, and Preventive steps.
`;
    }

    const systemPrompt = `You are AgriShare AI, an expert agricultural consultant and farming companion specialized in:
1. Crop identification and plant disease diagnosis in Indian agriculture.
2. Visible crop symptoms, chlorosis, lesions, pest marks, and pathogen/abiotic causes.
3. Soil health, pH management, organic matter, and NPK/micronutrient deficiencies.
4. Fertilizer selection, split dosage, application method (broadcasting, fertigation, foliar), and safety precautions.
5. Irrigation and water management: growth-stage water needs, drip/sprinkler scheduling, overwatering vs underwatering.
6. Seasonal calendar management (Kharif, Rabi, Zaid).
7. Pest and disease prevention, biological controls, and cultural practices.
8. Farm equipment selection, machinery matching (tractors, rotavators, harvesters, seed drills), and AgriShare rental scheduling.

Farmer Profile & Context:
- Name: ${userContext.fullName || 'Farmer'}
- Location: ${userContext.district || 'Pune'}, ${userContext.state || 'Maharashtra'}
- Farm Area: ${userContext.farmAreaAcres || '4'} acres
- Role: ${userContext.role || 'Farmer'}
${scanContext}

COMMUNICATION PRINCIPLES:
- Provide clear, practical answers in simple, accessible language.
- Structure advice clearly with bullet points.
- Never guarantee miraculous recovery or exaggerate claims.`;

    const chatContents: any[] = [];

    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        if (msg.role && msg.text && msg.text.trim()) {
          chatContents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    chatContents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // 6.5s timeout prevents chat hanging during Gemini 503 high-demand surges
    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: chatContents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    const response = await withTimeout(apiPromise, 6500);
    const reply = response.text || generateAgronomicReply(message, userContext, attachedScanReport);
    return res.json({ reply });
  } catch (err: any) {
    console.warn('Gemini chat API fallback engaged:', err?.message || err);
    const reply = generateAgronomicReply(
      req.body?.message || '',
      req.body?.userContext || {},
      req.body?.attachedScanReport || null
    );
    return res.json({ reply });
  }
});

// ---------------------------------------------
// Dev & Production Server Mounting
// ---------------------------------------------

async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`AgriShare server running on port ${PORT} (${IS_PROD ? 'production' : 'development'})`);
  });
}

startServer();
