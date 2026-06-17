import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { tools } from '../../mod.ts';
import type { PluginContext, ToolContext } from '../../types.ts';

// Mock PluginContext
const mockContext: PluginContext & ToolContext = {
  pluginId: 'cortex-plugin-supabase',
  pluginDir: '/tmp/plugins/cortex-plugin-supabase',
  state: {
    get: async () => null,
    set: async () => {},
    delete: async () => {},
    list: async () => ({}),
  },
  config: {
    get: async () => null,
    set: async () => {},
    getAll: async () => ({}),
  },
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  host: {
    registerTool: () => {},
    unregisterTool: () => {},
  },
  sessionId: 'test-session',
  workingDir: '/tmp',
  agentId: 'test-agent',
  workspaceDir: '/tmp',
};

function findTool(name: string) {
  const tool = tools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Tool "${name}" not found`);
  return tool;
}

Deno.test('tools array — exports all tools', () => {
  assertEquals(tools.length, 6);
  assertEquals(tools[0].definition.name, 'supabase_query');
  assertEquals(tools[1].definition.name, 'supabase_list_tables');
  assertEquals(tools[2].definition.name, 'supabase_create_table');
  assertEquals(tools[3].definition.name, 'supabase_manage_rls');
  assertEquals(tools[4].definition.name, 'supabase_deploy_function');
  assertEquals(tools[5].definition.name, 'supabase_manage_storage');
});

Deno.test('supabase_query — rejects empty query', async () => {
  const tool = findTool('supabase_query');
  const result = await tool.execute({ 'query': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('supabase_list_tables — tool is defined with name and description', () => {
  const tool = findTool('supabase_list_tables');
  assertEquals(typeof tool.definition.description, 'string');
  assertEquals(tool.definition.description.length > 0, true);
});

Deno.test('supabase_create_table — rejects empty table_name', async () => {
  const tool = findTool('supabase_create_table');
  const result = await tool.execute({ 'table_name': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('supabase_manage_rls — rejects empty table_name', async () => {
  const tool = findTool('supabase_manage_rls');
  const result = await tool.execute({ 'table_name': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('supabase_deploy_function — rejects empty name', async () => {
  const tool = findTool('supabase_deploy_function');
  const result = await tool.execute({ 'name': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('supabase_manage_storage — rejects empty action', async () => {
  const tool = findTool('supabase_manage_storage');
  const result = await tool.execute({ 'action': '' }, mockContext);
  assertEquals(result.success, false);
  assertStringIncludes(result.error ?? '', 'non-empty string');
});

Deno.test('all tools return durationMs', async () => {
  for (const tool of tools) {
    const args: Record<string, unknown> = {};
    const result = await tool.execute(args, mockContext);
    assertEquals(typeof result.durationMs, 'number');
    assertEquals(result.durationMs >= 0, true);
  }
});
