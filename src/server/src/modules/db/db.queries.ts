const createUserTableQuery = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const createPolicyTableQuery = `
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
`;

const createScanTableQuery = `
CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scan_type TEXT NOT NULL CHECK(scan_type IN ('full', 'quick', 'custom')),
  target_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  files_scanned INTEGER DEFAULT 0,
  files_with_threats INTEGER DEFAULT 0,
  total_threats INTEGER DEFAULT 0,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

const createLiveScannerTableQuery = `
CREATE TABLE IF NOT EXISTS live_scanners (
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
`;

export const initializeDatabaseQuery = `${createUserTableQuery} ${createPolicyTableQuery} ${createScanTableQuery} ${createLiveScannerTableQuery}`;
