import { Response } from "express";
import { WalletService } from "../services/WalletService";
import { sendSuccess, sendError } from "../utils/response";
import { AuthRequest } from "../middleware/auth";
import type { FundWalletInput, TransferInput, WithdrawInput } from "../schemas";

export class WalletController {
  static async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const wallet = await WalletService.getBalance(userId);
      sendSuccess(res, wallet, "Wallet retrieved successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to retrieve wallet";
      sendError(res, message, 400);
    }
  }

  static async fundWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      // req.body already validated & typed by Zod middleware
      const body = req.body as FundWalletInput;
      const transaction = await WalletService.fundWallet(userId, body);
      sendSuccess(res, transaction, "Wallet funded successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to fund wallet";
      sendError(res, message, 400);
    }
  }

  static async transfer(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const body = req.body as TransferInput;
      const transaction = await WalletService.transfer(userId, body);
      sendSuccess(res, transaction, "Transfer successful");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Transfer failed";
      sendError(res, message, 400);
    }
  }

  static async withdraw(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const body = req.body as WithdrawInput;
      const transaction = await WalletService.withdraw(userId, body);
      sendSuccess(res, transaction, "Withdrawal successful");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Withdrawal failed";
      sendError(res, message, 400);
    }
  }

  static async getTransactions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const transactions = await WalletService.getTransactions(userId);
      sendSuccess(res, transactions, "Transactions retrieved successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to retrieve transactions";
      sendError(res, message, 400);
    }
  }
}
