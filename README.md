# 🥩 Meatloaf — AI Agent Sandbox Runtime

**Build. Run. Test. Ship.** 🚀

Meatloaf is an open-source CLI tool that gives AI agents the power to not just write code, but to **build, run, test, and ship** applications autonomously. It bridges the gap between "generating code" and "delivering working software."

## 🤔 Why Meatloaf?

AI agents can write thousands of lines of code, but they can't:
- 🖥️ Spin up and interact with running services
- 👁️ See what the application actually looks like
- 🧪 Test endpoints and verify behavior
- 🐛 Debug issues in real-time
- 🔄 Iterate on build→test→fix loops

**Meatloaf changes that.** It gives AI agents a body to interact with the digital world.

## ⚡ Quick Start

```bash
# Install
npm install -g meatloaf

# Create a sandbox
meatloaf create --image node:20-alpine

# Run commands
meatloaf exec sandbox-abc123 "npm init -y && npm install express"

# Test endpoints
meatloaf test --url http://localhost:3000

# Take screenshots
meatloaf screenshot http://localhost:3000

# Full lifecycle
meatloaf up ./my-project
```

## 🎯 Commands

### Sandbox Management
| Command | Description |
|---------|-------------|
| `meatloaf create` | 🆕 Create a new sandbox |
| `meatloaf destroy <id>` | 💀 Destroy a sandbox |
| `meatloaf list` | 📋 List all sandboxes |
| `meatloaf inspect <id>` | 🔍 Inspect sandbox details |
| `meatloaf stop <id>` | ⏹️ Stop a sandbox |
| `meatloaf start <id>` | 🟢 Start a sandbox |
| `meatloaf cleanup` | 🧹 Remove orphaned sandboxes |

### Execution
| Command | Description |
|---------|-------------|
| `meatloaf exec <id> <cmd>` | ▶️ Run a command |
| `meatloaf script <id> <file>` | 📜 Run a script file |
| `meatloaf upload <id> <file>` | ⬆️ Upload file to sandbox |
| `meatloaf download <id> <path>` | ⬇️ Download file from sandbox |
| `meatloaf shell <id>` | 🐚 Interactive shell |

### HTTP Testing
| Command | Description |
|---------|-------------|
| `meatloaf test [url]` | 🌐 HTTP request tester |
| `meatloaf batch <file>` | 🧪 Run batch tests |
| `meatloaf wait <id>` | ⏳ Wait for endpoint ready |
| `meatloaf bench <url>` | ⚡ Load testing with latency percentiles |

### Observation
| Command | Description |
|---------|-------------|
| `meatloaf screenshot <url>` | 📸 Capture screenshot |
| `meatloaf html <url>` | 📄 Get HTML snapshot |
| `meatloaf logs <id>` | 📋 View/stream logs |
| `meatloaf stats <id>` | 📊 Resource usage |
| `meatloaf monitor` | 📊 Live terminal dashboard |

### Network Management
| Command | Description |
|---------|-------------|
| `meatloaf network create/list/remove` | 🌐 Docker networks |
| `meatloaf network connect/disconnect` | 🌐 Attach sandboxes |

### Volume Management
| Command | Description |
|---------|-------------|
| `meatloaf volume create/list/remove/prune` | 💾 Persistent storage |

### Image Management
| Command | Description |
|---------|-------------|
| `meatloaf image list/pull/remove/build` | 🖼️ Docker images |
| `meatloaf image inspect/history/tag/prune` | 🖼️ Image operations |

### Multi-Container Orchestration
| Command | Description |
|---------|-------------|
| `meatloaf compose up/down/ps/logs` | 🎼 Docker Compose-style |

### Process Management
| Command | Description |
|---------|-------------|
| `meatloaf ps list/kill/top/tree` | 🔄 Process control |

### Filesystem Operations
| Command | Description |
|---------|-------------|
| `meatloaf fs ls/cat/find/write` | 📁 File operations |
| `meatloaf fs mkdir/rm/du/grep` | 📁 Directory operations |

### Snapshots
| Command | Description |
|---------|-------------|
| `meatloaf snapshot save/restore/list` | 📸 State management |
| `meatloaf snapshot export/import` | 📸 Tar export/import |

### Health & Monitoring
| Command | Description |
|---------|-------------|
| `meatloaf health check/watch/system` | 🏥 Health checks |

### Port Management
| Command | Description |
|---------|-------------|
| `meatloaf port scan/check/find/map` | 🔌 Port operations |

### Secrets Management
| Command | Description |
|---------|-------------|
| `meatloaf secrets set/get/list/remove` | 🔐 Encrypted secrets |
| `meatloaf secrets inject/export/import` | 🔐 Secret injection |

