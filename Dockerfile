FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Set environment variable for Node
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD npm test

# Expose necessary ports
# Not required for STDIO transport, but good practice
EXPOSE 3000

# Start server
CMD ["node", "src/index.js"] 