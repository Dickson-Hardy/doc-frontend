# Deployment Guide

Complete guide for deploying the CMDA Conference Registration System to production.

## Quick Start - Vercel Deployment (Recommended)

**For detailed Vercel deployment instructions, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)**

### Quick Deploy to Vercel

```bash
# 1. Deploy Backend
cd backend
vercel --prod

# 2. Deploy Frontend
cd ..
vercel --prod
```

That's it! See VERCEL_DEPLOYMENT.md for full configuration details.

---

## Alternative: AWS Lambda Deployment

If you prefer AWS Lambda over Vercel serverless functions, follow this guide.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│  API Gateway │────────▶│   Lambda    │
│  (Vercel)   │         │    (AWS)     │         │  (NestJS)   │
└─────────────┘         └──────────────┘         └─────────────┘
                                                         │
                                                         ▼
                                    ┌──────────────────────────────────┐
                                    │        Databases                 │
                                    │  ┌────────────┐  ┌────────────┐ │
                                    │  │  MongoDB   │  │   Neon     │ │
                                    │  │   Atlas    │  │ PostgreSQL │ │
                                    │  └────────────┘  └────────────┘ │
                                    └──────────────────────────────────┘
                                                         │
                                                         ▼
                                                  ┌─────────────┐
                                                  │  Paystack   │
                                                  │   Gateway   │
                                                  └─────────────┘
```

## Prerequisites

- AWS Account with CLI configured (for AWS Lambda deployment)
- Vercel account (for Vercel deployment - recommended)
- Neon PostgreSQL database
- MongoDB Atlas with member data
- Paystack live API keys
- Domain name (optional)

---

## Deployment Options

### Option 1: Full Vercel Deployment (Recommended)
- **Frontend**: Vercel Static Hosting
- **Backend**: Vercel Serverless Functions
- **Databases**: Neon PostgreSQL + MongoDB Atlas
- **Pros**: Simplest setup, automatic HTTPS, great DX
- **See**: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### Option 2: AWS Lambda + Vercel Frontend
- **Frontend**: Vercel Static Hosting
- **Backend**: AWS Lambda + API Gateway
- **Databases**: Neon PostgreSQL + MongoDB Atlas
- **Pros**: More control, AWS ecosystem integration
- **See**: Instructions below

---

## Part 1: Database Setup

### MongoDB Atlas (Member Database)

Your existing member database should already be on MongoDB Atlas. If not:

```bash
1. Go to https://cloud.mongodb.com
2. Create cluster (Free tier available)
3. Create database user
4. Whitelist IP: 0.0.0.0/0 (allow from anywhere)
5. Get connection string
6. Import existing member data
```

### Neon PostgreSQL (Registration Database)

```bash
1. Go to https://neon.tech
2. Create new project
3. Create database: cmda_conference
4. Copy connection details
5. Tables will auto-create on first backend run
```

---

## Part 2: Backend Deployment (AWS Lambda)

### 1. Install Serverless Framework

```bash
npm install -g serverless
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key ID, Secret Access Key, Region (us-east-1)

# Or use environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

### 3. Update Serverless Configuration

Edit `backend/serverless.yml`:

```yaml
provider:
  name: aws
  runtime: nodejs18.x
  region: us-east-1  # Change to your region
  stage: prod
  environment:
    # Neon PostgreSQL
    DATABASE_HOST: <neon-endpoint>.neon.tech
    DATABASE_PORT: 5432
    DATABASE_USER: <neon-username>
    DATABASE_PASSWORD: <neon-password>
    DATABASE_NAME: cmda_conference
    
    # MongoDB Atlas
    MONGODB_URI: mongodb+srv://user:pass@cluster.mongodb.net/
    MONGODB_DATABASE: cmda_members
    
    # Paystack
    PAYSTACK_SECRET_KEY: ${env:PAYSTACK_SECRET_KEY}
    PAYSTACK_PUBLIC_KEY: ${env:PAYSTACK_PUBLIC_KEY}
    
    # Frontend
    FRONTEND_URL: https://your-domain.com
```

### 4. Set Environment Variables

```bash
cd backend

# Set Paystack keys
export PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
export PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
```

### 5. Deploy to AWS

```bash
# Build and deploy
npm run build
serverless deploy --stage prod

# Output will show:
# - API Gateway endpoint URL
# - Lambda function name
# - CloudFormation stack info
```

### 6. Test API Endpoint

```bash
# Test member lookup
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/api/members/lookup?email=test@example.com
```

### 7. Configure Custom Domain (Optional)

```bash
# Install plugin
npm install --save-dev serverless-domain-manager

# Add to serverless.yml
plugins:
  - serverless-domain-manager

custom:
  customDomain:
    domainName: api.your-domain.com
    certificateName: '*.your-domain.com'
    basePath: ''
    stage: prod
    createRoute53Record: true

# Create domain
serverless create_domain --stage prod

# Deploy with domain
serverless deploy --stage prod
```

## Part 3: Frontend Deployment (Vercel)

### 1. Prepare for Production

```bash
# Update .env.production
VITE_API_BASE_URL=https://your-api-endpoint.amazonaws.com/prod/api
VITE_PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
```

