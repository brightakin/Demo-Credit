import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import {
  RegisterSchema,
  LoginSchema,
  FundWalletSchema,
  TransferSchema,
  WithdrawSchema,
} from "../schemas";

const registry = new OpenAPIRegistry();

// ─── SECURITY SCHEME ────────────────────────────────────────────────────────
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// ─── REUSABLE RESPONSE SCHEMAS ───────────────────────────────────────────────
const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.record(z.string(), z.string()).optional(),
});

const UserResponseSchema = z.object({
  id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  phone_number: z.string(),
  is_blacklisted: z.boolean(),
  created_at: z.string(),
});

const WalletResponseSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  balance: z.number(),
  created_at: z.string(),
});

const TransactionResponseSchema = z.object({
  id: z.string(),
  wallet_id: z.string(),
  type: z.enum(["fund", "transfer", "withdrawal"]),
  amount: z.number(),
  reference: z.string(),
  receiver_wallet_id: z.string().nullable(),
  status: z.enum(["pending", "completed", "failed"]),
  description: z.string().nullable(),
  created_at: z.string(),
});

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
registry.registerPath({
  method: "post",
  path: "/api/v1/users/register",
  tags: ["Auth"],
  summary: "Register a new user",
  request: {
    body: { content: { "application/json": { schema: RegisterSchema } } },
  },
  responses: {
    201: {
      description: "User registered successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.object({ user: UserResponseSchema, token: z.string() }),
          }),
        },
      },
    },
    400: {
      description: "Email/phone already exists or blacklisted",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/users/login",
  tags: ["Auth"],
  summary: "Login and get a JWT token",
  request: {
    body: { content: { "application/json": { schema: LoginSchema } } },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.object({ user: UserResponseSchema, token: z.string() }),
          }),
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ─── WALLET ROUTES ────────────────────────────────────────────────────────────
const bearerSecurity = [{ bearerAuth: [] }];

registry.registerPath({
  method: "get",
  path: "/api/v1/wallets/balance",
  tags: ["Wallet"],
  summary: "Get wallet balance",
  security: bearerSecurity,
  responses: {
    200: {
      description: "Wallet retrieved",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: WalletResponseSchema,
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/wallets/fund",
  tags: ["Wallet"],
  summary: "Fund wallet",
  security: bearerSecurity,
  request: {
    body: { content: { "application/json": { schema: FundWalletSchema } } },
  },
  responses: {
    200: {
      description: "Wallet funded",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: TransactionResponseSchema,
          }),
        },
      },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/wallets/transfer",
  tags: ["Wallet"],
  summary: "Transfer funds to another user",
  security: bearerSecurity,
  request: {
    body: { content: { "application/json": { schema: TransferSchema } } },
  },
  responses: {
    200: {
      description: "Transfer successful",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: TransactionResponseSchema,
          }),
        },
      },
    },
    400: {
      description: "Insufficient balance or receiver not found",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/wallets/withdraw",
  tags: ["Wallet"],
  summary: "Withdraw funds from wallet",
  security: bearerSecurity,
  request: {
    body: { content: { "application/json": { schema: WithdrawSchema } } },
  },
  responses: {
    200: {
      description: "Withdrawal successful",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: TransactionResponseSchema,
          }),
        },
      },
    },
    400: {
      description: "Insufficient balance",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
    422: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/wallets/transactions",
  tags: ["Wallet"],
  summary: "Get transaction history",
  security: bearerSecurity,
  responses: {
    200: {
      description: "Transactions retrieved",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            message: z.string(),
            data: z.array(TransactionResponseSchema),
          }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResponseSchema } },
    },
  },
});

// ─── GENERATE SPEC ────────────────────────────────────────────────────────────
export const generateOpenApiSpec = () => {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Demo Credit Wallet API",
      version: "1.0.0",
      description:
        "An MVP wallet service for Demo Credit. Supports account creation, funding, transfers, and withdrawals.",
    },
    servers: [{ url: process.env.API_BASE_URL || "http://localhost:3000" }],
  });
};
