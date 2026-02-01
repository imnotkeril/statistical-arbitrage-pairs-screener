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

# Create startup script that sets PORT
RUN echo '#!/bin/sh\n\
PORT=${PORT:-80}\n\
echo "server {\n\
    listen $PORT;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}" > /etc/nginx/conf.d/default.conf\n\
exec nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
