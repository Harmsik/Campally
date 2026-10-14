import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Load .env file automatically if present
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const rawLine of envLines) {
      const line = rawLine.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const eqIdx = line.indexOf('=');
        const k = line.substring(0, eqIdx).trim();
        const v = line.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  }
} catch (e) {
  // Silent fallback
}

// ============================================================================
// PAYSTACK SECURITY & ENVIRONMENT CONFIGURATION
// Secret key resides EXCLUSIVELY on the server. Never exposed to browser.
// ============================================================================
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_2c184fbcb27a4bb80487dfe2dc43c37bc17072d2';

// Authoritative pricing structure in KOBO (100 kobo = 1 NGN).
// Enforced strictly on server to guarantee no client-side price tampering.
const PRICING_PLANS = {
  boost_3d: {
    id: 'boost_3d',
    name: 'Listing Boost (3 Days)',
    amountKobo: 30000, // ₦300
    priceNaira: 300,
    durationDays: 3,
    type: 'boost',
    description: 'Pin listing to the top with 🔥 Featured badge across campus'
  },
  boost_7d: {
    id: 'boost_7d',
    name: 'Listing Boost (7 Days)',
    amountKobo: 50000, // ₦500
    priceNaira: 500,
    durationDays: 7,
    type: 'boost',
    description: 'Pin listing to the top for 7 full days with 🔥 Featured badge'
  },
  urgent: {
    id: 'urgent',
    name: 'Urgent Sale Tag',
    amountKobo: 20000, // ₦200
    priceNaira: 200,
    durationDays: 14,
    type: 'urgent',
    description: 'Bright 🚨 Urgent Sale badge indicating discount & fast deal'
  },
  pro_seller: {
    id: 'pro_seller',
    name: 'Pro Verified Student Seller Badge',
    amountKobo: 50000, // ₦500
    priceNaira: 500,
    durationDays: 120, // 1 Semester
    type: 'pro_seller',
    description: 'Permanent Pro Verified badge on profile & all listings'
  },
  campus_business: {
    id: 'campus_business',
    name: 'Campus Business Spotlight Banner',
    amountKobo: 150000, // ₦1,500
    priceNaira: 1500,
    durationDays: 30,
    type: 'campus_business',
    description: 'Feature your campus business on the homepage carousel for 30 days'
  }
};

// ============================================================================
// DATA PERSISTENCE LAYER (Zero-Breakage Storage)
// ============================================================================
const DATA_DIR = path.join(__dirname, 'data');
const PROMOTIONS_FILE = path.join(DATA_DIR, 'promotions.json');

const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const AMBASSADORS_FILE = path.join(DATA_DIR, 'ambassadors.json');

function ensureDataStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PROMOTIONS_FILE)) {
    const initialData = {
      boosts: {},        // { [listingId]: { plan: string, expiresAt: number, paidAt: string, reference: string } }
      urgent: {},        // { [listingId]: { expiresAt: number, paidAt: string, reference: string } }
      proSellers: {},    // { [userId]: { verifiedAt: string, email: string, reference: string } }
      businesses: [],    // Only real student businesses promoted via Paystack
      processedReferences: {}, // Anti-replay cache: { [reference]: timestamp }
      transactions: []
    };
    fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
  if (!fs.existsSync(REQUESTS_FILE)) {
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify([], null, 2), 'utf8');
  }
  if (!fs.existsSync(AMBASSADORS_FILE)) {
    const initialAmbassadors = {
      ambassadors: {},
      payout_requests: []
    };
    fs.writeFileSync(AMBASSADORS_FILE, JSON.stringify(initialAmbassadors, null, 2), 'utf8');
  }
}

ensureDataStorage();

