# Data Guard Backend — Comprehensive Audit Report

## Table of Contents

1. [Module-to-Test Mapping](#1-module-to-test-mapping)
2. [Test Helpers (`tests/helpers.ts`)](#2-test-helpers)
3. [Key Test Patterns & Conventions](#3-key-test-patterns--conventions)
4. [What's NOT Tested](#4-whats-not-tested)
5. [Key Functions Needing Tests per Untested Module](#5-key-functions-needing-tests-per-untested-module)

---

## 1. Module-to-Test Mapping

### Source File Inventory

| Module                | Source Files                                                                                                                                                               | Unit Tests                                                                                                                                     | Integration Tests                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **auth**              | `auth.controller.ts`, `auth.service.ts`, `auth.repository.ts`, `auth.middleware.ts`, `auth.session.ts`, `auth.jwt.ts`, `auth.module.ts`, `auth.types.ts`, `dto/` (6 files) | `auth.middleware.test.ts` (8 tests), `auth.repository.test.ts` (8 tests), `auth.service.test.ts` (16 tests), `auth.session.test.ts` (12 tests) | `auth.integration.test.ts` (~20 tests)                                 |
| **db**                | `db.repository.ts`, `db.service.ts`, `db.user.ts`, `db.policy.ts`, `db.scan.ts`, `db.liveScanner.ts`, `db.queries.ts`, `db.module.ts`, `db.types.ts`                       | `db.repository.test.ts` (~10 tests), `db.user.test.ts` (~8 tests), `db.policy.test.ts` (~14 tests)                                             | —                                                                      |
| **documentExtractor** | `documentExtractor.service.ts`                                                                                                                                             | **NONE**                                                                                                                                       | —                                                                      |
| **fileActions**       | `fileActions.controller.ts`, `fileActions.service.ts`, `fileActions.repository.ts`, `fileActions.types.ts`, `index.ts`                                                     | **NONE**                                                                                                                                       | —                                                                      |
| **liveScanner**       | `liveScanner.controller.ts`, `liveScanner.service.ts`, `liveScanner.repository.ts`, `liveScanner.types.ts`, `liveScanner.module.ts`, `index.ts`                            | `liveScanner.repository.test.ts` (~18 tests)                                                                                                   | `liveScanner.integration.test.ts` (~25 tests)                          |
| **mlModel**           | `mlModel.service.ts`                                                                                                                                                       | **NONE**                                                                                                                                       | —                                                                      |
| **policy**            | `policy.controller.ts`, `policy.service.ts`, `policy.repository.ts`, `policy.types.ts`, `index.ts`, `dto/` (5 files)                                                       | `policy.service.test.ts` (~25 tests)                                                                                                           | `policy.integration.test.ts` (~25 tests)                               |
| **policyEngine**      | `policyEngine.service.ts`, `policyEngine.matcher.ts`, `policyEngine.types.ts`, `policyEngine.module.ts`, `index.ts`                                                        | `policyEngine.service.test.ts` (~22 tests)                                                                                                     | —                                                                      |
| **reports**           | `reports.controller.ts`, `reports.service.ts`, `reports.repository.ts`, `reports.types.ts`, `index.ts`, `pdf.generator.ts`, `xlsx.generator.ts`, `json.generator.ts`       | **NONE**                                                                                                                                       | —                                                                      |
| **scanner**           | `scanner.controller.ts`, `scanner.service.ts`, `scanner.repository.ts`, `scanner.types.ts`, `scanner.module.ts`, `index.ts`                                                | **NONE**                                                                                                                                       | `scanner.integration.test.ts` (~18 tests)                              |
| **socket**            | `socket.service.ts`                                                                                                                                                        | **NONE**                                                                                                                                       | —                                                                      |
| **entities**          | `user.entity.ts`, `policy.entity.ts`, `scan.entity.ts`, `liveScanner.entity.ts`, `index.ts`                                                                                | — (pure interfaces)                                                                                                                            | —                                                                      |
| **middleware**        | `errorHandler.ts`                                                                                                                                                          | **NONE**                                                                                                                                       | —                                                                      |
| **utils**             | `errors.ts`                                                                                                                                                                | **NONE**                                                                                                                                       | —                                                                      |
| **app**               | `app.ts`                                                                                                                                                                   | —                                                                                                                                              | `app.integration.test.ts` (7 tests)                                    |
| **cross-cutting**     | —                                                                                                                                                                          | —                                                                                                                                              | `input-validation.test.ts` (~12 tests), `security.test.ts` (~12 tests) |

### Test Count Summary

| Category          | Files  | Approx. Test Cases |
| ----------------- | ------ | ------------------ |
| Unit Tests        | 10     | ~141               |
| Integration Tests | 7      | ~119               |
| **Total**         | **17** | **~260**           |

---

## 2. Test Helpers (`tests/helpers.ts`)

```typescript
import fs from "fs";
import path from "path";

// Creates an isolated temp DB directory per test, ensuring test isolation
export function createTestDbPath(): string {
  const testDbPath = path.join(
    __dirname,
    "../temp-test-dbs",
    `test-${Date.now()}`,
  );
  if (!fs.existsSync(testDbPath)) {
    fs.mkdirSync(testDbPath, { recursive: true });
  }
  return testDbPath;
}

// Safely cleans up a test DB directory, handling Windows SQLite locks (EBUSY/EPERM)
export function cleanupTestDb(dbPath: string): void {
  if (!dbPath || !dbPath.includes("temp-test-dbs")) return;
  try {
    if (fs.existsSync(dbPath)) {
      const files = fs.readdirSync(dbPath);
      for (const file of files) {
        const filePath = path.join(dbPath, file);
        try {
          fs.unlinkSync(filePath);
        } catch (err: any) {
          if (err.code === "EBUSY" || err.code === "EPERM") {
            // File locked by SQLite, will be cleaned up later
          } else {
            throw err;
          }
        }
      }
      try {
        fs.rmdirSync(dbPath);
      } catch {
        // Directory may not be empty due to locked files
      }
    }
  } catch (error) {
    // Silently handle cleanup errors
  }
}

// Creates a mock Express Request object with sensible defaults
export function mockRequest(options: any = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...options,
  };
}

// Creates a mock Express Response object with jest.fn() spies for chaining
export function mockResponse(): any {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// Returns a jest.fn() that can serve as Express next()
export function mockNext(): jest.Mock {
  return jest.fn();
}

// Generates unique test user credentials using timestamp + counter to prevent collisions
let userCounter = 0;
export function generateTestUser(overrides: any = {}) {
  return {
    username: `testuser_${Date.now()}_${++userCounter}`,
    password: "Test1234!@#$",
    ...overrides,
  };
}

// Promise-based delay utility for async test scenarios
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Global Test Setup (`tests/setup.ts`)

```typescript
import { SessionManager } from "../src/modules/auth/auth.session";

beforeEach(() => {
  SessionManager.clearAllSessions();
});

afterAll(() => {
  SessionManager.clearAllSessions();
});
```

---

## 3. Key Test Patterns & Conventions

### 3.1 Database Isolation

- **Real SQLite databases** (not mocks) via `createTestDbPath()` — each test gets its own temp directory under `temp-test-dbs/`
- `cleanupTestDb()` handles Windows `EBUSY`/`EPERM` errors from SQLite file locks
- `beforeEach` creates a fresh DB; `afterEach` cleans it up

### 3.2 Session Management

- `SessionManager.clearAllSessions()` called in `beforeEach` (via global `setup.ts`) and explicitly in integration tests
- No JWT — sessions are verified via `x-session-id` header in integration tests

### 3.3 Integration Test Pattern

```typescript
// Standard integration test setup:
let app: Application;
let testDbPath: string;
let sessionId: string;

beforeEach(async () => {
  testDbPath = createTestDbPath();
  app = createDataGuardApp({
    IS_PRODUCTION: false,
    DB_PATH: testDbPath,
  });
  SessionManager.clearAllSessions();

  // Register a test user to get a valid session
  const userData = generateTestUser();
  const res = await request(app)
    .post("/api/auth/register")
    .send(userData);
  sessionId = res.body.sessionId;
});
```

- Uses `supertest` for HTTP assertions
- Each test gets a fresh Express app + DB + authenticated session
- Tests verify status codes, response shapes, and data persistence

### 3.4 Unit Test Pattern

```typescript
// Standard unit test setup:
let testDbPath: string;
let service: SomeService;

beforeEach(() => {
  testDbPath = createTestDbPath();
  service = new SomeService(testDbPath);
});

afterEach(() => {
  cleanupTestDb(testDbPath);
});
```

- Instantiates real service/repository classes with isolated DBs
- No mocking of DB layer — tests the full service → repository → SQLite stack
- Only mocks: Express `req`/`res`/`next` objects (for middleware tests)

### 3.5 User Isolation Testing

- Multi-user scenarios consistently test that User A cannot access User B's resources
- Tested across: policies, scans, live scanners (403 Forbidden responses)

### 3.6 Password Security

- `argon2` used in tests for password hashing (real hashing, not mocked)
- Tests verify passwords/hashes are **never** exposed in API responses

### 3.7 Unique Test Data

- `generateTestUser()` uses `Date.now()` + incrementing counter — avoids collisions in parallel/fast test runs

### 3.8 File System Tests

- Live scanner & scanner integration tests create real temp directories with `fs.mkdtempSync`
- Write real files with sensitive content, wait for async scanning, then verify results
- Use `setTimeout` delays (1–2.5s) for chokidar debounce/scanning completion

---

## 4. What's NOT Tested

### 4.1 Modules with ZERO Test Coverage

| Module                      | Risk Level | Reason                                                                                                                 |
| --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| **documentExtractor**       | 🔴 HIGH    | Core extraction logic for 10+ file formats (PDF, DOCX, XLSX, CSV, etc.) — bugs here silently miss threats during scans |
| **fileActions**             | 🔴 HIGH    | Handles quarantine, AES-256-CBC encryption/decryption, file deletion — data loss/corruption risk if buggy              |
| **reports**                 | 🟡 MEDIUM  | PDF/XLSX/JSON report generation — wrong data in reports is a compliance risk                                           |
| **mlModel**                 | 🟡 MEDIUM  | HuggingFace API integration for ML classification — external API dependency, error handling untested                   |
| **socket**                  | 🟡 MEDIUM  | Real-time event broadcasting — silent failures would break the UI's live updates                                       |
| **middleware/errorHandler** | 🟡 MEDIUM  | Global error handler, asyncHandler wrapper, 404 handler — gaps could leak stack traces or crash the server             |
| **utils/errors**            | 🟢 LOW     | Pure error class definitions — simple but custom status codes should be verified                                       |

### 4.2 Partially Tested Modules (Gaps)

| Module           | What IS Tested                           | What's MISSING                                                                                                                                                        |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **auth**         | service, repository, session, middleware | `auth.controller.ts` (DTO attachment, route wiring, error responses)                                                                                                  |
| **db**           | user, policy, repository (partial)       | `db.scan.ts`, `db.liveScanner.ts` (as standalone), `db.service.ts` composition                                                                                        |
| **liveScanner**  | repository (CRUD)                        | `liveScanner.service.ts` (startWatching, stopWatching, handleFileChange, filesystem interaction — partially covered by integration tests but no unit-level isolation) |
| **scanner**      | — (integration only)                     | `scanner.service.ts` unit tests (performScan, scanFile, path resolution, ML integration, cancellation logic)                                                          |
| **policyEngine** | service + matcher                        | Edge cases: very large files, unicode content, catastrophic regex backtracking                                                                                        |

### 4.3 Specific Untested Behaviors

- **Error handler middleware**: `errorHandler()`, `asyncHandler()`, `notFoundHandler()` — never directly tested
- **App startup**: `startServer()` in `index.ts` (HTTP server creation, Socket.IO initialization)
- **DB scan operations**: `db.scan.ts` (Scan class with createScan, updateScan, deleteScan, etc.)
- **DB liveScanner operations**: `db.liveScanner.ts` standalone class
- **File encryption key storage/retrieval**: `fileActions.repository.ts` (encrypted_files table CRUD)
- **System path safety check**: `fileActions.service.ts` `SYSTEM_PATH_PREFIXES` validation
- **Document extraction edge cases**: Binary file handling, corrupt files, very large files, unsupported encodings
- **ML model tier selection**: `sensitivityToTier()`, `classifyText()` error handling, API timeout
- **Report data assembly**: `reportsService.buildReportData()` (complex query aggregation)
- **Socket.IO event broadcasting**: All emit methods, system metrics collection, connection handlers
- **PDF/XLSX generator formatting**: Layout correctness, data overflow, special characters

---

## 5. Key Functions Needing Tests per Untested Module

### 5.1 `documentExtractor` — Priority: 🔴 HIGH

| Function                             | What to Test                                                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isExtractable(filePath)`            | Returns `true` for all supported extensions (`.pdf`, `.docx`, `.xlsx`, `.csv`, `.json`, `.xml`, `.html`, `.md`, `.ipynb`); `false` for `.exe`, `.png`, unknown |
| `extractText(filePath)` — PDF        | Valid PDF → text; corrupt PDF → returns `null` (not crash)                                                                                                     |
| `extractText(filePath)` — DOCX       | Valid DOCX → text; empty DOCX → empty string                                                                                                                   |
| `extractText(filePath)` — XLSX/XLS   | Multi-sheet extraction; empty workbook                                                                                                                         |
| `extractText(filePath)` — CSV        | Standard CSV; CSV with commas in quoted fields                                                                                                                 |
| `extractText(filePath)` — JSON       | Valid JSON → stringified content                                                                                                                               |
| `extractText(filePath)` — XML/HTML   | Tag stripping; nested tags; special entities                                                                                                                   |
| `extractText(filePath)` — IPYNB      | Jupyter notebook cell extraction (code + markdown)                                                                                                             |
| `extractText(filePath)` — Edge cases | Non-existent file; permission denied; binary file; 0-byte file; very large file                                                                                |

### 5.2 `fileActions` — Priority: 🔴 HIGH

| Function                             | What to Test                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `quarantineFile(userId, filePath)`   | Moves file to quarantine dir; original removed; system path blocked; non-existent file error                |
| `encryptFile(userId, filePath)`      | Creates `.enc` file; original removed; key stored in DB; AES-256-CBC round-trip; duplicate encryption error |
| `decryptFile(userId, encryptedPath)` | Restores original; `.enc` removed; key deleted from DB; wrong user → error; missing key → error             |
| `deleteFile(userId, filePath)`       | File removed from disk; system path blocked (`C:\Windows`, `/etc`, etc.)                                    |
| `getEncryptedFiles(userId)`          | Returns only current user's encrypted files; empty array when none                                          |
| `fileActionsRepository`              | `storeEncryptedFile`, `getByEncryptedPath`, `getByUserId`, `deleteByEncryptedPath`                          |
| **Controller**                       | Auth middleware enforcement on all routes; proper status codes (200, 400, 401, 404, 500)                    |

### 5.3 `reports` — Priority: 🟡 MEDIUM

| Function                                    | What to Test                                                                           |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `generateReport(userId, username, request)` | Creates report file on disk; stores metadata in DB; returns report ID                  |
| `buildReportData()`                         | Correctly aggregates scans, policies, threats from DB; handles empty data              |
| `getReportHistory(userId)`                  | Returns only user's reports; sorted by date; empty list                                |
| `getReportFilePath(reportId, userId)`       | Returns path for valid report; 404 for non-existent; 403 for other user's report       |
| `deleteReport(reportId, userId)`            | Removes file from disk; removes DB record; authorization check                         |
| `generatePDF(data, outputPath)`             | Creates valid PDF file; handles empty data; special characters in content              |
| `generateXLSX(data, outputPath)`            | Creates valid XLSX with all sheets (Summary, Scans, Alerts, Policies, Recommendations) |
| `generateJSON(data, outputPath)`            | Creates valid JSON file; data matches input                                            |
| `reportsRepository`                         | CRUD for reports table; proper SQL queries                                             |

### 5.4 `mlModel` — Priority: 🟡 MEDIUM

| Function                              | What to Test                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| `sensitivityToTier(sensitivity)`      | Maps sensitivity levels to correct model tiers ("base"/"small"/"tiny")                |
| `classifyText(text, tier)`            | Mock HuggingFace API → returns MLResult; API error → returns `null`; timeout handling |
| `classifyMatches(matchedLines, tier)` | Multiple lines classified; empty input → empty output; API failure mid-batch          |
| **Edge cases**                        | Very long text; empty text; special characters; API rate limiting                     |

### 5.5 `socket` — Priority: 🟡 MEDIUM

| Function                          | What to Test                                         |
| --------------------------------- | ---------------------------------------------------- |
| `initSocketService(httpServer)`   | Creates singleton; returns SocketService instance    |
| `getSocketService()`              | Returns existing instance; throws if not initialized |
| `emitScanStart/Progress/Complete` | Emits correct event name + data shape                |
| `emitAlert`                       | Broadcasts to all connected clients                  |
| `emitLiveScannerActivity`         | Correct event payload                                |
| `getSystemMetrics()`              | Returns CPU/memory/uptime data                       |
| `startMetricsBroadcast()`         | Emits metrics on interval                            |
| `destroy()`                       | Cleans up interval + IO instance                     |

### 5.6 `middleware/errorHandler` — Priority: 🟡 MEDIUM

| Function                            | What to Test                                                                                                                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `errorHandler(err, req, res, next)` | `AppError` → uses its statusCode; generic `Error` → 500; `ValidationError` → 400; includes message; does NOT include stack trace in production |
| `asyncHandler(fn)`                  | Wraps async route; caught rejection calls `next(err)`; successful execution passes through                                                     |
| `notFoundHandler(req, res, next)`   | Returns 404 with meaningful message                                                                                                            |

### 5.7 `utils/errors` — Priority: 🟢 LOW

| Class                 | What to Test                                              |
| --------------------- | --------------------------------------------------------- |
| `AppError`            | Constructor sets `message`, `statusCode`, `isOperational` |
| `ValidationError`     | Extends `AppError`; statusCode = 400                      |
| `UnauthorizedError`   | statusCode = 401                                          |
| `ForbiddenError`      | statusCode = 403                                          |
| `NotFoundError`       | statusCode = 404                                          |
| `ConflictError`       | statusCode = 409                                          |
| `InternalServerError` | statusCode = 500; `isOperational` = false                 |

### 5.8 `scanner.service` (unit tests) — Priority: 🟡 MEDIUM

| Function                     | What to Test                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `startScan(userId, request)` | Creates scan record; launches async performScan; returns scanId              |
| `performScan()`              | Walks directory tree; applies policies; records threats; updates scan status |
| `scanFile()`                 | Reads file; runs through PolicyEngine; optionally runs ML classification     |
| `getQuickScanPaths()`        | Returns correct platform-specific paths                                      |
| `getFullScanPaths()`         | Returns more extensive path list                                             |
| `getAllDrivePaths()`         | Windows drive enumeration                                                    |
| `resolveTargetPath()`        | Handles relative/absolute paths; non-existent paths                          |
| `isSafeToScan()`             | Skips binary/too-large files; respects extension filters                     |
| **Cancellation**             | Running scan → cancel → status updated; scan stops processing files          |

### 5.9 `db.scan` + `db.liveScanner` — Priority: 🟢 LOW

| Class                                       | What to Test                           |
| ------------------------------------------- | -------------------------------------- |
| `Scan.createScan`                           | Creates record; returns entity         |
| `Scan.getScanById`                          | Existing → entity; non-existent → null |
| `Scan.updateScan`                           | Updates fields; preserves others       |
| `Scan.deleteScan / deleteAllScansByUserId`  | Removes records; authorization         |
| `LiveScanner.createLiveScanner`             | Creates record                         |
| `LiveScanner.getActiveLiveScannersByUserId` | Filters by status="active"             |
| `LiveScanner.updateLiveScanner`             | Partial field update                   |

---

## Architecture Notes

```
Client (Electron + Next.js)
  ↓ HTTP / Socket.IO
Express App (app.ts)
  ├── /api/auth      → authModule       → authController → authService → authRepository → dbModule
  ├── /api/policies   → policyModule     → policyController → policyService → policyRepository → dbModule
  ├── /api/scans      → scannerModule    → scannerController → scannerService → scanRepository → dbModule
  ├── /api/live-scanners → liveScannerModule → liveScannerController → liveScannerService → liveScannerRepository → dbModule
  ├── /api/reports    → reportsModule    → reportsController → reportsService → reportsRepository (own DB)
  ├── /api/files      → fileActionsModule → fileActionsController → fileActionsService → fileActionsRepository
  └── /api/health     → inline handler

Shared Services (no routes):
  ├── PolicyEngineService + PolicyMatcher   (used by scanner + liveScanner)
  ├── documentExtractor                     (used by scanner + liveScanner)
  ├── mlModel.service                       (used by scanner)
  └── SocketService                         (used by scanner + liveScanner, broadcasts events)

Database: SQLite via better-sqlite3-multiple-ciphers
  Tables: users, policies, scans, live_scanners, encrypted_files, reports
```

---

_Report generated from full codebase audit — all source files and test files read._
