-- =====================================================
-- Coedula Database Triggers
-- =====================================================

CREATE TRIGGER users_updated_at_tg
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER drive_files_updated_at_tg
BEFORE UPDATE ON public.drive_files
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER academic_degrees_updated_at_tg
BEFORE UPDATE ON public.academic_degrees
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER academic_cycles_updated_at_tg
BEFORE UPDATE ON public.academic_cycles
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER cycle_degrees_updated_at_tg
BEFORE UPDATE ON public.cycle_degrees
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER students_updated_at_tg
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER teachers_updated_at_tg
BEFORE UPDATE ON public.teachers
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER enrollments_updated_at_tg
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();

CREATE TRIGGER attendances_updated_at_tg
BEFORE UPDATE ON public.attendances
FOR EACH ROW EXECUTE FUNCTION public.timestamp_updater();
