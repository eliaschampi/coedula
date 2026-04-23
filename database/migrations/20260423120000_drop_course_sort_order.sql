-- Migration: drop course sort order
-- Created: 2026-04-23T12:00:00.000Z

-- ==================== UP ====================
DROP INDEX IF EXISTS public.courses_sort_order_idx;
ALTER TABLE IF EXISTS public.courses DROP CONSTRAINT IF EXISTS courses_sort_order_check;
ALTER TABLE IF EXISTS public.courses DROP COLUMN IF EXISTS sort_order;

-- ==================== DOWN ====================
ALTER TABLE IF EXISTS public.courses ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS public.courses DROP CONSTRAINT IF EXISTS courses_sort_order_check;
ALTER TABLE IF EXISTS public.courses
  ADD CONSTRAINT courses_sort_order_check CHECK (sort_order >= 0);
CREATE INDEX IF NOT EXISTS courses_sort_order_idx ON public.courses (sort_order, name);
