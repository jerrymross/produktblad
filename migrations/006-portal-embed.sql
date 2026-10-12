CREATE TABLE portal_embed_tickets(ticket_hash text PRIMARY KEY, cookie_hash text NOT NULL REFERENCES portal_sessions(cookie_hash) ON DELETE CASCADE,
  return_to text NOT NULL, expires_at timestamptz NOT NULL DEFAULT now()+interval '60 seconds');
