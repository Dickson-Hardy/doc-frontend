# Quick Deploy Guide - 5 Minutes to Production

Get your CMDA Conference Registration System live in 5 minutes using Vercel.

## Prerequisites Checklist

- [ ] GitHub account with your code pushed
- [ ] Vercel account (free) - https://vercel.com
- [ ] Neon PostgreSQL database - https://neon.tech (free tier available)
- [ ] MongoDB Atlas with member data - https://mongodb.com/atlas (free tier available)
- [ ] Paystack account with API keys - https://paystack.com

---

## Step 1: Set Up Databases (2 minutes)

### Neon PostgreSQL

```bash
1. Go to https://neon.tech → Sign up
2. Create new project → Name: "CMDA Conference"
3. Copy connection string
4. Done! (Tables auto-create)
```

### MongoDB Atlas

```bash
1. Your existing member database should already be here
2. Get connection string from: Database → Connect → Connect your application
3. Ensure IP whitelist includes: 0.0.0.0/0
```

---

## Step 2: Deploy Backend (2 minutes)

### Via Vercel Dashboard

```bash
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure:
   - Root Directory: backend
   - Framework: Other
   - Build Command: pnpm run build
   - Output Directory: dist
4. Add Environment Variables (click "Add"):
```

**Environment Variables to Add:**

```
NODE_ENV=production
DATABASE_HOST=your-neon-host.neon.tech
DATABASE_PORT=5432
DATABASE_USER=your-neon-username
DATABASE_PASSWORD=your-neon-password
DATABASE_NAME=cmda_conference
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DATABASE=cmda_members
PAYSTACK_SECRET_KEY=sk_test_or_live_key
PAYSTACK_PUBLIC_KEY=pk_test_or_live_key
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
```

```bash
5. Click "Deploy"
6. Wait 1-2 minutes
7. Copy your backend URL (e.g., https://cmda-backend.vercel.app)
```

---

## Step 3: Deploy Frontend (1 minute)

### Via Vercel Dashboard

```bash
1. Go to https://vercel.com/new
2. Import same GitHub repository
3. Configure:
   - Root Directory: ./ (leave empty)
   - Framework: Vite
   - Build Command: npm run build
   - Output Directory: dist
4. Add Environment Variables:
```

**Environment Variables to Add:**

```
VITE_API_BASE_URL=https://your-backend.vercel.app/api
VITE_PAYSTACK_PUBLIC_KEY=pk_test_or_live_key
```

```bash
5. Click "Deploy"
6. Wait 1-2 minutes
7. Your site is live! 🎉
```

---

## Step 4: Update Backend CORS

```bash
1. Go to your backend project on Vercel
2. Settings → Environment Variables
3. Update FRONTEND_URL and CORS_ORIGINS with your actual frontend URL
4. Redeploy: Deployments → Latest → "..." → Redeploy
```

---

## Step 5: Test Everything

```bash
1. Visit your frontend URL
2. Enter a test email from your MongoDB
3. Verify form auto-populates
4. Complete registration
5. Test payment with Paystack test card:
   - Card: 4084 0840 8408 4081
   - CVV: 408
   - Expiry: Any future date
   - PIN: 0000
   - OTP: 123456
```

---

## Troubleshooting

### Backend not connecting to databases?

**Check:**
- Environment variables are correct (no typos)
- MongoDB Atlas allows connections from 0.0.0.0/0
- Neon PostgreSQL credentials are correct
- Redeploy after adding variables

### Frontend can't reach backend?

**Check:**
- `VITE_API_BASE_URL` includes `/api` at the end
- Backend CORS includes frontend URL
- Both are deployed (not just previews)

### Payment not working?

**Check:**
- Using correct Paystack keys (test vs live)
- `VITE_PAYSTACK_PUBLIC_KEY` matches backend secret key environment
- Check Paystack dashboard for transaction logs

---

## Going Live Checklist

Before accepting real registrations:

- [ ] Switch to Paystack LIVE keys (both frontend and backend)
- [ ] Test with real payment
- [ ] Add custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Set up error monitoring
- [ ] Test on mobile devices
- [ ] Verify email lookup works with real member data
- [ ] Check all form validations
- [ ] Test complete registration flow end-to-end

---

## Custom Domain (Optional)

### Add to Frontend

```bash
1. Vercel Dashboard → Your Frontend Project
2. Settings → Domains
3. Add domain: conference.cmdanigeria.org
4. Follow DNS instructions
5. Wait for SSL (automatic, ~5 minutes)
```

### Add to Backend

```bash
1. Vercel Dashboard → Your Backend Project
2. Settings → Domains
3. Add domain: api.conference.cmdanigeria.org
4. Update frontend VITE_API_BASE_URL
5. Update backend CORS settings
```

---

## Costs

### Free Tier (Good for testing)
- Vercel: Free (Hobby plan)
- Neon: Free (0.5GB storage)
- MongoDB Atlas: Free (512MB storage)
- **Total: $0/month**

### Production (Recommended)
- Vercel Pro: $20/month (both projects)
- Neon Pro: $19/month (10GB)
- MongoDB Shared: $9/month (2GB)
- **Total: ~$48/month**

---

## Support

**Deployment Issues:**
- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord

**Database Issues:**
- Neon Docs: https://neon.tech/docs
- MongoDB Docs: https://docs.mongodb.com/atlas

**Payment Issues:**
- Paystack Docs: https://paystack.com/docs
- Paystack Support: support@paystack.com

---

## Next Steps

1. **Monitor**: Check Vercel Analytics for traffic
2. **Backup**: Neon and MongoDB have automatic backups
3. **Scale**: Upgrade plans as traffic grows
4. **Optimize**: Monitor function execution times
5. **Secure**: Rotate API keys regularly

---

**Congratulations! Your conference registration system is live! 🚀**

Need help? Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions.
