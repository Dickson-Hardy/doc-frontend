# Member Registration Flow

## Updated Flow with CMDA Membership Requirement

### Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Visits Conference Site               │
│                 conference.cmdanigeria.org                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Email Lookup Step                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ℹ️  CMDA Members Only                              │    │
│  │  This conference is exclusively for registered     │    │
│  │  CMDA members. Not a member? Register at           │    │
│  │  cmdanigeria.net first.                            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Email: [_____________________] [Lookup]                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Query MongoDB  │
                    │  Member Database│
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
        ┌──────────────┐          ┌──────────────────┐
        │ Member Found │          │ Member NOT Found │
        └──────────────┘          └──────────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────────┐
    │ ✅ Success!          │    │ ❌ Email not found       │
    │                      │    │                          │
    │ Auto-populate form:  │    │ You need to be a         │
    │ • Name               │    │ registered CMDA member   │
    │ • Category           │    │ to attend this           │
    │ • Chapter            │    │ conference.              │
    │ • All details        │    │                          │
    │                      │    │ [Register as CMDA Member]│
    │ Proceed to form...   │    │ (Opens cmdanigeria.net)  │
    └──────────────────────┘    └──────────────────────────┘
                │                           │
                ▼                           ▼
    ┌──────────────────────┐    ┌──────────────────────────┐
    │ Complete Registration│    │ User goes to             │
    │ Form (Steps 1-5)     │    │ cmdanigeria.net          │
    │                      │    │                          │
    │ • Personal Info      │    │ Registers as member      │
    │ • CMDA Info          │    │                          │
    │ • Category           │    │ Returns to conference    │
    │ • Spouse (if needed) │    │ site with new email      │
    │ • Logistics          │    │                          │
    │ • Abstracts          │    │ Tries lookup again ✓     │
    └──────────────────────┘    └──────────────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │ Payment via Paystack │
    └──────────────────────┘
                │
                ▼
    ┌──────────────────────┐
    │ ✅ Registration      │
    │    Complete!         │
    └──────────────────────┘
```

---

## Code Implementation

### 1. Email Lookup Component (`EmailLookupStep.tsx`)

#### Info Banner (Always Visible)
```tsx
<Alert className="mb-6 border-blue-200 bg-blue-50">
  <AlertCircle className="h-4 w-4 text-blue-600" />
  <AlertDescription>
    <p className="font-semibold mb-1">CMDA Members Only</p>
    <p className="text-sm">
      This conference is exclusively for registered CMDA members. 
      If you're not a member yet, please{' '}
      <a href="https://cmdanigeria.net" target="_blank">
        register at cmdanigeria.net
      </a>
      {' '}first.
    </p>
  </AlertDescription>
</Alert>
```

#### Email Input & Lookup
```tsx
<Input
  type="email"
  placeholder="Enter your registered email"
  {...register('email')}
/>
<Button onClick={handleLookup}>
  Lookup
</Button>
```

#### Success State (Member Found)
```tsx
{lookupStatus === 'found' && (
  <Alert className="border-green-500 bg-green-50">
    <CheckCircle2 className="h-4 w-4 text-green-600" />
    <AlertDescription>
      Member found! Loading your information...
    </AlertDescription>
  </Alert>
)}

// Auto-populate form
setValue('surname', memberData.surname)
setValue('firstName', memberData.firstName)
setValue('category', memberData.category)
// ... all other fields

// Auto-advance after 1.5 seconds
setTimeout(() => onMemberFound(), 1500)
```

#### Error State (Member NOT Found)
```tsx
{lookupStatus === 'not-found' && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertDescription className="space-y-3">
      <p className="font-semibold">
        Email not found in our member database.
      </p>
      <p>
        You need to be a registered CMDA member to attend 
        this conference. Please register as a member first.
      </p>
      <Button
        variant="default"
        className="w-full mt-2"
        onClick={() => window.open('https://cmdanigeria.net', '_blank')}
      >
        Register as CMDA Member
      </Button>
    </AlertDescription>
  </Alert>
)}
```

#### Footer Link (Always Visible)
```tsx
<div className="pt-4 border-t border-border">
  <p className="text-sm text-muted-foreground text-center">
    Not a CMDA member yet?{' '}
    <a 
      href="https://cmdanigeria.net" 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-primary hover:underline font-medium"
    >
      Register here to become a member
    </a>
  </p>
