# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         React Frontend (Vite + TypeScript)               │   │
│  │  • Multi-step Registration Form                          │   │
│  │  • Email Lookup Component                                │   │
│  │  • Paystack Popup Integration                            │   │
│  │  • Real-time Price Calculator                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      HOSTING LAYER                               │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  Vercel/Netlify  │              │   AWS CloudFront │         │
│  │  (Static Files)  │              │   (CDN - Optional)│         │
│  └──────────────────┘              └──────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (AWS)                           │
│  • Rate Limiting                                                 │
│  • Request Validation                                            │
│  • CORS Handling                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SERVERLESS BACKEND (AWS Lambda)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              NestJS Application                          │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │   │
│  │  │  Members   │  │Registration│  │  Payment   │        │   │
│  │  │  Module    │  │  Module    │  │  Module    │        │   │
│  │  └────────────┘  └────────────┘  └────────────┘        │   │
│  │                                                          │   │
│  │  • Email Lookup API                                     │   │
│  │  • Registration Creation                                │   │
│  │  • Payment Verification                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                    │                        │
                    │                        │
                    ▼                        ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│   MONGODB (Atlas)        │    │   NEON POSTGRESQL        │
│   Member Database        │    │   Registration Database  │
│   (Read-Only)            │    │   (Read/Write)           │
│                          │    │                          │
│  ┌────────────────────┐  │    │  ┌────────────────────┐  │
│  │  Members           │  │    │  │ Registrations      │  │
│  │  Collection        │  │    │  │  Table             │  │
│  │  • Profile Data    │  │    │  │  • Form Data       │  │
│  │  • Category Info   │  │    │  │  • Payment Status  │  │
│  │  • Existing Data   │  │    │  │  • Spouse Details  │  │
│  └────────────────────┘  │    │  │  • Member Snapshot │  │
│                          │    │  └────────────────────┘  │
└──────────────────────────┘    └──────────────────────────┘
                                             │
                                             ▼
                                ┌──────────────────────────┐
                                │   PAYSTACK API           │
                                │   Payment Gateway        │
                                │                          │
                                │  • Initialize Payment   │
                                │  • Verify Transaction   │
                                │  • Webhook Callbacks    │
                                │                          │
                                └──────────────────────────┘
```

## Data Flow

### 1. Email Lookup Flow

```
User enters email
      │
      ▼
Frontend validates format
      │
      ▼
API: GET /api/members/lookup?email=xxx
      │
      ▼
Backend queries MongoDB Members collection
      │
      ├─── Found ──────▶ Return member data
      │                       │
      │                       ▼
      │                 Frontend auto-populates form
      │
      └─── Not Found ──▶ Return 404
                              │
                              ▼
                        Show error message
```

### 2. Registration Flow

```
User completes form
      │
      ▼
Frontend validates all steps
      │
      ▼
Calculate pricing (with late fee if applicable)
      │
      ▼
API: POST /api/registrations
      │
      ▼
Backend validates data
      │
      ▼
Create registration record in PostgreSQL (status: pending)
      │
      ▼
Store MongoDB member reference
      │
      ▼
Generate payment reference
      │
      ▼
Return: { registrationId, reference, amount }
      │
      ▼
Frontend opens Paystack popup
      │
      ▼
User completes payment
      │
      ├─── Success ────▶ Paystack callback
      │                       │
      │                       ▼
      │                 API: GET /api/registrations/verify-payment/:ref
      │                       │
      │                       ▼
      │                 Backend calls Paystack API
      │                       │
      │                       ▼
      │                 Update registration (status: paid)
      │                       │
      │                       ▼
      │                 Return success
      │                       │
      │                       ▼
      │                 Show confirmation
      │
      └─── Cancel/Fail ▶ Show error, allow retry
```

### 3. Payment Verification Flow

```
Paystack payment completed
      │
      ▼
Frontend receives reference
      │
      ▼
API: GET /api/registrations/verify-payment/:reference
      │
      ▼
Backend calls Paystack API
      │
      ▼
Paystack returns transaction status
      │
      ├─── Success ────▶ Update registration.paymentStatus = 'paid'
      │                  Update registration.paidAt = now()
      │                       │
      │                       ▼
      │                 Return success response
      │
      └─── Failed ─────▶ Return error response
```

## Component Architecture

### Frontend Components

```
App.tsx
  │
  ├── Header
  │
  ├── HeroSection
  │
  ├── RegistrationForm
  │     │
  │     ├── DeadlineNotice
  │     │
  │     ├── StepIndicator
  │     │
  │     ├── Form Steps (Dynamic)
  │     │     ├── EmailLookupStep
  │     │     ├── PersonalInfoStep
  │     │     ├── CMDAInfoStep
  │     │     ├── CategoryStep
  │     │     ├── SpouseDetailsStep (conditional)
  │     │     ├── LogisticsStep
  │     │     └── AbstractStep
  │     │
  │     └── PriceSummary
  │
  └── Footer
```

### Backend Modules

```
AppModule
  │
  ├── MembersModule
  │     ├── MembersController
  │     │     └── GET /members/lookup
  │     ├── MembersService
  │     │     └── findByEmail() [MongoDB]
  │     └── Member Schema (Mongoose)
  │
  ├── RegistrationsModule
  │     ├── RegistrationsController
  │     │     ├── POST /registrations
  │     │     └── GET /registrations/verify-payment/:ref
  │     ├── RegistrationsService
  │     │     ├── create() [PostgreSQL]
  │     │     ├── findByPaymentReference()
  │     │     └── updatePaymentStatus()
  │     └── Registration Entity (TypeORM)
  │
  └── PaymentModule
        ├── PaymentService
        │     ├── verifyPayment()
        │     └── initializePayment()
        └── Paystack API Integration
