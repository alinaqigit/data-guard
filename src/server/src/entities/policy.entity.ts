export interface PolicyEntity {
  id: number;
  userId: number;
  name: string;
  pattern: string;
  type: "keyword" | "regex";
  description?: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}
