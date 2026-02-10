import fs from "fs";
import path from "path";

/**
 * Test Helper Functions
 */

/**
 * Create a temporary test database directory
 */
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

/**
 * Clean up test database
 */
export function cleanupTestDb(dbPath: string): void {
  if (fs.existsSync(dbPath)) {
    try {
      const files = fs.readdirSync(dbPath);
      files.forEach((file) => {
        try {
          fs.unlinkSync(path.join(dbPath, file));
        } catch (err: any) {
          // On Windows, SQLite may lock files - ignore EBUSY errors
          if (err.code !== "EBUSY" && err.code !== "EPERM") {
            throw err;
          }
        }
      });
      try {
        fs.rmdirSync(dbPath);
      } catch (err: any) {
        // Directory may not be empty due to locked files
        if (err.code !== "ENOTEMPTY") {
          throw err;
        }
      }
    } catch (err) {
      // Silent fail for cleanup - don't break tests
      console.warn(
        `Warning: Could not fully cleanup test db at ${dbPath}`,
      );
    }
  }
}

/**
 * Create a mock Express request
 */
export function mockRequest(options: any = {}): any {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ...options,
  };
}

/**
 * Create a mock Express response
 */
export function mockResponse(): any {
  const res: any = {
    statusCode: 200,
    jsonData: null,
  };
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data: any) => {
    res.jsonData = data;
    return res;
  });
  res.send = jest.fn((data: any) => {
    res.jsonData = data;
    return res;
  });
  return res;
}

/**
 * Create a mock Next function
 */
export function mockNext(): jest.Mock {
  return jest.fn();
}

// Counter to ensure unique usernames even within the same millisecond
let userCounter = 0;

/**
 * Generate test user data
 */
export function generateTestUser(overrides: any = {}) {
  return {
    username: `testuser_${Date.now()}_${++userCounter}`,
    password: "Test1234!@#$",
    ...overrides,
  };
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
