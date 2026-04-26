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
    COUNT(*) FILTER (WHERE e.is_active = TRUE AND ac.end_date >= CURRENT_DATE)::INTEGER AS active_enrollment_count
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
  e.is_active,
  CASE
    WHEN e.is_active = FALSE THEN 'inactive'
    WHEN cdo.end_date < CURRENT_DATE THEN 'finalized'
    ELSE 'active'
  END AS status,
  e.group_code,
  e.observation,
  e.created_at,
  e.updated_at
FROM public.enrollments e
INNER JOIN public.students s ON s.code = e.student_code
INNER JOIN public.cycle_degree_overview cdo ON cdo.code = e.cycle_degree_code;

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

CREATE OR REPLACE VIEW public.attendance_overview AS
SELECT
  a.code AS attendance_code,
  a.attendance_date,
  a.state AS attendance_state,
  a.entry_time AS attendance_entry_time,
  a.observation AS attendance_observation,
  a.created_at AS attendance_created_at,
  a.updated_at AS attendance_updated_at,
  eo.code AS enrollment_code,
  eo.enrollment_number,
  eo.student_code,
  eo.student_number,
  eo.student_full_name,
  eo.student_dni,
  eo.student_phone,
  s.photo_url AS student_photo_url,
  eo.cycle_degree_code,
  eo.cycle_code,
  eo.branch_code,
  eo.branch_name,
  eo.cycle_title,
  eo.modality,
  eo.degree_code,
  eo.degree_name,
  eo.roll_code,
  eo.turn,
  eo.group_code
FROM public.attendances a
INNER JOIN public.enrollment_overview eo ON eo.code = a.enrollment_code
INNER JOIN public.students s ON s.code = eo.student_code;

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
      WHEN 'finalized' THEN 1
      ELSE 2
    END,
    eo.created_at DESC
  LIMIT 1
) AS current_enrollment ON TRUE;

CREATE OR REPLACE VIEW public.payment_overview AS
SELECT
  p.code,
  p.payment_number,
  p.branch_code,
  b.name AS branch_name,
  p.cashier_user_code,
  TRIM(COALESCE(cu.name, '') || ' ' || COALESCE(cu.last_name, '')) AS cashier_full_name,
  p.student_code,
  s.student_number,
  CASE
    WHEN p.student_code IS NOT NULL THEN (s.first_name || ' ' || s.last_name)
    ELSE NULL
  END AS student_full_name,
  p.payer_full_name,
  p.payment_date,
  p.observation,
  p.status,
  p.total_amount,
  p.registered_by_user_code,
  TRIM(COALESCE(u.name, '') || ' ' || COALESCE(u.last_name, '')) AS registered_by_full_name,
  p.voided_at,
  p.voided_by_user_code,
  p.created_at,
  p.updated_at,
  COALESCE(item_summary.item_count, 0) AS item_count,
  COALESCE(item_summary.concept_summary, '') AS concept_summary
FROM public.payments p
INNER JOIN public.branches b ON b.code = p.branch_code
INNER JOIN public.users cu ON cu.code = p.cashier_user_code
LEFT JOIN public.students s ON s.code = p.student_code
INNER JOIN public.users u ON u.code = p.registered_by_user_code
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS item_count,
    STRING_AGG(pi.concept_label, ' · ' ORDER BY pi.position) AS concept_summary
  FROM public.payment_items pi
  WHERE pi.payment_code = p.code
) AS item_summary ON TRUE;

CREATE OR REPLACE VIEW public.cash_outflow_overview AS
SELECT
  co.code,
  co.outflow_number,
  co.branch_code,
  b.name AS branch_name,
  co.cashier_user_code,
  TRIM(COALESCE(cu.name, '') || ' ' || COALESCE(cu.last_name, '')) AS cashier_full_name,
  co.outflow_type,
  co.outflow_date,
  co.concept,
  co.description,
  co.amount,
  COALESCE(co.returned_amount, 0)::NUMERIC(12,2) AS returned_amount,
  GREATEST(co.amount - COALESCE(co.returned_amount, 0), 0)::NUMERIC(12,2) AS pending_amount,
  co.responsible_name,
  co.status,
  co.registered_by_user_code,
  TRIM(COALESCE(u.name, '') || ' ' || COALESCE(u.last_name, '')) AS registered_by_full_name,
  co.deleted_at,
  co.deleted_by_user_code,
  co.created_at,
  co.updated_at
