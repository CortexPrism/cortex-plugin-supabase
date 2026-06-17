# Supabase Backend Plugin

Full Supabase integration for CortexPrism: auth, database, storage, and edge functions.

## Installation

```bash
cortex plugin install marketplace:cortex-plugin-supabase
cortex plugin install github:CortexPrism/cortex-plugin-supabase
cortex plugin install ./manifest.json
```

## Configuration

Configure in `~/.cortex/config.json` or via the CortexPrism UI settings:

| Key                  | Type   | Required | Description               |
| -------------------- | ------ | -------- | ------------------------- |
| `supabaseUrl`        | text   | yes      | Your Supabase project URL |
| `supabaseAnonKey`    | secret | yes      | Anonymous/public key      |
| `supabaseServiceKey` | secret | yes      | Service role key (admin)  |

## Tools

### supabase_query — Run SQL query

- `query` (string, required) — SQL query to execute
- Returns JSON result set

### supabase_list_tables — List tables

- `schema` (string, default `"public"`) — Schema name

### supabase_create_table — Create table

- `table_name` (string, required) — Table name
- `columns` (string, required) — JSON array of column defs
- `schema` (string, default `"public"`)

### supabase_manage_rls — Manage RLS policies

- `table_name` (string, required)
- `action` (enum: `list`, `enable`, `disable`)
- `policy` (string, optional) — JSON policy definition

### supabase_deploy_function — Deploy edge function

- `name` (string, required) — Function name
- `code` (string, required) — Source code
- `verify_jwt` (boolean, default `true`)

### supabase_manage_storage — Manage storage

- `action` (enum: `list_buckets`, `create_bucket`, `upload_file`)
- `bucket_name` (string, optional)
- `file_path` (string, optional)
- `file_content` (string, optional)

## Capabilities

- `tools` — Tool execution
- `network:fetch` — HTTPS requests to Supabase API
- `db:read` — Read database access
- `db:write` — Write database access

## Development

```bash
deno task test
deno fmt --check
deno lint
```

## License

MIT
