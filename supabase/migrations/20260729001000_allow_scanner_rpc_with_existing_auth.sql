-- Scanner access codes are independently validated by opaque session tokens.
-- Permit the dedicated scanner flow to work even when the browser still has
-- an unrelated authenticated Supabase session from a previous admin login.
GRANT EXECUTE ON FUNCTION public.login_scanner_with_code(text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_in_registration_with_scanner_session(text, text, uuid, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_scanner_participation_check_ins(text, text, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.logout_scanner_session(text, text)
  TO authenticated;
