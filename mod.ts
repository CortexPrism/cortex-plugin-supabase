import type { Tool, ToolContext, PluginContext, ToolCallResult } from "cortex/plugins";

let config: Record<string, string> = {};

async function resolveConfig(ctx: PluginContext): Promise<Record<string, string>> {
  const url = await ctx.config.get("supabaseUrl");
  const anonKey = await ctx.config.get("supabaseAnonKey");
  const serviceKey = await ctx.config.get("supabaseServiceKey");
  return {
    supabaseUrl: url ?? "",
    supabaseAnonKey: anonKey ?? "",
    supabaseServiceKey: serviceKey ?? "",
  };
}

export async function onLoad(ctx: PluginContext): Promise<void> {
  config = await resolveConfig(ctx);
}

function supabaseHeaders(): Record<string, string> {
  return {
    "apikey": config.supabaseServiceKey || config.supabaseAnonKey,
    "Authorization": `Bearer ${config.supabaseServiceKey || config.supabaseAnonKey}`,
    "Content-Type": "application/json",
    "User-Agent": "CortexPrism-SupabasePlugin/1.0.0",
  };
}

const supabaseQueryTool: Tool = {
  definition: {
    name: "supabase_query",
    description: "Run a raw SQL query against your Supabase database",
    params: [{ name: "query", type: "string", description: "SQL query to execute", required: true }],
    capabilities: ["db:read", "db:write"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const query = args.query;
      if (!query || typeof query !== "string") {
        return { toolName: "supabase_query", success: false, output: "", error: "query must be a non-empty string", durationMs: Date.now() - start };
      }
      const base = config.supabaseUrl;
      if (!base) {
        return { toolName: "supabase_query", success: false, output: "", error: "Supabase URL not configured", durationMs: Date.now() - start };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch(`${base}/rest/v1/rpc/pgrest_exec`, {
          method: "POST",
          headers: supabaseHeaders(),
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.text();
          return { toolName: "supabase_query", success: false, output: "", error: `Supabase error ${res.status}: ${err}`, durationMs: Date.now() - start };
        }
        const data = await res.json();
        return { toolName: "supabase_query", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error && e.name === "AbortError") {
          return { toolName: "supabase_query", success: false, output: "", error: "Request timeout (30s)", durationMs: Date.now() - start };
        }
        throw e;
      }
    } catch (error) {
      return { toolName: "supabase_query", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const supabaseListTablesTool: Tool = {
  definition: {
    name: "supabase_list_tables",
    description: "List all tables in a database schema",
    params: [{ name: "schema", type: "string", description: "Database schema name", required: false, defaultValue: "public" }],
    capabilities: ["db:read"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const schema = (typeof args.schema === "string" && args.schema) ? args.schema : "public";
      const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' ORDER BY table_name`;
      const base = config.supabaseUrl;
      if (!base) {
        return { toolName: "supabase_list_tables", success: false, output: "", error: "Supabase URL not configured", durationMs: Date.now() - start };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`${base}/rest/v1/rpc/pgrest_exec`, {
          method: "POST",
          headers: supabaseHeaders(),
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.text();
          return { toolName: "supabase_list_tables", success: false, output: "", error: `Supabase error ${res.status}: ${err}`, durationMs: Date.now() - start };
        }
        const data = await res.json();
        return { toolName: "supabase_list_tables", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error && e.name === "AbortError") {
          return { toolName: "supabase_list_tables", success: false, output: "", error: "Request timeout (15s)", durationMs: Date.now() - start };
        }
        throw e;
      }
    } catch (error) {
      return { toolName: "supabase_list_tables", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const supabaseCreateTableTool: Tool = {
  definition: {
    name: "supabase_create_table",
    description: "Create a new table with the given column definitions",
    params: [
      { name: "table_name", type: "string", description: "Name of the table to create", required: true },
      { name: "columns", type: "string", description: "JSON array of column definitions", required: true },
      { name: "schema", type: "string", description: "Database schema name", required: false, defaultValue: "public" },
    ],
    capabilities: ["db:write"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const tableName = args.table_name;
      const columnsRaw = args.columns;
      const schema = (typeof args.schema === "string" && args.schema) ? args.schema : "public";
      if (!tableName || typeof tableName !== "string") {
        return { toolName: "supabase_create_table", success: false, output: "", error: "table_name must be a non-empty string", durationMs: Date.now() - start };
      }
      if (!columnsRaw || typeof columnsRaw !== "string") {
        return { toolName: "supabase_create_table", success: false, output: "", error: "columns must be a non-empty JSON string", durationMs: Date.now() - start };
      }
      let columns: Array<Record<string, unknown>>;
      try { columns = JSON.parse(columnsRaw); } catch {
        return { toolName: "supabase_create_table", success: false, output: "", error: "columns must be valid JSON", durationMs: Date.now() - start };
      }
      if (!Array.isArray(columns) || columns.length === 0) {
        return { toolName: "supabase_create_table", success: false, output: "", error: "columns must be a non-empty JSON array", durationMs: Date.now() - start };
      }
      const colDefs = columns.map((c) => `${c.name} ${c.type}${c.nullable === false ? " NOT NULL" : ""}${c.default ? ` DEFAULT ${c.default}` : ""}`).join(", ");
      const query = `CREATE TABLE IF NOT EXISTS "${schema}"."${tableName}" (${colDefs});`;
      const base = config.supabaseUrl;
      if (!base) {
        return { toolName: "supabase_create_table", success: false, output: "", error: "Supabase URL not configured", durationMs: Date.now() - start };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        const res = await fetch(`${base}/rest/v1/rpc/pgrest_exec`, {
          method: "POST",
          headers: supabaseHeaders(),
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.text();
          return { toolName: "supabase_create_table", success: false, output: "", error: `Supabase error ${res.status}: ${err}`, durationMs: Date.now() - start };
        }
        return { toolName: "supabase_create_table", success: true, output: `Table "${schema}"."${tableName}" created successfully`, durationMs: Date.now() - start };
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error && e.name === "AbortError") {
          return { toolName: "supabase_create_table", success: false, output: "", error: "Request timeout (30s)", durationMs: Date.now() - start };
        }
        throw e;
      }
    } catch (error) {
      return { toolName: "supabase_create_table", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const supabaseManageRLSTool: Tool = {
  definition: {
    name: "supabase_manage_rls",
    description: "Manage Row-Level Security policies on a table",
    params: [
      { name: "table_name", type: "string", description: "Name of the table", required: true },
      { name: "action", type: "string", description: "RLS action to perform", required: true, options: ["list", "enable", "disable"] },
      { name: "policy", type: "string", description: "JSON policy definition", required: false },
    ],
    capabilities: ["db:write"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const tableName = args.table_name;
      const action = args.action;
      if (!tableName || typeof tableName !== "string") {
        return { toolName: "supabase_manage_rls", success: false, output: "", error: "table_name must be a non-empty string", durationMs: Date.now() - start };
      }
      if (!action || typeof action !== "string" || !["list", "enable", "disable"].includes(action)) {
        return { toolName: "supabase_manage_rls", success: false, output: "", error: "action must be one of: list, enable, disable", durationMs: Date.now() - start };
      }
      let query: string;
      switch (action) {
        case "list":
          query = `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = '${tableName}'`;
          break;
        case "enable":
          query = `ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY`;
          break;
        case "disable":
          query = `ALTER TABLE "${tableName}" DISABLE ROW LEVEL SECURITY`;
          break;
        default:
          return { toolName: "supabase_manage_rls", success: false, output: "", error: `Unknown action: ${action}`, durationMs: Date.now() - start };
      }
      const base = config.supabaseUrl;
      if (!base) {
        return { toolName: "supabase_manage_rls", success: false, output: "", error: "Supabase URL not configured", durationMs: Date.now() - start };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const res = await fetch(`${base}/rest/v1/rpc/pgrest_exec`, {
          method: "POST",
          headers: supabaseHeaders(),
          body: JSON.stringify({ query }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.text();
          return { toolName: "supabase_manage_rls", success: false, output: "", error: `Supabase error ${res.status}: ${err}`, durationMs: Date.now() - start };
        }
        if (action === "list") {
          const data = await res.json();
          return { toolName: "supabase_manage_rls", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
        }
        return { toolName: "supabase_manage_rls", success: true, output: `RLS ${action === "enable" ? "enabled" : "disabled"} for table "${tableName}"`, durationMs: Date.now() - start };
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error && e.name === "AbortError") {
          return { toolName: "supabase_manage_rls", success: false, output: "", error: "Request timeout (15s)", durationMs: Date.now() - start };
        }
        throw e;
      }
    } catch (error) {
      return { toolName: "supabase_manage_rls", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const supabaseDeployFunctionTool: Tool = {
  definition: {
    name: "supabase_deploy_function",
    description: "Deploy a Supabase edge function",
    params: [
      { name: "name", type: "string", description: "Function name", required: true },
      { name: "code", type: "string", description: "Function source code", required: true },
      { name: "verify_jwt", type: "boolean", description: "Whether to require JWT verification", required: false, defaultValue: true },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const name = args.name;
      const code = args.code;
      const verifyJwt = args.verify_jwt !== false;
      if (!name || typeof name !== "string") {
        return { toolName: "supabase_deploy_function", success: false, output: "", error: "name must be a non-empty string", durationMs: Date.now() - start };
      }
      if (!code || typeof code !== "string") {
        return { toolName: "supabase_deploy_function", success: false, output: "", error: "code must be a non-empty string", durationMs: Date.now() - start };
      }
      const base = config.supabaseUrl;
      if (!base) {
        return { toolName: "supabase_deploy_function", success: false, output: "", error: "Supabase URL not configured", durationMs: Date.now() - start };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      try {
        const res = await fetch(`${base}/functions/v1/deploy`, {
          method: "POST",
          headers: { ...supabaseHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ name, code, verify_jwt: verifyJwt }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.text();
          return { toolName: "supabase_deploy_function", success: false, output: "", error: `Supabase error ${res.status}: ${err}`, durationMs: Date.now() - start };
        }
        const data = await res.json();
        return { toolName: "supabase_deploy_function", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error && e.name === "AbortError") {
          return { toolName: "supabase_deploy_function", success: false, output: "", error: "Request timeout (60s)", durationMs: Date.now() - start };
        }
        throw e;
      }
    } catch (error) {
      return { toolName: "supabase_deploy_function", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

const supabaseManageStorageTool: Tool = {
  definition: {
    name: "supabase_manage_storage",
    description: "Manage Supabase storage buckets and files",
    params: [
      { name: "action", type: "string", description: "Storage action to perform", required: true, options: ["list_buckets", "create_bucket", "upload_file"] },
      { name: "bucket_name", type: "string", description: "Name of the storage bucket", required: false },
      { name: "file_path", type: "string", description: "Path to the file within the bucket", required: false },
      { name: "file_content", type: "string", description: "Base64-encoded file content", required: false },
    ],
    capabilities: ["network:fetch"],
  },
  execute: async (args: Record<string, unknown>, _ctx: ToolContext): Promise<ToolCallResult> => {
    const start = Date.now();
    try {
      const action = args.action;
      if (!action || typeof action !== "string" || !["list_buckets", "create_bucket", "upload_file"].includes(action)) {
        return { toolName: "supabase_manage_storage", success: false, output: "", error: "action must be one of: list_buckets, create_bucket, upload_file", durationMs: Date.now() - start };
      }
      const base = config.supabaseUrl;
      if (!base) {
        return { toolName: "supabase_manage_storage", success: false, output: "", error: "Supabase URL not configured", durationMs: Date.now() - start };
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        let url: string;
        let method = "GET";
        let body: BodyInit | undefined;
        switch (action) {
          case "list_buckets":
            url = `${base}/storage/v1/bucket`;
            method = "GET";
            break;
          case "create_bucket": {
            const bucketName = args.bucket_name;
            if (!bucketName || typeof bucketName !== "string") {
              clearTimeout(timeout);
              return { toolName: "supabase_manage_storage", success: false, output: "", error: "bucket_name is required for create_bucket", durationMs: Date.now() - start };
            }
            url = `${base}/storage/v1/bucket`;
            method = "POST";
            body = JSON.stringify({ name: bucketName, public: false });
            break;
          }
          case "upload_file": {
            const bucketName = args.bucket_name;
            const filePath = args.file_path;
            const fileContent = args.file_content;
            if (!bucketName || typeof bucketName !== "string") {
              clearTimeout(timeout);
              return { toolName: "supabase_manage_storage", success: false, output: "", error: "bucket_name is required for upload_file", durationMs: Date.now() - start };
            }
            if (!filePath || typeof filePath !== "string") {
              clearTimeout(timeout);
              return { toolName: "supabase_manage_storage", success: false, output: "", error: "file_path is required for upload_file", durationMs: Date.now() - start };
            }
            if (!fileContent || typeof fileContent !== "string") {
              clearTimeout(timeout);
              return { toolName: "supabase_manage_storage", success: false, output: "", error: "file_content is required for upload_file", durationMs: Date.now() - start };
            }
            url = `${base}/storage/v1/object/${encodeURIComponent(bucketName)}/${encodeURIComponent(filePath)}`;
            method = "POST";
            const binary = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));
            body = binary;
            break;
          }
          default:
            clearTimeout(timeout);
            return { toolName: "supabase_manage_storage", success: false, output: "", error: `Unknown action: ${action}`, durationMs: Date.now() - start };
        }
        const headers = supabaseHeaders();
        if (body && typeof body === "string") {
          headers["Content-Type"] = "application/json";
        } else if (body instanceof Uint8Array) {
          headers["Content-Type"] = "application/octet-stream";
        }
        const res = await fetch(url, { method, headers, body, signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.text();
          return { toolName: "supabase_manage_storage", success: false, output: "", error: `Supabase error ${res.status}: ${err}`, durationMs: Date.now() - start };
        }
        const data = await res.json().catch(() => ({ message: "OK" }));
        return { toolName: "supabase_manage_storage", success: true, output: JSON.stringify(data, null, 2), durationMs: Date.now() - start };
      } catch (e) {
        clearTimeout(timeout);
        if (e instanceof Error && e.name === "AbortError") {
          return { toolName: "supabase_manage_storage", success: false, output: "", error: "Request timeout (30s)", durationMs: Date.now() - start };
        }
        throw e;
      }
    } catch (error) {
      return { toolName: "supabase_manage_storage", success: false, output: "", error: `Failed: ${error instanceof Error ? error.message : String(error)}`, durationMs: Date.now() - start };
    }
  },
};

export async function onUnload(_ctx: PluginContext): Promise<void> {}

export const tools: Tool[] = [
  supabaseQueryTool,
  supabaseListTablesTool,
  supabaseCreateTableTool,
  supabaseManageRLSTool,
  supabaseDeployFunctionTool,
  supabaseManageStorageTool,
];
