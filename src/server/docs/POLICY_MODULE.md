# Policy Management Module Documentation

## Overview

The Policy Management Module provides a complete RESTful API for managing data scanning policies. Policies define keywords or regex patterns that the scanner module will use to detect sensitive data in files.

## Architecture

The module follows a layered architecture pattern consistent with the rest of the application:

```
policyModule
├── policyController  (API Routes & Request Handling)
├── policyService     (Business Logic & Validation)
├── policyRepository  (Data Access Layer)
└── db.policy         (Database Operations)
```

## Database Schema

### Policies Table

```sql
CREATE TABLE IF NOT EXISTS policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('keyword', 'regex')),
  description TEXT,
  is_enabled INTEGER DEFAULT 1 CHECK(is_enabled IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Constraints:**

- `user_id`: Foreign key to users table with CASCADE delete
- `type`: Must be either 'keyword' or 'regex'
- `is_enabled`: Boolean flag (0 = disabled, 1 = enabled), defaults to enabled
- Policies are automatically deleted when the owning user is deleted

## API Endpoints

All policy endpoints require authentication via `x-session-id` header.

### Create Policy

**POST** `/api/policies`

Creates a new policy for the authenticated user.

**Request Body:**

```json
{
  "name": "Credit Card Policy",
  "pattern": "4111-1111-1111-1111",
  "type": "keyword",
  "description": "Detects credit card numbers"
}
```

**Response:** `201 Created`

```json
{
  "id": 1,
  "userId": 1,
  "name": "Credit Card Policy",
  "pattern": "4111-1111-1111-1111",
  "type": "keyword",
  "description": "Detects credit card numbers",
  "isEnabled": true,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid type or regex pattern
- `401 Unauthorized`: Missing or invalid session

---

### Get All Policies

**GET** `/api/policies`

Retrieves all policies for the authenticated user.

**Response:** `200 OK`

```json
[
  {
    "id": 2,
    "userId": 1,
    "name": "Email Policy",
    "pattern": "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
    "type": "regex",
    "description": "Detects email addresses",
    "isEnabled": true,
    "createdAt": "2026-02-12T11:00:00.000Z",
    "updatedAt": "2026-02-12T11:00:00.000Z"
  },
  {
    "id": 1,
    "userId": 1,
    "name": "Credit Card Policy",
    "pattern": "4111-1111-1111-1111",
    "type": "keyword",
    "description": "Detects credit card numbers",
    "isEnabled": false,
    "createdAt": "2026-02-12T10:30:00.000Z",
    "updatedAt": "2026-02-12T10:30:00.000Z"
  }
]
```

**Note:** Results are ordered by ID descending (most recent first).

---

### Get Single Policy

**GET** `/api/policies/:id`

Retrieves a specific policy by ID.

**Response:** `200 OK`

```json
{
  "id": 1,
  "userId": 1,
  "name": "Credit Card Policy",
  "pattern": "4111-1111-1111-1111",
  "type": "keyword",
  "description": "Detects credit card numbers",
  "isEnabled": true,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T10:30:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid policy ID
- `403 Forbidden`: Policy belongs to different user
- `404 Not Found`: Policy does not exist

---

### Update Policy

**PUT** `/api/policies/:id`

Updates an existing policy. Only provided fields are updated.

**Request Body:**

```json
{
  "name": "Updated Name",
  "pattern": "new-pattern",
  "type": "regex",
  "description": "Updated description"
}
```

**Response:** `200 OK`

```json
{
  "id": 1,
  "userId": 1,
  "name": "Updated Name",
  "pattern": "new-pattern",
  "type": "regex",
  "description": "Updated description",
  "isEnabled": true,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-12T12:00:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid type or regex pattern
- `403 Forbidden`: Policy belongs to different user
- `404 Not Found`: Policy does not exist

---

### Toggle Policy Status

**PATCH** `/api/policies/:id/toggle`

Toggles a policy between enabled and disabled states.

**Response:** `200 OK`

```json
{
  "id": 1,
  "userId": 1,
  "name": "Credit Card Policy",
  "pattern": "4111-1111-1111-1111",
  "type": "keyword",
  "description": "Detects credit card numbers",
  "isEnabled": false,
  "createdAt": "2026-02-12T10:30:00.000Z",
  "updatedAt": "2026-02-13T11:45:00.000Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid policy ID
- `403 Forbidden`: Policy belongs to different user
- `404 Not Found`: Policy does not exist

---

### Delete Policy

**DELETE** `/api/policies/:id`

Permanently deletes a policy.

**Response:** `200 OK`

```json
{
  "message": "Policy deleted successfully"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid policy ID
- `403 Forbidden`: Policy belongs to different user
- `404 Not Found`: Policy does not exist

---

## Policy Types

### Keyword

Simple string matching. The scanner will look for exact occurrences of the pattern in files.

**Example:**

```json
{
  "name": "API Key",
  "pattern": "sk-live-abc123",
  "type": "keyword"
}
```

### Regex

Pattern matching using regular expressions. The scanner will test the pattern against file content.

**Example:**

```json
{
  "name": "SSN Pattern",
  "pattern": "\\d{3}-\\d{2}-\\d{4}",
  "type": "regex"
}
```

**Validation:**

- Regex patterns are validated before saving
- Invalid regex patterns return a `400 Bad Request` error

---

## Security Features

### Authentication

All policy endpoints require a valid session. The session ID must be provided in the `x-session-id` header.

### Authorization

- Users can only access their own policies
- Attempting to access another user's policy returns `403 Forbidden`
- Policy ownership is enforced at the database level via foreign keys

### Data Isolation

- Database queries filter by `user_id` automatically
- Foreign key constraints ensure referential integrity
- Cascading deletes remove all policies when a user is deleted

---

## Usage Examples

### JavaScript/TypeScript

```typescript
// Create a policy
const response = await fetch("http://localhost:4000/api/policies", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-session-id": sessionId,
  },
  body: JSON.stringify({
    name: "Password Pattern",
    pattern: "password\\s*=\\s*[\"'][^\"']+[\"']",
    type: "regex",
    description: "Detects hardcoded passwords",
  }),
});

const policy = await response.json();

// Get all policies
const policies = await fetch("http://localhost:4000/api/policies", {
  headers: {
    "x-session-id": sessionId,
  },
}).then((res) => res.json());

// Update a policy
await fetch(`http://localhost:4000/api/policies/${policy.id}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "x-session-id": sessionId,
  },
  body: JSON.stringify({
    name: "Updated Password Pattern",
    pattern: "password\\s*[:=]\\s*[\"'][^\"']+[\"']",
    type: "regex",
    description: "Enhanced password detection",
  }),
});