FROM public.cash_outflows co
INNER JOIN public.branches b ON b.code = co.branch_code
INNER JOIN public.users cu ON cu.code = co.cashier_user_code
INNER JOIN public.users u ON u.code = co.registered_by_user_code;

CREATE OR REPLACE VIEW public.cashbox_daily_summary AS
WITH all_scopes AS (
  SELECT branch_code, cashier_user_code, business_date
  FROM public.cashbox_days
  UNION
  SELECT branch_code, cashier_user_code, business_date
  FROM public.cashbox_movements
),
movement_totals AS (
  SELECT
    cm.branch_code,
    cm.cashier_user_code,
    cm.business_date,
    COALESCE(SUM(cm.amount) FILTER (WHERE cm.movement_type IN ('payment', 'outflow_return') AND cm.status = 'active'), 0)::NUMERIC(12,2) AS income_amount,
    COALESCE(SUM(cm.amount) FILTER (WHERE cm.movement_type = 'expense' AND cm.status = 'active'), 0)::NUMERIC(12,2) AS expense_amount,
    COALESCE(SUM(cm.amount) FILTER (WHERE cm.movement_type = 'surrender' AND cm.status = 'active'), 0)::NUMERIC(12,2) AS surrender_amount
  FROM public.cashbox_movements cm
  GROUP BY cm.branch_code, cm.cashier_user_code, cm.business_date
)
SELECT
  ad.branch_code,
  b.name AS branch_name,
  ad.cashier_user_code,
  TRIM(COALESCE(cu.name, '') || ' ' || COALESCE(cu.last_name, '')) AS cashier_full_name,
  ad.business_date,
  cd.code AS cashbox_day_code,
  cd.opened_by_user_code,
  cd.closed_by_user_code,
  COALESCE(cd.opening_amount, 0)::NUMERIC(12,2) AS opening_amount,
  COALESCE(mt.income_amount, 0)::NUMERIC(12,2) AS income_amount,
  COALESCE(mt.expense_amount, 0)::NUMERIC(12,2) AS expense_amount,
  COALESCE(mt.surrender_amount, 0)::NUMERIC(12,2) AS surrender_amount,
  (
    COALESCE(cd.opening_amount, 0)
    + COALESCE(mt.income_amount, 0)
    - COALESCE(mt.expense_amount, 0)
    - COALESCE(mt.surrender_amount, 0)
  )::NUMERIC(12,2) AS current_amount,
  cd.closing_amount,
  cd.notes,
  cd.closed_at,
  cd.created_at,
  cd.updated_at
FROM all_scopes ad
INNER JOIN public.branches b ON b.code = ad.branch_code
INNER JOIN public.users cu ON cu.code = ad.cashier_user_code
LEFT JOIN public.cashbox_days cd
  ON cd.branch_code = ad.branch_code
  AND cd.cashier_user_code = ad.cashier_user_code
  AND cd.business_date = ad.business_date
LEFT JOIN movement_totals mt
  ON mt.branch_code = ad.branch_code
  AND mt.cashier_user_code = ad.cashier_user_code
  AND mt.business_date = ad.business_date;

CREATE OR REPLACE VIEW public.teacher_overview AS
SELECT
  t.code,
  t.teacher_number,
  t.first_name,
  t.last_name,
  (t.first_name || ' ' || t.last_name) AS full_name,
  t.phone,
  t.created_at,
  t.updated_at
FROM public.teachers t;

CREATE OR REPLACE VIEW public.teacher_attendance_overview AS
SELECT
  ta.code AS attendance_code,
  ta.attendance_date,
  ta.state AS attendance_state,
  ta.entry_time AS attendance_entry_time,
  ta.observation AS attendance_observation,
  ta.created_at AS attendance_created_at,
  ta.updated_at AS attendance_updated_at,
  ta.teacher_code,
  t.teacher_number,
  t.first_name,
  t.last_name,
  (t.first_name || ' ' || t.last_name) AS teacher_full_name,
  t.phone AS teacher_phone,
  ta.branch_code,
  b.name AS branch_name,
  ta.schedule_code,
  ts.weekday AS schedule_weekday,
  ts.entry_time AS schedule_entry_time,
  ts.tolerance_minutes AS schedule_tolerance_minutes
FROM public.teacher_attendances ta
INNER JOIN public.teachers t ON t.code = ta.teacher_code
INNER JOIN public.branches b ON b.code = ta.branch_code
INNER JOIN public.teacher_schedules ts ON ts.code = ta.schedule_code;
