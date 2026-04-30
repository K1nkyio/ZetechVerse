# ZetechVerse Backend API



A comprehensive REST API for the ZetechVerse university community platform, built with Node.js, Express, and PostgreSQL.



## Features



- 🔐 **Authentication & Authorization** - JWT-based auth with role-based access control

- 💼 **Opportunities Management** - Jobs, internships, scholarships, and attachments

- 🏪 **Marketplace** - Buy/sell platform for students

- 💬 **Confessions** - Anonymous posting and community discussions

- 📅 **Events** - Campus events with RSVP functionality

- 📝 **Blog System** - Articles and content management

- 🛡️ **Security** - Rate limiting, input validation, CORS protection

- 📊 **Analytics** - User activity tracking and reporting



## Tech Stack



- **Runtime**: Node.js

- **Framework**: Express.js

- **Database**: PostgreSQL locally and Supabase Postgres in production

- **Authentication**: JWT (jsonwebtoken)

- **Security**: bcryptjs, helmet, CORS

- **Validation**: express-validator



## Quick Start



### Prerequisites



- Node.js (v16 or higher)
- PostgreSQL for local development

- npm or yarn



### Installation



1. **Clone and navigate to backend directory**

   ```bash

   cd backend

   ```



2. **Install dependencies**

   ```bash

   npm install

   ```



3. **Initialize database**

   ```bash

   npm run init-db

   ```



4. **Start development server**

   ```bash

   npm run dev

   ```



The API will be available at `http://localhost:3000`



## API Endpoints



### Authentication

```

POST /api/auth/register          - User registration

POST /api/auth/login             - User login

POST /api/auth/forgot-password   - Request password reset email

POST /api/auth/reset-password    - Reset password using token

GET  /api/auth/profile           - Get user profile (protected)

PUT  /api/auth/profile           - Update user profile (protected)

PUT  /api/auth/change-password   - Change password (protected)

GET  /api/auth/verify            - Verify token validity (protected)

```



### Opportunities

```

GET  /api/opportunities              - Get all opportunities (with filtering)

GET  /api/opportunities/featured     - Get featured opportunities

GET  /api/opportunities/:id          - Get single opportunity

POST /api/opportunities              - Create opportunity (protected)

PUT  /api/opportunities/:id          - Update opportunity (protected)

DELETE /api/opportunities/:id        - Delete opportunity (protected)

GET  /api/opportunities/user/my-opportunities - Get user's opportunities (protected)

GET  /api/opportunities/user/stats   - Get opportunity statistics (protected)

```



## Authentication



The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:



```

Authorization: Bearer <your-jwt-token>

```



## Admin Account Setup



No default admin users are created during database initialization. Create admin and/or super admin accounts using:

```
npm run create-admin-users
```

Required environment variables:

- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (optional)
- `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` (optional)

Optional environment variables:

- `ADMIN_USERNAME`, `ADMIN_FULL_NAME`
- `SUPERADMIN_USERNAME`, `SUPERADMIN_FULL_NAME`

Password requirements: minimum 12 characters with uppercase, lowercase, number, and symbol.

Admin approval workflow:
- Admins can request access via `POST /api/auth/admin/request` and are created with `admin_status=pending`.
- Super admins approve or deactivate via `POST /api/auth/admin/approve` and `POST /api/auth/admin/deactivate`.

If you have an existing database, run the migration:

```
npm run migrate-admin-approval
```






## Environment Variables



Create a `.env` file in the backend directory:



```env

# Server Configuration

NODE_ENV=development

PORT=3000

FRONTEND_URL=http://localhost:5173



# Database Configuration

DB_HOST=localhost
DB_PORT=5432
DB_NAME=zetechverse
DB_USER=postgres
DB_PASSWORD=your-local-postgres-password
DB_SSL=false
DB_POOL_MAX=20



# JWT Configuration

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

JWT_EXPIRES_IN=7d

PASSWORD_RESET_SECRET=your-password-reset-secret

# SMTP (required for password reset emails in production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=ZetechVerse <no-reply@your-domain.com>
SMTP_REPLY_TO=support@your-domain.com



# Security

BCRYPT_ROUNDS=12



# Rate Limiting

RATE_LIMIT_WINDOW_MS=900000

RATE_LIMIT_MAX_REQUESTS=100

API_RATE_LIMIT_MAX_REQUESTS=50

```



For production on Render with Supabase, set these in the Render backend service environment:

```env
NODE_ENV=production
PGHOST=aws-1-eu-central-1.pooler.supabase.com
PGPORT=5432
PGDATABASE=postgres
PGUSER=postgres.hlgawzpmlqvbnfbjsvms
PGPASSWORD=your_actual_supabase_password
DB_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=your_long_production_secret
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
```

Do not set Supabase `PG*` values or `DATABASE_URL` in your local laptop `.env` unless you intentionally want your local backend to connect to Supabase. Local development will use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.

See `SUPABASE_DEPLOYMENT.md` for the full Vercel + Render + Supabase setup checklist.

## API Response Format



All API responses follow this format:



**Success Response:**

```json

{

  "success": true,

  "message": "Operation completed successfully",

  "data": { ... }

}

```



**Error Response:**

```json

{

  "success": false,

  "message": "Error description",

  "errors": [ ... ] // validation errors

}

```



## Database Schema



The PostgreSQL database schema is defined in `database/schema_postgresql.sql` and includes:



- **users** - User accounts and profiles

- **categories** - Content categorization

- **opportunities** - Jobs and opportunities

- **marketplace_listings** - Buy/sell items

- **events** - Campus events

- **confessions** - Anonymous posts

- **blog_posts** - Articles and content

- Supporting tables for relationships, notifications, etc.



## Development



### Available Scripts



- `npm start` - Start production server

- `npm run dev` - Start development server with nodemon

- `npm run init-db` - Initialize/reset database



### Project Structure



```

backend/

├── src/

│   ├── config/

│   │   └── db.js              # Database connection

│   ├── controllers/           # Route controllers

│   ├── middleware/            # Custom middleware

│   ├── models/               # Database models

│   ├── routes/               # API routes

│   └── app.js                # Express app setup

├── database/

│   └── schema_postgresql.sql # PostgreSQL database schema

├── scripts/

│   └── init-db-postgresql.js # Database initialization

├── package.json

├── .env                      # Environment variables

└── README.md

```



## Security Features



- **JWT Authentication** with configurable expiration

- **Password Hashing** using bcrypt with salt rounds

- **Rate Limiting** to prevent abuse

- **Input Validation** using express-validator

- **CORS Protection** with configurable origins

- **Helmet.js** for security headers

- **SQL Injection Prevention** using parameterized queries



## Contributing



1. Follow the existing code structure

2. Use proper error handling

3. Add validation for all user inputs

4. Include JSDoc comments for functions

5. Test your changes thoroughly



## License



This project is licensed under the MIT License.
