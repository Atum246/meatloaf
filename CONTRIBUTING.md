# 🤝 Contributing to Meatloaf

Thanks for your interest in contributing! 🥩

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/meatloaf-ai/meatloaf.git
cd meatloaf

# Install
npm install

# Run locally
node bin/meatloaf.js --help

# Run tests
npm test
```

## 📁 Project Structure

```
meatloaf/
├── bin/meatloaf.js          # CLI entry point
├── src/
│   ├── index.js             # CLI command definitions
│   ├── commands/            # Feature modules
│   │   ├── sandbox.js       # Sandbox lifecycle
│   │   ├── exec.js          # Command execution
│   │   ├── http.js          # HTTP testing
│   │   ├── ...              # 30+ modules
│   ├── lib/                 # Core libraries
│   │   ├── docker.js        # Docker engine
│   │   ├── http.js          # HTTP client
│   │   └── screenshot.js    # Screenshot engine
│   ├── mcp/server.js        # MCP server for AI agents
│   └── utils/               # Shared utilities
├── tests/                   # Test suite
├── completions/             # Shell completions
├── Dockerfile               # Docker image
└── docker-compose.yml       # Docker Compose
```

## 🎯 How to Contribute

### 🐛 Bug Reports
1. Check existing issues
2. Create a new issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Meatloaf version (`meatloaf --version`)
   - Docker version (`docker --version`)
   - OS details

### ✨ Feature Requests
1. Open an issue with the `enhancement` label
2. Describe the use case
3. Explain why it would be useful

### 🔧 Code Contributions
1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests if applicable
5. Run tests: `npm test`
6. Commit: `git commit -m "feat: add my feature"`
7. Push: `git push origin feature/my-feature`
8. Open a Pull Request

### 📝 Commit Convention
We use [Conventional Commits](https://conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `test:` — Tests
- `refactor:` — Code refactoring
- `chore:` — Maintenance

## 🧪 Testing

```bash
# Run all tests
npm test

# Test specific feature
node bin/meatloaf.js create --image alpine:latest
node bin/meatloaf.js exec sandbox-id "echo hello"
node bin/meatloaf.js destroy sandbox-id
```

## 📋 Code Style

- Use `const` by default, `let` when needed
- Arrow functions for callbacks
- Template literals for string interpolation
- Emoji in user-facing output (that's our thing 🥩)
- JSON output for every command (AI agents need it)

## 🏗️ Adding a New Command

1. Create `src/commands/mycommand.js`
2. Export a class with async methods
3. Register in `src/index.js`
4. Add shell completion in `completions/`
5. Update README.md
6. Add tests

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.