</div>
```

---

## User Experience Scenarios

### Scenario 1: Existing Member (Happy Path)

```
1. User visits conference site
2. Sees "CMDA Members Only" info banner
3. Enters email: john.doe@example.com
4. Clicks "Lookup"
5. ✅ "Member found! Loading your information..."
6. Form auto-populates with all details
7. Auto-advances to Personal Info step after 1.5s
8. User reviews/edits details
9. Completes registration
10. Pays via Paystack
11. ✅ Registration complete!
```

### Scenario 2: Non-Member (Redirect Path)

```
1. User visits conference site
2. Sees "CMDA Members Only" info banner
3. Enters email: newuser@example.com
4. Clicks "Lookup"
5. ❌ "Email not found in our member database"
6. Sees message: "You need to be a registered CMDA member..."
7. Clicks "Register as CMDA Member" button
8. Opens cmdanigeria.net in new tab
9. Completes CMDA membership registration
10. Returns to conference site
11. Enters newly registered email
12. ✅ Member found!
13. Continues with conference registration
```

### Scenario 3: Typo in Email

```
1. User enters: john.deo@example.com (typo)
2. Clicks "Lookup"
3. ❌ "Email not found"
4. User realizes typo
5. Corrects to: john.doe@example.com
6. Clicks "Lookup" again
7. ✅ Member found!
```

---

## API Flow

### Member Lookup Request
```typescript
// Frontend
const memberData = await memberApi.lookupByEmail(email)

// API Call
GET /api/members/lookup?email=john.doe@example.com

// Backend (members.controller.ts)
@Get('lookup')
async lookupByEmail(@Query('email') email: string) {
  const member = await membersService.findByEmail(email)
  
  if (!member) {
    throw new NotFoundException('Member not found')
  }
  
  return member
}

// Backend (members.service.ts)
async findByEmail(email: string) {
  // Query MongoDB Atlas (existing member database)
  return this.memberModel.findOne({ 
    email: email.toLowerCase() 
  }).lean().exec()
}
```

### Response Examples

**Success (200):**
```json
{
  "email": "john.doe@example.com",
  "surname": "Doe",
  "firstName": "John",
  "otherNames": "Michael",
  "age": 35,
  "sex": "male",
  "phone": "+2348012345678",
  "chapter": "Lagos",
  "isCmdaMember": true,
  "category": "doctor",
  "yearsInPractice": "5-and-above",
  "chapterOfGraduation": "University of Lagos"
}
```

**Not Found (404):**
```json
{
  "statusCode": 404,
  "message": "Member not found"
}
```

---

## Key Features

### 1. Clear Messaging
- Info banner at top explains membership requirement
- Error message is helpful, not just "not found"
- Provides clear next steps

### 2. Easy Access to Registration
- Button directly in error message
- Footer link always visible
- Opens in new tab (doesn't lose progress)

### 3. Smooth UX
- Auto-advance when member found
- Loading states during lookup
- Success/error visual feedback
- Can retry lookup easily

### 4. Prevents Confusion
- Upfront about membership requirement
- Explains why email might not be found
- Guides user to solution

---

## Configuration

### Environment Variables

**Frontend (.env):**
```env
VITE_API_BASE_URL=https://your-backend.vercel.app/api
```

**Backend (.env):**
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DATABASE=cmda_members
```

### CMDA Website URL

The URL `https://cmdanigeria.net` is hardcoded in:
- `src/components/form-steps/EmailLookupStep.tsx` (line 96, 182)

To change it, update both locations:
```tsx
window.open('https://cmdanigeria.net', '_blank')
```

---

## Testing

### Test Cases

1. **Valid Member Email**
   - Input: Existing member email
   - Expected: Success, form populates, auto-advance

2. **Invalid Email**
   - Input: Non-existent email
   - Expected: Error message, "Register as CMDA Member" button

3. **Network Error**
   - Simulate: API failure
   - Expected: "Failed to lookup member. Please try again."

4. **Empty Email**
   - Input: Click lookup without email
   - Expected: "Please enter your email address"

5. **Invalid Format**
   - Input: "notanemail"
   - Expected: "Please enter a valid email address"

---

## Future Enhancements

1. **Email Verification**
   - Send verification code to email
   - Confirm user owns the email

2. **Partial Match**
   - Suggest similar emails if typo detected
   - "Did you mean: john.doe@example.com?"

3. **Multiple Accounts**
   - Handle users with multiple emails
   - Let them choose which profile to use

4. **Membership Status**
   - Show membership expiry date
   - Warn if membership expired
   - Link to renewal page

5. **Analytics**
   - Track how many non-members try to register
   - Identify conversion rate from redirect

---

## Support

If users have issues:
- Email: conference@cmdanigeria.org
- Membership: membership@cmdanigeria.org
- Technical: tech@cmdanigeria.org
