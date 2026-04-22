-- Migration: add student drive links
-- Created: 2026-04-21T16:00:00.000Z

-- ==================== UP ====================
CREATE TABLE IF NOT EXISTS public.student_drive_links (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  student_code UUID NOT NULL,
  file_code UUID NOT NULL,
  linked_by_user_code UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT student_drive_links_pk PRIMARY KEY (code),
  CONSTRAINT student_drive_links_student_fk FOREIGN KEY (student_code) REFERENCES public.students (code) ON DELETE CASCADE,
  CONSTRAINT student_drive_links_file_fk FOREIGN KEY (file_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT student_drive_links_user_fk FOREIGN KEY (linked_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT student_drive_links_student_file_uq UNIQUE (student_code, file_code)
);

CREATE INDEX IF NOT EXISTS student_drive_links_student_idx
  ON public.student_drive_links (student_code, created_at DESC);
CREATE INDEX IF NOT EXISTS student_drive_links_file_idx
  ON public.student_drive_links (file_code);
CREATE INDEX IF NOT EXISTS student_drive_links_user_idx
  ON public.student_drive_links (linked_by_user_code);

-- ==================== DOWN ====================
DROP INDEX IF EXISTS public.student_drive_links_user_idx;
DROP INDEX IF EXISTS public.student_drive_links_file_idx;
DROP INDEX IF EXISTS public.student_drive_links_student_idx;
DROP TABLE IF EXISTS public.student_drive_links;
