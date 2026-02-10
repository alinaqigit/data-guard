# Quick Start Guide - Tests & Critical Fixes

## 🚀 Run Tests Immediately

### Step 1: Install Dependencies

```bash
cd "f:\Programming\Projects\Electron + NEXT + Express\data-guard\src\server"
npm install
```

### Step 2: Run Tests

```bash
npm test
```

Expected output:

```
Test Suites: 9 passed, 9 total
Tests:       90+ passed, 90+ total
Coverage:    >80%
```

### Step 3: View Coverage

```bash
# After running tests, open:
coverage/index.html
```

---

## 🔧 Fix Critical Issues (15 minutes)

### Fix 1: CORS Configuration (2 min)

**File:** `src/app.ts` line 18-21

**Before:**

```typescript
const corsOptions = {
  origin: config.IS_PRODUCTION ? "null" : "localhost",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
```

**After:**

```typescript
const corsOptions = {
  origin: config.IS_PRODUCTION
    ? process.env.ALLOWED_ORIGIN || "https://yourapp.com"
    : "http://localhost:3000",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};
```

---

### Fix 2: Add Rate Limiting (5 min)

**Install:**

```bash
npm install express-rate-limit
```

**File:** `src/app.ts` - Add after imports

```typescript
import rateLimit from "express-rate-limit";

// Create rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: { error: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Apply to auth routes (before app.use('/api/auth', ...)):**

```typescript
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
```

---

### Fix 3: Password Validation (5 min)

**File:** `src/modules/auth/auth.service.ts` - Add helper function at top

```typescript
private validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null; // Valid
}
```

**Use in register method (after line 75):**

```typescript
public async register(dto: registerDTO): Promise<authResponse> {
  // 1. Check if the user already exists
  const user = this.authRepository.retreiveUserFromDB({
    username: dto.username,
  });

  if (user) {
    return {
      status: 409,
      error: "User already exists",
    };
  }

  // 1.5 Validate password strength
  const passwordError = this.validatePassword(dto.password);
  if (passwordError) {
    return {
      status: 400,
      error: passwordError,
    };
  }

  // 2. Hash the password...
```

---

### Fix 4: Session Expiration (3 min)

**File:** `src/modules/auth/auth.session.ts`

**Update interface (line 10):**

```typescript
interface Session extends SessionPayload {
  sessionId: string;
  expiresAt: Date;
}
```

**Update createSession (line 20):**

```typescript
public static createSession(payload: SessionPayload): string {
  const sessionId = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  this.sessions.set(sessionId, {
    ...payload,
    sessionId,
    expiresAt,
  });

  return sessionId;
}
```

**Update verifySession (line 35):**

```typescript
public static verifySession(sessionId: string): SessionPayload | null {
  const session = this.sessions.get(sessionId);

  if (!session) {
    return null;
  }

  // Check expiration
  if (new Date() > session.expiresAt) {
    this.sessions.delete(sessionId);
    return null;
  }

  return {
    userId: session.userId,
    username: session.username,
    createdAt: session.createdAt,
  };
}
```

---

## ✅ Verify Fixes

After making changes:

```bash
# Rebuild
npm run build

# Run tests
npm test

# Start server
npm run dev
```

Test manually:

```bash
# Register (should require strong password now)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test1234"}'

# Try rate limit (run 6 times quickly)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}'
```

---

## 📊 Expected Results

### After Fixes:

✅ **Weak passwords rejected**

```json
{
  "error": "Password must be at least 8 characters"
}
```

✅ **Rate limiting works**

```json
{
  "error": "Too many attempts, please try again later"
}
```

✅ **Sessions expire after 24h**

```json
{
  "error": "Invalid or expired session"
}
```

✅ **CORS configured properly**

- Production uses environment variable
- Development allows localhost

---

## 🧪 Test the Fixes

Create: `src/server/tests/security-fixes.test.ts`

```typescript
import request from "supertest";
import { createDataGuardApp } from "../src/app";
import { createTestDbPath, cleanupTestDb } from "./helpers";

describe("Security Fixes Validation", () => {
  let app: any;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = createTestDbPath();
    app = createDataGuardApp({
      IS_PRODUCTION: false,
      DB_PATH: testDbPath,
    });
  });

  afterEach(() => {
    cleanupTestDb(testDbPath);
  });

  it("should reject weak passwords", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ username: "testuser", password: "123" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Password must");
  });

  it("should accept strong passwords", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ username: "testuser", password: "Test1234" });

    expect(response.status).toBe(201);
  });
});
```

Run: `npm test`

---

## 📋 Checklist

Before production:

- [ ] All tests passing (`npm test`)
- [ ] Coverage >80%
- [ ] Rate limiting enabled
- [ ] Password validation working
- [ ] Session expiration set
- [ ] CORS configured
- [ ] Environment variables set
- [ ] Error logging added
- [ ] Database cleanup handler added

---

## 🆘 Troubleshooting

### Tests fail with "Cannot find module"

```bash
npm install
npm run build
npm test
```

### TypeScript errors

```bash
npx tsc --noEmit
```

### Rate limiter not working

```bash
# Check package installed
npm list express-rate-limit

# Verify import
# Should be: import rateLimit from 'express-rate-limit';
```

### Sessions not expiring

```bash
# Check system time
node -e "console.log(new Date())"

# Test with shorter expiry
expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes for testing
```

---

## 📞 Next Steps

1. ✅ Run tests: `npm test`
2. ✅ Apply critical fixes (above)
3. ✅ Re-run tests to verify
4. ✅ Review `SECURITY_ANALYSIS.md` for remaining issues
5. ✅ Read `tests/README.md` for test documentation

---

**Time to Complete:** ~15-20 minutes  
**Difficulty:** Easy  
**Impact:** High Security Improvement
