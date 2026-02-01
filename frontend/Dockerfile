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
# nginx:alpine automatically processes templates in /etc/nginx/templates/ at startup
# Railway sets $PORT environment variable (e.g., 8080)
RUN echo 'server { \
    listen ${PORT}; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Railway automatically sets PORT env var (e.g., 8080)
# No need to set default, Railway will provide it
# EXPOSE is just metadata, Railway uses $PORT from env
EXPOSE 8080
