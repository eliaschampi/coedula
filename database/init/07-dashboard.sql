-- =====================================================
-- Coedula Dashboard Views
-- =====================================================

CREATE OR REPLACE VIEW public.dashboard_education_summary AS
SELECT
  (SELECT COUNT(*)::INTEGER FROM public.branches WHERE state = TRUE) AS active_branches,
  (SELECT COUNT(*)::INTEGER FROM public.academic_cycles WHERE is_active = TRUE) AS active_cycles,
  (SELECT COUNT(*)::INTEGER FROM public.students WHERE is_active = TRUE) AS active_students,
  (SELECT COUNT(*)::INTEGER FROM public.teachers WHERE is_active = TRUE) AS active_teachers,
  (SELECT COUNT(*)::INTEGER FROM public.enrollments WHERE status = 'active') AS active_enrollments;

CREATE OR REPLACE VIEW public.dashboard_enrollment_status_summary AS
SELECT
  e.status,
  COUNT(*)::INTEGER AS total
FROM public.enrollments e
GROUP BY e.status;
