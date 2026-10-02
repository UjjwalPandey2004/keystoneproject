# Deploying KEYSTONE to the cloud

```
Browser ──► Frontend (static files: Nginx container / CDN / static hosting)
              │  /api
              ▼
        Spring Boot API container  ──►  Managed PostgreSQL
              │                         (automated backups + point-in-time recovery)
              ├──► Upload storage (STORAGE_DIR on a persistent volume or mounted bucket)
              ├──► SMTP provider (OTP + password-reset emails)
              └──► Logs (JSON, cloud profile) + /actuator health & metrics
```

The same Docker images run on any container platform (AWS ECS/App Runner, Google Cloud Run, Azure Container Apps, Render, Railway, Kubernetes).

## 1. Configuration and secrets

All configuration comes from environment variables. Store the secret ones in the platform's secret manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault); never commit them. `.env` is git-ignored; `.env.example` lists every variable.

| Variable | Secret? | Purpose |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | password yes | Managed PostgreSQL connection |
| `JWT_SECRET` | yes | Signs login tokens. Required (32+ random characters); the app will not start without it |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENABLED=true` | password yes | SMTP for verification codes and password resets |
| `UPI_VPA`, `UPI_PAYEE_NAME` | no | Enables UPI and UPI QR payments (e.g. `keystone@okhdfcbank`) |
| `STORAGE_DIR` | no | Upload folder; mount a persistent volume or bucket here |
| `APP_BASE_URL`, `CORS_ALLOWED_ORIGINS` | no | Public frontend URL (used in emails and CORS) |
| `SPRING_PROFILES_ACTIVE=cloud` | no | JSON logs, graceful shutdown, proxy headers, health probes |
| `DEMO_MODE` | no | Must be `false` in any shared or production environment |

## 2. Database

Use a managed PostgreSQL 16+ (RDS, Cloud SQL, Azure Database for PostgreSQL). Flyway creates and upgrades the schema on start-up (`src/main/resources/db/migration`). Turn on the provider's automated daily backups and point-in-time recovery, and keep a second, portable copy with `scripts/backup-db.sh` (pg_dump, 14-day retention, ready to copy to object storage).

## 3. File storage

Work-order photos and documents go through `StorageService`. The included `LocalFileStorageService` writes to `STORAGE_DIR`. In the cloud, point it at durable storage:
- a persistent volume (EFS, Filestore, Azure Files), or
- a bucket mounted as a folder (Cloud Storage FUSE, Mountpoint for S3).

docker-compose already mounts the `uploads_data` volume. To store directly in S3/GCS/Azure Blob, add another `StorageService` implementation with the provider's SDK; nothing else needs to change. Uploads are limited to 10 MB of JPEG, PNG, WebP or PDF (checked by file content), and only people who can see the work order can download its files.

## 4. Monitoring

- `GET /actuator/health` (public): use it for load-balancer and uptime checks. `/actuator/health/liveness` and `/readiness` are available for container platforms.
- `GET /actuator/info` and `/actuator/metrics` (manager token only): JVM, HTTP request and database-pool metrics.
- With the `cloud` profile, logs are one JSON object per line, ready for CloudWatch, Cloud Logging or Azure Monitor. Alert on error rate and on health checks failing.

## 5. Notifications

In-app notifications are stored in PostgreSQL and shown through the bell icon (polled every 30 seconds). Email delivery uses SMTP; any provider with SMTP works (Amazon SES, SendGrid, Mailgun, Gmail with an app password).

## 6. Release checklist

1. Set every secret in the secret manager and set `DEMO_MODE=false`.
2. Set `BOOTSTRAP_ADMIN_PASSWORD` for the first start (the seeded manager account), then sign in and change it.
3. Set `MAIL_ENABLED=true` with working SMTP credentials; otherwise new customers cannot receive their verification code.
4. Set `UPI_VPA` if UPI payments should be offered.
5. Serve the frontend and API over HTTPS only.