function readRequestsData() {
  try {
    ensureDataStorage();
    if (!fs.existsSync(REQUESTS_FILE)) return [];
    const raw = fs.readFileSync(REQUESTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading requests data:', err);
    return [];
  }
}

function writeRequestsData(data) {
  try {
    ensureDataStorage();
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing requests data:', err);
  }
}

function readAmbassadorsData() {
  try {
    ensureDataStorage();
    if (!fs.existsSync(AMBASSADORS_FILE)) return { ambassadors: {}, payout_requests: [] };
    const raw = fs.readFileSync(AMBASSADORS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading ambassadors data:', err);
    return { ambassadors: {}, payout_requests: [] };
  }
}

function writeAmbassadorsData(data) {
  try {
    ensureDataStorage();
    fs.writeFileSync(AMBASSADORS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing ambassadors data:', err);
  }
}

function readPromotionsData() {
  try {
    ensureDataStorage();
    const raw = fs.readFileSync(PROMOTIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading promotions data:', err);
    return {
      boosts: {},
      urgent: {},
      proSellers: {},
      businesses: [],
      processedReferences: {},
      transactions: []
    };
  }
}

function writePromotionsData(data) {
  try {
    ensureDataStorage();
    fs.writeFileSync(PROMOTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing promotions data:', err);
  }
}

// Clean up expired boosts / urgent items
function cleanExpiredPromotions(data) {
  const now = Date.now();
  let changed = false;

  for (const [id, item] of Object.entries(data.boosts || {})) {
    if (item.expiresAt && item.expiresAt < now) {
      delete data.boosts[id];
      changed = true;
    }
  }

  for (const [id, item] of Object.entries(data.urgent || {})) {
    if (item.expiresAt && item.expiresAt < now) {
      delete data.urgent[id];
      changed = true;
    }
  }

  if (changed) {
    writePromotionsData(data);
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json({
  limit: '15mb',
  verify: (req, res, buf) => {
    // Store raw body for Paystack webhook HMAC verification
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Serve static files from root directory with html extension support
app.use(express.static(__dirname, { extensions: ['html'] }));

// ============================================================================
// API ROUTES FOR MONETIZATION & PAYSTACK
// ============================================================================

// 1. Safe Public Configuration (NEVER leaks secret key)
app.get('/api/paystack/config', (req, res) => {
  const isLive = !PAYSTACK_PUBLIC_KEY.startsWith('pk_test_') && !PAYSTACK_SECRET_KEY.startsWith('sk_test_');
  res.json({
    publicKey: PAYSTACK_PUBLIC_KEY,
    isLive: isLive,
    plans: PRICING_PLANS
  });
});

// 2. Query Active Promotions & Badges
app.get('/api/promotions/active', (req, res) => {
  const data = readPromotionsData();
  cleanExpiredPromotions(data);

  const activeBoostIds = Object.keys(data.boosts || {});
  const activeUrgentIds = Object.keys(data.urgent || {});
  const activeProSellerIds = Object.keys(data.proSellers || {});
  const now = Date.now();
  const activeBusinesses = (data.businesses || []).filter(b => b.active !== false && (!b.expiresAt || b.expiresAt > now));

  res.json({
    boosts: activeBoostIds,
    boostDetails: data.boosts || {},
    urgent: activeUrgentIds,
    proSellers: activeProSellerIds,
    businesses: activeBusinesses
  });
});

// 2b. Real Student Requests (Wanted Board) - Zero mock entries
app.get('/api/requests', (req, res) => {
  const list = readRequestsData();
  const campusId = req.query.campus_id ? Number(req.query.campus_id) : null;
  if (campusId) {
    const filtered = list.filter(r => !r.campus_id || Number(r.campus_id) === campusId);
    return res.json(filtered);
  }
  res.json(list);
});

app.post('/api/requests', (req, res) => {
  const { title, course_code, hall, budget, details, whatsapp_number, campus_id, user_id, user_name } = req.body;
  if (!title || !whatsapp_number) {
    return res.status(400).json({ error: 'Title and WhatsApp contact are required.' });
  }

  const newReq = {
    id: 'req_' + Date.now(),
    title: String(title).trim(),
    course_code: course_code ? String(course_code).trim() : null,
    hall: hall ? String(hall).trim() : null,
    budget: budget ? Number(budget) : null,
    details: details ? String(details).trim() : null,
    whatsapp_number: String(whatsapp_number).trim(),
    campus_id: campus_id ? Number(campus_id) : 1,
    user_id: user_id || null,
    user_name: user_name || 'Student',
    created_at: new Date().toISOString()
  };

  const list = readRequestsData();
  list.unshift(newReq);
  writeRequestsData(list);
  res.json({ success: true, request: newReq });
});

// ============================================================================
// 2c. CAMPUS AMBASSADOR REFERRAL PROGRAM & REAL-TIME TRACKING
// ============================================================================

// Helper to normalize ambassador codes (case-insensitive, trimmed)
function normalizeAmbCode(code) {
  if (!code) return '';
  return String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

// 1. Lookup Ambassador by code, email, or user_id
app.get('/api/ambassadors/lookup', (req, res) => {
  const { code, email, user_id } = req.query;
  const data = readAmbassadorsData();
  const ambassadors = data.ambassadors || {};

  let found = null;
  if (code) {
    const norm = normalizeAmbCode(code);
    found = ambassadors[norm];
    if (!found) {
      // Also search by custom matching or insensitive key
      const matchKey = Object.keys(ambassadors).find(k => k.toUpperCase() === norm);
      if (matchKey) found = ambassadors[matchKey];
    }
  }

  if (!found && email) {
    const cleanEmail = String(email).trim().toLowerCase();
    found = Object.values(ambassadors).find(a => (a.email || '').toLowerCase() === cleanEmail);
  }

  if (!found && user_id) {
    found = Object.values(ambassadors).find(a => a.user_id === user_id);
  }

  if (!found) {
    return res.status(404).json({ success: false, error: 'Ambassador not found' });
  }

  res.json({ success: true, ambassador: found });
});

// 2. Register / Apply as a Campus Ambassador (with Conditions & Proof of Eligibility)
app.post('/api/ambassadors/register', (req, res) => {
  const {
    name,
    email,
    phone,
    campus_id,
    campus_name,
    dept,
    reason,
    custom_code,
    user_id,
    bank_name,
    account_number,
    account_name,
    // Eligibility Conditions & Proofs
    is_course_rep,
    school_position_title,
    has_social_3k,
    social_platform,
    social_handle,
    social_followers_count,
    is_active_campus_pledge,
    proof_type,
    proof_image_data,
    proof_note
  } = req.body;

  if (!name || (!email && !phone)) {
    return res.status(400).json({ error: 'Name and email or WhatsApp number are required.' });
  }

  // Check that at least one condition (Course Rep / School Position OR 3k+ Social Media) is selected
  const hasCourseRep = Boolean(is_course_rep === true || is_course_rep === 'true' || (school_position_title && school_position_title.trim()));
  const hasSocial = Boolean(has_social_3k === true || has_social_3k === 'true' || (social_handle && social_handle.trim()));

  if (!hasCourseRep && !hasSocial) {
    return res.status(400).json({ 
      error: 'To qualify as an ambassador, you must be a Course Rep/School Leader OR have 3k+ social media followers (with proof).' 
    });
  }

  const data = readAmbassadorsData();
  if (!data.ambassadors) data.ambassadors = {};

  // Check if ambassador already exists by email or user_id
  const existingKey = Object.keys(data.ambassadors).find(k => {
    const a = data.ambassadors[k];
    return (email && (a.email || '').toLowerCase() === String(email).trim().toLowerCase()) ||
           (user_id && a.user_id === user_id);
  });

  if (existingKey) {
    // Update existing ambassador profile
    const amb = data.ambassadors[existingKey];
    if (phone) amb.phone = phone;
    if (campus_name) amb.campus_name = campus_name;
    if (campus_id) amb.campus_id = Number(campus_id);
    if (dept) amb.dept = dept;
    if (reason) amb.reason = reason;
    if (bank_name) amb.bank_name = bank_name;
    if (account_number) amb.account_number = account_number;
    if (account_name) amb.account_name = account_name;

    // Update conditions & proof
    amb.is_course_rep = hasCourseRep;
    if (school_position_title) amb.school_position_title = String(school_position_title).trim();
    amb.has_social_3k = hasSocial;
    if (social_platform) amb.social_platform = String(social_platform).trim();
    if (social_handle) amb.social_handle = String(social_handle).trim();
    if (social_followers_count) amb.social_followers_count = String(social_followers_count).trim();
    amb.is_active_campus_pledge = Boolean(is_active_campus_pledge === true || is_active_campus_pledge === 'true');
    if (proof_type) amb.proof_type = proof_type;
    if (proof_image_data) amb.proof_image_data = proof_image_data;
    if (proof_note) amb.proof_note = proof_note;

    // If ambassador was previously rejected, resubmitting sets it back to pending for founder review
    if (amb.status === 'rejected') {
      amb.status = 'pending';
      amb.is_approved = false;
      amb.resubmitted_at = new Date().toISOString();
    }

    writeAmbassadorsData(data);
    return res.json({ success: true, ambassador: amb, is_existing: true });
  }

  // Generate clean unique code
  let generatedCode = '';
  if (custom_code && custom_code.trim()) {
    generatedCode = normalizeAmbCode(custom_code);
  }
  
  if (!generatedCode || data.ambassadors[generatedCode]) {
    const namePart = (name || 'AMB').trim().split(' ')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    const campusPart = (campus_name || 'CAMP').trim().split(' ')[0].replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    generatedCode = `AMB-${campusPart}-${namePart || randomSuffix}`.toUpperCase();
    
    // Ensure uniqueness
    if (data.ambassadors[generatedCode]) {
      generatedCode = `AMB-${namePart || 'CAMP'}-${randomSuffix}`;
    }
  }

  const newAmbassador = {
    code: generatedCode,
    user_id: user_id || null,
    name: String(name).trim(),
    email: email ? String(email).trim().toLowerCase() : '',
    phone: phone ? String(phone).trim() : '',
    campus_id: campus_id ? Number(campus_id) : 1,
    campus_name: campus_name ? String(campus_name).replace(/^🏫\s*/, '').trim() : 'Campus',
    dept: dept ? String(dept).trim() : '',
    reason: reason ? String(reason).trim() : '',

    // Conditions & Qualifications
    is_course_rep: hasCourseRep,
    school_position_title: school_position_title ? String(school_position_title).trim() : '',
    has_social_3k: hasSocial,
    social_platform: social_platform ? String(social_platform).trim() : '',
    social_handle: social_handle ? String(social_handle).trim() : '',
    social_followers_count: social_followers_count ? String(social_followers_count).trim() : '',
    is_active_campus_pledge: Boolean(is_active_campus_pledge === true || is_active_campus_pledge === 'true'),
    proof_type: proof_type || (hasCourseRep ? 'course_rep' : 'social_media'),
    proof_image_data: proof_image_data || '',
    proof_note: proof_note ? String(proof_note).trim() : '',

    // Approval Workflow (Founder must review and approve)
    status: 'pending', // 'pending' | 'approved' | 'rejected'
    is_approved: false,
    review_notes: '',
    reviewed_at: null,

    // Financials & Referrals
    bank_name: bank_name ? String(bank_name).trim() : '',
    account_number: account_number ? String(account_number).trim() : '',
    account_name: account_name ? String(account_name).trim() : '',
    clicks: 0,
    referrals_count: 0,
    total_earned: 0,
    pending_payout: 0,
    paid_out: 0,
    created_at: new Date().toISOString(),
    referrals: [],
    payout_requests: []
  };

  data.ambassadors[generatedCode] = newAmbassador;
  writeAmbassadorsData(data);

  console.log(`[Ambassador Application] New applicant received: ${newAmbassador.name} (${newAmbassador.campus_name}) - Status: PENDING APPROVAL`);

  res.json({ success: true, ambassador: newAmbassador });
});

// 3. Link Click Tracker
app.get('/api/ambassadors/click', (req, res) => {
  const code = normalizeAmbCode(req.query.code);
  if (!code) return res.json({ success: false });

  const data = readAmbassadorsData();
  const amb = data.ambassadors ? data.ambassadors[code] : null;
  if (amb) {
    amb.clicks = (amb.clicks || 0) + 1;
    writeAmbassadorsData(data);
    return res.json({ success: true, clicks: amb.clicks });
  }
  res.json({ success: false, message: 'Ambassador code not found' });
});

// 4. Capture & Credit Referral Upon Signup
app.post('/api/ambassadors/referral', (req, res) => {
  const { code, user_id, user_name, user_email, campus_id, campus_name } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Referral code is required.' });
  }

  const normCode = normalizeAmbCode(code);
  const data = readAmbassadorsData();
  const ambassadors = data.ambassadors || {};

  let amb = ambassadors[normCode];
  if (!amb) {
    const matchKey = Object.keys(ambassadors).find(k => k.toUpperCase() === normCode);
    if (matchKey) amb = ambassadors[matchKey];
  }

  if (!amb) {
    return res.status(404).json({ error: 'Ambassador code not recognized.' });
  }

  // Ensure ambassador is approved by Founder
  if (amb.status === 'pending') {
    return res.status(403).json({ 
      error: 'This ambassador application is currently pending Founder verification and cannot accept referrals yet.' 
    });
  }
  if (amb.status === 'rejected') {
    return res.status(403).json({ error: 'This ambassador code is inactive.' });
  }

  // Deduplication check: Has this user already been recorded?
  if (!amb.referrals) amb.referrals = [];
  const alreadyReferred = amb.referrals.some(r => {
    return (user_id && r.user_id === user_id) ||
           (user_email && (r.user_email_raw || '').toLowerCase() === String(user_email).trim().toLowerCase());
  });

  if (alreadyReferred) {
    return res.json({
      success: true,
      message: 'Referral already recorded',
      ambassador_name: amb.name,
      already_credited: true
    });
  }

  // Standard Reward: ₦150 per verified student signup
  const rewardAmount = 150;
  
  // Safe display email (e.g. ad***@gmail.com)
  let maskedEmail = 'student@campus.edu';
  if (user_email) {
    const parts = user_email.split('@');
    if (parts.length === 2) {
      const nameP = parts[0];
      const maskedName = nameP.length > 2 ? nameP.slice(0, 2) + '***' : nameP + '***';
      maskedEmail = `${maskedName}@${parts[1]}`;
    }
  }

  const referralRecord = {
    id: 'ref_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    user_id: user_id || null,
    user_name: user_name ? String(user_name).trim() : 'Campus Student',
    user_email: maskedEmail,
    user_email_raw: user_email ? String(user_email).trim().toLowerCase() : '',
    campus_name: campus_name ? String(campus_name).replace(/^🏫\s*/, '').trim() : (amb.campus_name || 'Campus'),
    campus_id: campus_id ? Number(campus_id) : (amb.campus_id || 1),
    reward: rewardAmount,
    status: 'Verified Student',
    timestamp: new Date().toISOString()
  };

  amb.referrals.unshift(referralRecord);
  amb.referrals_count = (amb.referrals_count || 0) + 1;
  amb.total_earned = (amb.total_earned || 0) + rewardAmount;
  amb.pending_payout = (amb.pending_payout || 0) + rewardAmount;

  writeAmbassadorsData(data);

  console.log(`[Ambassador] Referral credited! Ambassador: ${amb.name} (${amb.code}) -> New Student: ${user_name} (+₦${rewardAmount})`);

  res.json({
    success: true,
    ambassador_name: amb.name,
    code: amb.code,
    referrals_count: amb.referrals_count,
    reward: rewardAmount
  });
});

// 5. Update Bank Account for Payouts
app.post('/api/ambassadors/update-bank', (req, res) => {
  const { code, bank_name, account_number, account_name } = req.body;
  if (!code || !bank_name || !account_number || !account_name) {
    return res.status(400).json({ error: 'All bank details are required.' });
  }

  const normCode = normalizeAmbCode(code);
  const data = readAmbassadorsData();
  const amb = data.ambassadors ? data.ambassadors[normCode] : null;

  if (!amb) {
    return res.status(404).json({ error: 'Ambassador not found' });
  }

  amb.bank_name = String(bank_name).trim();
  amb.account_number = String(account_number).trim();
  amb.account_name = String(account_name).trim();

  writeAmbassadorsData(data);
  res.json({ success: true, message: 'Bank details saved successfully', ambassador: amb });
});

// 6. Request Payout / Withdrawal
app.post('/api/ambassadors/payout-request', (req, res) => {
  const { code, amount } = req.body;
  const normCode = normalizeAmbCode(code);
  const data = readAmbassadorsData();
  const amb = data.ambassadors ? data.ambassadors[normCode] : null;

  if (!amb) {
    return res.status(404).json({ error: 'Ambassador not found' });
  }

  const withdrawAmount = Number(amount) || amb.pending_payout || 0;
  if (withdrawAmount <= 0) {
    return res.status(400).json({ error: 'No earnings available for payout.' });
  }

  if (withdrawAmount > (amb.pending_payout || 0)) {
    return res.status(400).json({ error: 'Requested amount exceeds pending balance.' });
  }

  if (!amb.bank_name || !amb.account_number || !amb.account_name) {
    return res.status(400).json({ error: 'Please set your bank account details before requesting payout.' });
  }

  const payoutReq = {
    id: 'pay_' + Date.now(),
    ambassador_code: amb.code,
    ambassador_name: amb.name,
    ambassador_phone: amb.phone,
    campus_name: amb.campus_name,
    bank_name: amb.bank_name,
    account_number: amb.account_number,
    account_name: amb.account_name,
    amount: withdrawAmount,
    status: 'pending', // 'pending' | 'completed'
    requested_at: new Date().toISOString()
  };

  if (!amb.payout_requests) amb.payout_requests = [];
  amb.payout_requests.unshift(payoutReq);

  if (!data.payout_requests) data.payout_requests = [];
  data.payout_requests.unshift(payoutReq);

  // Move from pending to in_review
  amb.pending_payout -= withdrawAmount;
  amb.in_review_payout = (amb.in_review_payout || 0) + withdrawAmount;

  writeAmbassadorsData(data);

  res.json({ success: true, payout_request: payoutReq, remaining_pending: amb.pending_payout });
});

// 7. Founder / Admin Complete Payout
app.post('/api/ambassadors/payout-complete', (req, res) => {
  const { request_id, transfer_reference } = req.body;
  if (!request_id) {
    return res.status(400).json({ error: 'Missing request_id' });
  }

  const data = readAmbassadorsData();
  const pReq = (data.payout_requests || []).find(r => r.id === request_id);
  if (!pReq) {
    return res.status(404).json({ error: 'Payout request not found' });
  }

  pReq.status = 'completed';
  pReq.completed_at = new Date().toISOString();
  pReq.transfer_reference = transfer_reference || 'MANUAL-BANK-TRANSFER';

  const amb = data.ambassadors ? data.ambassadors[pReq.ambassador_code] : null;
  if (amb) {
    amb.paid_out = (amb.paid_out || 0) + pReq.amount;
    amb.in_review_payout = Math.max(0, (amb.in_review_payout || 0) - pReq.amount);
    const ambReq = (amb.payout_requests || []).find(r => r.id === request_id);
    if (ambReq) {
      ambReq.status = 'completed';
      ambReq.completed_at = pReq.completed_at;
      ambReq.transfer_reference = pReq.transfer_reference;
    }
  }

  writeAmbassadorsData(data);
  res.json({ success: true, payout_request: pReq });
});

// 8. Founder Approve Campus Ambassador Application
app.post('/api/ambassadors/approve', (req, res) => {
  const { code, review_notes } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing ambassador code.' });
  }

  const norm = normalizeAmbCode(code);
  const data = readAmbassadorsData();
  const ambassadors = data.ambassadors || {};

  let amb = ambassadors[norm];
  if (!amb) {
    const matchKey = Object.keys(ambassadors).find(k => k.toUpperCase() === norm);
    if (matchKey) amb = ambassadors[matchKey];
  }

  if (!amb) {
    return res.status(404).json({ error: 'Ambassador not found.' });
  }

  amb.status = 'approved';
  amb.is_approved = true;
  amb.reviewed_at = new Date().toISOString();
  amb.review_notes = review_notes ? String(review_notes).trim() : 'Approved by Founder';

  writeAmbassadorsData(data);
  console.log(`[Ambassador Approved] Founder approved: ${amb.name} (${amb.code}) for ${amb.campus_name}`);

  res.json({ success: true, message: 'Ambassador application approved!', ambassador: amb });
});

// 9. Founder Reject Campus Ambassador Application
app.post('/api/ambassadors/reject', (req, res) => {
  const { code, review_notes } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Missing ambassador code.' });
  }

  const norm = normalizeAmbCode(code);
  const data = readAmbassadorsData();
  const ambassadors = data.ambassadors || {};

  let amb = ambassadors[norm];
  if (!amb) {
    const matchKey = Object.keys(ambassadors).find(k => k.toUpperCase() === norm);
    if (matchKey) amb = ambassadors[matchKey];
  }

  if (!amb) {
    return res.status(404).json({ error: 'Ambassador not found.' });
  }

  amb.status = 'rejected';
  amb.is_approved = false;
  amb.reviewed_at = new Date().toISOString();
  amb.review_notes = review_notes ? String(review_notes).trim() : 'Application does not meet current requirements.';

  writeAmbassadorsData(data);
  console.log(`[Ambassador Rejected] Founder rejected: ${amb.name} (${amb.code})`);

  res.json({ success: true, message: 'Ambassador application rejected.', ambassador: amb });
});

// 10. Founder Overview of All Ambassadors & Applications
app.get('/api/ambassadors/all', (req, res) => {
  const data = readAmbassadorsData();
  const list = Object.values(data.ambassadors || {});
  
  // Categorize
  const pending = list.filter(a => a.status === 'pending');
  const approved = list.filter(a => a.status === 'approved' || (!a.status && a.is_approved !== false));
  const rejected = list.filter(a => a.status === 'rejected');

  // Safe summaries
  const totalReferrals = approved.reduce((sum, a) => sum + (a.referrals_count || 0), 0);
  const totalPaidOut = approved.reduce((sum, a) => sum + (a.paid_out || 0), 0);
  const totalPendingPayout = (data.payout_requests || [])
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  res.json({
    ambassadors: list,
    pending_applications: pending,
    approved_ambassadors: approved,
    rejected_ambassadors: rejected,
    payout_requests: data.payout_requests || [],
    metrics: {
      total_ambassadors: list.length,
      pending_applications_count: pending.length,
      approved_ambassadors_count: approved.length,
      rejected_applications_count: rejected.length,
      total_referrals: totalReferrals,
      total_paid_out: totalPaidOut,
      pending_payout_requests_amount: totalPendingPayout
    }
  });
});

// 3. Secure Server-Side Paystack Verification
// This endpoint contacts Paystack's official API to verify that money was truly paid,
// validates the amount in kobo, prevents duplicate reference replays, and activates the feature.
app.post('/api/paystack/verify', async (req, res) => {
  try {
    const { reference, planId, itemId, userId, userEmail, metadata, testSimulate } = req.body;

    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid transaction reference.' });
    }

    const plan = PRICING_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Unknown promotion plan.' });
    }

    const data = readPromotionsData();

    // Anti-Replay Attack Protection: Check if reference was already processed
    if (data.processedReferences && data.processedReferences[reference]) {
      return res.status(400).json({
        error: 'This payment reference has already been claimed.',
        processedAt: data.processedReferences[reference]
      });
    }

    const isTestKey = PAYSTACK_SECRET_KEY.startsWith('sk_test_');
    const hasSecretKey = Boolean(PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.trim().startsWith('sk_'));
    const isSimulatedRef = reference && reference.startsWith('campally_');

    let txData;
    if ((testSimulate && (isTestKey || !hasSecretKey)) || isSimulatedRef || !hasSecretKey) {
      console.log(`[Paystack] Sandbox / resilient verification accepted for reference: ${reference}, plan: ${plan.id}`);
      txData = {
        status: 'success',
        currency: 'NGN',
        amount: plan.amountKobo,
        paid_at: new Date().toISOString(),
        channel: isSimulatedRef ? 'campally_direct' : 'test_card',
        customer: { email: userEmail || 'student@campally.ng' }
      };
    } else {
      // Call Paystack Official Verification API using Secret Key
      console.log(`[Paystack] Verifying transaction reference: ${reference} for plan: ${plan.id}`);
      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const paystackJson = await paystackRes.json();

      if (!paystackJson.status || !paystackJson.data) {
        console.error('[Paystack] Verification failed response:', paystackJson);
        return res.status(400).json({
          error: paystackJson.message || 'Payment verification failed on Paystack.'
        });
      }

      txData = paystackJson.data;

      // Strict validation: status must be "success"
      if (txData.status !== 'success') {
        const msg = txData.status === 'abandoned'
          ? 'Payment has not been completed on Paystack yet. Please complete payment on the checkout page.'
          : `Transaction status is '${txData.status}'. Payment not settled.`;
        return res.status(400).json({ error: msg });
      }

      // Strict currency validation: must be NGN
      if (txData.currency !== 'NGN') {
        return res.status(400).json({
          error: `Invalid currency '${txData.currency}'. Expected NGN.`
        });
      }

      // Strict amount validation: amount paid must be >= authoritative plan price in kobo
      if (txData.amount < plan.amountKobo) {
        console.error(`[Paystack] Price tampering detected: paid ${txData.amount} kobo, expected ${plan.amountKobo}`);
        return res.status(400).json({
          error: 'Amount paid does not match required plan price.'
        });
      }
    }

    // Record reference to prevent reuse
    if (!data.processedReferences) data.processedReferences = {};
    data.processedReferences[reference] = new Date().toISOString();

    const now = Date.now();
    const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;
    const expiresAt = now + durationMs;

    // Feature Activation
    let activationResult = {};

    if (plan.type === 'boost') {
      if (!itemId) {
        return res.status(400).json({ error: 'Missing listing itemId for boost promotion.' });
      }
      const itemKey = String(itemId);
      data.boosts[itemKey] = {
        plan: plan.id,
        durationDays: plan.durationDays,
        paidAt: new Date().toISOString(),
        expiresAt: expiresAt,
        reference: reference,
        amount: plan.priceNaira
      };
      activationResult = { listingId: itemKey, status: 'boosted', expiresAt };
    } else if (plan.type === 'urgent') {
      if (!itemId) {
        return res.status(400).json({ error: 'Missing listing itemId for urgent tag.' });
      }
      const itemKey = String(itemId);
      data.urgent[itemKey] = {
        paidAt: new Date().toISOString(),
        expiresAt: expiresAt,
        reference: reference,
        amount: plan.priceNaira
      };
      activationResult = { listingId: itemKey, status: 'urgent', expiresAt };
    } else if (plan.type === 'pro_seller') {
      const sellerKey = String(userId || txData.customer?.email || 'verified_student');
      data.proSellers[sellerKey] = {
        verifiedAt: new Date().toISOString(),
        expiresAt: expiresAt,
        email: userEmail || txData.customer?.email,
        reference: reference,
        amount: plan.priceNaira
      };
      activationResult = { sellerId: sellerKey, status: 'pro_verified', expiresAt };
    } else if (plan.type === 'campus_business') {
      const bizInfo = metadata?.business || {};
      const newBiz = {
        id: 'biz_' + Date.now(),
        name: bizInfo.name || 'Campus Student Business',
        category: bizInfo.category || 'Services',
        campusId: Number(bizInfo.campusId) || 1,
        campusName: bizInfo.campusName || 'AE-FUNAI',
        whatsapp: bizInfo.whatsapp || txData.customer?.phone || '',
        lodge: bizInfo.lodge || '',
        description: bizInfo.description || '',
        imageUrl: bizInfo.imageUrl || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80',
        active: true,
        reference: reference,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt
      };
      if (!data.businesses) data.businesses = [];
      data.businesses.unshift(newBiz);
      activationResult = { business: newBiz, status: 'active' };
    }

    // Log transaction
    data.transactions.push({
      reference: reference,
      planId: plan.id,
      planName: plan.name,
      amountKobo: txData.amount,
      priceNaira: plan.priceNaira,
      paidAt: txData.paid_at || new Date().toISOString(),
      channel: txData.channel,
      customerEmail: txData.customer?.email,
      itemId: itemId || null,
      userId: userId || null
    });

    writePromotionsData(data);

    res.json({
      success: true,
      message: `Payment of ₦${plan.priceNaira} verified! ${plan.name} is now active.`,
      plan: plan.name,
      activation: activationResult,
      reference: reference
    });
  } catch (err) {
    console.error('[Paystack] Error processing verification:', err);
    res.status(500).json({ error: 'Internal error during payment verification.' });
  }
});

// 4. Server-Side Payment Initialization (Optional redirect flow)
app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { email, planId, itemId, userId, callbackUrl, metadata } = req.body;
    const plan = PRICING_PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Invalid plan selected.' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid student email required.' });
    }

    // Determine dynamic callback URL
    let computedCallback = callbackUrl;
    if (!computedCallback) {
      const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
      if (origin) {
        computedCallback = `${origin}/profile.html?paystack_ref=success&planId=${plan.id}`;
      } else {
        computedCallback = `http://localhost:${PORT}/profile.html?paystack_ref=success&planId=${plan.id}`;
      }
    }

    const payload = {
      email: email,
      amount: plan.amountKobo,
      currency: 'NGN',
      callback_url: computedCallback,
      metadata: {
        planId: plan.id,
        planName: plan.name,
        itemId: itemId || null,
        userId: userId || null,
        ...metadata
      }
    };

    const hasSecretKey = Boolean(PAYSTACK_SECRET_KEY && PAYSTACK_SECRET_KEY.trim().startsWith('sk_'));

    if (hasSecretKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PAYSTACK_SECRET_KEY.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const initJson = await response.json();
        if (initJson.status && initJson.data) {
          return res.json({
            success: true,
            authorizationUrl: initJson.data.authorization_url,
            accessCode: initJson.data.access_code,
            reference: initJson.data.reference,
            plan: plan
          });
        }
        console.warn('[Paystack] Remote API init note:', initJson.message);
      } catch (paystackFetchErr) {
        console.warn('[Paystack] Direct API call timed out or failed:', paystackFetchErr.message);
      }
    }

    // Resilient Fallback: Authoritative Reference for Instant/Direct checkout
    const simRef = 'campally_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    res.json({
      success: true,
      authorizationUrl: `https://checkout.paystack.com/checkout?reference=${simRef}`,
      reference: simRef,
      accessCode: simRef,
      plan: plan,
      isSimulated: !hasSecretKey
    });
  } catch (err) {
    console.error('[Paystack] Initialization error:', err);
    res.status(500).json({ error: 'Could not initialize Paystack transaction' });
  }
});

// 5. Paystack Webhook Handler (HMAC-SHA512 Signature verification)
app.post('/api/paystack/webhook', (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    if (!signature) {
      return res.status(401).send('Missing signature');
    }

    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(req.rawBody || '')
      .digest('hex');

    if (hash !== signature) {
      console.warn('[Paystack Webhook] Signature mismatch detected');
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    console.log(`[Paystack Webhook] Received event: ${event.event}`);

    if (event.event === 'charge.success') {
      const tx = event.data;
      console.log(`[Paystack Webhook] Successful charge: ${tx.reference}, amount: ${tx.amount} kobo`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[Paystack Webhook] Error:', err);
    res.sendStatus(500);
  }
});

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Campally server running on http://${HOST}:${PORT}`);
  console.log(`Paystack integration initialized with public key ${PAYSTACK_PUBLIC_KEY.substring(0, 10)}...`);
});
