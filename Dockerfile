### STAGE 1: Build ###
FROM node:12.7-alpine AS build
WORKDIR /usr/src/app
#COPY package.json package-lock.json ./
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build:prod
RUN chmod 666 /usr/src/app/dist/Meta-Forms-App-Experience/index.html

### STAGE 2: Run ###
FROM nginxinc/nginx-unprivileged:1.21.6-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist/Meta-Forms-App-Experience /usr/share/nginx/html
