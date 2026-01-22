# MongoDB Setup Guide

⚠️ **IMPORTANT UPDATE**: After inspection, we found that:
- **Member data is in the `users` collection** (7,343+ documents)
- The `members` collection exists but is **EMPTY**
- The schema and service have been updated to use the `users` collection
- Field mappings have been configured (see `backend/MONGODB_STRUCTURE.md` for details)

---

Your MongoDB connection string has been configured. Now let's inspect and connect to your database.

## Your MongoDB Details

```
URI: mongodb+srv://cmdassociationnigeria:hAI6Os9uW2QE2zU8@cluster0.5nfcr.mongodb.net/live?retryWrites=true&w=majority&appName=Cluster0
Database: live
Cluster: cluster0.5nfcr.mongodb.net
```

---

## Step 1: Inspect Your Database Structure

Run the inspection script to see what's in your database:

```bash
# Navigate to scripts directory
cd backend/scripts

# Install dependencies
npm install

# Run inspector
node inspect-mongodb.js
```

### What to Look For

The script will show you:

1. **Collection Names** - Which collection contains member data?
   - `members`, `users`, `doctors`, `students`, etc.

2. **Field Names** - What are the exact field names?
   - Email: `email`, `Email`, `emailAddress`?
   - Name: `surname`, `lastName`, `last_name`?
   - Category: `category`, `memberType`, `type`?

3. **Category Values** - What values are used?
   - `"student"`, `"Student"`, `"STUDENT"`?
   - `"doctor"`, `"Doctor"`, `"DOCTOR"`?
   - `"doctor-with-spouse"` or something else?

4. **Sample Data** - See actual member records

---

## Step 2: Update Backend Configuration

### Option A: If Your Database Matches Our Schema

If your database has these fields:
- `email`, `surname`, `firstName`, `category`, `yearsInPractice`

**Use the standard schema:**

```bash
# No changes needed!
# The current schema should work
```

### Option B: If Your Database Has Different Field Names

If your database uses different field names, use the flexible schema:

**1. Replace the member schema:**

```bash
# Backup current schema
mv backend/src/members/schemas/member.schema.ts backend/src/members/schemas/member.schema.backup.ts

# Use flexible schema
mv backend/src/members/schemas/member.schema.flexible.ts backend/src/members/schemas/member.schema.ts
```

**2. Replace the member service:**

```bash
# Backup current service
mv backend/src/members/members.service.ts backend/src/members/members.service.backup.ts

# Use flexible service
mv backend/src/members/members.service.flexible.ts backend/src/members/members.service.ts
```

**3. Update collection name in schema:**

Edit `backend/src/members/schemas/member.schema.ts`:

```typescript
@Schema({ 
  collection: 'YOUR_ACTUAL_COLLECTION_NAME',  // ← Update this
  timestamps: true,
  strict: false
})
```

---

## Step 3: Configure Environment Variables

Create `backend/.env`:

```env
# Node Environment
NODE_ENV=development

# Neon PostgreSQL (for registrations)
DATABASE_HOST=your-neon-host.neon.tech
DATABASE_PORT=5432
DATABASE_USER=your-username
DATABASE_PASSWORD=your-password
DATABASE_NAME=cmda_conference

# MongoDB (for existing members)
MONGODB_URI=mongodb+srv://cmdassociationnigeria:hAI6Os9uW2QE2zU8@cluster0.5nfcr.mongodb.net/live?retryWrites=true&w=majority&appName=Cluster0
MONGODB_DATABASE=live

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx

# Frontend URL
FRONTEND_URL=http://localhost:5173

# CORS Origins
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## Step 4: Test the Connection

### Test 1: Direct MongoDB Connection

Create a test file `backend/test-mongodb.js`:

```javascript
const { MongoClient } = require('mongodb');

