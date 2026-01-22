# Quick Start Guide

Get the CMDA Conference Registration System up and running in minutes.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ installed and running
- [ ] Paystack test account created
- [ ] Git installed

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-name>

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb cmda_conference

# Or using psql
psql -U postgres
CREATE DATABASE cmda_conference;
\q
```

### 3. Configure Environment Variables

#### Frontend (.env)
```bash
# Create .env file in root
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

#### Backend (backend/.env)
```bash
# Create .env file in backend folder
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=cmda_conference

PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key

FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Seed Database with Sample Data

```bash
# From backend directory
npm run seed
```

This creates sample members you can use for testing:
- john.doe@example.com (Senior Doctor)
- jane.smith@example.com (Junior Doctor)
- student@example.com (Student)

### 5. Start Development Servers

#### Terminal 1 - Backend
```bash
cd backend
npm run start:dev
```

Backend runs at: `http://localhost:3000`

#### Terminal 2 - Frontend
```bash
# From project root
npm run dev
```

Frontend runs at: `http://localhost:5173`

### 6. Test the Application

1. Open browser to `http://localhost:5173`
2. Click "Register Now" or scroll to registration form
3. Enter test email: `john.doe@example.com`
4. Click "Lookup" - form should auto-populate
5. Complete the registration steps
6. Use Paystack test card for payment:
   - Card: 4084 0840 8408 4081
   - CVV: 408
   - Expiry: Any future date
   - PIN: 0000
   - OTP: 123456

## Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL is running
pg_isready

# Check connection details in backend/.env
# Ensure DATABASE_PASSWORD matches your PostgreSQL password
```

### Port Already in Use
```bash
# Frontend (5173)
lsof -ti:5173 | xargs kill -9

# Backend (3000)
lsof -ti:3000 | xargs kill -9
```

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Same for backend
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Paystack Integration Issues
- Verify you're using test keys (pk_test_... and sk_test_...)
- Check Paystack dashboard for API key status
- Ensure CORS is enabled in Paystack settings

## Next Steps

### Add Real Member Data

Replace sample data in `backend/src/database/seeds/members.seed.ts` with your actual member database export.

### Configure Production Environment

1. Set up production PostgreSQL database (AWS RDS, Heroku Postgres, etc.)
2. Get Paystack live keys
3. Deploy backend to AWS Lambda
4. Deploy frontend to Vercel/Netlify
5. Update environment variables

### Testing Payment Flow

Use Paystack test cards:
- Success: 4084 0840 8408 4081
- Decline: 5060 6666 6666 6666 4444
- Insufficient Funds: 5060 6666 6666 6666 4444

## Common Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter

# Backend
cd backend
npm run start:dev    # Start dev server
npm run build        # Build for production
npm run seed         # Seed database
npm run lint         # Run linter

# Deployment
cd backend
serverless deploy --stage prod  # Deploy to AWS
```

## Support

- Technical Issues: Create an issue in the repository
- Conference Questions: conference@cmdanigeria.org
- Payment Issues: Check Paystack dashboard first

## Development Tips

1. **Hot Reload**: Both frontend and backend support hot reload
2. **Database Changes**: TypeORM auto-syncs in development
3. **API Testing**: Use Postman/Insomnia with `http://localhost:3000/api`
4. **Debugging**: Check browser console and terminal logs
5. **Database Inspection**: Use pgAdmin or TablePlus

## Ready to Go! 🚀

Your development environment is now set up. Start building and testing the registration flow!
