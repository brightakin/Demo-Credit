export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone_number: string;
  is_blacklisted: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateUserDTO {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  created_at?: Date;
  updated_at?: Date;
}

export type TransactionType = "fund" | "transfer" | "withdrawal";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  reference: string;
  receiver_wallet_id?: string | null;
  status: TransactionStatus;
  description?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface FundWalletDTO {
  amount: number;
  idempotencyKey: string;
}

export interface TransferDTO {
  idempotencyKey: string;
  receiver_email: string;
  amount: number;
  description?: string;
}

export interface WithdrawDTO {
  amount: number;
  idempotencyKey: string;
  description?: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
}
