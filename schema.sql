CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL,
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 website TEXT,
 service TEXT,
 budget TEXT,
 timeline TEXT,
 details TEXT NOT NULL,
 landing_page TEXT,
 conversion_page TEXT,
 referrer TEXT,
 utm_source TEXT,
 utm_medium TEXT,
 utm_campaign TEXT,
 utm_term TEXT,
 utm_content TEXT,
 country TEXT,
 user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