### Environment Profiles
| Command | Description |
|---------|-------------|
| `meatloaf env create/show/list/delete` | 📋 Profile management |
| `meatloaf env set/unset/inject/merge/diff` | 📋 Variable operations |

### Git Operations
| Command | Description |
|---------|-------------|
| `meatloaf git clone/status/commit/push` | 📁 Git inside sandboxes |
| `meatloaf git diff/log` | 📁 Git history |

### File Sync
| Command | Description |
|---------|-------------|
| `meatloaf sync up/down/watch` | 🔄 Sync files |

### Proxy & Tunneling
| Command | Description |
|---------|-------------|
| `meatloaf proxy start/forward/tunnel` | 🔀 Port forwarding |

### Scheduled Tasks
| Command | Description |
|---------|-------------|
| `meatloaf cron add/list/remove/clear` | ⏰ Cron jobs |

### Diff & Compare
| Command | Description |
|---------|-------------|
| `meatloaf diff files/sb/changes` | 🔀 Compare files |

### Watch Mode
| Command | Description |
|---------|-------------|
| `meatloaf watch <id>` | 👁️ Auto-sync on changes |

### Resource Quotas
| Command | Description |
|---------|-------------|
| `meatloaf quota set/get/limits` | 📊 Resource limits |

### Service Discovery
| Command | Description |
|---------|-------------|
| `meatloaf discover resolve/lookup/register` | 🌐 DNS resolution |

### Audit Logging
| Command | Description |
|---------|-------------|
| `meatloaf audit log/stats/clear/export` | 📋 Audit trail |

### System
| Command | Description |
|---------|-------------|
| `meatloaf system --prune --info` | 🧹 System operations |

## 🤖 AI Agent Integration

Meatloaf works seamlessly with:

### OpenClaw
```bash
# Meatloaf works out of the box with OpenClaw agents
meatloaf create --image node:20-alpine
meatloaf exec sandbox-id "npm start"
meatloaf test --url http://localhost:3000
```

### Claude Code / Cursor / VS Code
```bash
# Use meatloaf from any terminal-based AI agent
meatloaf up ./my-project --json  # JSON output for parsing
```

### Any AI Agent
```bash
# Detect environment
meatloaf agent --detect

# JSON output mode
meatloaf create --image python:3.12-slim --json
```

## 📁 Templates

```bash
meatloaf templates           # List all
meatloaf init -t node-express
meatloaf init -t python-flask
meatloaf init -t static-site
meatloaf init -t go-gin
meatloaf init -t postgres
meatloaf init -t redis
```

## 🔥 Full Lifecycle Example

```bash
# One command to rule them all
meatloaf up ./my-app

# This will:
# 1. Create a sandbox
# 2. Upload your project files
# 3. Run setup commands (npm install, etc.)
# 4. Start the application
# 5. Wait for the endpoint to be ready
# 6. Report success
```

## 🧪 Batch Testing

Create a `tests.json`:
```json
[
  { "name": "Home", "url": "http://localhost:3000", "method": "GET" },
  { "name": "Health", "url": "http://localhost:3000/health", "method": "GET" },
  { "name": "Create", "url": "http://localhost:3000/api/items", "method": "POST", "body": {"name": "test"} }
]
```

Run:
```bash
meatloaf batch tests.json
```

## ⚙️ Configuration

Meatloaf stores config in `~/.meatloaf/config.json`:

```json
{
  "defaultImage": "node:20-alpine",
  "sandboxTTL": 3600000,
  "maxSandboxes": 10,
  "screenshot": {
    "width": 1280,
    "height": 720
  }
}
```

## 🏗️ Architecture

```
meatloaf/
├── bin/meatloaf.js          # Entry point
├── src/
│   ├── index.js             # CLI definition
│   ├── commands/
│   │   ├── sandbox.js       # Sandbox lifecycle
│   │   ├── exec.js          # Command execution
│   │   ├── http.js          # HTTP testing
│   │   ├── screenshot.js    # Screenshot capture
│   │   ├── logs.js          # Log management
│   │   └── init.js          # Project templates
│   ├── lib/
│   │   ├── docker.js        # Docker engine
│   │   ├── http.js          # HTTP client
│   │   └── screenshot.js    # Screenshot engine
│   └── utils/
│       ├── logger.js        # CLI output
│       ├── config.js        # Configuration
│       └── helpers.js       # Utilities
└── tests/
    └── integration.test.js  # Test suite
```

## 📄 License

MIT — Use it, fork it, make it yours. 🥩

---

**Built with ❤️ for AI agents everywhere** 🤖
