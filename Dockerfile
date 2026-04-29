# 🥩 Meatloaf Docker Image
# AI Agent Sandbox Runtime — all-in-one

FROM docker:29-dind

LABEL maintainer="Meatloaf Team"
LABEL description="🥩 Meatloaf — AI Agent Sandbox Runtime"
LABEL version="1.0.0"

# Install Node.js
RUN apk add --no-cache nodejs npm git curl bash

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Make binary executable
RUN chmod +x bin/meatloaf.js

# Create symlink for global access
RUN ln -s /app/bin/meatloaf.js /usr/local/bin/meatloaf
RUN ln -s /app/bin/meatloaf.js /usr/local/bin/ml

# Create config directory
RUN mkdir -p /root/.meatloaf

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD meatloaf --version || exit 1

# Default: show help
CMD ["meatloaf", "--help"]