```

## Database Schema

### MongoDB - Members Collection (Read-Only)

```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  surname: String,
  firstName: String,
  otherNames: String,
  age: Number,
  sex: String,
  phone: String,
  chapter: String,
  isCmdaMember: Boolean,
  currentLeadershipPost: String,
  previousLeadershipPost: String,
  category: String, // 'student' | 'doctor' | 'doctor-with-spouse'
  chapterOfGraduation: String,
  yearsInPractice: String, // 'less-than-5' | '5-and-above'
  createdAt: Date,
  updatedAt: Date
}
```

### PostgreSQL (Neon) - Registrations Table

```sql
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_mongo_id VARCHAR(24), -- MongoDB ObjectId reference
  
  -- Personal Info (snapshot from MongoDB)
  email VARCHAR(255) NOT NULL,
  surname VARCHAR(100) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  other_names VARCHAR(100),
  age INTEGER NOT NULL,
  sex VARCHAR(10) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  
  -- CMDA Info
  chapter VARCHAR(100) NOT NULL,
  is_cmda_member BOOLEAN DEFAULT false,
  current_leadership_post VARCHAR(100),
  previous_leadership_post VARCHAR(100),
  
  -- Category
  category VARCHAR(50) NOT NULL,
  chapter_of_graduation VARCHAR(100),
  years_in_practice VARCHAR(20),
  
  -- Spouse Details
  spouse_surname VARCHAR(100),
  spouse_first_name VARCHAR(100),
  spouse_other_names VARCHAR(100),
  spouse_email VARCHAR(255),
  
  -- Logistics
  date_of_arrival DATE NOT NULL,
  accommodation_option VARCHAR(50) NOT NULL,
  
  -- Abstract
  has_abstract BOOLEAN DEFAULT false,
  presentation_title VARCHAR(255),
  abstract_file_url VARCHAR(500),
  
  -- Payment
  base_fee INTEGER DEFAULT 0,
  late_fee INTEGER DEFAULT 0,
  total_amount INTEGER DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_reference VARCHAR(100),
  paid_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_registrations_email ON registrations(email);
CREATE INDEX idx_registrations_payment_ref ON registrations(payment_reference);
CREATE INDEX idx_registrations_status ON registrations(payment_status);
```

## Security Architecture

### Authentication & Authorization
- No user authentication required (public registration)
- Backend validates all inputs
- Rate limiting on API Gateway
- CORS restricted to frontend domain

### Data Protection
- HTTPS enforced on all connections
- Database credentials in environment variables
- Paystack keys secured
- SQL injection protection via TypeORM
- XSS protection via React

### Payment Security
- PCI compliance via Paystack
- No card details stored
- Payment verification server-side
- Webhook signature verification (optional)

## Scalability Considerations

### Frontend
- Static files served via CDN
- Lazy loading of components
- Code splitting by route
- Image optimization

### Backend
- Serverless auto-scaling (Lambda)
- Stateless architecture
- Connection pooling for database
- Caching strategies (optional)

### Database
- Indexed queries for performance
- Read replicas for high traffic (optional)
- Connection pooling
- Query optimization

## Monitoring & Logging

### Frontend
- Vercel Analytics
- Error tracking (Sentry - optional)
- Performance monitoring

### Backend
- CloudWatch Logs (Lambda)
- CloudWatch Metrics
- Custom alarms for errors
- API Gateway metrics

### Database
- RDS Performance Insights
- CloudWatch metrics
- Slow query logs
- Connection monitoring

## Disaster Recovery

### Backup Strategy
- MongoDB: Managed by MongoDB Atlas (automated backups)
- Neon PostgreSQL: Automated backups with point-in-time recovery
- Manual snapshots before major changes

### Rollback Procedures
- Serverless deployment history
- Vercel deployment history
- Database snapshots (both MongoDB and PostgreSQL)

### High Availability
- MongoDB Atlas: Multi-region replication
- Neon: Built-in high availability
- Lambda automatic failover
- CDN redundancy

## Cost Optimization

### Estimated Monthly Costs
- AWS Lambda: $5-20 (based on invocations)
- Neon PostgreSQL (Free tier or Paid): $0-25
- MongoDB Atlas (Shared/Dedicated): $0-57
- AWS Data Transfer: $5-10
- Vercel Pro: $20 (optional)
- Total: ~$10-132/month (depending on tier selection)

### Optimization Strategies
- Right-size Lambda memory
- Use Neon's free tier for development
- Use MongoDB Atlas shared cluster for development
- Optimize database queries
- Use CloudFront caching

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI Framework |
| Build Tool | Vite | Fast development & build |
| UI Components | shadcn/ui (Radix) | Component library |
| Styling | Tailwind CSS | Utility-first CSS |
| Form Management | React Hook Form | Form state & validation |
| Validation | Zod | Schema validation |
| API Client | Fetch API | HTTP requests |
| State Management | TanStack Query | Server state |
| Backend | NestJS 10 | Node.js framework |
| ORM | TypeORM + Mongoose | Database abstraction |
| Database (Registrations) | Neon PostgreSQL | Serverless PostgreSQL |
| Database (Members) | MongoDB Atlas | Document database |
| Serverless | AWS Lambda | Compute |
| API Gateway | AWS API Gateway | HTTP routing |
| Hosting | Vercel/Netlify | Static hosting |
| Payment | Paystack | Payment gateway |
| Deployment | Serverless Framework | Infrastructure as code |

---

This architecture provides a scalable, secure, and cost-effective solution for the CMDA Conference Registration System.
