const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yaml = require('yaml');
const { log, ORANGE } = require('../utils/logger');
const { loadConfig, saveConfig } = require('../utils/config');

const TEMPLATES = {
  'node-express': {
    name: 'Node.js + Express',
    image: 'node:20-alpine',
    ports: ['3000:3000'],
    setup: [
      'npm init -y',
      'npm install express cors helmet morgan'
    ],
    files: {
      'server.js': `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Meatloaf! 🥩', status: 'running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on port \${PORT} 🚀\`);
});
`
    }
  },
  'python-flask': {
    name: 'Python + Flask',
    image: 'python:3.12-slim',
    ports: ['5000:5000'],
    setup: [
      'pip install flask flask-cors'
    ],
    files: {
      'app.py': `from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({'message': 'Hello from Meatloaf! 🥩', 'status': 'running'})

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
`
    }
  },
  'static-site': {
    name: 'Static HTML/CSS/JS',
    image: 'nginx:alpine',
    ports: ['8080:80'],
    setup: [],
    files: {
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meatloaf App 🥩</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; background: #1a1a2e; color: #eee; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .container { text-align: center; }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; color: #FF6B35; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥩 Meatloaf</h1>
        <p>Your app is running!</p>
    </div>
</body>
</html>
`
    }
  },
  'nextjs': {
    name: 'Next.js',
    image: 'node:20-alpine',
    ports: ['3000:3000'],
    setup: [
      'npx create-next-app@latest app --yes --typescript --tailwind --app --no-eslint --no-src-dir --no-import-alias',
      'cd app && npm install'
    ],
    files: {}
  },
  'go-gin': {
    name: 'Go + Gin',
    image: 'golang:1.22-alpine',
    ports: ['8080:8080'],
    setup: [
      'go mod init meatloaf-app',
      'go get -u github.com/gin-gonic/gin'
    ],
    files: {
      'main.go': `package main

import (
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "Hello from Meatloaf! 🥩",
			"status":  "running",
		})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	r.Run(":8080")
}
`
    }
  },
  'postgres': {
    name: 'PostgreSQL',
    image: 'postgres:16-alpine',
    ports: ['5432:5432'],
    env: ['POSTGRES_USER=meatloaf', 'POSTGRES_PASSWORD=meatloaf123', 'POSTGRES_DB=meatloaf'],
    setup: [],
    files: {}
  },
  'redis': {
    name: 'Redis',
    image: 'redis:alpine',
    ports: ['6379:6379'],
    setup: [],
    files: {}
  }
};

class InitCommands {
  async init(opts) {
    const templateName = opts.template || 'node-express';
    const template = TEMPLATES[templateName];
    
    if (!template) {
      log.error(`Unknown template: ${templateName}`);
      log.info(`Available templates: ${Object.keys(TEMPLATES).join(', ')}`);
      return;
    }

    const projectDir = opts.output || `./meatloaf-${templateName}`;
    
    log.nl();
    log.banner(`  🥩 Initializing: ${template.name}\n`);
    
    // Create project directory
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Create files
    for (const [filename, content] of Object.entries(template.files)) {
      const filePath = path.join(projectDir, filename);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content);
      log.step(`Created: ${filename}`);
    }

    // Create meatloaf.yml config
    const config = {
      name: templateName,
      image: template.image,
      ports: template.ports,
      setup: template.setup,
      env: template.env || []
    };
    
    fs.writeFileSync(
      path.join(projectDir, 'meatloaf.yml'),
      yaml.stringify(config)
    );
    log.step('Created: meatloaf.yml');

    // Create .meatloaf.json for AI agents
    const agentConfig = {
      name: templateName,
      template: templateName,
      description: `${template.name} project initialized with Meatloaf`,
      commands: {
        setup: template.setup.join(' && '),
        start: templateName.includes('python') ? 'python app.py' : 
               templateName.includes('go') ? 'go run main.go' :
               templateName.includes('static') ? 'nginx -g "daemon off;"' :
               'node server.js',
        test: `curl http://localhost:${template.ports[0]?.split(':')[0] || 3000}/`
      }
    };
    
    fs.writeFileSync(
      path.join(projectDir, '.meatloaf.json'),
      JSON.stringify(agentConfig, null, 2)
    );
    log.step('Created: .meatloaf.json');

    log.nl();
    log.success(chalk.green(`Project initialized in ${chalk.bold(projectDir)}`));
    log.nl();
    log.info('Next steps:');
    log.plain(chalk.hex(ORANGE)(`  cd ${projectDir}`));
    log.plain(chalk.hex(ORANGE)('  meatloaf create --image ' + template.image));
    log.plain(chalk.hex(ORANGE)('  meatloaf exec <sandbox-id> "npm install && npm start"'));
    log.plain(chalk.hex(ORANGE)('  meatloaf test --url http://localhost:3000'));
    log.nl();
  }

  async listTemplates() {
    log.nl();
    log.banner('  🥩 Available Templates\n');
    
    const rows = Object.entries(TEMPLATES).map(([key, t]) => [
      chalk.hex(ORANGE).bold(key),
      t.name,
      t.image,
      t.ports?.join(', ') || '-'
    ]);

    log.table(rows, ['Template', 'Name', 'Image', 'Ports']);
    log.nl();
  }
}

module.exports = { InitCommands, TEMPLATES };
