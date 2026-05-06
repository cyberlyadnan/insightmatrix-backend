# InsightMatrix - Survey Platform Backend

Production-grade backend for **InsightMatrix - Survey Management & Distribution Platform** using Node.js, Express, MongoDB, JWT auth, RBAC, Swagger docs, and enterprise modular architecture.

## 1) Folder Structure

```txt
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   ├── repositories/
│   ├── utils/
│   ├── validations/
│   ├── helpers/
│   ├── constants/
│   ├── jobs/
│   ├── events/
│   ├── sockets/
│   ├── docs/
│   ├── uploads/
│   ├── database/
│   ├── modules/
│   ├── templates/
│   ├── logs/
│   └── app.ts
├── nextjs-integration/
├── server.ts
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 2) Package Installation Commands

```bash
npm install express mongoose dotenv cors cookie-parser compression helmet express-rate-limit xss-clean hpp bcryptjs jsonwebtoken joi morgan winston nodemailer multer cloudinary uuid dayjs swagger-ui-express swagger-jsdoc
npm install -D nodemon prettier eslint @eslint/js globals
```

## 3) Environment Setup

1. Copy `.env.example` to `.env`
2. Fill values for MongoDB, JWT, SMTP, Cloudinary
3. Start server:

```bash
npm install
npm run dev
```

Backend base: `http://localhost:5000`  
API base: `http://localhost:5000/api/v1`  
Docs: `http://localhost:5000/docs`

## 4) API Modules Included

- Auth: register, login, logout, refresh token, forgot password, reset password
- User: CRUD, profile, role-managed routes
- Survey: create, update, delete, publish, analytics
- Response: submit, fetch by survey, export-ready output

## 5) Security & Production Features

- Helmet, CORS, HPP, XSS clean, compression
- Global API rate limiter
- JWT access + refresh token flow with secure HttpOnly cookie
- RBAC middleware (`admin`, `user`, `survey_manager`)
- Joi request validation middleware
- Centralized error handling
- Winston logging + Morgan request logs
- Cloudinary file upload service abstraction
- Swagger/OpenAPI docs
- Health route: `GET /api/v1/health`

## 6) Next.js Integration

`nextjs-integration/src/lib/api` contains:

- `client.ts`: Axios instance with auth interceptors and refresh token handling
- `services.ts`: Example typed service calls for auth/survey/response APIs

Environment example in Next.js app:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
```

## 7) Deployment Recommendations

- Run app behind Nginx or managed ingress
- Use managed MongoDB (Atlas) with IP and network policies
- Keep JWT secrets in secret manager (AWS Secrets Manager / GCP Secret Manager / Vault)
- Enable HTTPS and set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` for cross-site secure cookies
- Use PM2 or container orchestration (Docker + ECS/K8s)
- Add monitoring: health checks, uptime checks, error alerting
- Configure log shipping (CloudWatch / ELK / Datadog)
- Add CI checks: lint, tests, security scan (Snyk/Dependabot)

## 8) Useful Scripts

- `npm run dev` - development with auto-restart
- `npm start` - production start
- `npm run lint` - lint code
- `npm run lint:fix` - auto-fix lint errors
- `npm run format` - format codebase

---

This scaffold is production-oriented and ready for extension with caching, queue jobs, audit trails, analytics pipelines, and multi-tenant controls.
