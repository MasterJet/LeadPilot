# LeadPilot Production Deployment Guide

This guide details how to configure and deploy the LeadPilot application to your production server.

---

## 1. Docker Compose File Name on Server

You **do not** need to rename `docker-compose.prod.yml` to `docker-compose.yml`. In fact, keeping them separate is recommended so you can manage development and production configs cleanly:

*   **To deploy using the production file, run:**
    ```bash
    docker compose -f docker-compose.prod.yml up -d --build
    ```
*   **Alternative (Default Override Pattern):** 
    If you prefer to run just `docker compose up -d`, you can rename `docker-compose.prod.yml` to `docker-compose.yml` on the server. Since your local development overrides (like mapping code volumes) are ignored by git via `docker-compose.override.yml`, your server will run the clean, production-ready configuration out of the box.

---

## 2. Mandatory Setup Before Deploying

Before running the containers on the server, you need to configure the environment variables that Next.js and the backend need.

### Create a Root `.env` File
Create a `.env` file at the root of the project on the production server (`/home/coder/DevWork/projects/LeadPilot/.env`):

```env
# 1. Production Database Password
DB_PASSWORD=your_secure_production_password_here

# 2. Next.js API Endpoint (Accessible from the user's web browser)
NEXT_PUBLIC_API_URL=https://backend.leadpilot.asdev.tech/api/v1
```

> [!IMPORTANT]
> Since `NEXT_PUBLIC_API_URL` is used client-side (in the browser), it **must** be a URL that the client's browser can resolve. For your deployment, this is `https://backend.leadpilot.asdev.tech/api/v1`.

---

## 3. Other Required Production Changes

### A. Setup a Reverse Proxy (Nginx / Caddy)
Exposing raw container ports directly to the public internet is a security hazard and doesn't support SSL (HTTPS). You should run a reverse proxy on the host server to handle SSL and route traffic.

*   **Frontend Server**: Routed to host port `1701`
*   **Backend API**: Routed to host port `1702`

#### Example Caddy Configuration (`Caddyfile`):
```caddy
# Frontend Server
leadpilot.asdev.tech {
    reverse_proxy localhost:1701
}

# Backend API
backend.leadpilot.asdev.tech {
    reverse_proxy localhost:1702
}
```

By default, backend, database, and Redis ports in `docker-compose.prod.yml` are configured to only bind to `127.0.0.1` instead of `0.0.0.0`, so they cannot be accessed directly from the outside:
```yaml
# In docker-compose.prod.yml
backend:
  ports:
    - "127.0.0.1:1702:8000"
```

### B. Secure Database and Ports
1. Change the root DB password from `root` in the production `.env`.
2. MySQL (port `1703`) and Redis (port `1704`) are bound to `127.0.0.1` to prevent any external connections. Do not expose these ports publicly.

### C. Persistent Storage Directory
Ensure the database volume (`db_data_prod`) has appropriate write permissions on the host file system. Docker handles this automatically in standard setups.

---

## 4. Deployment Command Cheat Sheet

```bash
# 1. Pull latest code
git pull origin main

# 2. Build and start containers in detached mode
docker compose -f docker-compose.prod.yml up -d --build

# 3. View logs to ensure everything started properly
docker compose -f docker-compose.prod.yml logs -f

# 4. To stop the application
docker compose -f docker-compose.prod.yml down
```
