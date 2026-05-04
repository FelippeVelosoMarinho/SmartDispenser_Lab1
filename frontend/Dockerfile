# Build stage
FROM oven/bun:1.1 AS build

WORKDIR /app

# Copy root package.json and lockfile (workspaces)
COPY package.json bun.lock ./
# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install dependencies (from root to handle workspaces)
RUN bun install

# Copy frontend source code
COPY frontend ./frontend

# Build the application
WORKDIR /app/frontend
RUN bun run build

# Production stage (Nginx)
FROM nginx:stable-alpine

# Copy built assets from build stage
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Add custom nginx config to handle SPA routing
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
