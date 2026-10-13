CREATE TABLE IF NOT EXISTS admin_members (
 email TEXT PRIMARY KEY NOT NULL,
 created_at TEXT NOT NULL,
 created_by TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_member_events (
 id TEXT PRIMARY KEY NOT NULL,
 email TEXT NOT NULL,
 action TEXT NOT NULL,
 actor TEXT NOT NULL,
 created_at TEXT NOT NULL
);
