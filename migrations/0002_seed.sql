-- Dukh Dealer — seed data (same content the Part 1 mock UI shipped with)
-- Safe to run once. Edit everything afterwards from the Admin Panel.

INSERT OR IGNORE INTO site_settings (id, website_name, tagline, description, email, instagram_url, social_links, footer_text, navigation_labels, cta_labels)
VALUES (
  'default',
  'Dukh Dealer',
  'A private space to be heard',
  'Private paid conversations with a real listener. Chat, voice, or mystery video — just listening, talking, and being heard.',
  'hello@dukhdealer.com',
  'https://instagram.com/dukhdealer',
  '[{"platform":"Instagram","url":"https://instagram.com/dukhdealer"}]',
  '© 2026 Dukh Dealer. A private conversation service. Not therapy or medical treatment.',
  '{"home":"Home","about":"About","services":"Sessions","packages":"Packages","blog":"Blog","book":"Book a Session"}',
  '{"primary":"Book a Private Session","secondary":"See How It Works"}'
);

INSERT OR IGNORE INTO theme_settings (id, primary_color, secondary_color, background, foreground, accent, card, border, muted, cta, cta_text)
VALUES ('default', '#5B2A5F', '#431F46', '#FFF8F2', '#29212B', '#F4A261', '#FFFFFF', '#E8DDE4', '#756B76', '#E76F35', '#FFFFFF');

INSERT OR IGNORE INTO seo_settings (id, global_title, global_description, og_image, homepage_title, homepage_description, about_title, about_description, services_title, services_description, faq_title, faq_description, blog_title, blog_description, canonical_base)
VALUES (
  'default',
  'Dukh Dealer — Private Conversations',
  'Private paid conversation service. Chat, voice, or mystery video. Be heard without labels.',
  NULL,
  'Dukh Dealer — A private space to be heard',
  'Book a private chat, voice, or mystery video session with a real listener.',
  'About | Dukh Dealer',
  'Learn what Dukh Dealer is — and what it is not.',
  'Sessions | Dukh Dealer',
  'Private Chat, Private Voice, and Mystery Video sessions.',
  'FAQ | Dukh Dealer',
  'Common questions about sessions, payments, and what to expect.',
  'Blog | Dukh Dealer',
  'Reflections on listening and private conversation.',
  'https://dukhdealer.com'
);

-- Logos start empty: the public header falls back to the website-name wordmark until
-- an admin uploads one in Admin Panel -> Logo. The previous seed pointed at
-- /logo-light.svg and /logo-dark.svg, which do not exist in /public and rendered as
-- broken images.
INSERT OR IGNORE INTO logo_settings (id, light_logo, dark_logo, favicon)
VALUES ('default', NULL, NULL, '/favicon.ico');

INSERT OR IGNORE INTO payment_qr (id, image_url, instructions, enabled, upi_id)
VALUES ('default', '/mock/payment-qr.svg', 'Scan the QR with any UPI app. Pay the exact amount shown. Then upload a clear screenshot of the successful payment.', 1, 'dukhdealer@upi');

