export interface UserEntity {
  id: number;
  username: string;
  passwordHash: string; // Required for authentication
  email?: string;
  bio?: string;
}
