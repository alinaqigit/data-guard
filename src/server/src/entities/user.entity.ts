export interface UserEntity {
  id: number;
  username: string;
  passwordHash: string; // Required for authentication
}