INSERT OR IGNORE INTO packages (id, name, description, service_type, duration, price, currency, badge, cta_text, active, display_order, created_at, updated_at) VALUES
('pkg-001', '10 Minute First Conversation', 'A short first session to see if this feels right for you.', 'private_chat', 10, 299, 'INR', 'Starter', 'Book Now', 1, 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('pkg-002', '30 Minute Conversation', 'A focused half-hour of private listening and talk.', 'private_voice', 30, 699, 'INR', 'Popular', 'Book Now', 1, 2, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('pkg-003', '60 Minute Conversation', 'A full hour to slow down and be fully heard.', 'mystery_video', 60, 1199, 'INR', 'Deep Dive', 'Book Now', 1, 3, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
('pkg-004', '30 Minute Private Chat', 'Text-based private conversation for quiet reflection.', 'private_chat', 30, 599, 'INR', NULL, 'Book Now', 1, 4, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');

INSERT OR IGNORE INTO listeners (id, nickname, languages, style, modes, avatar, active, bio) VALUES
('lst-001', 'Aarav', '["hindi","english","hinglish"]', 'Calm, patient, non-judgmental', '["private_chat","private_voice","mystery_video"]', '/avatars/listener-1.svg', 1, 'Here to listen without fixing.'),
('lst-002', 'Meera', '["hindi","english"]', 'Warm, reflective, grounded', '["private_chat","private_voice"]', '/avatars/listener-2.svg', 1, 'A quiet space for your words.'),
('lst-003', 'Kabir', '["english","hinglish"]', 'Direct, present, steady', '["private_voice","mystery_video"]', '/avatars/listener-3.svg', 1, 'No advice unless you ask.');

INSERT OR IGNORE INTO customers (id, nickname, email, created_at) VALUES
('cust-001', 'Anonymous', 'demo@example.com', '2026-01-15T10:00:00Z');

INSERT OR IGNORE INTO bookings (id, booking_id, customer_id, customer_nickname, package_id, package_name, service_type, duration, listener_id, listener_name, date, time, amount, currency, payment_status, booking_status, payment_screenshot, conversation_preference, language, created_at, updated_at) VALUES
('bk-001', 'DD-2026-A1B2C', 'cust-001', 'Riya', 'pkg-002', '30 Minute Conversation', 'private_voice', 30, 'lst-001', 'Aarav', '2026-09-20', '19:00', 699, 'INR', 'verification_pending', 'payment_verification_pending', NULL, 'just_listen', 'hinglish', '2026-09-16T12:00:00Z', '2026-09-16T12:30:00Z'),
('bk-002', 'DD-2026-X9Y8Z', 'cust-001', 'Dev', 'pkg-003', '60 Minute Conversation', 'mystery_video', 60, 'lst-003', 'Kabir', '2026-09-18', '20:00', 1199, 'INR', 'verified', 'confirmed', NULL, 'talk_with_me', 'english', '2026-09-15T09:00:00Z', '2026-09-15T10:00:00Z');

INSERT OR IGNORE INTO reviews (id, display_name, text, rating, status, display_order, created_at) VALUES
('rev-001', 'A.K.', 'Felt heard without pressure. Exactly what I needed.', 5, 'published', 1, '2026-02-01T00:00:00Z'),
('rev-002', 'S.', 'Private and calm. The mystery video felt surprisingly natural.', 5, 'published', 2, '2026-02-10T00:00:00Z'),
('rev-003', 'M.R.', 'No advice-pushing. Just listening. Rare.', 4, 'published', 3, '2026-03-01T00:00:00Z');

INSERT OR IGNORE INTO faqs (id, question, answer, category, status, display_order) VALUES
('faq-001', 'Is this therapy?', 'No. Dukh Dealer is a private paid conversation service focused on listening and being heard. It is not therapy, psychotherapy, psychiatric treatment, medical treatment, diagnosis, or an emergency service.', 'General', 'published', 1),
('faq-002', 'What is Mystery Video?', 'In Mystery Video, the listener may appear wearing the official mystery mask. Your camera is optional. It keeps the conversation private while adding a unique presence.', 'Sessions', 'published', 2),
('faq-003', 'How do payments work?', 'You pay via UPI/QR. After uploading your payment screenshot, the booking enters verification. Once approved, your session is confirmed.', 'Payments', 'published', 3),
('faq-004', 'Can I extend a session?', 'Yes. During a session you can request +15 or +30 minutes. Extension payment will be handled in a future update.', 'Sessions', 'published', 4);

INSERT OR IGNORE INTO blog_posts (id, title, slug, excerpt, content, author, category, tags, status, publish_date, seo_title, seo_description, created_at, updated_at) VALUES
('blog-001', 'Why Being Heard Matters', 'why-being-heard-matters', 'A short reflection on the value of a private conversation without labels.', '<p>Sometimes you just need someone to listen. No diagnosis. No treatment plan. Just presence.</p><p>That is the space Dukh Dealer aims to hold.</p>', 'Dukh Dealer', 'Reflections', '["listening","conversation"]', 'published', '2026-03-01T00:00:00Z', 'Why Being Heard Matters | Dukh Dealer', 'A short reflection on private listening and conversation.', '2026-02-20T00:00:00Z', '2026-03-01T00:00:00Z');

INSERT OR IGNORE INTO banners (id, heading, description, cta_text, cta_url, published, display_order) VALUES
('ban-001', 'A private space to be heard', 'Chat. Voice. Mystery Video. Real listening, no labels.', 'Book a Session', '/booking', 1, 1);

INSERT OR IGNORE INTO cta_blocks (id, heading, description, button_text, url, enabled, display_order) VALUES
('cta-001', 'Ready when you are', 'Choose a package and book a private conversation.', 'View Packages', '/packages', 1, 1);

INSERT OR IGNORE INTO about_sections (id, title, content, published, display_order) VALUES
('about-001', 'What this is', 'Dukh Dealer is a private paid conversation service. You talk with a real listener through private chat, voice, or mystery video. The focus is listening, conversation, talking, and being heard.', 1, 1),
('about-002', 'What this is not', 'This is not therapy, psychotherapy, psychiatric treatment, medical treatment, diagnosis, or an emergency service. If you need clinical support, please seek appropriate professional help.', 1, 2),
('about-003', 'The mystery mask', 'Mystery Video sessions may feature the official mystery mask. It is a brand identity — calm and private — not a costume. Your camera remains optional.', 1, 3);

INSERT OR IGNORE INTO media_library (id, name, url, r2_key, type, size, mime_type, created_at) VALUES
('media-001', 'payment-qr.svg', '/mock/payment-qr.svg', NULL, 'image', 2048, 'image/svg+xml', '2026-01-01T00:00:00Z');

-- Availability is NOT seeded on purpose.
-- Booking slots are created by the admin in Admin Panel -> Availability (see
-- availability_windows in 0003_part3_fixes.sql). If no window is open, customers
-- cannot book -- which is the intended behaviour.
