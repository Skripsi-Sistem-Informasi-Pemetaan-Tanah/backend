-- -- Table: public.histories

-- -- DROP TABLE IF EXISTS public.histories;

-- CREATE TABLE IF NOT EXISTS public.histories
-- (
--     history_id integer NOT NULL DEFAULT nextval('histories_history_id_seq'::regclass),
--     status character(25) COLLATE pg_catalog."default" DEFAULT 'belum tervalidasi'::bpchar,
--     map_id integer NOT NULL,
--     CONSTRAINT histories_pkey PRIMARY KEY (history_id),
--     CONSTRAINT histories_map_id_fkey FOREIGN KEY (map_id)
--         REFERENCES public.maps (map_id) MATCH SIMPLE
--         ON UPDATE NO ACTION
--         ON DELETE NO ACTION
-- )

-- TABLESPACE pg_default;

-- ALTER TABLE IF EXISTS public.histories
--     OWNER to postgres;

-- -- Table: public.koordinat

-- -- DROP TABLE IF EXISTS public.koordinat;

-- CREATE TABLE IF NOT EXISTS public.koordinat
-- (
--     koordinat_id integer NOT NULL DEFAULT nextval('koordinat_koordinat_id_seq'::regclass),
--     koordinat double precision[],
--     status integer DEFAULT 0,
--     image character(100) COLLATE pg_catalog."default",
--     map_id integer NOT NULL,
--     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
--     updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     CONSTRAINT koordinat_pkey PRIMARY KEY (koordinat_id),
--     CONSTRAINT koordinat_map_id_fkey FOREIGN KEY (map_id)
--         REFERENCES public.maps (map_id) MATCH SIMPLE
--         ON UPDATE NO ACTION
--         ON DELETE NO ACTION
-- )

-- TABLESPACE pg_default;

-- ALTER TABLE IF EXISTS public.koordinat
--     OWNER to postgres;

-- -- Table: public.maps

-- -- DROP TABLE IF EXISTS public.maps;

-- CREATE TABLE IF NOT EXISTS public.maps
-- (
--     map_id integer NOT NULL DEFAULT nextval('maps_map_id_seq'::regclass),
--     name character(100) COLLATE pg_catalog."default" NOT NULL,
--     koordinat double precision[],
--     progress integer DEFAULT 0,
--     updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
--     created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
--     status integer DEFAULT 0,
--     CONSTRAINT maps_pkey PRIMARY KEY (map_id),
--     CONSTRAINT maps_name_fkey FOREIGN KEY (name)
--         REFERENCES public.users (username) MATCH SIMPLE
--         ON UPDATE NO ACTION
--         ON DELETE NO ACTION
-- )

-- TABLESPACE pg_default;

-- ALTER TABLE IF EXISTS public.maps
--     OWNER to postgres;


-- Table: public.users

-- DROP TABLE IF EXISTS public.users;

-- CREATE TABLE IF NOT EXISTS public.users
-- (
--     user_id integer NOT NULL DEFAULT nextval('users_user_id_seq'::regclass),
--     username character varying(255) COLLATE pg_catalog."default",
--     email character varying(255) COLLATE pg_catalog."default",
--     password character varying(255) COLLATE pg_catalog."default",
--     refresh_token text COLLATE pg_catalog."default",
--     "updatedAt" timestamp with time zone,
--     "createdAt" timestamp with time zone,
--     CONSTRAINT users_pkey PRIMARY KEY (user_id),
--     CONSTRAINT users_username_key UNIQUE (username)
-- )

-- TABLESPACE pg_default;

-- ALTER TABLE IF EXISTS public.users
--     OWNER to postgres;

-- Trigger: update_updated_at_trigger

-- DROP TRIGGER IF EXISTS update_updated_at_trigger ON public.koordinat;

CREATE OR REPLACE TRIGGER update_updated_at_trigger
    BEFORE UPDATE 
    ON public.koordinat
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();

-- Trigger: update_updated_at_trigger

-- DROP TRIGGER IF EXISTS update_updated_at_trigger ON public.maps;

CREATE OR REPLACE TRIGGER update_updated_at_trigger
    BEFORE UPDATE 
    ON public.maps
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
-- FUNCTION: public.update_updated_at()

CREATE OR REPLACE TRIGGER update_updated_at_trigger
    BEFORE UPDATE 
    ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at();
