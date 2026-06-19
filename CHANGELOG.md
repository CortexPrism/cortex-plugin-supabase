# Changelog

## [Unreleased]

### Added

- Structured logging via ctx.logger in lifecycle hooks

### Changed

- Renamed manifest file from `cortex.json` to `manifest.json` for consistency with Cortex standard
- Standardized UI section structure to `ui.settings` format
- Normalized parameter naming: `defaultValue` → `default`, `options` → `enum`
- Added `homepage` field with repository URL
- Added `dependencies` field to manifest

## [1.0.1] — 2026-06-15

### Added

- Initial release

## [1.0.1] — 2026-06-17

### Added

- Initial project setup

## [1.0.0] — 2026-06-15

### Added

- Initial release of cortex-plugin-supabase
- `supabase_query` — Run raw SQL queries
- `supabase_list_tables` — List database tables
- `supabase_create_table` — Create tables with column definitions
- `supabase_manage_rls` — Manage Row-Level Security policies
- `supabase_deploy_function` — Deploy edge functions
- `supabase_manage_storage` — Manage storage buckets and files
