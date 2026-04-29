# Discord Community Messages 💬

Ready to post in relevant Discord servers. Adapt the tone to each community.

---

## OpenClaw Community

Hey everyone 👋

Just shipped **Meatloaf** — an open-source CLI that gives AI agents a body to interact with the digital world.

Instead of agents just *writing* code, they can now:
- Spin up Docker sandboxes
- Run commands & test endpoints
- Take screenshots & stream logs
- Iterate on build→test→fix loops

It works natively with OpenClaw and has 40+ commands.

```bash
npm install -g meatloaf-cli
```

GitHub: https://github.com/Atum246/meatloaf

Would love feedback from the OpenClaw community on what integrations would be most useful! 🥩

---

## Claude/AI Coding Community

Yo, built something cool for the "AI agents can't run code" problem.

**Meatloaf** — a CLI that gives Claude (and other AI agents) the ability to manage Docker sandboxes:

```bash
npm install -g meatloaf-cli
meatloaf create --image node:20-alpine
meatloaf exec sandbox-id "npm start"
meatloaf test --url http://localhost:3000
```

The idea: AI writes the code, Meatloaf makes sure it works.

40+ commands, MIT licensed, works with any terminal-based agent.

GitHub: https://github.com/Atum246/meatloaf

---

## Cursor/IDE Community

I was tired of the cycle: AI writes code → I manually run it → paste error back → AI fixes → repeat.

Built **Meatloaf** to break that loop. It's a CLI that lets AI agents manage Docker sandboxes — run code, test endpoints, capture screenshots, stream logs.

```bash
npm install -g meatloaf-cli
```

Works great with Cursor's terminal integration. The `--json` output mode makes it easy for agents to parse results.

GitHub: https://github.com/Atum246/meatloaf

---

## DevOps/Infrastructure Community

Built a CLI tool for AI agent sandbox automation — **Meatloaf**.

40+ commands covering:
- Docker sandbox lifecycle (create/destroy/start/stop)
- HTTP testing (endpoints, batch, load testing)
- Secrets management (encrypted injection)
- Networking (port forwarding, tunneling)
- Compose orchestration
- Snapshot save/restore
- Cron scheduling inside containers

Designed for AI agents but useful for any Docker automation workflow.

```bash
npm install -g meatloaf-cli
```

MIT licensed. GitHub: https://github.com/Atum246/meatloaf

---

## General Developer Community

Hey all, just open-sourced something I've been working on.

**Meatloaf** 🥩 — gives AI coding agents the ability to actually run and test code, not just generate it.

The gap: AI agents write code but can't verify it works.
The solution: Docker sandboxes with full lifecycle control.

```bash
npm install -g meatloaf-cli
```

40+ commands. Works with Claude, Cursor, Copilot, any AI agent.

GitHub: https://github.com/Atum246/meatloaf
Website: https://atum246.github.io/meatloaf/

Stars appreciated ⭐
