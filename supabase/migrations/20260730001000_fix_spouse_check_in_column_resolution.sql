DO $migration$
DECLARE
  v_signature regprocedure;
  v_definition text;
  v_old_conflict text :=
    'ON CONFLICT (registration_id, attendee_type) DO NOTHING';
  v_new_conflict text :=
    'ON CONFLICT ON CONSTRAINT participation_check_ins_registration_attendee_key DO NOTHING';
  v_old_lookup text :=
    E'FROM public.participation_check_ins\n    WHERE registration_id = p_registration_id\n      AND attendee_type = v_attendee_type;';
  v_new_lookup text :=
    E'FROM public.participation_check_ins AS existing_check_in\n    WHERE existing_check_in.registration_id = p_registration_id\n      AND existing_check_in.attendee_type = v_attendee_type;';
BEGIN
  FOREACH v_signature IN ARRAY ARRAY[
    'public.check_in_registration(uuid,text,text)'::regprocedure,
    'public.check_in_registration_with_scanner_session(text,text,uuid,text,text)'::regprocedure
  ]
  LOOP
    v_definition := pg_get_functiondef(v_signature);
    v_definition := replace(v_definition, v_old_conflict, v_new_conflict);
    v_definition := replace(v_definition, v_old_lookup, v_new_lookup);

    IF position(v_old_conflict IN v_definition) > 0
      OR position(v_old_lookup IN v_definition) > 0 THEN
      RAISE EXCEPTION 'Could not repair attendee column resolution for %', v_signature;
    END IF;

    EXECUTE v_definition;
  END LOOP;
END;
$migration$;
