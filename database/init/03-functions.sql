-- =====================================================
-- Coedula Database Functions
-- =====================================================

CREATE OR REPLACE FUNCTION public.timestamp_updater()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- Drive tree helpers
-- -----------------------------------------------------
-- Recursive traversal is constrained to the same scope (and same owner when
-- the scope is private) so tree operations never cross access boundaries.

-- Returns every descendant (including the root itself) of a drive file.
CREATE OR REPLACE FUNCTION public.drive_file_subtree(root_code UUID)
RETURNS TABLE (
  code UUID,
  parent_code UUID,
  storage_path TEXT,
  scope VARCHAR(30),
  user_code UUID
) AS $$
  WITH RECURSIVE drive_tree AS (
    SELECT f.code, f.parent_code, f.storage_path, f.scope, f.user_code
    FROM public.drive_files f
    WHERE f.code = root_code
    UNION ALL
    SELECT f.code, f.parent_code, f.storage_path, f.scope, f.user_code
    FROM public.drive_files f
    INNER JOIN drive_tree dt ON f.parent_code = dt.code
    WHERE f.scope = dt.scope
      AND (dt.scope <> 'user_private' OR f.user_code = dt.user_code)
  )
  SELECT code, parent_code, storage_path, scope, user_code FROM drive_tree
$$ LANGUAGE SQL STABLE;

-- Returns every file inside the trash of a scope context (descendants
-- included) so callers can clean up the tree in a single pass.
CREATE OR REPLACE FUNCTION public.drive_trash_subtree(
  scope_value VARCHAR(30),
  owner_code UUID
)
RETURNS TABLE (
  code UUID,
  storage_path TEXT
) AS $$
  WITH RECURSIVE trash_tree AS (
    SELECT f.code, f.parent_code, f.storage_path, f.scope, f.user_code
    FROM public.drive_files f
    WHERE f.scope = scope_value
      AND f.deleted_at IS NOT NULL
      AND (scope_value <> 'user_private' OR f.user_code = owner_code)
    UNION ALL
    SELECT f.code, f.parent_code, f.storage_path, f.scope, f.user_code
    FROM public.drive_files f
    INNER JOIN trash_tree tt ON f.parent_code = tt.code
    WHERE f.scope = tt.scope
      AND (tt.scope <> 'user_private' OR f.user_code = tt.user_code)
  )
  SELECT DISTINCT code, storage_path FROM trash_tree
$$ LANGUAGE SQL STABLE;

-- Returns TRUE when candidate_code is inside the subtree rooted at
-- ancestor_code (used to detect cyclic folder moves).
CREATE OR REPLACE FUNCTION public.drive_file_is_descendant(
  ancestor_code UUID,
  candidate_code UUID
) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drive_file_subtree(ancestor_code) s
    WHERE s.code = candidate_code
  )
$$ LANGUAGE SQL STABLE;

-- Returns TRUE when any ancestor of start_code (inclusive) is in the trash,
-- staying within the provided scope context.
CREATE OR REPLACE FUNCTION public.drive_file_has_trashed_ancestor(
  start_code UUID,
  scope_value VARCHAR(30),
  owner_code UUID
) RETURNS BOOLEAN AS $$
  WITH RECURSIVE ancestors AS (
    SELECT f.code, f.parent_code, f.scope, f.user_code, f.deleted_at
    FROM public.drive_files f
    WHERE f.code = start_code
      AND f.scope = scope_value
      AND (scope_value <> 'user_private' OR f.user_code = owner_code)
    UNION ALL
    SELECT f.code, f.parent_code, f.scope, f.user_code, f.deleted_at
    FROM public.drive_files f
    INNER JOIN ancestors a ON a.parent_code = f.code
    WHERE f.scope = a.scope
      AND (a.scope <> 'user_private' OR f.user_code = a.user_code)
  )
  SELECT EXISTS (
    SELECT 1 FROM ancestors WHERE deleted_at IS NOT NULL
  )
$$ LANGUAGE SQL STABLE;