// Toggle policy status (enable/disable)
const toggleResponse = await fetch(
  `http://localhost:4000/api/policies/${policy.id}/toggle`,
  {
    method: "PATCH",
    headers: {
      "x-session-id": sessionId,
    },
  },
);
const updatedPolicy = await toggleResponse.json();
console.log(
  `Policy is now ${updatedPolicy.isEnabled ? "enabled" : "disabled"}`,
);

// Delete a policy
await fetch(`http://localhost:4000/api/policies/${policy.id}`, {
  method: "DELETE",
  headers: {
    "x-session-id": sessionId,
  },
});
```

---

## Integration with Scanner Module

The Policy Management Module is designed to work seamlessly with the Scanner Module:

1. **Policy Retrieval**: Scanner fetches all policies for a user
2. **Status Filtering**: Scanner only applies enabled policies (isEnabled: true)
3. **Pattern Matching**: Scanner applies each enabled policy's pattern to scanned files
4. **Type Handling**: Scanner uses different matching algorithms for keyword vs regex
5. **Result Reporting**: Scanner references policy IDs when reporting matches

**Example Integration:**

```typescript
// In scanner module
const policyService = new policyService(DB_PATH);
const policiesResponse = await policyService.getAllPolicies(userId);
const policies = policiesResponse.body;

// Filter for enabled policies only
const enabledPolicies = policies.filter((p) => p.isEnabled);

