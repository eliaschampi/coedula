#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[SETUP]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

run_migrate() {
    pnpm exec -- tsx database/dev/migrate.ts "$@"
}

is_container() {
    [ -f /.dockerenv ] || grep -q docker /proc/1/cgroup 2>/dev/null
}

wait_for_db() {
    log "Waiting for database connection..."
    local attempt=1
    while [ $attempt -le 30 ]; do
        if run_migrate check >/dev/null 2>&1; then
            success "Database connection established"
            return 0
        fi
        log "Attempt $attempt/30 - waiting for database..."
        sleep 2
        ((attempt++))
    done
    error "Database connection failed after 30 attempts"
    return 1
}

is_db_initialized() {
    log "Checking if database is initialized..."
    # Checks whether core schema tables exist.
    if run_migrate check:tables 2>/dev/null | grep -q "true"; then
        success "Database is already initialized"
        return 0
    else
        log "Database needs initialization"
        return 1
    fi
}

init_database() {
    log "Initializing database with SQL files..."
    if run_migrate init >/dev/null 2>&1; then
        success "Database initialization completed"
    else
        error "Database initialization failed"
        return 1
    fi
}

generate_types() {
    log "Generating TypeScript types..."
    if pnpm run db:generate >/dev/null 2>&1; then
        success "Types generated successfully"
    else
        error "Type generation failed"
        return 1
    fi
}

migrate_database() {
    log "Applying pending SQL migrations..."
    if run_migrate migrate >/dev/null 2>&1; then
        success "SQL migrations applied successfully"
    else
        error "Applying SQL migrations failed"
        return 1
    fi
}

setup_database() {
    log "Starting database setup..."

    # Check if running in container
    if ! is_container; then
        warn "Running outside Docker. Proceeding with local Postgres."
    fi

    # Wait for database
    if ! wait_for_db; then
        error "Cannot connect to database"
        exit 1
    fi

    # Initialize if needed, then apply pending migrations and refresh generated types
    if is_db_initialized; then
        log "Database already initialized"
    else
        log "Fresh database detected, running initialization..."
        init_database
    fi
    migrate_database
    generate_types

    success "Database setup completed successfully!"
}

show_status() {
    log "Checking database status..."

    if ! wait_for_db >/dev/null 2>&1; then
        error "Database connection failed. Ensure Postgres is running and .env is set"
        return 1
    fi

    if is_db_initialized >/dev/null 2>&1; then
        success "Database is initialized"
        log "Schema source: database/init + database/migrations"
        run_migrate status
    else
        warn "Database not initialized. Run: pnpm db:setup"
    fi
}

reset_database() {
    log "Resetting database..."
    warn "This will destroy ALL data and reset to initial state!"
    local force="${2:-}"
    local confirmed="no"

    if [[ "$force" == "--yes" || "$force" == "-y" || "${DB_RESET_FORCE:-}" == "1" || "${DB_RESET_FORCE:-}" == "true" ]]; then
        confirmed="yes"
    else
        read -p "Are you sure? Type 'yes' to confirm: " -r
        if [[ $REPLY == "yes" ]]; then
            confirmed="yes"
        fi
    fi

    if [[ "$confirmed" == "yes" ]]; then
        log "Dropping all tables and schema..."
        if run_migrate reset >/dev/null 2>&1; then
            success "Database reset completed"
            log "Reinitializing database from SQL baseline and migrations..."
            if init_database && migrate_database && generate_types; then
                success "Database reinitialized successfully"
            else
                error "Failed to reinitialize database after reset"
                return 1
            fi
        else
            error "Database reset failed"
            return 1
        fi
    else
        log "Reset cancelled"
    fi
}

case "${1:-setup}" in
    "setup"|"init") setup_database ;;
    "status") show_status ;;
    "reset"|"rebuild") reset_database "$@" ;;
    *)
        echo "Usage: bash database/dev/setup.sh [setup|status|reset|rebuild] [--yes]"
        echo ""
        echo "Commands:"
        echo "  setup   - Initialize if needed, apply migrations, generate types"
        echo "  status  - Show database initialization and migration status"
        echo "  reset   - Reset database, reapply baseline + migrations, generate types"
        echo "  rebuild - Alias of reset"
        ;;
esac