const MONGODB_URI = "mongodb+srv://cmdassociationnigeria:hAI6Os9uW2QE2zU8@cluster0.5nfcr.mongodb.net/live?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    
    const db = client.db('live');
    const collections = await db.listCollections().toArray();
    
    console.log('\n📚 Collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // Try to find a member by email
    const memberCollection = db.collection('members'); // Update if different
    const member = await memberCollection.findOne();
    
    console.log('\n📄 Sample member:');
    console.log(member);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
```

Run it:
```bash
cd backend
node test-mongodb.js
```

### Test 2: Backend API

Start the backend:

```bash
cd backend
pnpm install
pnpm run start:dev
```

Test the member lookup endpoint:

```bash
# Replace with an actual email from your database
curl "http://localhost:3000/api/members/lookup?email=test@example.com"
```

Expected response:
```json
{
  "email": "test@example.com",
  "surname": "Doe",
  "firstName": "John",
  "category": "doctor",
  ...
}
```

---

## Common Database Structures & Solutions

### Structure 1: Standard Format ✅

```javascript
{
  _id: ObjectId("..."),
  email: "john@example.com",
  surname: "Doe",
  firstName: "John",
  category: "doctor",
  yearsInPractice: "5-and-above"
}
```

**Solution:** Use standard schema (no changes needed)

### Structure 2: Different Field Names

```javascript
{
  _id: ObjectId("..."),
  Email: "john@example.com",  // Capital E
  lastName: "Doe",            // Not surname
  first_name: "John",         // Underscore
  memberType: "Doctor",       // Not category
  experienceYears: 7          // Number, not string
}
```

**Solution:** Use flexible schema (handles all variations)

### Structure 3: Nested Structure

```javascript
{
  _id: ObjectId("..."),
  profile: {
    email: "john@example.com",
    personalInfo: {
      firstName: "John",
      lastName: "Doe"
    }
  },
  membership: {
    type: "doctor",
    yearsActive: 7
  }
}
```

**Solution:** Custom mapping needed. Update the flexible service:

```typescript
private normalizeMemberData(member: any): any {
  return {
    email: member.profile?.email || '',
    surname: member.profile?.personalInfo?.lastName || '',
    firstName: member.profile?.personalInfo?.firstName || '',
    category: this.normalizeCategory(member.membership?.type || ''),
    yearsInPractice: this.normalizeYearsInPractice(member.membership?.yearsActive),
    // ... rest of fields
  };
}
```

---

## Troubleshooting

### Issue 1: "Member not found" for valid emails

**Possible causes:**
1. Wrong collection name
2. Email field has different name
3. Email stored with different case
4. Email has extra spaces

**Solution:**
```bash
# Check actual data
node backend/scripts/inspect-mongodb.js

# Look for the email field
# Update schema collection name
# Use flexible schema for field variations
```

### Issue 2: "Authentication failed"

**Possible causes:**
1. Wrong credentials
2. IP not whitelisted
3. Database user doesn't have permissions

**Solution:**
```bash
# Check MongoDB Atlas:
1. Database Access → Verify user exists
2. Network Access → Add 0.0.0.0/0 (allow from anywhere)
3. Try connection string in MongoDB Compass
```

### Issue 3: Data format doesn't match

**Example:** Category is "Doctor" but code expects "doctor"

**Solution:** Use flexible service - it normalizes data:
```typescript
// Handles: "Doctor", "doctor", "DOCTOR", "physician"
private normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  if (normalized.includes('doctor')) return 'doctor';
  if (normalized.includes('student')) return 'student';
  return category;
}
```

---

## Field Mapping Reference

If you need to add custom field mappings, edit the flexible service:

```typescript
// backend/src/members/members.service.flexible.ts

private normalizeMemberData(member: any): any {
  return {
    // Add your custom mappings here
    email: member.YOUR_EMAIL_FIELD || '',
    surname: member.YOUR_SURNAME_FIELD || '',
    firstName: member.YOUR_FIRSTNAME_FIELD || '',
    category: this.normalizeCategory(member.YOUR_CATEGORY_FIELD || ''),
    // ... etc
  };
}
```

---

## Verification Checklist

Before deploying, verify:

- [ ] MongoDB connection works
- [ ] Can list collections
- [ ] Can find member by email
- [ ] Field names match or are mapped
- [ ] Category values are normalized
- [ ] Years in practice format is correct
- [ ] Backend API returns member data
- [ ] Frontend can lookup members
- [ ] Form auto-populates correctly

---

## Next Steps

1. **Run the inspector script** to see your database structure
2. **Choose the appropriate schema** (standard or flexible)
3. **Update configuration** if needed
4. **Test the connection** with the test scripts
5. **Test the API endpoint** with curl
6. **Test the frontend** email lookup
7. **Deploy** when everything works

---

## Support

If you encounter issues:

1. **Check the inspector output** - Shows exact database structure
2. **Use flexible schema** - Handles most variations automatically
3. **Add custom mapping** - For complex nested structures
4. **Test incrementally** - Connection → Query → API → Frontend

Need help? Share the output from `inspect-mongodb.js` and we can help configure the mapping!
