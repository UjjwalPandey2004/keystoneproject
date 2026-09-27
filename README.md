# Keystone Field Service Management

Keystone is a role-based field service management application for managers, dispatchers, technicians, and customers. The backend is Spring Boot 3.5 on Java 21, the frontend is React + TypeScript, and PostgreSQL is managed with Flyway migrations.

## Features

- **Role-Based Access Control (RBAC)**: Four distinct roles (Manager, Dispatcher, Technician, Customer) with tailored permissions
- **Work Order Management**: Create, assign, track, and complete work orders with SLA monitoring
- **Customer & Site Management**: Manage customer organizations and their service sites
- **Inventory Management**: Track inventory with consumption locking and negative stock prevention
- **Real-time Notifications**: After-commit notification logging system
- **Dashboard & Reporting**: Role-specific dashboards with key metrics and reports
- **User Administration**: Managers can create and manage user accounts
- **API Documentation**: Swagger/OpenAPI 3.0 documentation at `/swagger-ui/index.html`

## Tech Stack

### Backend
- **Framework**: Spring Boot 3.5
- **Language**: Java 21
- **Database**: PostgreSQL with Flyway migrations
- **Security**: JWT authentication with RBAC
- **Build Tool**: Maven
- **Testing**: JUnit 5, Mockito

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query / Context API
- **Routing**: React Router

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (production)
- **Database**: PostgreSQL 16
- **CI/CD**: GitHub Actions

## Quick Start with Docker

Docker is the only required runtime for the complete stack; Java, Maven, Node.js, and PostgreSQL do not need to be installed globally.

1. Create the local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Replace the placeholder values in `.env`. `JWT_SECRET` must contain at least 32 characters.

3. Build and start the stack:

   ```powershell
   docker compose up -d --build
   ```

4. Open the application at <http://localhost:5173>. API documentation is at <http://localhost:8080/swagger-ui/index.html>.

5. Stop the services when finished to release laptop memory:

   ```powershell
   docker compose down
   ```

Use `docker compose down -v` only when you also want to delete the local Keystone database volume.

## Development Accounts

The migrations create demonstration accounts for each role. Their initial password is `password` and must be changed before any real deployment.

| Role | Email |
| --- | --- |
| Manager | `admin@meridian.com` |
| Dispatcher | `dispatcher@meridian.com` |
| Technician | `tech@meridian.com` |
| Customer | `customer@meridian.com` |

## Local Ports

| Service | Port |
| --- | --- |
| React application | 5173 |
| Spring Boot API | 8080 |
| PostgreSQL | 5433 |

PostgreSQL intentionally uses host port 5433 to avoid common conflicts with a locally installed database on port 5432.

## Architecture

```text
Browser -> Nginx/React -> Spring Boot REST API -> PostgreSQL
                              |                     |
                              +-- JWT/RBAC          +-- Flyway migrations
                              +-- SLA scheduler
                              +-- after-commit notification log
```

- Managers use dashboards, reports, inventory and user administration.
- Dispatchers manage customers, sites, work orders and assignments.
- Technicians can access and update only work assigned to them.
- Customers can access requests belonging only to their organization.
- Inventory rows are locked during consumption and database constraints prevent negative stock.
- Anonymous registration always creates a customer account; privileged roles can only be created by a manager.

The API health endpoint is <http://localhost:8080/actuator/health>. GitHub Actions runs the Java 21 backend tests and the production frontend build for pull requests and pushes to `main`.

## Tests and Builds

### Backend Tests
Run as part of the backend Docker image build. To run them with a local Java 21 installation:

```powershell
.\mvnw.cmd test
```

### Frontend Build
For a local frontend build:

```powershell
Set-Location frontend
npm ci
npm run build
```

## Project Structure

```
keystoneproject/
├── src/                    # Backend Spring Boot source
│   ├── main/
│   │   ├── java/com/keystone/deliveryservice/
│   │   │   ├── Controller/    # REST controllers
│   │   │   ├── Service/       # Business logic
│   │   │   ├── Repository/    # Data access
│   │   │   ├── Model/         # Entities & DTOs
│   │   │   ├── Security/      # JWT & RBAC config
│   │   │   └── Config/        # Application configuration
│   │   └── resources/
│   │       ├── db/migration/  # Flyway SQL migrations
│   │       └── application.properties
│   └── test/                 # Backend tests
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── contexts/          # React contexts
│   │   └── types/             # TypeScript types
│   └── package.json
├── .github/workflows/         # GitHub Actions CI/CD
├── Dockerfile                 # Backend Docker image
├── docker-compose.yml         # Full stack orchestration
├── pom.xml                    # Maven configuration
└── README.md                  # This file
```

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `POSTGRES_DB` | Database name | Yes |
| `POSTGRES_USER` | Database user | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `JWT_SECRET` | JWT signing key (min 32 chars) | Yes |
| `MAIL_USERNAME` | SMTP username | No |
| `MAIL_PASSWORD` | SMTP password | No |
| `MAIL_ENABLED` | Enable email notifications | No |
| `APP_BASE_URL` | Frontend base URL | Yes |
| `CORS_ALLOWED_ORIGINS` | Allowed CORS origins | Yes |

## Security Notes

- Never commit real credentials to version control
- Use strong, unique `JWT_SECRET` in production (minimum 32 characters)
- Change default passwords for all demo accounts before deployment
- Enable `MAIL_ENABLED` and configure SMTP for production email notifications
- Use HTTPS in production with proper TLS certificates

## License

This project is proprietary software. All rights reserved.