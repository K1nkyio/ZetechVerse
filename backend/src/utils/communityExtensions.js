const crypto = require('crypto');
const { run, get, all } = require('../config/db');

let schemaReady = false;
let schemaPromise = null;

const ddlStatements = [
  `ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS reserved_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP`,
  `ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP`,
  `ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS reservation_message TEXT`,
  `ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS safety_notes TEXT`,

  `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS group_name VARCHAR(120)`,
  `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 1`,
  `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS reminder_opt_in BOOLEAN DEFAULT false`,
  `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 60`,
  `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS networking_note TEXT`,
  `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT false`,

  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS abuse_score NUMERIC(5,2) DEFAULT 0`,
  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC(5,2) DEFAULT 0`,
  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS sentiment_label VARCHAR(20) DEFAULT 'neutral'`,
  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low'`,
  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS auto_flagged BOOLEAN DEFAULT false`,
  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS accountability_hash VARCHAR(255)`,
  `ALTER TABLE confessions ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0`,

  `CREATE TABLE IF NOT EXISTS marketplace_seller_reviews (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (listing_id, reviewer_id)
  )`,

  `CREATE TABLE IF NOT EXISTS marketplace_reports (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(120) NOT NULL,
    details TEXT,
    risk_level VARCHAR(20) DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    meetup_status VARCHAR(20) DEFAULT 'planned' CHECK (meetup_status IN ('planned', 'completed', 'cancelled')),
    note TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS event_photo_drops (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    media_url VARCHAR(500) NOT NULL,
    caption TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS user_career_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    resume_url VARCHAR(500),
    resume_filename VARCHAR(255),
    skills TEXT DEFAULT '[]',
    interests TEXT DEFAULT '[]',
    linkedin_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    mentor_open BOOLEAN DEFAULT false,
    mentor_bio TEXT,
    mentorship_topics TEXT DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS saved_opportunities (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, opportunity_id)
  )`,

  `CREATE TABLE IF NOT EXISTS mentor_connections (
    id SERIAL PRIMARY KEY,
    mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    UNIQUE (mentor_id, mentee_id)
  )`,

  `CREATE TABLE IF NOT EXISTS confession_reports (
    id SERIAL PRIMARY KEY,
    confession_id INTEGER NOT NULL REFERENCES confessions(id) ON DELETE CASCADE,
    reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason VARCHAR(120) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (confession_id, reporter_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_seller_id ON marketplace_seller_reviews(seller_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_reports_listing_id ON marketplace_reports(listing_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_listing_id ON marketplace_transactions(listing_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_event_photo_drops_event_id ON event_photo_drops(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_saved_opportunities_user_id ON saved_opportunities(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mentor_connections_mentor_id ON mentor_connections(mentor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_confession_reports_confession_id ON confession_reports(confession_id)`
];

const ensureCommunityFeatureSchema = async () => {
  if (schemaReady) return;
  if (schemaPromise) {
    await schemaPromise;
    return;
  }

  schemaPromise = (async () => {
    for (const statement of ddlStatements) {
      try {
        await run(statement);
      } catch (error) {
        error.message = `Community schema update failed for statement "${statement.replace(/\s+/g, ' ').trim().slice(0, 140)}": ${error.message}`;
        throw error;
      }
    }
    schemaReady = true;
  })();

  try {
    await schemaPromise;
  } finally {
    schemaPromise = null;
  }
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const sanitizeArrayStrings = (value) =>
  parseJsonArray(value)
    .map((item) => String(item || '').trim())
    .filter(Boolean);

const hashAccountabilitySource = (value) =>
  crypto
    .createHash('sha256')
    .update(String(value || 'anonymous'))
    .digest('hex');

const POSITIVE_WORDS = [
  'good',
  'great',
  'happy',
  'love',
  'support',
  'safe',
  'thanks',
  'helpful',
  'kind',
  'encouraging'
];

const NEGATIVE_WORDS = [
  'hate',
  'stupid',
  'useless',
  'trash',
  'idiot',
  'angry',
  'toxic',
  'fake',
  'scam',
  'fraud'
];

const HIGH_RISK_PATTERNS = [
  /kill myself/i,
  /suicide/i,
  /rape/i,
  /leak (their|her|his) number/i,
  /share (their|her|his) number/i,
  /beat (him|her|them) up/i,
  /threat/i
];

const MEDIUM_RISK_PATTERNS = [
  /scam/i,
  /fraud/i,
  /harass/i,
  /bully/i,
  /nude/i,
  /doxx/i,
  /abuse/i,
  /blackmail/i
];

const PROFANITY_PATTERNS = [
  /\bfool\b/i,
  /\bidiot\b/i,
  /\bdumb\b/i,
  /\bstupid\b/i,
  /\bhell\b/i
];

const analyzeConfessionContent = (content) => {
  const text = String(content || '').trim();
  const lowered = text.toLowerCase();

  const positiveHits = POSITIVE_WORDS.reduce(
    (count, word) => count + (lowered.includes(word) ? 1 : 0),
    0
  );
  const negativeHits = NEGATIVE_WORDS.reduce(
    (count, word) => count + (lowered.includes(word) ? 1 : 0),
    0
  );
  const profanityHits = PROFANITY_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );
  const mediumRiskHits = MEDIUM_RISK_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );
  const highRiskHits = HIGH_RISK_PATTERNS.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );

  const abuseScore = Math.min(100, highRiskHits * 45 + mediumRiskHits * 20 + profanityHits * 10);
  const sentimentScore = Math.max(-1, Math.min(1, (positiveHits - negativeHits) / 5));

  let sentimentLabel = 'neutral';
  if (sentimentScore >= 0.3) sentimentLabel = 'positive';
  if (sentimentScore <= -0.3) sentimentLabel = 'negative';

  let riskLevel = 'low';
  if (highRiskHits > 0 || abuseScore >= 60) riskLevel = 'high';
  else if (mediumRiskHits > 0 || abuseScore >= 25) riskLevel = 'medium';

  const autoFlagged = riskLevel === 'high' || abuseScore >= 70;

  return {
    abuseScore,
    sentimentScore: Number(sentimentScore.toFixed(2)),
    sentimentLabel,
    riskLevel,
    autoFlagged
  };
};

