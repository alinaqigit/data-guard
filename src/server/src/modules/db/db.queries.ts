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

export const initializeDatabaseQuery = `${createUserTableQuery} ${createPolicyTableQuery}`;
