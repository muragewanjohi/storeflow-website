-- Add explicit service-role policies for RLS-protected tables that are
-- intentionally unavailable to anon/authenticated PostgREST clients.

DROP POLICY IF EXISTS tenants_service_role_access ON tenants;
CREATE POLICY tenants_service_role_access
  ON tenants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS admins_service_role_access ON admins;
CREATE POLICY admins_service_role_access
  ON admins
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS landlord_users_service_role_access ON landlord_users;
CREATE POLICY landlord_users_service_role_access
  ON landlord_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS custom_domains_service_role_access ON custom_domains;
CREATE POLICY custom_domains_service_role_access
  ON custom_domains
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS cron_job_logs_service_role_access ON cron_job_logs;
CREATE POLICY cron_job_logs_service_role_access
  ON cron_job_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS analytics_tracking_service_role_access ON analytics_tracking;
CREATE POLICY analytics_tracking_service_role_access
  ON analytics_tracking
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS mfa_otp_codes_service_role_access ON mfa_otp_codes;
CREATE POLICY mfa_otp_codes_service_role_access
  ON mfa_otp_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS subscription_changes_service_role_access ON subscription_changes;
CREATE POLICY subscription_changes_service_role_access
  ON subscription_changes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS onboarding_starter_packs_service_role_access ON onboarding_starter_packs;
CREATE POLICY onboarding_starter_packs_service_role_access
  ON onboarding_starter_packs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
