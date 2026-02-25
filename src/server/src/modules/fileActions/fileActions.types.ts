export type FileActionType = "quarantine" | "encrypt" | "delete" | "decrypt";

export interface FileActionRequest {
  filePath: string;
  alertId?: number;
}

export interface DecryptRequest {
  filePath: string; // path to .enc file
}

export interface FileActionResult {
  success: boolean;
  action: FileActionType;
  originalPath: string;
  newPath?: string;       // for quarantine / encrypt
  message: string;
}

export interface EncryptedFileRecord {
  id: number;
  userId: number;
  originalPath: string;
  encryptedPath: string;
  encryptionKey: string;  // AES-256 key hex, stored in DB
  iv: string;             // initialization vector hex
  encryptedAt: string;
}