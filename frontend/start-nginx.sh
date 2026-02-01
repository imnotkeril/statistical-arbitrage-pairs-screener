#!/bin/sh
# Start script for nginx with dynamic PORT from Railway

# Set default PORT if not provided
export PORT=${PORT:-80}

# Process nginx template with envsubst
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
