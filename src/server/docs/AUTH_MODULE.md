# Auth Module Documentation

## Overview

Complete authentication module with **session-based authentication** for offline Electron applications. No JWT tokens, no expiry—sessions persist in memory until logout or app restart.

## Features

✅ User registration with password hashing (Argon2)  
✅ User login with session ID generation  
✅ In-memory session management (no expiry)  
✅ Session verification for protected routes  
✅ Logout functionality  
✅ Authentication middleware for protected routes  
✅ Secure password handling (never exposed in responses)  
✅ Perfect for offline desktop applications

---

## Authentication Flow

1. **Register/Login** → Receive `sessionId`
2. **Store sessionId** → Client stores in memory/localStorage
3. **Protected requests** → Send `x-session-id` header
4. **Logout** → Session deleted from memory

---

## API Endpoints

### 1. **Register** - `POST /api/auth/register`

Create a new user account.

**Request Body:**

```json
{
  "username": "john_doe",
  "password": "secure_password123"
}
```

**Response (201):**

```json
{
  "user": {
    "id": 1,
    "username": "john_doe"
  },
  "sessionId": "a1b2c3d4e5f6...64-character-hex-string"
}
```

**Error Responses:**

- `409` - User already exists
- `400` - Invalid request (missing fields or wrong types)

---

### 2. **Login** - `POST /api/auth/login`

Authenticate existing user.

**Request Body:**

```json
{
  "username": "john_doe",
  "password": "secure_password123"
}
```

**Response (200):**

```json
{
  "user": {
    "id": 1,
    "username": "john_doe"
  },
  "sessionId": "a1b2c3d4e5f6...64-character-hex-string"
}
```

**Error Responses:**

- `404` - User not found
- `401` - Invalid credentials
- `400` - Invalid request

---

### 3. **Logout** - `POST /api/auth/logout`

End user session.

**Headers:**

```
x-session-id: <your-session-id>
```

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

**Error Responses:**

- `400` - No session ID provided
- `404` - Session not found

---

### 4. **Verify Session** - `GET /api/auth/verify` 🔒

Verify session and get user data (Protected route).

**Headers:**

```
x-session-id: <your-session-id>
```

**Response (200):**

```json
{
  "id": 1,
  "username": "john_doe"
}
```

**Error Responses:**

- `401` - Invalid or expired session
- `404` - User not found

---

### 5. **Get Current User** - `GET /api/auth/me` 🔒

Get current authenticated user info (Protected route).

**Headers:**

```
x-session-id: <your-session-id>
```

**Response (200):**

```json
{
  "user": {
    "userId": 1,
    "username": "john_doe",
    "createdAt": "2026-02-10T12:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` - No session ID provided / Invalid session

---

## Authentication Headers

### For Protected Routes

All protected routes require the session ID in headers:

```javascript
headers: {
  'x-session-id': '<your-session-id>'
}
```

---

## Integration Examples

### React/Next.js Frontend

**1. Login Function:**

```typescript
const login = async (username: string, password: string) => {
  const response = await fetch(
    "http://localhost:3000/api/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
  );

  const data = await response.json();

  if (response.ok) {
    // Store session ID
    localStorage.setItem("sessionId", data.sessionId);
    return data;
  }

  throw new Error(data.error);
};
```

**2. Register Function:**

```typescript
const register = async (username: string, password: string) => {
  const response = await fetch(
    "http://localhost:3000/api/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
  );

  const data = await response.json();

  if (response.ok) {
    // Store session ID
    localStorage.setItem("sessionId", data.sessionId);
    return data;
  }

  throw new Error(data.error);
};
```

**3. Logout Function:**

```typescript
const logout = async () => {
  const sessionId = localStorage.getItem("sessionId");

  await fetch("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers: { "x-session-id": sessionId },
  });

  localStorage.removeItem("sessionId");
};
```

**4. Protected API Requests:**

```typescript
const fetchProtectedData = async () => {
  const sessionId = localStorage.getItem("sessionId");

  const response = await fetch(
    "http://localhost:3000/api/protected-endpoint",
    {
      headers: { "x-session-id": sessionId },
    },
  );

  return response.json();
};
```

**5. API Interceptor (Axios):**

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000/api",
});

// Add session ID to all requests
api.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    config.headers["x-session-id"] = sessionId;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("sessionId");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
```

---

## Using the Auth Middleware

### Protecting Routes

```typescript
import { authMiddleware } from "./modules/auth";

// Protect a route
router.get(
  "/protected",
  authMiddleware.verifySession,
  (req: AuthenticatedRequest, res: Response) => {
    // Access user data from req.user
    const { userId, username } = req.user;
    res.json({ message: `Hello ${username}` });
  },
);
```

### Optional Authentication

```typescript
import { authMiddleware } from "./modules/auth";

