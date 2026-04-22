-- =====================================================
-- Coedula Database Views
-- =====================================================

CREATE OR REPLACE VIEW public.cycle_degree_overview AS
SELECT
  cd.code,
  cd.cycle_code,
  cd.degree_code,
  ac.branch_code,
  b.name AS branch_name,
  ac.title AS cycle_title,
  ac.modality,
  ac.start_date,
  ac.end_date,
  ac.base_cost,
  ac.is_active AS cycle_is_active,
  ad.name AS degree_name,
  ad.short_name AS degree_short_name,
  ad.sort_order AS degree_sort_order,
  ad.name AS label,
  cd.created_at,
  cd.updated_at
FROM public.cycle_degrees cd
INNER JOIN public.academic_cycles ac ON ac.code = cd.cycle_code
INNER JOIN public.branches b ON b.code = ac.branch_code
INNER JOIN public.academic_degrees ad ON ad.code = cd.degree_code;

CREATE OR REPLACE VIEW public.cycle_overview AS
SELECT
  ac.code,
  ac.branch_code,
  b.name AS branch_name,
  ac.title,
  ac.modality,
  ac.start_date,
  ac.end_date,
  ac.base_cost,
  ac.turn_1_attendance_time,
  ac.turn_1_tolerance_minutes,
  ac.turn_2_attendance_time,
  ac.turn_2_tolerance_minutes,
  ac.is_active,
  ac.notes,
  ac.created_at,
  ac.updated_at,
  COALESCE(offerings.degree_count, 0) AS degree_count,
  COALESCE(offerings.degrees_summary, '') AS degrees_summary,
  COALESCE(enrollment_counts.enrollment_count, 0) AS enrollment_count,
  COALESCE(enrollment_counts.active_enrollment_count, 0) AS active_enrollment_count
FROM public.academic_cycles ac
INNER JOIN public.branches b ON b.code = ac.branch_code
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS degree_count,
    STRING_AGG(cdo.label, ', ' ORDER BY cdo.degree_sort_order, cdo.degree_name) AS degrees_summary
  FROM public.cycle_degree_overview cdo
  WHERE cdo.cycle_code = ac.code
) AS offerings ON TRUE
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS enrollment_count,
    COUNT(*) FILTER (WHERE e.status = 'active')::INTEGER AS active_enrollment_count
  FROM public.enrollments e
  INNER JOIN public.cycle_degrees cd ON cd.code = e.cycle_degree_code
  WHERE cd.cycle_code = ac.code
) AS enrollment_counts ON TRUE;

CREATE OR REPLACE VIEW public.enrollment_overview AS
SELECT
  e.code,
  e.enrollment_number,
  e.student_code,
  s.student_number,
  s.first_name,
  s.last_name,
  (s.first_name || ' ' || s.last_name) AS student_full_name,
  s.phone AS student_phone,
  s.dni AS student_dni,
  e.cycle_degree_code,
  cdo.cycle_code,
  cdo.branch_code,
  cdo.branch_name,
  cdo.cycle_title,
  cdo.modality,
  cdo.start_date,
  cdo.end_date,
  cdo.degree_code,
  cdo.degree_name,
  e.roll_code,
  e.pay_cost,
  e.turn,
  e.status,
  e.group_code,
  e.observation,
  e.finalized_at,
  e.created_at,
  e.updated_at
FROM public.enrollments e
INNER JOIN public.students s ON s.code = e.student_code
INNER JOIN public.cycle_degree_overview cdo ON cdo.code = e.cycle_degree_code;

CREATE OR REPLACE VIEW public.student_overview AS
SELECT
  s.code,
  s.student_number,
  s.first_name,
  s.last_name,
  (s.first_name || ' ' || s.last_name) AS full_name,
  s.phone,
  s.address,
  s.dni,
  s.birth_date,
  s.observation,
  s.photo_url,
  s.is_active,
  s.created_at,
  s.updated_at,
  COALESCE(enrollment_stats.enrollments_count, 0) AS enrollments_count,
  current_enrollment.enrollment_number AS current_enrollment_number,
  current_enrollment.status AS current_enrollment_status,
  current_enrollment.cycle_title AS current_cycle_title,
  current_enrollment.degree_name AS current_degree_name,
  current_enrollment.branch_name AS current_branch_name
FROM public.students s
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS enrollments_count
  FROM public.enrollments e
  WHERE e.student_code = s.code
) AS enrollment_stats ON TRUE
LEFT JOIN LATERAL (
  SELECT
    eo.enrollment_number,
    eo.status,
    eo.cycle_title,
    eo.degree_name,
    eo.branch_name
  FROM public.enrollment_overview eo
  WHERE eo.student_code = s.code
  ORDER BY
    CASE eo.status
      WHEN 'active' THEN 0
      WHEN 'inactive' THEN 1
      ELSE 2
    END,
    eo.created_at DESC
  LIMIT 1
) AS current_enrollment ON TRUE;

CREATE OR REPLACE VIEW public.teacher_overview AS
SELECT
  t.code,
  t.teacher_number,
  t.first_name,
  t.last_name,
  (t.first_name || ' ' || t.last_name) AS full_name,
  t.phone,
  t.address,
  t.dni,
  t.birth_date,
  t.observation,
  t.photo_url,
  t.is_active,
  t.created_at,
  t.updated_at
FROM public.teachers t;
