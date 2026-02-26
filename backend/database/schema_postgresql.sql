-- ZetechVerse Database Schema
-- PostgreSQL Database Design for Marketplace, Opportunities, Events, Confessions, and Users

-- ===========================================
-- USERS TABLE
-- ===========================================

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'anonymous')),
    student_id VARCHAR(50),
    course VARCHAR(255),
    year_of_study INTEGER,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    admin_status VARCHAR(20) DEFAULT 'approved' CHECK (admin_status IN ('pending', 'approved', 'deactivated')),
    admin_requested_at TIMESTAMP,
    admin_approved_at TIMESTAMP,
    admin_approved_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,

    FOREIGN KEY (admin_approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================
-- POSTS TABLE (Blog Posts)
-- ===========================================

CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    category VARCHAR(100),
    tags TEXT, -- JSON array of tags
    featured_image VARCHAR(500),
    video_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
    author_id INTEGER NOT NULL,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- CATEGORIES TABLE
-- ===========================================

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('marketplace', 'opportunities', 'events', 'confessions', 'blog')),
    icon VARCHAR(50),
    color VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- MARKETPLACE LISTINGS
-- ===========================================

CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    category_id INTEGER,
    location VARCHAR(255),
    condition VARCHAR(20) DEFAULT 'used' CHECK (condition IN ('new', 'used', 'refurbished')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'inactive')),
    seller_id INTEGER NOT NULL,
    image_urls TEXT, -- JSON array of image URLs
    tags TEXT, -- JSON array of tags
    phone VARCHAR(20),
    contact_method VARCHAR(20) DEFAULT 'in_app' CHECK (contact_method IN ('phone', 'email', 'in_app')),
    is_negotiable BOOLEAN DEFAULT false,
    urgent BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- OPPORTUNITIES
-- ===========================================

CREATE TABLE opportunities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('internship', 'attachment', 'job', 'scholarship', 'volunteer')),
    category_id INTEGER,
    application_deadline TIMESTAMP,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    salary_min DECIMAL(12,2),
    salary_max DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'KES',
    is_paid BOOLEAN DEFAULT false,
    is_remote BOOLEAN DEFAULT false,
    requirements TEXT, -- JSON array of requirements
    benefits TEXT, -- JSON array of benefits
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    application_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'filled')),
    posted_by INTEGER NOT NULL,
    views_count INTEGER DEFAULT 0,
    applications_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (posted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- OPPORTUNITY APPLICATIONS
-- ===========================================

CREATE TABLE opportunity_applications (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER NOT NULL,
    applicant_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
    cover_letter TEXT,
    resume_url VARCHAR(500),
    additional_info TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER,

    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(opportunity_id, applicant_id)
);

-- ===========================================
-- EVENTS
-- ===========================================

CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    location VARCHAR(255),
    venue_details TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('hackathon', 'workshop', 'competition', 'social', 'seminar', 'cultural')),
    category_id INTEGER,
    organizer_id INTEGER NOT NULL,
    max_attendees INTEGER,
    current_attendees INTEGER DEFAULT 0,
    registration_deadline TIMESTAMP,
    ticket_price DECIMAL(10,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT false,
    registration_required BOOLEAN DEFAULT true,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    agenda TEXT, -- JSON array of agenda items
    requirements TEXT, -- JSON array of requirements
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    website_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- EVENT REGISTRATIONS/RSVP
-- ===========================================

CREATE TABLE event_registrations (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled')),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attended_at TIMESTAMP,
    ticket_number VARCHAR(50) UNIQUE,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_amount DECIMAL(10,2),
    special_requests TEXT,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
);

-- ===========================================
-- CONFESSIONS
-- ===========================================

CREATE TABLE confessions (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    category_id INTEGER,
    author_id INTEGER, -- NULL for anonymous posts
    is_anonymous BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    is_hot BOOLEAN DEFAULT false,
    moderated_by INTEGER,
    moderated_at TIMESTAMP,
    moderation_reason TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================
-- CONFESSION LIKES
-- ===========================================

CREATE TABLE confession_likes (
    id SERIAL PRIMARY KEY,
    confession_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(confession_id, user_id)
);

-- ===========================================
-- CONFESSION COMMENTS
-- ===========================================

CREATE TABLE confession_comments (
    id SERIAL PRIMARY KEY,
    confession_id INTEGER NOT NULL,
    user_id INTEGER,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT true,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by INTEGER,
    moderated_at TIMESTAMP,
    parent_comment_id INTEGER, -- For nested comments
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (confession_id) REFERENCES confessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_comment_id) REFERENCES confession_comments(id) ON DELETE CASCADE
);

-- ===========================================
-- BLOG POSTS (for Explore section)
-- ===========================================

CREATE TABLE blog_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    category_id INTEGER,
    author_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'published', 'rejected', 'archived')),
    featured BOOLEAN DEFAULT false,
    image_url VARCHAR(500),
    tags TEXT, -- JSON array of tags
    seo_title VARCHAR(255),
    seo_description TEXT,
    reading_time_minutes INTEGER,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- BLOG POST LIKES
