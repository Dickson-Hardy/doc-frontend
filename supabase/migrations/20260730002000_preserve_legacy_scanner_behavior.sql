DO $migration$
DECLARE
  v_signature regprocedure;
  v_definition text;
  v_old_choice text :=
    E'IF v_registration.category = ''doctor-with-spouse''\n    AND v_attendee_type IS NULL THEN';
  v_new_choice text :=
    E'IF v_registration.category = ''doctor-with-spouse''\n    AND v_attendee_type = ''select'' THEN';
  v_old_default text :=
    'v_attendee_type := COALESCE(v_attendee_type, ''primary'');';
  v_new_default text :=
    E'IF v_attendee_type IS NULL OR v_attendee_type = ''select'' THEN\n    v_attendee_type := ''primary'';\n  END IF;';
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.check_in_registration(uuid,text,text)'::regprocedure,
    'public.check_in_registration_with_scanner_session(text,text,uuid,text,text)'::regprocedure
  ]
  LOOP
    v_definition := pg_get_functiondef(v_signature);
    v_definition := replace(v_definition, v_old_choice, v_new_choice);
    v_definition := replace(v_definition, v_old_default, v_new_default);

    IF position(v_old_choice IN v_definition) > 0
      OR position(v_old_default IN v_definition) > 0 THEN
      RAISE EXCEPTION 'Could not preserve legacy scanner behavior for %', v_signature;
    END IF;

    EXECUTE v_definition;
  END LOOP;
END;
$migration$;