const getMarketplaceSafetyGuidance = (listing) => {
  const location = String(listing?.location || '').trim();
  return [
    'Meet in a busy, public location on campus during daylight hours when possible.',
    location ? `Use "${location}" only as a meeting reference after confirming with the seller.` : 'Confirm the exact meetup point before leaving.',
    'Avoid paying in full before inspecting the item or service details in person.',
    'Bring a friend or share your meetup plan with someone you trust.',
    'Report suspicious behavior immediately if pricing, urgency, or contact changes feel unsafe.'
  ];
};

const getSellerTrustProfile = async (sellerId) => {
  await ensureCommunityFeatureSchema();

  const seller = await get(
    `
      SELECT id, email, student_id, email_verified, full_name, username
      FROM users
      WHERE id = ?
    `,
    [sellerId]
  );

  const reviewAggregate = await get(
    `
      SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating,
        COUNT(*)::INTEGER AS reviews_count
      FROM marketplace_seller_reviews
      WHERE seller_id = ?
    `,
    [sellerId]
  );

  const completedTransactions = await get(
    `
      SELECT COUNT(*)::INTEGER AS total
      FROM marketplace_transactions
      WHERE seller_id = ? AND meetup_status = 'completed'
    `,
    [sellerId]
  );

  const verifiedStudent = Boolean(
    seller?.email_verified ||
    seller?.student_id ||
    /zetech/i.test(String(seller?.email || ''))
  );

  return {
    id: seller?.id || sellerId,
    full_name: seller?.full_name || null,
    username: seller?.username || null,
    verified_student: verifiedStudent,
    badge_label: verifiedStudent ? 'Verified student' : 'Unverified seller',
    average_rating: Number(reviewAggregate?.average_rating || 0),
    reviews_count: Number(reviewAggregate?.reviews_count || 0),
    completed_transactions: Number(completedTransactions?.total || 0)
  };
};

const refreshEventAttendeeCount = async (eventId) => {
  await ensureCommunityFeatureSchema();
  const totals = await get(
    `
      SELECT COALESCE(SUM(CASE WHEN status = 'registered' THEN GREATEST(COALESCE(guest_count, 1), 1) ELSE 0 END), 0)::INTEGER AS count
      FROM event_registrations
      WHERE event_id = ?
    `,
    [eventId]
  );

  await run('UPDATE events SET current_attendees = ? WHERE id = ?', [Number(totals?.count || 0), eventId]);
  return Number(totals?.count || 0);
};

const getCareerProfileByUserId = async (userId) => {
  await ensureCommunityFeatureSchema();
  const profile = await get(
    `
      SELECT *
      FROM user_career_profiles
      WHERE user_id = ?
    `,
    [userId]
  );

  if (!profile) {
    return {
      user_id: userId,
      resume_url: null,
      resume_filename: null,
      skills: [],
      interests: [],
      linkedin_url: null,
      portfolio_url: null,
      mentor_open: false,
      mentor_bio: null,
      mentorship_topics: []
    };
  }

  return {
    ...profile,
    skills: sanitizeArrayStrings(profile.skills),
    interests: sanitizeArrayStrings(profile.interests),
    mentorship_topics: sanitizeArrayStrings(profile.mentorship_topics),
    mentor_open: Boolean(profile.mentor_open)
  };
};

module.exports = {
  ensureCommunityFeatureSchema,
  parseJsonArray,
  sanitizeArrayStrings,
  hashAccountabilitySource,
  analyzeConfessionContent,
  getMarketplaceSafetyGuidance,
  getSellerTrustProfile,
  refreshEventAttendeeCount,
  getCareerProfileByUserId,
  all,
  get,
  run
};