for (const policy of enabledPolicies) {
  if (policy.type === "keyword") {
    // Simple string search
    if (fileContent.includes(policy.pattern)) {
      reportMatch(file, policy);
    }
  } else if (policy.type === "regex") {
    // Regex matching
    const regex = new RegExp(policy.pattern, "g");
    const matches = fileContent.matchAll(regex);
    for (const match of matches) {
      reportMatch(file, policy, match);
    }
  }
}
```

---

## Module Structure

### Files

```
src/server/src/modules/policy/
├── policy.module.ts          # Module orchestration
├── policy.controller.ts      # HTTP request handling
├── policy.service.ts         # Business logic
├── policy.repository.ts      # Data access
├── policy.types.ts           # Type definitions
└── dto/
    ├── createPolicy.dto.ts   # Create DTO
    ├── updatePolicy.dto.ts   # Update DTO
    ├── CustomRequest.dto.ts  # Request interface
    ├── Parent.dto.ts         # Base DTO
    └── index.ts              # Exports

src/server/src/modules/db/
└── db.policy.ts              # Database operations

src/server/src/entities/
└── policy.entity.ts          # Type definitions

src/server/tests/
├── unit/
│   ├── policy.service.test.ts     # Service unit tests
│   └── db.policy.test.ts          # DB unit tests
└── integration/
    └── policy.integration.test.ts  # API integration tests
```

### Dependencies

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "better-sqlite3-multiple-ciphers": "^12.6.2"
  }
}
```

---

## Error Handling

### Validation Errors (400)

```json
{
  "error": "Type must be either 'keyword' or 'regex'"
}
```

```json
{
  "error": "Invalid regex pattern"
}
```

```json
["name is required", "pattern cannot be empty"]
```

### Authentication Errors (401)

```json
{
  "error": "Unauthorized"
}
```

### Authorization Errors (403)

```json
{
  "error": "Access denied"
}
```

### Not Found Errors (404)

```json
{
  "error": "Policy not found"
}
```

### Server Errors (500)

```json
{
  "error": "Failed to create policy"
}
```

---

## Testing

### Test Coverage

- **Unit Tests**: 50+ tests covering service and database layers
- **Integration Tests**: 30+ tests covering full API workflows
- **Test Files**:
  - `tests/unit/policy.service.test.ts`
  - `tests/unit/db.policy.test.ts`
  - `tests/integration/policy.integration.test.ts`

### Running Tests

```bash
# All policy tests
npm test -- policy

# Unit tests only
npm run test:unit -- policy

# Integration tests only
npm run test:integration -- policy

# With coverage
npm test -- --coverage policy
```

### Test Scenarios

- ✅ CRUD operations
- ✅ Toggle policy enable/disable status
- ✅ Authentication/authorization
- ✅ Input validation
- ✅ Regex pattern validation
- ✅ User isolation
- ✅ Error handling
- ✅ Cascading deletes
- ✅ Empty result sets

---

## Best Practices

### Creating Effective Policies

1. **Descriptive Names**: Use clear, specific names

   ```json
   ✅ "Credit Card Numbers (Visa/MC)"
   ❌ "Policy 1"
   ```

2. **Test Regex Patterns**: Validate patterns before deployment

   ```javascript
   // Test regex in console first
   const pattern = /\d{3}-\d{2}-\d{4}/;
   console.log(pattern.test("123-45-6789")); // true
   ```

3. **Use Keywords for Exact Matches**: Faster than regex

   ```json
   {
     "pattern": "api_key_12345",
     "type": "keyword"
   }
   ```

4. **Escape Special Characters**: In regex patterns
   ```json
   {
     "pattern": "\\$\\{.*\\}", // Matches ${...}
     "type": "regex"
   }
   ```

### Performance Considerations

- Keyword policies are faster than regex
- Compile regex patterns once in scanner
- Limit number of active policies per user
- Use specific patterns over generic ones

---

## Future Enhancements

- [ ] Policy groups/categories
- [ ] Policy sharing between users
- [ ] Policy templates/presets
- [ ] Policy priority/ordering
- [ ] Policy usage statistics
- [ ] Bulk policy import/export
- [ ] Policy version history

---

## Support

For issues or questions:

- Check test files for usage examples
- Review error messages carefully
- Ensure patterns are properly escaped
- Verify session authentication is working

---

## License

Part of the Data Guard project
