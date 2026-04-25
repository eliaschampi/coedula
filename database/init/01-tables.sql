-- =====================================================
-- Coedula Database Tables
-- =====================================================
-- Clean educational baseline schema
-- =====================================================

CREATE SEQUENCE public.student_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE public.teacher_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE public.enrollment_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE public.payment_number_seq START WITH 1000 INCREMENT BY 1;
CREATE SEQUENCE public.cash_outflow_number_seq START WITH 1000 INCREMENT BY 1;

-- Users
CREATE TABLE public.users (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(100) NULL,
  last_name VARCHAR(150) NULL,
  email VARCHAR(255) NOT NULL,
  photo_url TEXT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  last_login TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pk PRIMARY KEY (code),
  CONSTRAINT users_email_uq UNIQUE (email)
);

-- Permissions
CREATE TABLE public.permissions (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  user_code UUID NOT NULL,
  entity TEXT NOT NULL,
  action VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT permissions_pk PRIMARY KEY (code),
  CONSTRAINT permissions_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE NO ACTION,
  CONSTRAINT permissions_entity_user_action_uq UNIQUE (entity, user_code, action)
);

-- Auth login rate limits
CREATE TABLE public.auth_login_rate_limits (
  rate_key TEXT NOT NULL,
  first_attempt_at TIMESTAMPTZ NOT NULL,
  failed_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT auth_login_rate_limits_pk PRIMARY KEY (rate_key)
);

-- Branches
CREATE TABLE public.branches (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  state BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  users UUID[] NOT NULL,
  CONSTRAINT branches_pk PRIMARY KEY (code),
  CONSTRAINT branches_name_check CHECK (char_length(trim(name)) > 0)
);

