# 1. Build Stage
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies with the project's npm settings
COPY package*.json .npmrc ./
RUN npm ci

# Build the Angular app
COPY . .
RUN npm run build --configuration=production

# 2. Serve Stage (Nginx)
FROM nginx:alpine
# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the compiled Angular files (output folder from angular.json: dist/smartcrm)
COPY --from=build /app/dist/smartcrm /usr/share/nginx/html

# Copy our custom Nginx routing config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