// Route works with or without authentication
router.get(
  "/optional",
  authMiddleware.optionalAuth,
  (req: AuthenticatedRequest, res: Response) => {
    if (req.user) {
      res.json({ message: `Welcome back ${req.user.username}` });
    } else {
      res.json({ message: "Welcome guest" });
    }
  },
);
```

---

## Session Management

### In-Memory Storage

Sessions are stored in memory using a `Map<string, Session>`:

- **sessionId**: 64-character hex string (256-bit random)
- **userId**: User's database ID
- **username**: User's username
- **createdAt**: Session creation timestamp

### Session Lifecycle

1. **Created**: On successful login/register
2. **Active**: Until logout or app restart
3. **Destroyed**: On logout or manual cleanup

### Clearing Sessions

```typescript
import { SessionManager } from "./modules/auth";

// Clear all sessions (e.g., on app shutdown)
SessionManager.clearAllSessions();

// Get active session count
const count = SessionManager.getActiveSessionCount();
```

---

## Security Features

### Password Security

- Passwords hashed using **Argon2** (industry standard)
- Never stored or transmitted in plain text
- Password hash never included in API responses

### Session Security

- Cryptographically secure random session IDs (32 bytes)
- Session validation on every protected request
- Sessions isolated in memory (not shared between app instances)
- No session expiry needed for offline apps

### Input Validation

- Request body validation via DTOs
- Type checking for all inputs
- Required field validation
- Sanitized error messages

---

## Error Handling

### Standard Error Format

```json
{
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- **200** - Success (GET, POST operations)
- **201** - Created (registration)
- **400** - Bad Request (invalid input)
- **401** - Unauthorized (invalid session)
- **404** - Not Found (user/session doesn't exist)
- **409** - Conflict (user already exists)

---

## TypeScript Types

### SessionPayload

```typescript
interface SessionPayload {
  userId: number;
  username: string;
  createdAt: Date;
}
```

### AuthenticatedRequest

```typescript
interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
}
```

### Auth Response

```typescript
interface authResponse {
  status: number;
  body?: any;
  error?: string;
}
```

---

## Best Practices

### Frontend

✅ Store `sessionId` in localStorage or secure state management  
✅ Include session ID in all protected requests  
✅ Handle 401 errors and redirect to login  
✅ Clear session data on logout  
✅ Never store passwords in frontend

### Backend

✅ Always use middleware for protected routes  
✅ Validate session on every request  
✅ Never expose password hashes  
✅ Clear sessions on app shutdown (if needed)  
✅ Use HTTPS in production (even for local apps)

---

## Module Structure

```
src/modules/auth/
├── auth.module.ts          # Main module export
├── auth.session.ts         # Session management
├── auth.service.ts         # Business logic
├── auth.controller.ts      # Route handlers
├── auth.middleware.ts      # Auth middleware
├── auth.repository.ts      # Database operations
├── auth.types.ts           # Type definitions
└── dto/
    ├── login.dto.ts        # Login validation
    ├── register.dto.ts     # Register validation
    └── CustomRequest.dto.ts # Request types
```

---

## Advantages of Session-Based Auth (vs JWT)

For **Offline Electron Apps**:

✅ **Simpler** - No token signing/verification  
✅ **Faster** - No cryptographic operations  
✅ **No Expiry** - Sessions persist until logout  
✅ **Lightweight** - No external dependencies  
✅ **Perfect for Offline** - No need for token refresh  
✅ **Memory Efficient** - Clean up on app close

---

## Testing

### Test User Creation

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "testpass123"}'
```

### Test Protected Route

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "x-session-id: <your-session-id>"
```

### Test Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "x-session-id: <your-session-id>"
```

---

## Troubleshooting

### Issue: "No session ID provided"

**Solution**: Ensure `x-session-id` header is included in requests

### Issue: "Invalid or expired session"

**Solutions**:

- Session may have been cleared on app restart
- User needs to login again
- Check if session ID is correct

### Issue: "User already exists"

**Solution**: Username is taken, choose a different username

### Issue: Database errors

**Solution**: Check `DB_PATH` is correct and directory is writable

---

## Migration from JWT

If migrating from JWT authentication:

1. ✅ Update frontend to use `x-session-id` header instead of `Authorization: Bearer`
2. ✅ Store `sessionId` instead of `accessToken`/`refreshToken`
3. ✅ Remove token refresh logic
4. ✅ Update API client interceptors
5. ✅ Test all authentication flows

---

## Support

For issues or questions:

- Check this documentation
- Review code examples above
- Test endpoints with curl/Postman
- Verify session ID is being sent correctly

**Headers:**

```
Authorization: Bearer <accessToken>
```

**Response (200):**

```json
{
  "user": {
    "userId": 1,
    "username": "john_doe"
  }
}
```

**Error Responses:**

- `401` - Authentication errors

---

## Using Authentication in Other Modules

### Protect Routes with Middleware

```typescript
import { authMiddleware, AuthenticatedRequest } from "../auth";
import { Router, Response } from "express";

const router = Router();

// Protected route - requires valid token
router.get(
  "/policies",
  authMiddleware.verifyToken,
  (req: AuthenticatedRequest, res: Response) => {
    // Access user info from req.user
    const userId = req.user?.userId;
    const username = req.user?.username;

    res.json({ policies: [...], user: req.user });
  }
);

// Optional auth - continues even without token
router.get(
  "/public-data",
  authMiddleware.optionalAuth,
  (req: AuthenticatedRequest, res: Response) => {
    // req.user will be undefined if no valid token
    if (req.user) {
      // Return user-specific data
    } else {
      // Return public data
    }
  }
);
```

### Example: Creating a Policies Module

```typescript
// policies.controller.ts
import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "../auth";
import { policiesService } from "./policies.service";

export class policiesController {
  private readonly policiesService: policiesService;
  private readonly policiesRouter: Router;

  constructor(policiesService: policiesService) {
    this.policiesService = policiesService;
    this.policiesRouter = Router();
    this.mapRoutes();
  }

  public getRouter() {
    return this.policiesRouter;
  }

  private mapRoutes() {
    // All routes are protected
    this.policiesRouter.use(authMiddleware.verifyToken);

    this.policiesRouter.get(
      "/",
      async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.userId; // Safe to use ! because middleware verified
        const policies =
          await this.policiesService.getUserPolicies(userId);
        res.json(policies);
      },
    );

    this.policiesRouter.post(
      "/",
      async (req: AuthenticatedRequest, res: Response) => {
        const userId = req.user!.userId;
        const policy = await this.policiesService.createPolicy(
          userId,
          req.body,
        );
        res.status(201).json(policy);
      },
    );
  }
}
```

---

## Token Management

### Access Token

- **Expiry:** 15 minutes
- **Purpose:** Authenticate API requests
- **Storage:** Memory (React state) or sessionStorage
- **Header format:** `Authorization: Bearer <token>`

### Refresh Token

- **Expiry:** 7 days
- **Purpose:** Get new access tokens
- **Storage:** httpOnly cookie (recommended) or localStorage
- **Should be:** Kept secure, used only for `/refresh` endpoint

### Client-Side Token Flow

```typescript
// Example in React/Frontend
class AuthService {
  async login(username: string, password: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    // Store tokens
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);

