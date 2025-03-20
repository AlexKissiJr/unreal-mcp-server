FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose necessary ports
# Not required for STDIO transport, but good practice
EXPOSE 3000

# Start server
CMD ["node", "src/index.js"] 