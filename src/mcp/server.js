#!/usr/bin/env node

/**
 * 🥩 Meatloaf MCP Server
 * 
 * Model Context Protocol server that lets AI agents
 * (Claude, GPT, Gemini, etc.) call Meatloaf as a tool.
 * 
 * Usage:
 *   node mcp-server.js
 *   # or
 *   meatloaf mcp
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const { execSync, spawn } = require('child_process');
const path = require('path');

const MEATLOAF_BIN = path.join(__dirname, '..', 'bin', 'meatloaf.js');

function runMeatloaf(args, opts = {}) {
  try {
    const result = execSync(`node ${MEATLOAF_BIN} ${args}`, {
      timeout: opts.timeout || 60000,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: (err.stdout || '').trim(),
      error: (err.stderr || '').trim() || err.message
    };
  }
}

function parseJsonOutput(output) {
  try {
    // Find JSON in output (last JSON block)
    const jsonMatch = output.match(/\{[\s\S]*\}$/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return null;
}

const TOOLS = [
  {
    name: 'meatloaf_create',
    description: 'Create a new sandbox environment for running code',
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Docker image (e.g. node:20-alpine, python:3.12-slim)', default: 'node:20-alpine' },
        ports: { type: 'array', items: { type: 'string' }, description: 'Port mappings (e.g. ["3000:3000"])' },
        env: { type: 'array', items: { type: 'string' }, description: 'Environment variables (e.g. ["NODE_ENV=development"])' },
      },
      required: []
    }
  },
  {
    name: 'meatloaf_exec',
    description: 'Execute a command inside a running sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID (e.g. sandbox-abc123)' },
        command: { type: 'string', description: 'Command to execute' },
      },
      required: ['sandbox_id', 'command']
    }
  },
  {
    name: 'meatloaf_test',
    description: 'Test an HTTP endpoint and return the response',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to test (e.g. http://localhost:3000/)' },
        method: { type: 'string', description: 'HTTP method', default: 'GET' },
        body: { type: 'string', description: 'Request body (JSON string)' },
      },
      required: ['url']
    }
  },
  {
    name: 'meatloaf_list',
    description: 'List all active sandboxes',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'meatloaf_destroy',
    description: 'Destroy a sandbox and clean up resources',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID to destroy' },
      },
      required: ['sandbox_id']
    }
  },
  {
    name: 'meatloaf_logs',
    description: 'Get logs from a running sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID' },
        tail: { type: 'number', description: 'Number of lines', default: 50 },
      },
      required: ['sandbox_id']
    }
  },
  {
    name: 'meatloaf_fs_read',
    description: 'Read a file from inside a sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID' },
        path: { type: 'string', description: 'File path inside sandbox' },
      },
      required: ['sandbox_id', 'path']
    }
  },
  {
    name: 'meatloaf_fs_write',
    description: 'Write content to a file inside a sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID' },
        path: { type: 'string', description: 'File path inside sandbox' },
        content: { type: 'string', description: 'File content' },
      },
      required: ['sandbox_id', 'path', 'content']
    }
  },
  {
    name: 'meatloaf_bench',
    description: 'Benchmark/load-test an HTTP endpoint',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to benchmark' },
        requests: { type: 'number', description: 'Total requests', default: 100 },
        concurrency: { type: 'number', description: 'Concurrent requests', default: 10 },
      },
      required: ['url']
    }
  },
  {
    name: 'meatloaf_health',
    description: 'Run health checks on a sandbox (container, CPU, memory, HTTP, disk)',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID' },
        port: { type: 'number', description: 'HTTP port to check', default: 3000 },
      },
      required: ['sandbox_id']
    }
  },
  {
    name: 'meatloaf_port_scan',
    description: 'Scan for open ports on localhost',
    inputSchema: {
      type: 'object',
      properties: {
        start: { type: 'number', description: 'Start port', default: 1 },
        end: { type: 'number', description: 'End port', default: 1024 },
      },
      required: []
    }
  },
  {
    name: 'meatloaf_snapshot',
    description: 'Save sandbox state as a reusable snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID' },
        message: { type: 'string', description: 'Snapshot description' },
      },
      required: ['sandbox_id']
    }
  },
  {
    name: 'meatloaf_network_create',
    description: 'Create a Docker network for multi-sandbox communication',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Network name' },
      },
      required: ['name']
    }
  },
  {
    name: 'meatloaf_git_clone',
    description: 'Clone a git repository inside a sandbox',
    inputSchema: {
      type: 'object',
      properties: {
        sandbox_id: { type: 'string', description: 'Sandbox ID' },
        repo: { type: 'string', description: 'Git repository URL' },
        branch: { type: 'string', description: 'Branch to checkout' },
      },
      required: ['sandbox_id', 'repo']
    }
  },
  {
    name: 'meatloaf_secrets_set',
    description: 'Store an encrypted secret',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Secret name' },
        value: { type: 'string', description: 'Secret value' },
      },
      required: ['name', 'value']
    }
  },
  {
    name: 'meatloaf_secrets_get',
    description: 'Retrieve an encrypted secret',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Secret name' },
      },
      required: ['name']
    }
  }
];

const server = new Server(
  { name: 'meatloaf', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'meatloaf_create': {
        const portArgs = args.ports ? args.ports.map(p => `-p ${p}`).join(' ') : '';
        const envArgs = args.env ? args.env.map(e => `-e ${e}`).join(' ') : '';
        result = runMeatloaf(`create --image ${args.image || 'node:20-alpine'} ${portArgs} ${envArgs} --json --quiet`);
        break;
      }

      case 'meatloaf_exec': {
        result = runMeatloaf(`exec ${args.sandbox_id} "${args.command.replace(/"/g, '\\"')}" --json --quiet`);
        break;
      }

      case 'meatloaf_test': {
        const bodyArg = args.body ? `-b '${args.body}'` : '';
        const methodArg = args.method ? `-m ${args.method}` : '';
        result = runMeatloaf(`test ${args.url} ${methodArg} ${bodyArg} --json --quiet`);
        break;
      }

      case 'meatloaf_list': {
        result = runMeatloaf('list --json --quiet');
        break;
      }

      case 'meatloaf_destroy': {
        result = runMeatloaf(`destroy ${args.sandbox_id} --quiet`);
        break;
      }

      case 'meatloaf_logs': {
        result = runMeatloaf(`logs ${args.sandbox_id} -n ${args.tail || 50} --json --quiet`);
        break;
      }

      case 'meatloaf_fs_read': {
        result = runMeatloaf(`fs cat ${args.sandbox_id} ${args.path} --json --quiet`);
        break;
      }

      case 'meatloaf_fs_write': {
        const escaped = args.content.replace(/'/g, "'\\''");
        result = runMeatloaf(`fs write ${args.sandbox_id} ${args.path} '${escaped}' --json --quiet`);
        break;
      }

      case 'meatloaf_bench': {
        result = runMeatloaf(`bench ${args.url} -n ${args.requests || 100} -c ${args.concurrency || 10} --json --quiet`, { timeout: 120000 });
        break;
      }

      case 'meatloaf_health': {
        result = runMeatloaf(`health check ${args.sandbox_id} -p ${args.port || 3000} --json --quiet`);
        break;
      }

      case 'meatloaf_port_scan': {
        result = runMeatloaf(`port scan -s ${args.start || 1} -e ${args.end || 1024} --json --quiet`);
        break;
      }

      case 'meatloaf_snapshot': {
        result = runMeatloaf(`snapshot save ${args.sandbox_id} -m "${args.message || 'snapshot'}" --json --quiet`);
        break;
      }

      case 'meatloaf_network_create': {
        result = runMeatloaf(`network create ${args.name} --json --quiet`);
        break;
      }

      case 'meatloaf_git_clone': {
        const branchArg = args.branch ? `-b ${args.branch}` : '';
        result = runMeatloaf(`git clone ${args.sandbox_id} ${args.repo} ${branchArg} --json --quiet`);
        break;
      }

      case 'meatloaf_secrets_set': {
        result = runMeatloaf(`secrets set ${args.name} "${args.value}" --json --quiet`);
        break;
      }

      case 'meatloaf_secrets_get': {
        result = runMeatloaf(`secrets get ${args.name} --json --quiet`);
        break;
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
    }

    const json = parseJsonOutput(result.output);
    
    return {
      content: [{
        type: 'text',
        text: json 
          ? JSON.stringify(json, null, 2)
          : result.output || result.error || 'No output'
      }],
      isError: !result.success
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🥩 Meatloaf MCP Server running');
}

main().catch(console.error);