### 2. Build Frontend

```bash
npm run build

# Test production build locally
npm run preview
```

### 3. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Project name: cmda-conference
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist
```

#### Option B: Vercel Dashboard

```bash
1. Go to vercel.com
2. Import Git repository
3. Configure:
   - Framework Preset: Vite
   - Build Command: npm run build
   - Output Directory: dist
4. Add environment variables:
   - VITE_API_BASE_URL
   - VITE_PAYSTACK_PUBLIC_KEY
5. Deploy
```

### 4. Configure Custom Domain

```bash
# In Vercel Dashboard:
1. Go to Project Settings → Domains
2. Add domain: conference.cmdanigeria.org
3. Configure DNS records as shown
4. Wait for SSL certificate provisioning
```

## Part 4: Post-Deployment Configuration

### 1. Update CORS Settings

In `backend/src/main.ts` and `backend/src/lambda.ts`:

```typescript
app.enableCors({
  origin: [
    'https://your-domain.com',
    'https://www.your-domain.com'
  ],
  credentials: true,
});
```

Redeploy backend:
```bash
cd backend
serverless deploy --stage prod
```

### 2. Configure Paystack Webhook

```bash
# In Paystack Dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: https://your-api-endpoint/api/webhook/paystack
3. Select events: charge.success
4. Save webhook secret for verification
```

### 3. Set Up Monitoring

#### CloudWatch (AWS)

```bash
# Lambda logs automatically go to CloudWatch
# View in AWS Console: CloudWatch → Log groups → /aws/lambda/cmda-conference-api-prod
```

#### Vercel Analytics

```bash
# Enable in Vercel Dashboard:
Project → Analytics → Enable
```

### 4. Database Backups

```bash
# Enable automated backups in RDS:
1. RDS Console → Your database
2. Modify → Backup
3. Backup retention: 7 days
4. Backup window: Preferred time
5. Apply immediately
```

## Part 5: Testing Production

### 1. Test Registration Flow

```bash
1. Visit https://your-domain.com
2. Enter test member email
3. Complete registration
4. Test payment with Paystack live mode
5. Verify payment in Paystack dashboard
6. Check database for registration record
```

### 2. Load Testing

```bash
# Install artillery
npm install -g artillery

# Create test script (load-test.yml)
config:
  target: 'https://your-api-endpoint'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Member lookup"
    flow:
      - get:
          url: "/api/members/lookup?email=test@example.com"

# Run test
artillery run load-test.yml
```

## Part 6: Monitoring & Maintenance

### CloudWatch Alarms

```bash
# Create alarm for Lambda errors:
1. CloudWatch → Alarms → Create alarm
2. Metric: Lambda → Errors
3. Threshold: > 5 in 5 minutes
4. Action: Send SNS notification
```

### Database Monitoring

```bash
# Monitor RDS metrics:
- CPU utilization
- Database connections
- Free storage space
- Read/Write latency
```

### Cost Optimization

```bash
# Lambda:
- Monitor invocations and duration
- Optimize memory allocation
- Use provisioned concurrency if needed

# RDS:
- Right-size instance type
- Enable storage auto-scaling
- Use read replicas for high traffic

# Vercel:
- Monitor bandwidth usage
- Optimize image sizes
- Enable caching
```

## Rollback Procedure

### Backend Rollback

```bash
# List deployments
serverless deploy list --stage prod

# Rollback to previous
serverless rollback --timestamp <timestamp> --stage prod
```

### Frontend Rollback

```bash
# In Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → Promote to Production
```

## Security Checklist

- [ ] All environment variables secured
- [ ] Database password is strong and rotated
- [ ] RDS security group restricts access
- [ ] API Gateway has rate limiting
- [ ] HTTPS enforced on all endpoints
- [ ] Paystack webhook signature verified
- [ ] CORS configured correctly
- [ ] CloudWatch logs enabled
- [ ] Automated backups configured
- [ ] SSL certificates valid

## Troubleshooting

### Lambda Timeout

```bash
# Increase timeout in serverless.yml
functions:
  api:
    timeout: 30  # Increase to 60 if needed
```

### Database Connection Issues

```bash
# Check security group allows Lambda
# Verify RDS endpoint in environment variables
# Test connection from Lambda console
```

### CORS Errors

```bash
# Verify frontend URL in backend CORS config
# Check API Gateway CORS settings
# Clear browser cache
```

## Support Contacts

- AWS Support: AWS Console → Support Center
- Vercel Support: vercel.com/support
- Paystack Support: support@paystack.com

## Estimated Costs (Monthly)

- AWS Lambda: $5-20 (depending on traffic)
- AWS RDS (db.t3.micro): $15-25
- AWS Data Transfer: $5-10
- Vercel Pro: $20 (optional)
- Domain: $10-15/year

Total: ~$45-75/month

## Deployment Checklist

- [ ] Database created and seeded
- [ ] Backend deployed to Lambda
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] CORS configured
- [ ] Paystack webhooks set up
- [ ] Monitoring enabled
- [ ] Backups configured
- [ ] Load testing completed
- [ ] Production testing passed

## Success! 🎉

Your CMDA Conference Registration System is now live in production!