-- Drive files
CREATE TABLE public.drive_files (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  scope VARCHAR(30) NOT NULL DEFAULT 'shared',
  user_code UUID NOT NULL,
  parent_code UUID NULL,
  name VARCHAR(500) NOT NULL,
  type VARCHAR(10) NOT NULL DEFAULT 'otr',
  size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NULL,
  mime_type VARCHAR(255) NULL,
  tag VARCHAR(10) NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT drive_files_pk PRIMARY KEY (code),
  CONSTRAINT drive_files_user_fk FOREIGN KEY (user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT drive_files_parent_fk FOREIGN KEY (parent_code) REFERENCES public.drive_files (code) ON DELETE CASCADE,
  CONSTRAINT drive_files_type_check CHECK (type IN ('dir', 'img', 'vid', 'aud', 'doc', 'zip', 'otr')),
  CONSTRAINT drive_files_scope_check CHECK (scope IN ('shared', 'user_private'))
);

-- Academic degrees
CREATE TABLE public.academic_degrees (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  short_name VARCHAR(40) NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT academic_degrees_pk PRIMARY KEY (code),
  CONSTRAINT academic_degrees_name_uq UNIQUE (name),
  CONSTRAINT academic_degrees_name_check CHECK (char_length(trim(name)) > 0),
  CONSTRAINT academic_degrees_sort_order_check CHECK (sort_order >= 0)
);

-- Courses
CREATE TABLE public.courses (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT courses_pk PRIMARY KEY (code),
  CONSTRAINT courses_name_uq UNIQUE (name),
  CONSTRAINT courses_name_check CHECK (char_length(trim(name)) > 0)
);

-- Academic cycles
CREATE TABLE public.academic_cycles (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  branch_code UUID NOT NULL,
  title VARCHAR(150) NOT NULL,
  modality VARCHAR(80) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  base_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  turn_1_attendance_time TIME NULL,
  turn_1_tolerance_minutes INTEGER NOT NULL DEFAULT 0,
  turn_2_attendance_time TIME NULL,
  turn_2_tolerance_minutes INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT academic_cycles_pk PRIMARY KEY (code),
  CONSTRAINT academic_cycles_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT academic_cycles_title_check CHECK (char_length(trim(title)) > 0),
  CONSTRAINT academic_cycles_modality_check CHECK (char_length(trim(modality)) > 0),
  CONSTRAINT academic_cycles_date_order_check CHECK (end_date >= start_date),
  CONSTRAINT academic_cycles_base_cost_check CHECK (base_cost >= 0),
  CONSTRAINT academic_cycles_turn_1_tolerance_check CHECK (turn_1_tolerance_minutes >= 0),
  CONSTRAINT academic_cycles_turn_2_tolerance_check CHECK (turn_2_tolerance_minutes >= 0)
);

-- Cycle degrees
CREATE TABLE public.cycle_degrees (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  cycle_code UUID NOT NULL,
  degree_code UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cycle_degrees_pk PRIMARY KEY (code),
  CONSTRAINT cycle_degrees_cycle_fk FOREIGN KEY (cycle_code) REFERENCES public.academic_cycles (code) ON DELETE CASCADE,
  CONSTRAINT cycle_degrees_degree_fk FOREIGN KEY (degree_code) REFERENCES public.academic_degrees (code) ON DELETE RESTRICT,
  CONSTRAINT cycle_degrees_cycle_degree_uq UNIQUE (cycle_code, degree_code)
);

-- Students
CREATE TABLE public.students (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  student_number VARCHAR(20) NOT NULL DEFAULT ('STU-' || LPAD(nextval('public.student_number_seq')::text, 6, '0')),
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NULL,
  address TEXT NULL,
  dni VARCHAR(20) NULL,
  birth_date DATE NULL,
  observation TEXT NULL,
  photo_url TEXT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT students_pk PRIMARY KEY (code),
  CONSTRAINT students_student_number_uq UNIQUE (student_number),
  CONSTRAINT students_first_name_check CHECK (char_length(trim(first_name)) > 0),
  CONSTRAINT students_last_name_check CHECK (char_length(trim(last_name)) > 0)
);

-- Student drive links
CREATE TABLE public.student_drive_links (
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

-- Teachers
CREATE TABLE public.teachers (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  teacher_number VARCHAR(20) NOT NULL DEFAULT ('TCH-' || LPAD(nextval('public.teacher_number_seq')::text, 6, '0')),
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NULL,
  address TEXT NULL,
  dni VARCHAR(20) NULL,
  birth_date DATE NULL,
  observation TEXT NULL,
  photo_url TEXT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT teachers_pk PRIMARY KEY (code),
  CONSTRAINT teachers_teacher_number_uq UNIQUE (teacher_number),
  CONSTRAINT teachers_first_name_check CHECK (char_length(trim(first_name)) > 0),
  CONSTRAINT teachers_last_name_check CHECK (char_length(trim(last_name)) > 0)
);

-- Enrollments
CREATE TABLE public.enrollments (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  enrollment_number VARCHAR(20) NOT NULL DEFAULT ('REG-' || LPAD(nextval('public.enrollment_number_seq')::text, 6, '0')),
  student_code UUID NOT NULL,
  cycle_degree_code UUID NOT NULL,
  roll_code VARCHAR(4) NOT NULL,
  pay_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  turn VARCHAR(12) NOT NULL DEFAULT 'turn_1',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  group_code VARCHAR(1) NOT NULL DEFAULT 'A',
  observation TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT enrollments_pk PRIMARY KEY (code),
  CONSTRAINT enrollments_student_fk FOREIGN KEY (student_code) REFERENCES public.students (code) ON DELETE RESTRICT,
  CONSTRAINT enrollments_cycle_degree_fk FOREIGN KEY (cycle_degree_code) REFERENCES public.cycle_degrees (code) ON DELETE RESTRICT,
  CONSTRAINT enrollments_enrollment_number_uq UNIQUE (enrollment_number),
  CONSTRAINT enrollments_student_cycle_degree_uq UNIQUE (student_code, cycle_degree_code),
  CONSTRAINT enrollments_roll_code_check CHECK (roll_code ~ '^[0-9]{4}$'),
  CONSTRAINT enrollments_pay_cost_check CHECK (pay_cost >= 0),
  CONSTRAINT enrollments_turn_check CHECK (turn IN ('turn_1', 'turn_2')),
  CONSTRAINT enrollments_group_code_check CHECK (group_code IN ('A', 'B', 'C', 'D'))
);

-- Cashbox day controls
CREATE TABLE public.cashbox_days (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  branch_code UUID NOT NULL,
  cashier_user_code UUID NOT NULL,
  business_date DATE NOT NULL,
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_amount NUMERIC(12,2) NULL,
  notes TEXT NULL,
  opened_by_user_code UUID NULL,
  closed_by_user_code UUID NULL,
  closed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cashbox_days_pk PRIMARY KEY (code),
  CONSTRAINT cashbox_days_scope_uq UNIQUE (business_date, branch_code, cashier_user_code),
  CONSTRAINT cashbox_days_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_days_cashier_user_fk FOREIGN KEY (cashier_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_days_opened_by_user_fk FOREIGN KEY (opened_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_days_closed_by_user_fk FOREIGN KEY (closed_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_days_opening_amount_check CHECK (opening_amount >= 0),
  CONSTRAINT cashbox_days_closing_amount_check CHECK (closing_amount IS NULL OR closing_amount >= 0),
  CONSTRAINT cashbox_days_closed_state_check CHECK (
    (closing_amount IS NULL AND closed_at IS NULL AND closed_by_user_code IS NULL)
    OR (closing_amount IS NOT NULL AND closed_at IS NOT NULL AND closed_by_user_code IS NOT NULL)
  )
);

-- Payments
CREATE TABLE public.payments (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  payment_number VARCHAR(20) NOT NULL DEFAULT ('PAY-' || LPAD(nextval('public.payment_number_seq')::text, 6, '0')),
  branch_code UUID NOT NULL,
  cashier_user_code UUID NOT NULL,
  student_code UUID NULL,
  payer_full_name VARCHAR(200) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  observation TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'posted',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  registered_by_user_code UUID NOT NULL,
  voided_at TIMESTAMPTZ NULL,
  voided_by_user_code UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_pk PRIMARY KEY (code),
  CONSTRAINT payments_payment_number_uq UNIQUE (payment_number),
  CONSTRAINT payments_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT payments_cashier_user_fk FOREIGN KEY (cashier_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT payments_student_fk FOREIGN KEY (student_code) REFERENCES public.students (code) ON DELETE RESTRICT,
  CONSTRAINT payments_registered_by_user_fk FOREIGN KEY (registered_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT payments_voided_by_user_fk FOREIGN KEY (voided_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT payments_payer_full_name_check CHECK (char_length(trim(payer_full_name)) > 0),
  CONSTRAINT payments_status_check CHECK (status IN ('posted', 'voided')),
  CONSTRAINT payments_total_amount_check CHECK (total_amount > 0),
  CONSTRAINT payments_voided_state_check CHECK (
    (status = 'voided' AND voided_at IS NOT NULL AND voided_by_user_code IS NOT NULL)
    OR (status = 'posted' AND voided_at IS NULL AND voided_by_user_code IS NULL)
  )
);

-- Payment items
CREATE TABLE public.payment_items (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  payment_code UUID NOT NULL,
  position INTEGER NOT NULL,
  concept_code VARCHAR(40) NOT NULL,
  concept_label VARCHAR(150) NOT NULL,
  detail TEXT NULL,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payment_items_pk PRIMARY KEY (code),
  CONSTRAINT payment_items_payment_fk FOREIGN KEY (payment_code) REFERENCES public.payments (code) ON DELETE CASCADE,
  CONSTRAINT payment_items_payment_position_uq UNIQUE (payment_code, position),
  CONSTRAINT payment_items_position_check CHECK (position > 0),
  CONSTRAINT payment_items_concept_code_check CHECK (
    concept_code IN ('enrollment', 'monthly_fee', 'first_installment', 'second_installment', 'initial_fee', 'other')
  ),
  CONSTRAINT payment_items_concept_label_check CHECK (char_length(trim(concept_label)) > 0),
  CONSTRAINT payment_items_amount_check CHECK (amount > 0)
);

-- Cash outflows (expenses + surrenders)
CREATE TABLE public.cash_outflows (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  outflow_number VARCHAR(20) NOT NULL DEFAULT ('OUT-' || LPAD(nextval('public.cash_outflow_number_seq')::text, 6, '0')),
  branch_code UUID NOT NULL,
  cashier_user_code UUID NOT NULL,
  outflow_type VARCHAR(20) NOT NULL DEFAULT 'expense',
  outflow_date DATE NOT NULL DEFAULT CURRENT_DATE,
  concept VARCHAR(160) NOT NULL,
  description TEXT NULL,
  amount NUMERIC(12,2) NOT NULL,
  responsible_name VARCHAR(180) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'posted',
  registered_by_user_code UUID NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  deleted_by_user_code UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cash_outflows_pk PRIMARY KEY (code),
  CONSTRAINT cash_outflows_outflow_number_uq UNIQUE (outflow_number),
  CONSTRAINT cash_outflows_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT cash_outflows_cashier_user_fk FOREIGN KEY (cashier_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cash_outflows_registered_by_user_fk FOREIGN KEY (registered_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cash_outflows_deleted_by_user_fk FOREIGN KEY (deleted_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cash_outflows_outflow_type_check CHECK (outflow_type IN ('expense', 'surrender')),
  CONSTRAINT cash_outflows_concept_check CHECK (char_length(trim(concept)) > 0),
  CONSTRAINT cash_outflows_amount_check CHECK (amount > 0),
  CONSTRAINT cash_outflows_status_check CHECK (status IN ('posted', 'deleted')),
  CONSTRAINT cash_outflows_deleted_state_check CHECK (
    (status = 'deleted' AND deleted_at IS NOT NULL AND deleted_by_user_code IS NOT NULL)
    OR (status = 'posted' AND deleted_at IS NULL AND deleted_by_user_code IS NULL)
  )
);

-- Cashbox movements
CREATE TABLE public.cashbox_movements (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  branch_code UUID NOT NULL,
  cashier_user_code UUID NOT NULL,
  business_date DATE NOT NULL,
  movement_type VARCHAR(20) NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  source_code UUID NOT NULL,
  direction VARCHAR(3) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  registered_by_user_code UUID NOT NULL,
  reversed_at TIMESTAMPTZ NULL,
  reversed_by_user_code UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT cashbox_movements_pk PRIMARY KEY (code),
  CONSTRAINT cashbox_movements_source_uq UNIQUE (source_type, source_code),
  CONSTRAINT cashbox_movements_branch_fk FOREIGN KEY (branch_code) REFERENCES public.branches (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_movements_cashier_user_fk FOREIGN KEY (cashier_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_movements_registered_by_user_fk FOREIGN KEY (registered_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_movements_reversed_by_user_fk FOREIGN KEY (reversed_by_user_code) REFERENCES public.users (code) ON DELETE RESTRICT,
  CONSTRAINT cashbox_movements_movement_type_check CHECK (movement_type IN ('payment', 'expense', 'surrender')),
  CONSTRAINT cashbox_movements_source_type_check CHECK (source_type IN ('payment', 'outflow')),
  CONSTRAINT cashbox_movements_direction_check CHECK (direction IN ('in', 'out')),
  CONSTRAINT cashbox_movements_amount_check CHECK (amount > 0),
  CONSTRAINT cashbox_movements_status_check CHECK (status IN ('active', 'reversed')),
  CONSTRAINT cashbox_movements_source_alignment_check CHECK (
    (movement_type = 'payment' AND source_type = 'payment' AND direction = 'in')
    OR (movement_type IN ('expense', 'surrender') AND source_type = 'outflow' AND direction = 'out')
  ),
  CONSTRAINT cashbox_movements_reversed_state_check CHECK (
    (status = 'reversed' AND reversed_at IS NOT NULL AND reversed_by_user_code IS NOT NULL)
    OR (status = 'active' AND reversed_at IS NULL AND reversed_by_user_code IS NULL)
  )
);

-- Evaluations
CREATE TABLE public.evals (
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

-- Evaluation sections
CREATE TABLE public.eval_sections (
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

-- Evaluation questions
CREATE TABLE public.eval_questions (
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

-- Evaluation answers
CREATE TABLE public.eval_answers (
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

-- Evaluation results
CREATE TABLE public.eval_results (
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

-- Attendance
CREATE TABLE public.attendances (
  code UUID NOT NULL DEFAULT gen_random_uuid(),
  enrollment_code UUID NOT NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  state VARCHAR(20) NOT NULL DEFAULT 'presente',
  entry_time TIME NULL,
  observation TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT attendances_pk PRIMARY KEY (code),
  CONSTRAINT attendances_enrollment_fk FOREIGN KEY (enrollment_code) REFERENCES public.enrollments (code) ON DELETE CASCADE,
  CONSTRAINT attendances_state_check CHECK (state IN ('presente', 'falta', 'tarde', 'justificado', 'permiso')),
  CONSTRAINT attendances_state_time_check CHECK (
    (state IN ('presente', 'tarde') AND entry_time IS NOT NULL)
    OR (state IN ('falta', 'justificado', 'permiso') AND entry_time IS NULL)
  ),
  CONSTRAINT attendances_enrollment_date_uq UNIQUE (enrollment_code, attendance_date)
);

-- Seed academic degree catalog
INSERT INTO public.academic_degrees (name, short_name, sort_order, is_active)
VALUES
  ('Unico', 'Unico', 0, TRUE),
  ('1ro', '1ro', 1, TRUE),
  ('2do', '2do', 2, TRUE),
  ('3ro', '3ro', 3, TRUE),
  ('4to', '4to', 4, TRUE),
  ('5to', '5to', 5, TRUE),
  ('6to', '6to', 6, TRUE)
ON CONFLICT (name) DO NOTHING;
