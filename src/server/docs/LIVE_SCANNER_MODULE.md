# Live Scanner Module

## Overview

The Live Scanner module provides real-time file system monitoring and policy-based threat detection. It watches directories for file changes and automatically scans new or modified files against active policies.

## Architecture

The module follows the same pattern as other server modules:

- **Entity**: `LiveScannerEntity` - Database entity for live scanner sessions
- **Types**: Type definitions and interfaces in `liveScanner.types.ts`
- **Repository**: Database operations in `liveScanner.repository.ts`
- **Service**: Business logic in `liveScanner.service.ts`
- **Controller**: HTTP endpoints in `liveScanner.controller.ts`
- **Module**: Module initialization in `liveScanner.module.ts`

## Features

- **Real-time monitoring**: Uses `chokidar` for efficient file system watching
- **Configurable watch modes**: 
  - `file-changes`: Monitor file additions, modifications, and deletions
  - `directory-changes`: Monitor directory additions and deletions
  - `both`: Monitor both files and directories
- **Recursive scanning**: Optional deep directory monitoring
- **Pause/Resume**: Control scanner without stopping it
- **Debouncing**: Prevents multiple scans of rapidly changing files
- **Statistics**: Track files monitored, scanned, and threats detected
- **Activity log**: Keep history of recent file changes

## API Endpoints

All endpoints require authentication via session.

### POST `/api/live-scanners`
Start a new live scanner.

**Request Body:**
```json
{
  "name": "My Live Scanner",
  "targetPath": "/path/to/watch",
  "watchMode": "file-changes",
  "isRecursive": true,
  "options": {
    "includeExtensions": [".js", ".ts", ".txt"],
    "excludePaths": ["node_modules", ".git"],
    "maxFileSize": 10485760,
    "debounceDelay": 1000
  }
}
```

**Response:**
```json
{
  "scannerId": 1,
  "message": "Live scanner started successfully"
}
```

### GET `/api/live-scanners`
Get all live scanners for the current user.

**Response:**
```json
[
  {
    "id": 1,
    "userId": 1,
    "name": "My Live Scanner",
    "targetPath": "/path/to/watch",
    "status": "active",
    "watchMode": "file-changes",
    "isRecursive": true,
    "startedAt": "2026-02-16T10:00:00.000Z",
    "filesMonitored": 150,
    "filesScanned": 45,
    "threatsDetected": 3,
    "lastActivityAt": "2026-02-16T10:30:00.000Z",
    "createdAt": "2026-02-16T10:00:00.000Z",
    "updatedAt": "2026-02-16T10:30:00.000Z"
  }
]
```

### GET `/api/live-scanners/:id`
Get a specific live scanner by ID.

### GET `/api/live-scanners/:id/stats`
Get detailed statistics and recent activity for a live scanner.

**Response:**
```json
{
  "scanner": { /* LiveScannerEntity */ },
  "recentActivity": [
    {
      "scannerId": 1,
      "filePath": "/path/to/file.js",
      "changeType": "add",
      "timestamp": "2026-02-16T10:30:00.000Z",
      "threatsFound": 1
    }
  ],
  "uptime": 1800000,
  "averageResponseTime": undefined
}
```

### POST `/api/live-scanners/:id/stop`
Stop a live scanner.

### POST `/api/live-scanners/:id/pause`
Pause a live scanner (keeps watcher active but ignores events).

### POST `/api/live-scanners/:id/resume`
Resume a paused live scanner.

### DELETE `/api/live-scanners/:id`
Delete a live scanner.

## Configuration Options

### LiveScannerOptions

- **includeExtensions**: Array of file extensions to monitor (e.g., `['.js', '.ts']`). Empty array monitors all files.
- **excludePaths**: Array of directory names to exclude from monitoring
- **maxFileSize**: Maximum file size in bytes (files larger are skipped)
- **followSymlinks**: Whether to follow symbolic links
- **debounceDelay**: Delay in milliseconds before scanning after file change
- **maxMatchesPerFile**: Maximum policy matches to return per file

### Default Options

```typescript
{
  includeExtensions: [],
  excludePaths: [
    "node_modules", ".git", "dist", "build", "coverage",
    ".next", ".nuxt", "vendor", "__pycache__", 
    ".venv", "venv", ".cache", "tmp", "temp"
  ],
  maxFileSize: 10485760, // 10MB
  followSymlinks: false,
  debounceDelay: 1000, // 1 second
  maxMatchesPerFile: 100
}
```

## Database Schema

```sql
CREATE TABLE live_scanners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  target_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active', 'paused', 'stopped')),
  watch_mode TEXT NOT NULL CHECK(watch_mode IN ('file-changes', 'directory-changes', 'both')),
  is_recursive INTEGER DEFAULT 1 CHECK(is_recursive IN (0, 1)),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  stopped_at DATETIME,
  files_monitored INTEGER DEFAULT 0,
  files_scanned INTEGER DEFAULT 0,
  threats_detected INTEGER DEFAULT 0,
  last_activity_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Implementation Notes

1. **File Watching**: Uses `chokidar` library for cross-platform file system watching
2. **In-Memory Activity Log**: Keeps last 100 activities per scanner in memory
3. **Automatic Cleanup**: Binary files and files exceeding size limit are skipped
4. **Error Handling**: File read errors don't crash the scanner
5. **User Isolation**: Each user can only access their own scanners

## Usage Example

```typescript
// Start a live scanner
const response = await fetch('/api/live-scanners', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-session-id': sessionId
  },
  body: JSON.stringify({
    name: 'Source Code Monitor',
    targetPath: '/workspace/src',
    watchMode: 'file-changes',
    isRecursive: true,
    options: {
      includeExtensions: ['.js', '.ts', '.jsx', '.tsx'],
      debounceDelay: 2000
    }
  })
});

const { scannerId } = await response.json();

// Get stats
const statsResponse = await fetch(`/api/live-scanners/${scannerId}/stats`, {
  headers: { 'x-session-id': sessionId }
});
const stats = await statsResponse.json();
```

## Dependencies

- **chokidar**: ^4.0.3 - File system watching

## Testing

Live scanner functionality can be tested using integration tests:

```typescript
// Example test
describe('Live Scanner', () => {
  it('should detect new file and scan it', async () => {
    // Start live scanner
    const response = await request(app)
      .post('/api/live-scanners')
      .set('x-session-id', sessionId)
      .send({
        name: 'Test Scanner',
        targetPath: testDir,
        watchMode: 'file-changes',
        isRecursive: false
      });
    
    const { scannerId } = response.body;
    
    // Create a file
    await fs.promises.writeFile(
      path.join(testDir, 'test.txt'),
      'sensitive data'
    );
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Check stats
    const stats = await request(app)
      .get(`/api/live-scanners/${scannerId}/stats`)
      .set('x-session-id', sessionId);
    
    expect(stats.body.scanner.filesScanned).toBeGreaterThan(0);
  });
});
```

## Future Enhancements

- **Event webhooks**: Notify external systems of scan results
- **Scan result storage**: Persist detailed scan results in database
- **Performance metrics**: Track average scan times and throughput
- **Advanced filtering**: Pattern-based file filtering (glob patterns)
- **Rate limiting**: Limit scans per second for high-activity directories
- **Alert thresholds**: Trigger alerts when threat count exceeds threshold
