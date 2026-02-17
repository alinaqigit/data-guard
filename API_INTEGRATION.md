# API Integration Documentation

## Overview

The DataGuard renderer has been successfully integrated with the Express server backend. All mock implementations have been replaced with actual API calls to the server.

## Changes Made

### 1. API Service Layer (`src/renderer/lib/api/`)

Created a comprehensive API service layer with the following modules:

- **`types.ts`**: TypeScript interfaces matching server API responses
- **`client.ts`**: HTTP client with session management
- **`auth.service.ts`**: Authentication endpoints (login, register, logout, verify)
- **`policy.service.ts`**: Policy management endpoints (CRUD operations)
- **`scanner.service.ts`**: File scanning endpoints (start scan, get scans, cancel)
- **`liveScanner.service.ts`**: Live scanner endpoints (start, stop, pause, resume)
- **`index.ts`**: Centralized exports

### 2. Updated Security Context (`src/renderer/context/SecurityContext.tsx`)

The Security Context now:

- Uses real API calls instead of mock data
- Automatically verifies sessions on mount
- Loads policies and scans from the server
- Handles async operations with proper error handling
- Maps API responses to UI-friendly formats

### 3. Updated Pages

#### Login Page (`src/renderer/app/login/page.tsx`)

- Async login with error handling
- Loading states during authentication
- Error messages displayed to users

#### Signup Page (`src/renderer/app/signup/page.tsx`)

- Real user registration via API
- Automatic login after successful signup
- Loading states and error handling

#### Scanner Page (`src/renderer/app/scanner/page.tsx`)

- Async scan execution
- Polling for scan completion
- Real-time scan status updates

#### Policies Page (`src/renderer/app/policies/page.tsx`)

- Async policy CRUD operations
- Pattern field support (keyword/regex)
- Error handling for all operations

### 4. Updated Components

#### PolicyModal (`src/renderer/components/PolicyModal.tsx`)

- Added pattern field for defining detection rules
- Supports both keyword and regex patterns

## Configuration

### Environment Variables

Create a `.env.local` file in `src/renderer/` with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

For production builds in Electron, the API will use:

- Development: `http://localhost:3000`
- Production: Server embedded in Electron app

## API Authentication

### Session Management

The application uses session-based authentication:

1. **Login/Register**: Returns a `sessionId` that's stored in localStorage
2. **Protected Requests**: Include `x-session-id` header automatically
3. **Session Verification**: Auto-verified on app load
4. **Logout**: Clears session from both client and server

### Session Storage

```typescript
// Session ID is stored in localStorage
localStorage.getItem('sessionId')

// Automatically included in API requests
headers: {
  'x-session-id': sessionId
}
```

## API Endpoints Used

### Authentication

- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End session
- `GET /api/auth/verify` - Verify session
- `GET /api/auth/me` - Get current user

### Policies

- `GET /api/policies` - Get all policies
- `GET /api/policies/:id` - Get single policy
- `POST /api/policies` - Create policy
- `PUT /api/policies/:id` - Update policy
- `PATCH /api/policies/:id/toggle` - Toggle enabled status
- `DELETE /api/policies/:id` - Delete policy

### Scanner

- `POST /api/scans` - Start new scan
- `GET /api/scans` - Get scan history
- `GET /api/scans/:id` - Get scan details
- `GET /api/scans/:id/progress` - Get scan progress
- `PATCH /api/scans/:id/cancel` - Cancel scan
- `DELETE /api/scans/:id` - Delete scan

### Live Scanner

- `POST /api/live-scanners` - Start live scanner
- `GET /api/live-scanners` - Get all live scanners
- `GET /api/live-scanners/:id` - Get scanner details
- `GET /api/live-scanners/:id/stats` - Get scanner statistics
- `POST /api/live-scanners/:id/stop` - Stop scanner
- `POST /api/live-scanners/:id/pause` - Pause scanner
- `POST /api/live-scanners/:id/resume` - Resume scanner
- `DELETE /api/live-scanners/:id` - Delete scanner

