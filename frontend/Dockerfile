FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build with environment variable
# Railway automatically makes env vars available during build
ENV VITE_API_URL=${VITE_API_URL:-}
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Create nginx config template
RUN echo 'server { \
    listen ${PORT}; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Copy and make start script executable
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh

# Railway automatically sets PORT env var (e.g., 8080)
# Use custom start script to ensure PORT is processed correctly
CMD ["/start-nginx.sh"]
