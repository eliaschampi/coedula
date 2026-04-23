-- Migration: add courses
-- Created: 2026-04-22T03:00:00.000Z

-- ==================== UP ====================
CREATE TABLE IF NOT EXISTS public.courses (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT courses_pk PRIMARY KEY (code),
  CONSTRAINT courses_name_uq UNIQUE (name),
  CONSTRAINT courses_name_check CHECK (char_length(trim(name)) > 0)
);

DROP TRIGGER IF EXISTS courses_updated_at_tg ON public.courses;
CREATE TRIGGER courses_updated_at_tg
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- ==================== DOWN ====================
DROP TRIGGER IF EXISTS courses_updated_at_tg ON public.courses;
DROP TABLE IF EXISTS public.courses;