    return data;
  }

  async refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);

    return data;
  }

  async makeAuthenticatedRequest(url: string) {
    let accessToken = localStorage.getItem("accessToken");

    let response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // If token expired, refresh and retry
    if (response.status === 401) {
      await this.refreshAccessToken();
      accessToken = localStorage.getItem("accessToken");

      response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    }

    return response.json();
  }
}
```

---

## Environment Variables

For production, set these environment variables:

```bash
ACCESS_TOKEN_SECRET=your-super-secret-access-key-min-32-chars
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-min-32-chars
```

⚠️ **Security Note:** Current defaults are for development only!

---

## Module Structure

```
auth/
├── auth.module.ts          # Module aggregator with DI
├── auth.controller.ts      # HTTP routes and request handling
├── auth.service.ts         # Business logic (login, register, refresh, verify)
├── auth.repository.ts      # Database access layer
├── auth.middleware.ts      # JWT verification middleware
├── auth.jwt.ts            # JWT token generation and verification
├── auth.types.ts          # Response types
├── index.ts               # Exports for other modules
└── dto/
    ├── login.dto.ts
    ├── register.dto.ts
    ├── refresh-token.dto.ts
    ├── CustomRequest.dto.ts
    └── Parent.dto.ts
```

---

## Next Steps

### For Future Modules (policies, threats, alerts, etc.):

1. **Import auth utilities:**

```typescript
import { authMiddleware, AuthenticatedRequest } from "../auth";
```

2. **Protect routes:**

```typescript
router.use(authMiddleware.verifyToken); // All routes protected
// or
router.get("/specific", authMiddleware.verifyToken, handler); // Specific route
```

3. **Access user info:**

```typescript
const userId = req.user!.userId;
const username = req.user!.username;
```

4. **Follow the same module pattern:**
   - `module.ts` - Aggregator with dependency injection
   - `controller.ts` - Routes
   - `service.ts` - Business logic
   - `repository.ts` - Database access
   - `dto/` - Request validation

---

## Support

For issues or questions:

- Check this documentation
- Review code examples above
- Test endpoints with curl/Postman
- Verify session ID is being sent correctly

---

**Last Updated:** February 10, 2026  
**Auth Type:** Session-Based (Offline Electron App)  
**No Token Expiry** | **In-Memory Sessions** | **Perfect for Desktop Apps**
