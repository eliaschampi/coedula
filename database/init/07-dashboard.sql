-- =====================================================
-- Coedula Dashboard Views
-- =====================================================
-- Focused analytical views for the academic dashboard.
-- =====================================================

CREATE OR REPLACE VIEW public.dashboard_enrollments_by_cycle AS
SELECT
  co.branch_code,
  co.code AS cycle_code,
  co.title AS cycle_title,
  co.start_date,
  COALESCE(co.enrollment_count, 0)::INTEGER AS enrollment_count
FROM public.cycle_overview co;

CREATE OR REPLACE VIEW public.dashboard_recent_branch_students AS
WITH branch_students AS (
  SELECT DISTINCT ON (s.code, eo.branch_code)
    eo.branch_code,
    s.code AS student_code,
    s.student_number,
    (s.first_name || ' ' || s.last_name) AS full_name,
    eo.cycle_title,
    eo.degree_name,
    eo.group_code,
    s.created_at,
    eo.created_at AS enrollment_created_at
  FROM public.students s
  INNER JOIN public.enrollment_overview eo ON eo.student_code = s.code
  ORDER BY s.code, eo.branch_code, eo.created_at DESC
)
SELECT
  branch_code,
  student_code,
  student_number,
  full_name,
  cycle_title,
  degree_name,
  group_code,
  created_at
FROM branch_students;

CREATE OR REPLACE VIEW public.dashboard_student_score_ranking AS
SELECT
  ev.cycle_degree_code,
  ev.group_code,
  eo.student_code,
  eo.roll_code,
  eo.student_full_name,
  ROUND(AVG(er.score)::NUMERIC, 2) AS average_score,
  COUNT(DISTINCT er.eval_code)::INTEGER AS total_evaluations
FROM public.eval_results er
INNER JOIN public.evals ev ON ev.code = er.eval_code
INNER JOIN public.enrollment_overview eo ON eo.code = er.enrollment_code
WHERE ev.cycle_degree_code = eo.cycle_degree_code
  AND ev.group_code = eo.group_code
  AND er.section_code IS NULL
GROUP BY
  ev.cycle_degree_code,
  ev.group_code,
  eo.student_code,
  eo.roll_code,
  eo.student_full_name;

CREATE OR REPLACE VIEW public.dashboard_general_performance_trend AS
SELECT
  ev.cycle_degree_code,
  ev.group_code,
  ev.code AS eval_code,
  ev.name AS eval_name,
  ev.eval_date,
  ev.created_at,
  ROUND(AVG(er.score)::NUMERIC, 2) AS average_score
FROM public.evals ev
INNER JOIN public.eval_results er ON er.eval_code = ev.code
INNER JOIN public.enrollment_overview eo ON eo.code = er.enrollment_code
WHERE ev.cycle_degree_code = eo.cycle_degree_code
  AND ev.group_code = eo.group_code
  AND er.section_code IS NULL
GROUP BY ev.cycle_degree_code, ev.group_code, ev.code, ev.name, ev.eval_date, ev.created_at;

CREATE OR REPLACE VIEW public.dashboard_course_performance_trend AS
SELECT
  ev.cycle_degree_code,
  ev.group_code,
  es.course_code,
  ev.code AS eval_code,
  ev.name AS eval_name,
  ev.eval_date,
  ev.created_at,
  ROUND(AVG(er.score)::NUMERIC, 2) AS average_score
FROM public.evals ev
INNER JOIN public.eval_sections es ON es.eval_code = ev.code
INNER JOIN public.eval_results er
  ON er.eval_code = ev.code
  AND er.section_code = es.code
INNER JOIN public.enrollment_overview eo ON eo.code = er.enrollment_code
WHERE ev.cycle_degree_code = eo.cycle_degree_code
  AND ev.group_code = eo.group_code
GROUP BY
  ev.cycle_degree_code,
  ev.group_code,
  es.course_code,
  ev.code,
  ev.name,
  ev.eval_date,
  ev.created_at;
