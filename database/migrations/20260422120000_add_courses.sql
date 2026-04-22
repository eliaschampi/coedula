-- Migration: add courses
-- Created: 2026-04-22T03:00:00.000Z

-- ==================== UP ====================
CREATE TABLE IF NOT EXISTS public.courses (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT courses_pk PRIMARY KEY (code),
  CONSTRAINT courses_name_uq UNIQUE (name),
  CONSTRAINT courses_name_check CHECK (char_length(trim(name)) > 0),
  CONSTRAINT courses_sort_order_check CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS courses_sort_order_idx ON public.courses (sort_order, name);

DROP TRIGGER IF EXISTS courses_updated_at_tg ON public.courses;
CREATE TRIGGER courses_updated_at_tg
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

-- ==================== DOWN ====================
DROP TRIGGER IF EXISTS courses_updated_at_tg ON public.courses;
DROP INDEX IF EXISTS public.courses_sort_order_idx;
DROP TABLE IF EXISTS public.courses;