-- ===========================================

CREATE TABLE blog_post_likes (
    id SERIAL PRIMARY KEY,
    blog_post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(blog_post_id, user_id)
);

-- ===========================================
-- POSTS LIKES (for posts table)
-- ===========================================

CREATE TABLE post_likes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(post_id, user_id)
);

-- ===========================================
-- EVENT LIKES
-- ===========================================

CREATE TABLE event_likes (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)
);

-- ===========================================
-- MARKETPLACE COMMENTS
-- ===========================================

CREATE TABLE marketplace_comments (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by INTEGER,
    moderated_at TIMESTAMP,
    parent_comment_id INTEGER, -- For nested comments
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_comment_id) REFERENCES marketplace_comments(id) ON DELETE CASCADE
);

-- ===========================================
-- MARKETPLACE LISTING LIKES
-- ===========================================

CREATE TABLE marketplace_listing_likes (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(listing_id, user_id)
);

-- ===========================================
-- BLOG POST COMMENTS
-- ===========================================

CREATE TABLE blog_post_comments (
    id SERIAL PRIMARY KEY,
    blog_post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by INTEGER,
    moderated_at TIMESTAMP,
    parent_comment_id INTEGER, -- For nested comments
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_comment_id) REFERENCES blog_post_comments(id) ON DELETE CASCADE
);

-- ===========================================
-- EVENTS COMMENTS
-- ===========================================

CREATE TABLE events_comments (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    moderated_by INTEGER,
    moderated_at TIMESTAMP,
    parent_comment_id INTEGER, -- For nested comments
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (moderated_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_comment_id) REFERENCES events_comments(id) ON DELETE CASCADE
);

-- ===========================================
-- EVENTS COMMENTS LIKES
-- ===========================================

CREATE TABLE events_comments_likes (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (comment_id) REFERENCES events_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(comment_id, user_id)
);

-- ===========================================
-- NOTIFICATIONS
-- ===========================================

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (
      type IN (
        'system', 'personal', 'reminder', 'alert', 'maintenance', 'update', 'announcement',
        'marketplace', 'opportunities', 'events', 'confessions', 'posts',
        'confession_like', 'confession_comment', 'event_reminder', 'application_update', 'listing_sold', 'blog_comment'
      )
    ),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_id INTEGER, -- ID of related entity (confession, event, etc.)
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- MESSAGES (for marketplace inquiries)
-- ===========================================

CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    listing_id INTEGER, -- NULL if not related to a listing
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE
);

-- ===========================================
-- ACTIVITY LOGS
-- ===========================================

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_admin_status ON users(admin_status);

-- Marketplace indexes
CREATE INDEX idx_marketplace_category ON marketplace_listings(category_id);
CREATE INDEX idx_marketplace_seller ON marketplace_listings(seller_id);
CREATE INDEX idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX idx_marketplace_created ON marketplace_listings(created_at);

-- Opportunities indexes
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_category ON opportunities(category_id);
CREATE INDEX idx_opportunities_deadline ON opportunities(application_deadline);
CREATE INDEX idx_opportunities_status ON opportunities(status);

-- Events indexes
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_likes ON events(likes_count);

-- Likes indexes
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_event_likes_event ON event_likes(event_id);
CREATE INDEX idx_event_likes_user ON event_likes(user_id);
CREATE INDEX idx_marketplace_listing_likes_listing ON marketplace_listing_likes(listing_id);
CREATE INDEX idx_marketplace_listing_likes_user ON marketplace_listing_likes(user_id);

-- Confessions indexes
CREATE INDEX idx_confessions_status ON confessions(status);
CREATE INDEX idx_confessions_category ON confessions(category_id);
CREATE INDEX idx_confessions_author ON confessions(author_id);
CREATE INDEX idx_confessions_hot ON confessions(is_hot);
CREATE INDEX idx_confessions_created ON confessions(created_at);

-- Marketplace comments indexes
CREATE INDEX idx_marketplace_comments_listing ON marketplace_comments(listing_id);
CREATE INDEX idx_marketplace_comments_user ON marketplace_comments(user_id);
CREATE INDEX idx_marketplace_comments_status ON marketplace_comments(status);
CREATE INDEX idx_marketplace_comments_created ON marketplace_comments(created_at);

