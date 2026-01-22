# Deploying to Vercel - Complete Guide

This guide covers deploying both the frontend and backend to Vercel.

## Architecture Overview

```
Frontend (Vercel) → Backend API (Vercel Serverless) → Databases
                                                      ├─ MongoDB Atlas
                                                      └─ Neon PostgreSQL
```

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository with your code
- Neon PostgreSQL database set up
- MongoDB Atlas database with member data
- Paystack API keys

---

## Part 1: Deploy Backend API to Vercel

### Step 1: Prepare Backend for Vercel

The backend is already configured with:
- `backend/vercel.json` - Vercel configuration
- `backend/api/index.ts` - Serverless function entry point

### Step 2: Deploy Backend

#### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to backend directory
cd backend

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? cmda-conference-backend
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

#### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your repository
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
4. Click "Deploy"

### Step 3: Configure Backend Environment Variables

In Vercel Dashboard → Your Backend Project → Settings → Environment Variables:

Add these variables:

```
NODE_ENV=production

# Neon PostgreSQL
DATABASE_HOST=your-project.neon.tech
DATABASE_PORT=5432
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password
DATABASE_NAME=cmda_conference

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE=cmda_members

# Paystack
PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Frontend URL (will update after frontend deployment)
FRONTEND_URL=https://your-frontend.vercel.app

# CORS
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Step 4: Redeploy Backend

After adding environment variables:
```bash
vercel --prod
```

Or click "Redeploy" in Vercel Dashboard.

### Step 5: Test Backend API

Your backend will be available at: `https://your-backend.vercel.app`

Test endpoints:
```bash
# Health check
curl https://your-backend.vercel.app/api/health

# Member lookup (replace with real email)
curl https://your-backend.vercel.app/api/members/lookup?email=test@example.com
```

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend Environment Variables

Create `.env.production` in the root directory:

```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
```

### Step 2: Deploy Frontend

#### Option A: Via Vercel CLI

```bash
# From project root
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? cmda-conference
# - Directory? ./
# - Override settings? No

# Deploy to production
vercel --prod
```

#### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave empty or root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Click "Deploy"

### Step 3: Configure Frontend Environment Variables

In Vercel Dashboard → Your Frontend Project → Settings → Environment Variables:

```
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx
```

### Step 4: Update Backend CORS

Go back to backend environment variables and update:
```
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
```

Redeploy backend after this change.

### Step 5: Test Complete Flow

1. Visit your frontend: `https://your-frontend.vercel.app`
2. Test email lookup
3. Complete registration form
4. Test payment with Paystack test card

---

## Part 3: Custom Domain (Optional)

### Add Custom Domain to Frontend

1. Go to Vercel Dashboard → Your Frontend Project → Settings → Domains
2. Add your domain (e.g., `conference.cmdanigeria.org`)
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

### Add Custom Domain to Backend

1. Go to Vercel Dashboard → Your Backend Project → Settings → Domains
2. Add subdomain (e.g., `api.conference.cmdanigeria.org`)
3. Update frontend environment variable:
   ```
   VITE_API_BASE_URL=https://api.conference.cmdanigeria.org/api
   ```

---

## Troubleshooting

### Backend Issues

**Error: "Cannot find module"**
- Ensure all dependencies are in `dependencies`, not `devDependencies`
- Check `package.json` in backend folder

**Error: "Database connection failed"**
- Verify environment variables are set correctly
- Check Neon PostgreSQL allows connections from Vercel IPs
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

**Error: "Function timeout"**
- Vercel free tier has 10s timeout
- Upgrade to Pro for 60s timeout
- Optimize database queries

### Frontend Issues

**Error: "API calls failing"**
- Check `VITE_API_BASE_URL` is correct
- Verify CORS is configured on backend
- Check browser console for errors

**Error: "Environment variables not working"**
- Ensure variables start with `VITE_`
- Redeploy after adding variables
- Check they're set for "Production" environment

### Database Issues

**MongoDB Connection**
- Whitelist all IPs: `0.0.0.0/0` in MongoDB Atlas
- Verify connection string format
- Test connection locally first

**Neon PostgreSQL**
- Neon automatically allows Vercel connections
- Verify credentials are correct
- Check database exists

---

## Monitoring & Logs

### View Logs

**Backend Logs:**
```bash
vercel logs https://your-backend.vercel.app
```

Or in Vercel Dashboard → Project → Deployments → Click deployment → Logs

**Frontend Logs:**
```bash
vercel logs https://your-frontend.vercel.app
```

### Monitor Performance

- Vercel Dashboard → Analytics
- Check function execution time
- Monitor error rates

---

## Cost Estimation

### Vercel Pricing

**Hobby (Free):**
- Unlimited deployments
- 100GB bandwidth/month
- 10s function timeout
- Good for: Testing, low traffic

**Pro ($20/month):**
- Unlimited bandwidth
- 60s function timeout
- Team collaboration
- Good for: Production

### Database Costs

**Neon PostgreSQL:**
- Free tier: 0.5GB storage, 3GB data transfer
- Pro: $19/month for 10GB

**MongoDB Atlas:**
- Free tier: 512MB storage
- Shared: $9/month for 2GB
- Dedicated: $57/month for 10GB

---

## Production Checklist

Before going live:

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] All environment variables set (production values)
- [ ] Database connections working
- [ ] CORS configured correctly
- [ ] Paystack live keys configured
- [ ] Custom domain configured (optional)
- [ ] SSL certificates active
- [ ] Test complete registration flow
- [ ] Test payment with real card
- [ ] Monitor logs for errors
- [ ] Set up error tracking (Sentry - optional)

---

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

- **Push to `main` branch** → Production deployment
- **Push to other branches** → Preview deployment

### Disable Auto-Deploy (Optional)

Vercel Dashboard → Project → Settings → Git → Disable "Production Branch"

---

## Rollback

If something goes wrong:

1. Go to Vercel Dashboard → Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"

---

## Alternative: Backend on Railway/Render

If you prefer a traditional server for the backend:

### Railway (Recommended)

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select backend folder
4. Add environment variables
5. Deploy

### Render

1. Go to https://render.com
2. New Web Service
3. Connect repository
4. Configure build command: `cd backend && pnpm install && pnpm run build`
5. Start command: `cd backend && pnpm run start:prod`
6. Add environment variables

---

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- NestJS on Vercel: https://docs.nestjs.com/faq/serverless

---

## Quick Commands Reference

```bash
# Deploy backend
cd backend && vercel --prod

# Deploy frontend
vercel --prod

# View logs
vercel logs [url]

# List deployments
vercel ls

# Remove deployment
vercel rm [deployment-url]

# Link to existing project
vercel link
```

---

**Your app is now live on Vercel! 🚀**
