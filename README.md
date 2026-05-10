# CMDA Nigeria Conference Registration System

Complete registration system for the CMDA Nigeria Doctors National Conference 2026 - July 30 to August 2 at Covenant University, Ota.

## Project Overview

This is a full-stack conference registration application with:
- **Frontend**: React + TypeScript + Vite + shadcn/ui
- **Backend**: Serverless NestJS with dual database architecture
- **Databases**: MongoDB Atlas (members) + Neon PostgreSQL (registrations)
- **Payment**: Paystack integration
- **Deployment**: Vercel (recommended) or AWS Lambda

## Features

### Registration Flow
1. **Email Lookup**: Members enter email to retrieve their profile data
2. **Auto-Population**: Personal and membership details auto-filled from database
3. **Category Selection**: Student, Doctor, or Doctor with Spouse packages
4. **Dynamic Pricing**: 
   - Student: ₦11,000
   - Junior Doctor (<5 years): ₦30,000
   - Senior Doctor (5+ years): ₦50,000
   - Doctor with Spouse: ₦85,000
   - Late fee: ₦10,000 (after May 18, 2026)
5. **Spouse Details**: Additional form for Doctor with Spouse package
6. **Logistics**: Arrival date and accommodation preferences
7. **Abstract Submission**: Optional presentation submission
8. **Payment**: Secure Paystack payment gateway

### Key Features
- Multi-step form with validation
- Real-time price calculation
- Responsive design (mobile-friendly)
- Email-based member lookup
- Secure payment processing
- Late registration fee automation

## Project Structure

```
.
├── src/                      # Frontend React application
│   ├── components/
│   │   ├── form-steps/      # Multi-step form components
│   │   └── ui/              # shadcn/ui components
│   ├── services/            # API integration
│   ├── lib/                 # Utilities (pricing, paystack)
│   ├── types/               # TypeScript definitions
│   └── pages/               # Route pages
├── backend/                 # NestJS serverless backend
│   ├── src/
│   │   ├── members/         # Member management
│   │   ├── registrations/   # Registration handling
│   │   └── payment/         # Paystack integration
│   └── serverless.yml       # AWS deployment config
└── public/                  # Static assets
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Neon PostgreSQL account (https://neon.tech)
- MongoDB Atlas with member data (https://mongodb.com/atlas)
- Paystack account (test/live keys)
- Vercel account (for deployment)

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_key
```

3. Run development server:
```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

### Backend Setup

See [backend/SETUP.md](./backend/SETUP.md) for detailed setup instructions.

Quick start:

1. Navigate to backend:
```bash
cd backend
pnpm install
```

2. Configure environment:
```bash
cp .env.example .env
```

Edit `backend/.env`:
```env
# Neon PostgreSQL
DATABASE_HOST=your-project.neon.tech
DATABASE_PORT=5432
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password
DATABASE_NAME=cmda_conference

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DATABASE=cmda_members

# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_key
PAYSTACK_PUBLIC_KEY=pk_test_your_key

# Frontend
FRONTEND_URL=http://localhost:5173
```

3. Run backend:
```bash
pnpm run start:dev
```

Backend API runs at `http://localhost:3000/api`

## API Endpoints

### Member Lookup
```
GET /api/members/lookup?email=user@example.com
```

### Create Registration
```
POST /api/registrations
```

### Verify Payment
```
GET /api/registrations/verify-payment/:reference
```

See `backend/README.md` for detailed API documentation.

## Database Schema

### MongoDB - Members Collection (Read-Only)
Existing member database accessed via MongoDB Atlas:
- Member profiles with personal info
- CMDA membership details
- Category and professional information

### PostgreSQL (Neon) - Registrations Table
New conference registrations stored in Neon:
- Registration data with member snapshot
- Payment status and tracking
- Spouse details (if applicable)
- Logistics preferences

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed schema.

## Payment Flow

1. User completes registration form
2. Frontend submits to backend → receives payment reference
3. Paystack popup opens for payment
4. User completes payment
5. Backend verifies payment with Paystack API
6. Registration status updated to "paid"
7. Confirmation email sent (to be implemented)

## Deployment

### Quick Deploy (5 minutes)

See [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for fastest deployment to Vercel.

```bash
# Deploy backend
cd backend && vercel --prod

# Deploy frontend
vercel --prod
```

### Detailed Deployment Guides

- **Vercel (Recommended)**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
- **AWS Lambda**: [DEPLOYMENT.md](./DEPLOYMENT.md)

### Production Checklist

- [ ] Neon PostgreSQL configured
- [ ] MongoDB Atlas with member data
- [ ] Paystack live keys configured
- [ ] Backend deployed and tested
- [ ] Frontend deployed and tested
- [ ] CORS configured correctly
- [ ] Custom domain (optional)
- [ ] SSL certificates active

## Environment Variables

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_PAYSTACK_PUBLIC_KEY`: Paystack public key

### Backend (backend/.env)
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` (Neon PostgreSQL)
- `MONGODB_URI`, `MONGODB_DATABASE` (MongoDB Atlas)
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`
- `FRONTEND_URL`: For CORS and callbacks
- `CORS_ORIGINS`: Allowed origins

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Hook Form + Zod
- shadcn/ui (Radix UI)
- Tailwind CSS
- TanStack Query
- Paystack Popup

### Backend
- NestJS 10
- TypeORM (PostgreSQL) + Mongoose (MongoDB)
- Neon PostgreSQL (Serverless)
- MongoDB Atlas (Member database)
- AWS Lambda or Vercel Serverless
- Serverless Framework
- Paystack API

## Development

### Run Tests
```bash
# Frontend
npm run test

# Backend
cd backend
npm run test
```

### Linting
```bash
# Frontend
npm run lint

# Backend
cd backend
npm run lint
```

## Contributing

This is a proprietary project for CMDA Nigeria. Contact the development team for contribution guidelines.

## Support

For issues or questions:
- Email: conference@cmdanigeria.org
- Technical support: tech@cmdanigeria.org

## License

Proprietary - CMDA Nigeria © 2026