-- DROP FUNCTION IF EXISTS public.update_updated_at();

CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS trigger
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE NOT LEAKPROOF
AS $BODY$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$BODY$;

ALTER FUNCTION public.update_updated_at()
    OWNER TO postgres;

-- Create history trigger
-- Step 1: Create the audit table
-- CREATE TABLE history (
--     history_id SERIAL PRIMARY KEY,
--     operation TEXT NOT NULL,
--     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     map_id TEXT,
--     old_koordinat TEXT,
--     new_koordinat TEXT,
-- );

-- -- Step 2: Create the trigger function
-- CREATE OR REPLACE FUNCTION audit_function()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     IF TG_OP = 'INSERT' THEN
--         INSERT INTO history (map_id, operation, new_koordinat)
--         VALUES (row_to_json(NEW)->>'map_id','INSERT', row_to_json(NEW)->>'koordinat');
--         RETURN NEW;
--     ELSIF TG_OP = 'UPDATE' THEN
--         INSERT INTO history (map_id, operation, old_koordinat, new_koordinat)
--         VALUES (row_to_json(NEW)->>'map_id','UPDATE',row_to_json(OLD)->>'koordinat', row_to_json(NEW)->>'koordinat');
--         RETURN NEW;
--     ELSIF TG_OP = 'DELETE' THEN
--         INSERT INTO history (map_id, operation, old_koordinat)
--         VALUES (row_to_json(OLD)->>'map_id','DELETE', row_to_json(OLD)->>'koordinat');
--         RETURN OLD;
--     END IF;
-- END;
-- $$ LANGUAGE plpgsql;

