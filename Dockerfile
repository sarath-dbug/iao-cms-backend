# syntax=docker/dockerfile:1

ARG NODE_VERSION=18

FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

################################################################################
# Install ALL dependencies (needed for build)
FROM base AS deps

COPY package*.json ./
RUN npm install

################################################################################
# Build stage
FROM base AS build

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

RUN npm run build

################################################################################
# Final stage (production)
FROM base AS final

ENV NODE_ENV=production

# Optional but good practice
USER node

# Copy only needed files
COPY package*.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app ./

EXPOSE 1337

CMD ["npm", "run", "start"]
