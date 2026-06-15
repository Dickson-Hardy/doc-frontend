-- Enable RLS on all tables
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated full access registrations" ON registrations;
  DROP POLICY IF EXISTS "Authenticated full access app_settings" ON app_settings;
  DROP POLICY IF EXISTS "Authenticated read email_logs" ON email_logs;
  DROP POLICY IF EXISTS "Authenticated read admin_users" ON admin_users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- registrations: authenticated users (admin/scanner) can do everything
CREATE POLICY "Authenticated full access registrations"
  ON registrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- app_settings: authenticated users can read and write settings
CREATE POLICY "Authenticated full access app_settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- email_logs: authenticated users can read email logs
CREATE POLICY "Authenticated read email_logs"
  ON email_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- admin_users: authenticated users can read admin user list
CREATE POLICY "Authenticated read admin_users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
