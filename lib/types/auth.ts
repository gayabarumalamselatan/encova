export type Role = "admin" | "user";

export interface Account {
  id: number | string;
  username: string;
  password?: string;
  role: Role;
  enabled: boolean;
  modules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AvailableModule {
  id: string;
  name: string;
}

export interface Session {
  user: Omit<Account, "password">;
  token: string;
}
