# Server Tests

Comprehensive test suite for the Data Guard authentication server.

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── helpers.ts                  # Test utilities and helpers
├── unit/                       # Unit tests
│   ├── auth.session.test.ts    # SessionManager tests
│   ├── auth.middleware.test.ts # Auth middleware tests
│   ├── auth.service.test.ts    # Auth service tests
│   ├── auth.repository.test.ts # Auth repository tests
│   ├── db.user.test.ts         # User database tests
│   └── db.repository.test.ts   # DB repository tests
└── integration/                # Integration tests
    ├── auth.integration.test.ts # Full auth API tests
    ├── app.integration.test.ts  # Application setup tests
    └── security.test.ts         # Security-focused tests
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Only Unit Tests

```bash
npm run test:unit
```

### Run Only Integration Tests

```bash
npm run test:integration
```

### View Coverage Report

After running tests, coverage report is generated in `coverage/` directory.

```bash
npm test
# Open coverage/index.html in browser
```

## Test Coverage

The test suite provides comprehensive coverage of:

### Unit Tests

- **SessionManager**: Session creation, verification, deletion, cleanup
- **Auth Middleware**: Session verification, optional auth, error handling
- **Auth Service**: Register, login, logout, verify session
- **Auth Repository**: User CRUD operations, database interactions
- **DB User**: User management business logic
- **DB Repository**: Low-level database operations

### Integration Tests

- **Auth API**: Full authentication flow via HTTP
- **Application**: App setup, CORS, middleware configuration
- **Security**: Password handling, session isolation, input validation, SQL injection prevention

## Test Helpers

### Available Helpers (from `helpers.ts`)

- `createTestDbPath()`: Creates isolated test database directory
- `cleanupTestDb(path)`: Removes test database after tests
- `mockRequest(options)`: Creates mock Express request
- `mockResponse()`: Creates mock Express response with jest spies
- `mockNext()`: Creates mock Express next function
- `generateTestUser(overrides)`: Generates unique test user data
- `wait(ms)`: Async delay utility

## Writing New Tests

### Unit Test Example

```typescript
import { SessionManager } from "../../src/modules/auth/auth.session";

describe("MyFeature", () => {
  beforeEach(() => {
    // Setup
    SessionManager.clearAllSessions();
  });

  it("should do something", () => {
    // Test implementation
    expect(true).toBe(true);
  });
});
```

### Integration Test Example

```typescript
import request from "supertest";
import { createDataGuardApp } from "../../src/app";
import { createTestDbPath, cleanupTestDb } from "../helpers";

describe("My API Integration", () => {
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

  it("should make API call", async () => {
    const response = await request(app)
      .get("/api/endpoint")
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
```

## Test Database

Tests use isolated SQLite databases in `temp-test-dbs/` directory. Each test gets its own database to prevent interference. All test databases are automatically cleaned up after tests complete.

## Continuous Integration

Tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run Single Test File

```bash
npx jest tests/unit/auth.session.test.ts
```

### Run Single Test

```bash
npx jest -t "should create a new session"
```

### Debug with Node Inspector

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Configuration

Tests are configured in `jest.config.ts`:

- TypeScript support via ts-jest
- Node environment
- Coverage collection from `src/` directory
- Automatic mock clearing between tests

## Known Issues & Limitations

1. Tests use in-memory sessions - server restart behavior not tested
2. Rate limiting not implemented yet - tests will be added when implemented
3. Session expiration not implemented - tests will be added when implemented
4. No performance/load tests included

## Contributing

When adding new features:

1. Write unit tests for all new functions/classes
2. Add integration tests for new API endpoints
3. Ensure coverage remains above 80%
4. Update this README if adding new test patterns

## Test Metrics

Current test counts:

- Unit tests: 50+ test cases
- Integration tests: 40+ test cases
- Total assertions: 200+

Target coverage: >80% line coverage
