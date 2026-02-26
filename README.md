# ZetechVerse - University Community Platform



A comprehensive platform connecting Zetech University students with opportunities, marketplace, events, and community features.



## 🚀 Features



- **🔐 Authentication & User Management** - Secure login/registration with role-based access

- **💼 Opportunities Board** - Jobs, internships, scholarships, and attachments

- **🏪 Campus Marketplace** - Buy/sell platform for students

- **📅 Events Management** - Campus events with RSVP functionality

- **💬 Confessions** - Anonymous community discussions

- **📝 Blog System** - Articles and campus news

- **👥 Admin Dashboard** - Comprehensive admin panel for content management



## 🏗️ Architecture



- **Backend**: Node.js + Express + SQLite

- **Frontend**: React + TypeScript + Vite

- **Database**: SQLite with proper relationships and constraints

- **Authentication**: JWT with secure password hashing



## 📋 Prerequisites



- **Node.js** (v16 or higher)

- **npm** or **yarn**

- **Git**



## 🛠️ Quick Setup



### Option 1: Automated Setup (Recommended)



```bash

# Backend setup

./setup-backend.sh



# Frontend setup

./setup-frontend.sh

```



### Option 2: Manual Setup



#### Backend Setup

```bash

cd backend

npm install

npm run init-db

npm start

```



#### Frontend Setup

```bash

cd "ZetechVerse - User Dashboard - Frontend"

npm install

npm run dev

```



## 🔧 Environment Configuration



### Backend (.env)

```env

NODE_ENV=development

PORT=3000

FRONTEND_URL=http://localhost:5173

DATABASE_PATH=./database/zetechverse.db

JWT_SECRET=your-super-secret-jwt-key

JWT_EXPIRES_IN=7d

PASSWORD_RESET_SECRET=your-password-reset-secret

SMTP_HOST=smtp.gmail.com

SMTP_PORT=587

SMTP_SECURE=false

SMTP_USER=your_smtp_username

SMTP_PASS=your_smtp_password

SMTP_FROM=ZetechVerse <no-reply@your-domain.com>

SMTP_REPLY_TO=support@your-domain.com

```



### Frontend (.env)

```env

VITE_API_URL=http://localhost:3000/api

VITE_APP_NAME=ZetechVerse

VITE_APP_VERSION=1.0.0

```



## 🚀 Running the Application



### Development Mode



1. **Terminal 1 - Backend:**

   ```bash

   cd backend

   npm start

   ```

   Backend API will be available at: `http://localhost:3000`



2. **Terminal 2 - Frontend:**

   ```bash

   cd "ZetechVerse - User Dashboard - Frontend"

   npm run dev

   ```

   Frontend will be available at: `http://localhost:5173`



### Production Mode



```bash

# Backend

cd backend

npm start



# Frontend (build for production)

cd "ZetechVerse - User Dashboard - Frontend"

npm run build

npm run preview

```



## Admin Account Setup

No default admin users are created. Use the backend script to create admin and/or super admin accounts:

```
npm run create-admin-users
```

Provide credentials via environment variables as documented in `backend/README.md`.

Admins can request access through the admin portal. Requests are pending until a super admin approves them.
If you have an existing database, run `npm run migrate-admin-approval` in `backend/`.

## 📊 API Endpoints



### Authentication

- `POST /api/auth/register` - User registration

- `POST /api/auth/login` - User login

- `POST /api/auth/forgot-password` - Request password reset email

- `POST /api/auth/reset-password` - Reset password with token

- `GET /api/auth/profile` - Get user profile (protected)

- `PUT /api/auth/profile` - Update profile (protected)



### Opportunities

- `GET /api/opportunities` - List opportunities with filtering

- `GET /api/opportunities/:id` - Get single opportunity

- `POST /api/opportunities` - Create opportunity (protected)

- `PUT /api/opportunities/:id` - Update opportunity (protected)

- `DELETE /api/opportunities/:id` - Delete opportunity (protected)

- `GET /api/opportunities/featured` - Get featured opportunities



## 🗄️ Database Schema



The SQLite database includes tables for:

- Users, Categories, Opportunities

- Marketplace listings, Events, Confessions

- Blog posts, Notifications, Messages

- Activity logs and application tracking



See `backend/database/schema.sql` for complete schema details.



## 🔒 Security Features



- **JWT Authentication** with secure token handling

- **Password Hashing** using bcrypt with salt rounds

- **Rate Limiting** to prevent abuse

- **Input Validation** with express-validator

- **SQL Injection Prevention** with parameterized queries

- **CORS Protection** with configurable origins



## 🧪 Testing the API



### Health Check

```bash

curl http://localhost:3000/health

```



### Register a User

```bash

curl -X POST http://localhost:3000/api/auth/register \

  -H "Content-Type: application/json" \

  -d '{

    "email": "test@zetech.ac.ke",

    "username": "testuser",

    "password": "Password123",

    "full_name": "Test User",

    "student_id": "12345",

    "course": "Computer Science",

    "year_of_study": 3

  }'

```



### Get Opportunities

```bash

curl http://localhost:3000/api/opportunities

```



## 📱 Frontend Features



### User Dashboard

- **Opportunities Board** - Browse and apply for opportunities

- **Marketplace** - Buy/sell with other students

- **Events** - Discover and RSVP to campus events

- **Confessions** - Anonymous community discussions

- **Explore** - Read articles and campus news



### Admin Dashboard (Coming Soon)

- Content management and moderation

- User management

- Analytics and reporting

- System configuration



## 🛠️ Development



### Project Structure

```

/

├── backend/                    # Node.js API server

│   ├── src/

│   │   ├── config/            # Database configuration

│   │   ├── controllers/       # Route controllers

│   │   ├── middleware/        # Authentication & validation

│   │   ├── models/           # Database models

│   │   ├── routes/           # API routes

│   │   └── app.js            # Express app setup

│   ├── database/

│   │   └── schema.sql        # Database schema

│   └── package.json

├── ZetechVerse - User Dashboard - Frontend/    # React frontend

│   ├── src/

│   │   ├── api/              # API client functions

│   │   ├── components/       # Reusable components

│   │   ├── pages/            # Page components

│   │   └── services/         # Business logic services

│   └── package.json

└── README.md

```



### Adding New Features



1. **Backend**: Add new routes, controllers, and models

2. **Frontend**: Create API functions and update components

3. **Database**: Update schema.sql for new tables/columns



## 🤝 Contributing



1. Fork the repository

2. Create a feature branch

3. Make your changes

4. Test thoroughly

5. Submit a pull request



## 📄 License



This project is licensed under the MIT License.



## 📞 Support



For questions or issues:

1. Check the troubleshooting section below

2. Create an issue on GitHub

3. Contact the development team



## 🔧 Troubleshooting



### Common Issues



**Backend won't start:**

- Ensure Node.js v16+ is installed

- Check if port 3000 is available

- Verify database file exists



**Frontend build fails:**

- Clear node_modules and reinstall

- Check Node.js version compatibility

- Verify environment variables



**API connection issues:**

- Ensure backend is running on port 3000

- Check VITE_API_URL in frontend .env

- Verify CORS configuration



**Database errors:**

- Run `npm run init-db` in backend directory

- Check file permissions for database directory

- Verify SQLite installation



### Development Tips



- Use the health endpoint to verify backend status

- Check browser console for frontend errors

- Use Postman/Insomnia for API testing

- Enable development tools in browser



---



**Happy coding! 🎓🚀**