## Data Flow

### 1. Application Startup

```
User opens app
  ↓
SecurityContext checks for sessionId in localStorage
  ↓
If sessionId exists → Verify with server
  ↓
If valid → Load policies and scans
  ↓
If invalid → Redirect to login
```

### 2. User Login

```
User enters credentials
  ↓
POST /api/auth/login
  ↓
Receive sessionId and user data
  ↓
Store sessionId in localStorage
  ↓
Load policies and scans from server
  ↓
Redirect to dashboard
```

### 3. Running a Scan

```
User configures and starts scan
  ↓
POST /api/scans with scan configuration
  ↓
Receive scanId
  ↓
Poll GET /api/scans/:id every 2 seconds
  ↓
When status !== 'running'
  ↓
Update UI and generate alerts if threats found
```

### 4. Managing Policies

```
User creates/updates/deletes policy
  ↓
API call with policy data
  ↓
Server validates and persists
  ↓
UI updates with server response
  ↓
Show success/error toast
```

## Error Handling

All API functions include try-catch blocks:

```typescript
try {
  await apiService.someOperation();
  // Show success message
} catch (error) {
  // Show error message
  console.error("Operation failed:", error);
  throw error;
}
```

Errors are displayed to users via toast notifications.

## Type Safety

All API responses are strongly typed:

```typescript
// Server response
interface Policy {
  id: number;
  userId: number;
  name: string;
  pattern: string;
  type: "keyword" | "regex";
  description?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// UI representation
interface UiPolicy {
  id: string;
  name: string;
  description: string;
  type: string;
  pattern: string;
  status: "Active" | "Disabled";
}
```

Mapping functions convert between API and UI formats.

## Testing the Integration

### Prerequisites

1. Start the server:

```bash
cd src/server
npm run dev
```

2. Start the renderer:

```bash
cd src/renderer
npm run dev
```

### Test Scenarios

#### 1. User Registration

- Navigate to `/signup`
- Enter username and password
- Submit form
- Should create account and redirect to dashboard

#### 2. User Login

- Navigate to `/login`
- Enter credentials
- Submit form
- Should authenticate and show dashboard

#### 3. Policy Management

- Navigate to `/policies`
- Click "New Policy"
- Fill in name, pattern, type, and description
- Save policy
- Should create policy and show in list

#### 4. File Scanning

- Navigate to `/scanner`
- Enter a valid path
- Select scan type
- Click "Start Scan"
- Should initiate scan and show progress

#### 5. Session Persistence

- Log in
- Refresh the page
- Should remain logged in

#### 6. Logout

- Click logout button
- Should clear session and redirect to login

## Troubleshooting

### Issue: "Failed to fetch" errors

**Solution**: Ensure the server is running on `http://localhost:3000`

### Issue: "Invalid session" after refresh

**Solution**: Check that sessionId is being stored in localStorage and the server session hasn't expired

### Issue: Policy creation fails

**Solution**: Ensure the pattern field is filled and the type is either 'keyword' or 'regex'

### Issue: Scan doesn't start

**Solution**:

1. Check that at least one active policy exists
2. Verify the target path is valid and accessible
3. Check server logs for errors

## Future Enhancements

Potential improvements:

1. **Real-time Updates**: Use WebSocket for live scan progress
2. **Offline Support**: Cache policies and scans for offline access
3. **Retry Logic**: Auto-retry failed requests with exponential backoff
4. **Request Cancellation**: Cancel in-flight requests when component unmounts
5. **Optimistic Updates**: Update UI before server response confirms
6. **Pagination**: Implement pagination for large policy/scan lists
7. **Search & Filter**: Add search and filtering capabilities

## Summary

The renderer is now fully integrated with the Express server backend. All mock implementations have been removed and replaced with real API calls. The application provides:

- ✅ Real user authentication
- ✅ Session management
- ✅ Policy CRUD operations
- ✅ File scanning with real results
- ✅ Error handling and user feedback
- ✅ Type-safe API interactions
- ✅ Persistent sessions across page refreshes
