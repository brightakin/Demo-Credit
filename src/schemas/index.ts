import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// Extend zod with .openapi() method — must be called once before any schema definitions
extendZodWithOpenApi(z);

// ─── AUTH SCHEMAS ────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .openapi({ example: "John" }),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .openapi({ example: "Doe" }),
  email: z
    .string()
    .email("Invalid email address")
    .openapi({ example: "john@example.com" }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .openapi({ example: "secret123" }),
  phone_number: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[0-9]+$/, "Phone number must contain only digits")
    .openapi({ example: "08012345678" }),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .openapi({ example: "john@example.com" }),
  password: z
    .string()
    .min(1, "Password is required")
    .openapi({ example: "secret123" }),
});

// ─── WALLET SCHEMAS ──────────────────────────────────────────────────────────

export const FundWalletSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than zero")
    .openapi({ example: 5000 }),
});

export const TransferSchema = z.object({
  receiver_email: z
    .string()
    .email("Invalid receiver email")
    .openapi({ example: "jane@example.com" }),
  amount: z
    .number()
    .positive("Amount must be greater than zero")
    .openapi({ example: 2000 }),
  description: z.string().optional().openapi({ example: "Rent payment" }),
});

export const WithdrawSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be greater than zero")
    .openapi({ example: 1000 }),
  description: z.string().optional().openapi({ example: "ATM withdrawal" }),
});

// ─── INFERRED TYPES (replaces manual DTOs) ───────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type FundWalletInput = z.infer<typeof FundWalletSchema>;
export type TransferInput = z.infer<typeof TransferSchema>;
export type WithdrawInput = z.infer<typeof WithdrawSchema>;
