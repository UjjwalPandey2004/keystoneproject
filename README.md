# Keystone Field Service Management

Keystone is a role-based field service management application for managers,
dispatchers, technicians, and customers. The backend is Spring Boot 3.5 on
Java 21, the frontend is React + TypeScript, and PostgreSQL is managed with
Flyway migrations.

## Quick start with Docker

Docker is the only required runtime for the complete stack; Java, Maven,
Node.js, and PostgreSQL do not need to be installed globally.

1. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Replace the placeholder values in `.env`. `JWT_SECRET` must contain at
   least 32 characters.

3. Build and start the stack:

   ```powershell
   docker compose up -d --build
   ```

4. Open the application at <http://localhost:5173>. API documentation is at
   <http://localhost:8080/swagger-ui/index.html>.

5. Stop the services when finished to release laptop memory:

   ```powershell
   docker compose down
   ```

Use `docker compose down -v` only when you also want to delete the local
Keystone database volume.

## Development accounts

The migrations create demonstration accounts for each role. Their initial
password is `password` and must be changed before any real deployment.

| Role | Email |
| --- | --- |
| Manager | `admin@meridian.com` |
| Dispatcher | `dispatcher@meridian.com` |
| Technician | `tech@meridian.com` |
| Customer | `customer@meridian.com` |

## Local ports

| Service | Port |
| --- | --- |
| React application | 5173 |
| Spring Boot API | 8080 |
| PostgreSQL | 5433 |

PostgreSQL intentionally uses host port 5433 to avoid common conflicts with a
locally installed database on port 5432.

## Tests and builds

Backend tests run as part of the backend Docker image build. To run them with
a local Java 21 installation:

```powershell
.\mvnw.cmd test
```

For a local frontend build:

```powershell
Set-Location frontend
npm ci
npm run build
```
