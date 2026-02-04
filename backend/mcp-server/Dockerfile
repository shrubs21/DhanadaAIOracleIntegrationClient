FROM node:20-alpine

WORKDIR /app

# Copy package files first (cache friendly)
COPY package*.json ./

# Install only production deps
RUN npm install --production

# Copy source code
COPY src ./src

EXPOSE 5001

# 🚨 IMPORTANT: DO NOT USE npm start
CMD ["node", "src/server.js"]
