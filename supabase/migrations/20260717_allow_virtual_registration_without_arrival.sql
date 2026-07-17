-- Virtual attendees do not travel to the physical conference, so an arrival
-- date is not applicable to them. The application and submit-registration
-- function continue to require this value for in-person categories.
ALTER TABLE registrations
  ALTER COLUMN "dateOfArrival" DROP NOT NULL;
