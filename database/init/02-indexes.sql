-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX users_email_idx ON public.users (email);
CREATE INDEX permissions_user_code_idx ON public.permissions (user_code);
CREATE INDEX permissions_entity_idx ON public.permissions (entity);
CREATE INDEX auth_login_rate_limits_updated_at_idx ON public.auth_login_rate_limits (updated_at);
CREATE INDEX branches_name_idx ON public.branches (name);

-- Drive
CREATE INDEX drive_files_scope_idx ON public.drive_files (scope);
CREATE INDEX drive_files_user_code_idx ON public.drive_files (user_code);
CREATE INDEX drive_files_parent_code_idx ON public.drive_files (parent_code);
CREATE INDEX drive_files_type_idx ON public.drive_files (type);
CREATE INDEX drive_files_deleted_at_idx ON public.drive_files (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX drive_files_created_at_idx ON public.drive_files (created_at);
CREATE INDEX drive_files_scope_parent_idx ON public.drive_files (scope, parent_code) WHERE deleted_at IS NULL;
CREATE INDEX drive_files_user_private_idx ON public.drive_files (user_code) WHERE scope = 'user_private';
CREATE UNIQUE INDEX drive_files_active_name_scope_uq ON public.drive_files (
  scope,
  COALESCE(CASE WHEN scope = 'user_private' THEN user_code ELSE NULL END, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(parent_code, '00000000-0000-0000-0000-000000000000'::uuid),
  LOWER(name)
) WHERE deleted_at IS NULL;

-- Academic catalog
CREATE INDEX academic_degrees_sort_order_idx ON public.academic_degrees (sort_order, name);
CREATE INDEX academic_cycles_branch_date_idx ON public.academic_cycles (branch_code, start_date DESC, end_date DESC);
CREATE INDEX academic_cycles_title_idx ON public.academic_cycles (title, modality);
CREATE INDEX academic_cycles_active_idx ON public.academic_cycles (is_active, start_date DESC);
CREATE INDEX cycle_degrees_cycle_idx ON public.cycle_degrees (cycle_code);
CREATE INDEX cycle_degrees_degree_idx ON public.cycle_degrees (degree_code);

-- People
CREATE UNIQUE INDEX students_dni_uq
  ON public.students (dni)
  WHERE dni IS NOT NULL AND btrim(dni) <> '';
CREATE UNIQUE INDEX teachers_dni_uq
  ON public.teachers (dni)
  WHERE dni IS NOT NULL AND btrim(dni) <> '';
CREATE INDEX students_full_name_idx ON public.students (last_name, first_name);
CREATE INDEX students_created_at_idx ON public.students (created_at DESC);
CREATE INDEX students_is_active_idx ON public.students (is_active, created_at DESC);
CREATE INDEX student_drive_links_student_idx ON public.student_drive_links (student_code, created_at DESC);
CREATE INDEX student_drive_links_file_idx ON public.student_drive_links (file_code);
CREATE INDEX student_drive_links_user_idx ON public.student_drive_links (linked_by_user_code);
CREATE INDEX teachers_full_name_idx ON public.teachers (last_name, first_name);
CREATE INDEX teachers_created_at_idx ON public.teachers (created_at DESC);
CREATE INDEX teachers_is_active_idx ON public.teachers (is_active, created_at DESC);

-- Enrollments
CREATE INDEX enrollments_status_created_at_idx ON public.enrollments (status, created_at DESC);
CREATE INDEX enrollments_cycle_degree_idx ON public.enrollments (cycle_degree_code, status);
CREATE INDEX enrollments_student_idx ON public.enrollments (student_code, created_at DESC);
CREATE UNIQUE INDEX enrollments_roll_code_cycle_group_uq
  ON public.enrollments (cycle_degree_code, group_code, roll_code);

-- Attendance
CREATE INDEX attendances_date_idx ON public.attendances (attendance_date DESC, state);
CREATE INDEX attendances_enrollment_idx ON public.attendances (enrollment_code, attendance_date DESC);
CREATE INDEX attendances_state_idx ON public.attendances (state, attendance_date DESC);
