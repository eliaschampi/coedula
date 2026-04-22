-- Migration: add evaluations
-- Created: 2026-04-22T15:30:00.000Z

-- ==================== UP ====================
CREATE TABLE IF NOT EXISTS public.evals (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  cycle_degree_code UUID NOT NULL,
  group_code VARCHAR(1) NOT NULL,
  eval_date DATE NOT NULL,
  user_code UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT evals_pk PRIMARY KEY (code),
  CONSTRAINT evals_cycle_degree_fk FOREIGN KEY (cycle_degree_code) REFERENCES public.cycle_degrees (code) ON DELETE RESTRICT,
  CONSTRAINT evals_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT evals_name_check CHECK (char_length(trim(name)) > 0),
  CONSTRAINT evals_group_code_check CHECK (group_code IN ('A', 'B', 'C', 'D'))
);

CREATE TABLE IF NOT EXISTS public.eval_sections (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  eval_code UUID NOT NULL,
  course_code UUID NOT NULL,
  order_in_eval INTEGER NOT NULL,
  question_count INTEGER NOT NULL,
  CONSTRAINT eval_sections_pk PRIMARY KEY (code),
  CONSTRAINT eval_sections_eval_fk FOREIGN KEY (eval_code) REFERENCES public.evals (code) ON DELETE CASCADE,
  CONSTRAINT eval_sections_course_fk FOREIGN KEY (course_code) REFERENCES public.courses (code) ON DELETE RESTRICT,
  CONSTRAINT eval_sections_eval_course_uq UNIQUE (eval_code, course_code),
  CONSTRAINT eval_sections_eval_order_uq UNIQUE (eval_code, order_in_eval),
  CONSTRAINT eval_sections_order_in_eval_check CHECK (order_in_eval > 0),
  CONSTRAINT eval_sections_question_count_check CHECK (question_count > 0)
);