-- -- Step 3: Create triggers for the main table
-- CREATE TRIGGER audit_trigger
-- AFTER INSERT OR UPDATE OR DELETE ON koordinat	
-- FOR EACH ROW EXECUTE FUNCTION audit_function();
-- Create the trigger function
CREATE OR REPLACE FUNCTION log_koordinat_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the old and new coordinates into history table
    INSERT INTO history (map_id, old_coordinate, new_coordinate, status, updated_at)
    VALUES (
        NEW.map_id,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.koordinat::TEXT END,
        NEW.koordinat::TEXT,
        NEW.status,
        NEW.updated_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER after_koordinat_insert_update
AFTER INSERT OR UPDATE ON koordinat
FOR EACH ROW
EXECUTE FUNCTION log_koordinat_changes();

CREATE OR REPLACE FUNCTION copy_to_verifikasi()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert the new or updated row into verifikasi table
    INSERT INTO verifikasi (map_id, user_id, namaLahan, koordinat, status, progress, komentar, updated_at)
    VALUES (NEW.map_id, NEW.user_id, NEW.namaLahan, NEW.koordinat, NEW.status, NEW.progress, NEW.komentar, NEW.updated_at)
    ON CONFLICT (map_id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        map_id = EXCLUDED.map_id,
        namaLahan = EXCLUDED.namaLahan,
        koordinat = EXCLUDED.koordinat,
        status = EXCLUDED.status,
        progress = EXCLUDED.progress,
        komentar = EXCLUDED.komentar,
        updated_at = EXCLUDED.updated_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_maps_insert_update
AFTER INSERT OR UPDATE ON maps
FOR EACH ROW
EXECUTE FUNCTION copy_to_verifikasi();

-- ENTRY DATA
-- INSERT INTO users (username, email, password)
-- VALUES
--   ('Ni Luh Putu Ayu Sari', 'niluhputuayusari123@email.com', 'Testing123'),
--   ('Kadek Agus Saputra', 'kadekagussaputra123@email.com', 'Testing123'),
--   ('I Ketut Ardana', 'iketutardana123@email.com', 'Testing123'),
--   ('Anak Agung Gde Raka', 'anakagunggderaka123@email.com', 'Testing123'),
--   ('Ni Wayan Murni', 'niwayanmurni123@email.com', 'Testing123'),
--   ('Made Suartawan', 'madesuartawan123@email.com', 'Testing123'),
--  ('Wahyu Suryanto', 'wahyusuryanto123@email.com', 'Testing123'),
--   ('Dewi Cahyani', 'dewicahyani123@email.com', 'Testing123'),
--   ('Sigit Wibowo', 'sigitwibowo123@email.com', 'Testing123'),
--   ('Rini Utami', 'riniutami123@email.com', 'Testing123'),
--   ('Budi Santoso', 'budisantoso123@email.com', 'Testing123'),
--   ('Sri Wahyuni', 'sriwahyuni123@email.com', 'Testing123'),
--   ('Ari Wibisono', 'ariwibisono123@email.com', 'Testing123'),
--   ('Lia Haryanti', 'liaharyanti123@email.com', 'Testing123'),
--   ('Denny Prasetyo', 'dennyprasetyo123@email.com', 'Testing123'),
--   ('Eka Susanto', 'ekasusanto123@email.com', 'Testing123'),
--   ('Putra Nugroho', 'putranugroho123@email.com', 'Testing123'),
--   ('Diana Kusuma', 'dianakusuma123@email.com', 'Testing123'),
--   ('Irfan Wijaya', 'irfanwijaya123@email.com', 'Testing123'),
--   ('Tri Handayani', 'trihandayani123@email.com', 'Testing123'),
--   ('Wahyu Setiawan', 'wahyusetiawan123@email.com', 'Testing123'),
--   ('Ratna Dewi', 'ratnadewi123@email.com', 'Testing123'),
--   ('Adi Nugraha', 'adinugraha123@email.com', 'Testing123'),
--   ('Nina Widya', 'ninawidya123@email.com', 'Testing123'),
--   ('Arif Hidayat', 'arifhidayat123@email.com', 'Testing123');

-- INSERT INTO maps (name, progress, created_at, status) VALUES
-- ('Ni Luh Putu Ayu Sari', 3, '2024-03-27 14:30:22.123456+00', 1),
-- ('Kadek Agus Saputra', 1, '2024-11-01 06:45:11.789123+00', 0),
-- ('Anak Agung Gde Raka', 5, '2024-06-14 17:18:05.345678+00', 1),
-- ('Ni Wayan Murni', 2, '2024-09-22 03:50:44.901234+00', 0),
-- ('Made Suartawan', 4, '2024-05-03 11:07:33.567891+00', 1),
-- ('Wahyu Suryanto', 2, '2024-03-03 08:15:00.000000+00', 1),
-- ('Dewi Cahyani', 4, '2024-03-03 10:30:00.000000+00', 0),
-- ('Sigit Wibowo', 1, '2024-03-03 12:45:00.000000+00', 1),
-- ('Rini Utami', 3, '2024-03-04 14:00:00.000000+00', 0),
-- ('Budi Santoso', 5, '2024-03-05 09:00:00.000000+00', 1),
-- ('Sri Wahyuni', 0, '2024-03-05 11:15:00.000000+00', 0),
-- ('Ari Wibisono', 2, '2024-03-05 13:30:00.000000+00', 1),
-- ('Lia Haryanti', 3, '2024-03-07 15:45:00.000000+00', 0),
-- ('Denny Prasetyo', 4, '2024-03-08 08:00:00.000000+00', 1),
-- ('Eka Susanto', 1, '2024-03-08 10:15:00.000000+00', 0),
-- ('Putra Nugroho', 0, '2024-03-08 12:30:00.000000+00', 1),
-- ('Diana Kusuma', 3, '2024-03-08 14:45:00.000000+00', 0),
-- ('Irfan Wijaya', 2, '2024-03-10 09:00:00.000000+00', 1),
-- ('Tri Handayani', 1, '2024-03-10 11:15:00.000000+00', 0),
-- ('Wahyu Setiawan', 4, '2024-03-11 13:30:00.000000+00', 1),
-- ('Ratna Dewi', 3, '2024-03-11 15:45:00.000000+00', 0),
-- ('Adi Nugraha', 5, '2024-03-12 08:00:00.000000+00', 1),
-- ('Nina Widya', 2, '2024-03-12 10:15:00.000000+00', 0),
-- ('Arif Hidayat', 0, '2024-03-12 12:30:00.000000+00', 1);

-- INSERT INTO koordinat (koordinat, map_id) VALUES
-- ({110.85266114982711,-7.358970139554024},1),
-- ({110.85302822390045,-7.359177007279643},1),
-- ({110.85317374482563,-7.358899706592064},1),
-- ({110.85281065966713,-7.358686795354014},1),
-- ({110.85359547962848,-7.358166216795818},3),
-- ({110.85394949719326,-7.358387686757259},3),
-- ({110.85409588847727,-7.358125334661593},3),
-- ({110.85373283135442,-7.357917774843088},3);

