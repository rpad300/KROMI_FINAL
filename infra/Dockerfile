# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p certs data logs src/certs

# Generate self-signed certificates for HTTPS
# Generate in both root certs and src/certs for compatibility
RUN if [ ! -f certs/cert.pem ] || [ ! -f certs/key.pem ]; then \
        npm run generate-cert; \
        cp certs/*.pem src/certs/ 2>/dev/null || true; \
    fi

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S visionkrono -u 1001

# Change ownership of the app directory
RUN chown -R visionkrono:nodejs /app

# Switch to non-root user
USER visionkrono

# Expose port
EXPOSE 1144

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('https://localhost:1144/api/config', {rejectUnauthorized: false}, (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