CREATE TABLE IF NOT EXISTS public.eval_questions (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  eval_code UUID NOT NULL,
  section_code UUID NOT NULL,
  order_in_eval INTEGER NOT NULL,
  correct_key CHAR(1) NOT NULL,
  omitable BOOLEAN NOT NULL DEFAULT FALSE,
  score_percent NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  CONSTRAINT eval_questions_pk PRIMARY KEY (code),
  CONSTRAINT eval_questions_eval_fk FOREIGN KEY (eval_code) REFERENCES public.evals (code) ON DELETE CASCADE,
  CONSTRAINT eval_questions_section_fk FOREIGN KEY (section_code) REFERENCES public.eval_sections (code) ON DELETE CASCADE,
  CONSTRAINT eval_questions_order_uq UNIQUE (eval_code, order_in_eval),
  CONSTRAINT eval_questions_order_in_eval_check CHECK (order_in_eval > 0),
  CONSTRAINT eval_questions_correct_key_ck CHECK (correct_key IN ('A', 'B', 'C', 'D', 'E')),
  CONSTRAINT eval_questions_score_ck CHECK (score_percent BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS public.eval_answers (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  enrollment_code UUID NOT NULL,
  question_code UUID NOT NULL,
  student_answer TEXT NULL,
  CONSTRAINT eval_answers_pk PRIMARY KEY (code),
  CONSTRAINT eval_answers_enrollment_fk FOREIGN KEY (enrollment_code) REFERENCES public.enrollments (code) ON DELETE CASCADE,
  CONSTRAINT eval_answers_question_fk FOREIGN KEY (question_code) REFERENCES public.eval_questions (code) ON DELETE CASCADE,
  CONSTRAINT eval_answers_unique_uq UNIQUE (enrollment_code, question_code),
  CONSTRAINT eval_answers_answer_ck CHECK (
    student_answer IN ('A', 'B', 'C', 'D', 'E', 'error_multiple')
    OR student_answer IS NULL
  )
);

CREATE TABLE IF NOT EXISTS public.eval_results (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  enrollment_code UUID NOT NULL,
  eval_code UUID NOT NULL,
  section_code UUID NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  blank_count INTEGER NOT NULL DEFAULT 0,
  incorrect_count INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT eval_results_pk PRIMARY KEY (code),
  CONSTRAINT eval_results_enrollment_fk FOREIGN KEY (enrollment_code) REFERENCES public.enrollments (code) ON DELETE CASCADE,
  CONSTRAINT eval_results_eval_fk FOREIGN KEY (eval_code) REFERENCES public.evals (code) ON DELETE CASCADE,
  CONSTRAINT eval_results_section_fk FOREIGN KEY (section_code) REFERENCES public.eval_sections (code) ON DELETE CASCADE,
  CONSTRAINT eval_results_correct_count_check CHECK (correct_count >= 0),
  CONSTRAINT eval_results_blank_count_check CHECK (blank_count >= 0),
  CONSTRAINT eval_results_incorrect_count_check CHECK (incorrect_count >= 0),
  CONSTRAINT eval_results_score_check CHECK (score >= 0)
);

CREATE INDEX IF NOT EXISTS evals_cycle_degree_group_date_idx
  ON public.evals (cycle_degree_code, group_code, eval_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS evals_user_code_idx ON public.evals (user_code, created_at DESC);
CREATE INDEX IF NOT EXISTS eval_sections_eval_order_idx ON public.eval_sections (eval_code, order_in_eval);
CREATE INDEX IF NOT EXISTS eval_sections_course_idx ON public.eval_sections (course_code);
CREATE INDEX IF NOT EXISTS eval_questions_eval_order_idx ON public.eval_questions (eval_code, order_in_eval);
CREATE INDEX IF NOT EXISTS eval_questions_section_idx ON public.eval_questions (section_code, order_in_eval);
CREATE INDEX IF NOT EXISTS eval_answers_enrollment_idx ON public.eval_answers (enrollment_code);
CREATE INDEX IF NOT EXISTS eval_answers_question_idx ON public.eval_answers (question_code);
CREATE INDEX IF NOT EXISTS eval_results_eval_idx ON public.eval_results (eval_code, calculated_at DESC);
CREATE INDEX IF NOT EXISTS eval_results_enrollment_idx ON public.eval_results (enrollment_code, calculated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS eval_results_overall_uq
  ON public.eval_results (enrollment_code, eval_code)
  WHERE section_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS eval_results_section_uq
  ON public.eval_results (enrollment_code, eval_code, section_code)
  WHERE section_code IS NOT NULL;

DROP TRIGGER IF EXISTS evals_updated_at_tg ON public.evals;
CREATE TRIGGER evals_updated_at_tg
BEFORE UPDATE ON public.evals
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE OR REPLACE VIEW public.eval_overview AS
SELECT
  e.code,
  e.name,
  e.cycle_degree_code,
  cdo.cycle_code,
  cdo.branch_code,
  cdo.branch_name,
  cdo.cycle_title,
  cdo.modality,
  cdo.degree_code,
  cdo.degree_name,
  cdo.degree_short_name,
  cdo.degree_sort_order,
  e.group_code,
  e.eval_date,
  e.user_code,
  e.created_at,
  e.updated_at,
  COALESCE(section_summary.section_count, 0) AS section_count,
  COALESCE(section_summary.planned_question_count, 0) AS planned_question_count,
  COALESCE(question_summary.configured_question_count, 0) AS configured_question_count,
  COALESCE(question_summary.has_questions, FALSE) AS has_questions,
  COALESCE(section_summary.eval_sections, '[]'::json) AS eval_sections
FROM public.evals e
INNER JOIN public.cycle_degree_overview cdo ON cdo.code = e.cycle_degree_code
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS section_count,
    COALESCE(SUM(es.question_count), 0)::INTEGER AS planned_question_count,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'code', es.code,
          'eval_code', es.eval_code,
          'course_code', es.course_code,
          'order_in_eval', es.order_in_eval,
          'question_count', es.question_count,
          'course_name', c.name
        )
        ORDER BY es.order_in_eval
      ),
      '[]'::json
    ) AS eval_sections
  FROM public.eval_sections es
  INNER JOIN public.courses c ON c.code = es.course_code
  WHERE es.eval_code = e.code
) AS section_summary ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS configured_question_count,
    (COUNT(*)::INTEGER > 0) AS has_questions
  FROM public.eval_questions eq
  WHERE eq.eval_code = e.code
) AS question_summary ON TRUE;

-- ==================== DOWN ====================
DROP VIEW IF EXISTS public.eval_overview;

DROP TRIGGER IF EXISTS evals_updated_at_tg ON public.evals;

DROP INDEX IF EXISTS public.eval_results_section_uq;
DROP INDEX IF EXISTS public.eval_results_overall_uq;
DROP INDEX IF EXISTS public.eval_results_enrollment_idx;
DROP INDEX IF EXISTS public.eval_results_eval_idx;
DROP INDEX IF EXISTS public.eval_answers_question_idx;
DROP INDEX IF EXISTS public.eval_answers_enrollment_idx;
DROP INDEX IF EXISTS public.eval_questions_section_idx;
DROP INDEX IF EXISTS public.eval_questions_eval_order_idx;
DROP INDEX IF EXISTS public.eval_sections_course_idx;
DROP INDEX IF EXISTS public.eval_sections_eval_order_idx;
DROP INDEX IF EXISTS public.evals_user_code_idx;
DROP INDEX IF EXISTS public.evals_cycle_degree_group_date_idx;

DROP TABLE IF EXISTS public.eval_results;
DROP TABLE IF EXISTS public.eval_answers;
DROP TABLE IF EXISTS public.eval_questions;
DROP TABLE IF EXISTS public.eval_sections;
DROP TABLE IF EXISTS public.evals;
