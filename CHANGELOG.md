# Changelog

All notable changes to Meatloaf will be documented in this file.

## [1.0.0] - 2026-04-30

### 🎉 Initial Release

#### 🏗️ Core
- Docker sandbox lifecycle management (create, start, stop, destroy, inspect, list)
- Full Docker API integration via Dockerode
- JSON output mode for AI agent integration
- Encrypted configuration storage

#### ⚡ Execution
- Command execution inside sandboxes
- Script file execution
- File upload/download between host and sandbox
- Interactive shell access

#### 🌐 HTTP Testing
- Single endpoint testing (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- Batch test runner from JSON files
- Endpoint readiness checker (wait for service)
- Load testing / benchmarking with latency percentiles (P50, P95, P99)

#### 📁 Filesystem
- Directory listing, file read/write, find, grep
- Directory creation, file removal, disk usage analysis

#### 🔄 Process Management
- Process listing, killing, top processes, process trees

#### 🖼️ Docker Resources
- Image management (list, pull, remove, build, inspect, history, tag, prune)
- Network management (create, list, remove, connect, disconnect, inspect)
- Volume management (create, list, remove, inspect, prune)

#### 🎼 Multi-Container
- Docker Compose-style orchestration (up, down, ps, logs)

#### 📸 Snapshots
- Save sandbox state as Docker image
- Restore from snapshots
- Export/import as tar archives

#### 🏥 Health & Monitoring
- Container health checks (CPU, memory, HTTP, disk)
- Continuous health watching
- Docker system info

#### 🔌 Port Management
- Port scanning
- Port availability checking
- Port mapping display

#### 🔐 Security
- AES-256-CBC encrypted secrets management
- Environment variable profiles

#### 🤖 AI Agent Integration
- MCP (Model Context Protocol) server
- JSON output on every command
- Agent environment detection

#### 🔧 Developer Tools
- Git operations inside sandboxes (clone, status, commit, push, diff, log)
- File synchronization (upload, download, live sync)
- HTTP/TCP proxy and tunneling
- Cron job scheduling inside sandboxes
- File and sandbox comparison (diff)
- Live monitoring dashboard
- Resource quota management
- Service discovery and DNS
- Audit logging
- Watch mode with auto-sync

#### 📦 Distribution
- npm package
- Docker image
- Shell completions (Bash, Zsh)
- GitHub Actions CI/CD
- Project templates (Node, Python, Go, Next.js, Static, PostgreSQL, Redis)
