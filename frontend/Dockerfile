# ---- Build: Vite static bundle ----
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime: nginx static serve + /api proxy ----
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
