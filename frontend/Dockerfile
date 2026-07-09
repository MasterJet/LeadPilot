FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Install dependencies with legacy-peer-deps to handle React 19 conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Expose port 3000
EXPOSE 3000

# Run in development mode
CMD ["npm", "run", "dev"]
