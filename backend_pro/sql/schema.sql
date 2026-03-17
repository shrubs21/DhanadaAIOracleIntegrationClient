-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------- USERS ----------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- CONVERSATIONS ----------------
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INTEGER,
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id
ON conversations(user_id);

-- ---------------- MESSAGES ----------------
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id UUID,
    role VARCHAR(20),
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    file_format TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
ON messages(conversation_id);

-- ---------------- INVOICES ----------------
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(100),

    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE,

    amount NUMERIC(15,2),
    currency VARCHAR(10),

    business_unit_id BIGINT,
    business_unit_name VARCHAR(255),

    supplier_id BIGINT,
    supplier_name VARCHAR(255),

    site_id BIGINT,
    site_name VARCHAR(255),

    invoice_type VARCHAR(50) DEFAULT 'Standard',
    payment_policy VARCHAR(100),

    description TEXT,

    approval_status VARCHAR(100),
    payment_status VARCHAR(100),

    amount_paid NUMERIC(15,2) DEFAULT 0,
    remaining_amount NUMERIC(15,2),

    status VARCHAR(50) DEFAULT 'IN_PROGRESS',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP
);

-- ---------------- SUPPLIERS ----------------
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id VARCHAR(100) NOT NULL,

    supplier_name VARCHAR(255) NOT NULL,
    supplier_number VARCHAR(100),
    tax_registration_number VARCHAR(100),

    email VARCHAR(255),
    phone VARCHAR(50),

    country VARCHAR(10),

    address1 VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),

    procurement_bu_name VARCHAR(255),
    procurement_bu_id BIGINT,

    supplier_id BIGINT NOT NULL,
    supplier_site_id BIGINT,

    payment_terms VARCHAR(100),

    currency VARCHAR(10) DEFAULT 'AED',
    status VARCHAR(50) DEFAULT 'IN_PROGRESS',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------- FOREIGN KEYS ----------------
ALTER TABLE conversations
ADD CONSTRAINT conversations_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

ALTER TABLE messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES conversations(id)
ON DELETE CASCADE;