-- Blog posts indexes
CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_category ON blog_posts(category_id);
CREATE INDEX idx_blog_posts_author ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at);
CREATE INDEX idx_blog_posts_featured ON blog_posts(featured);

-- Events comments indexes
CREATE INDEX idx_events_comments_event ON events_comments(event_id);
CREATE INDEX idx_events_comments_user ON events_comments(user_id);
CREATE INDEX idx_events_comments_status ON events_comments(status);
CREATE INDEX idx_events_comments_created ON events_comments(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Messages indexes
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_listing ON messages(listing_id);
CREATE INDEX idx_messages_read ON messages(is_read);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT (PostgreSQL version)
-- ===========================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_registrations_updated_at BEFORE UPDATE ON event_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_confessions_updated_at BEFORE UPDATE ON confessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_confession_comments_updated_at BEFORE UPDATE ON confession_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_comments_updated_at BEFORE UPDATE ON marketplace_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_post_comments_updated_at BEFORE UPDATE ON blog_post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_comments_updated_at BEFORE UPDATE ON events_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- INITIAL DATA SEEDING
-- ===========================================

-- Insert default categories
INSERT INTO categories (name, slug, description, type, icon, color, is_active, sort_order) VALUES
-- Marketplace categories
('All', 'all', 'All marketplace listings', 'marketplace', 'Grid3X3', '#6b7280', true, 1),
('Electronics', 'electronics', 'Phones, laptops, and electronic devices', 'marketplace', 'Smartphone', '#3b82f6', true, 2),
('Fashion', 'fashion', 'Clothing, shoes, and accessories', 'marketplace', 'Shirt', '#ec4899', true, 3),
('Books', 'books', 'Textbooks, novels, and study materials', 'marketplace', 'BookOpen', '#f59e0b', true, 4),
('Services', 'services', 'Tutoring, design, and other services', 'marketplace', 'Code', '#8b5cf6', true, 5),
('Hostels', 'hostels', 'Room and accommodation listings', 'marketplace', 'Home', '#10b981', true, 6),

-- Opportunities categories
('All', 'all-opportunities', 'All opportunities', 'opportunities', 'Briefcase', '#6b7280', true, 1),
('Internships', 'internships', 'Paid and unpaid internships', 'opportunities', 'GraduationCap', '#3b82f6', true, 2),
('Attachments', 'attachments', 'Industrial attachments', 'opportunities', 'BookOpen', '#10b981', true, 3),
('Jobs', 'jobs', 'Part-time and full-time jobs', 'opportunities', 'Briefcase', '#f59e0b', true, 4),
('Scholarships', 'scholarships', 'Scholarship opportunities', 'opportunities', 'Trophy', '#8b5cf6', true, 5),

-- Events categories
('All Events', 'all-events', 'All campus events', 'events', 'Calendar', '#6b7280', true, 1),
('Hackathons', 'hackathons', 'Programming competitions', 'events', 'Zap', '#3b82f6', true, 2),
('Workshops', 'workshops', 'Learning workshops', 'events', 'BookOpen', '#10b981', true, 3),
('Competitions', 'competitions', 'Various competitions', 'events', 'Trophy', '#f59e0b', true, 4),
('Social', 'social', 'Social events and parties', 'events', 'Music', '#ec4899', true, 5),

-- Confessions categories
('All', 'all-confessions', 'All confessions', 'confessions', 'MessageCircle', '#6b7280', true, 1),
('Trending', 'trending', 'Most popular confessions', 'confessions', 'TrendingUp', '#3b82f6', true, 2),
('New', 'new', 'Recently posted confessions', 'confessions', 'Clock', '#10b981', true, 3),
('Hot', 'hot', 'Currently trending confessions', 'confessions', 'Flame', '#ef4444', true, 4),

-- Blog categories
('All', 'all-blog', 'All blog posts', 'blog', 'BookOpen', '#6b7280', true, 1),
('Finance', 'finance', 'Money management and financial tips', 'blog', 'Coins', '#10b981', true, 2),
('Technology', 'technology', 'Tech news and tutorials', 'blog', 'Lightbulb', '#3b82f6', true, 3),
('Careers', 'careers', 'Career advice and opportunities', 'blog', 'Briefcase', '#f59e0b', true, 4),
('Campus Life', 'campus-life', 'Student life and experiences', 'blog', 'Coffee', '#8b5cf6', true, 5),
('Wellness', 'wellness', 'Mental health and wellness tips', 'blog', 'Heart', '#ec4899', true, 6),
('Success Stories', 'success-stories', 'Inspiring student success stories', 'blog', 'GraduationCap', '#06b6d4', true, 7);
