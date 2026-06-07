import { randomUUID } from "crypto";
import { Knex } from "knex";
import db from "../config/database";
import { WalletModel } from "../models/WalletModel";
import { UserModel } from "../models/UserModel";
import { TransactionModel } from "../models/TransactionModel";
import {
  FundWalletDTO,
  TransferDTO,
  WithdrawDTO,
  Wallet,
  Transaction,
  TransactionType,
} from "../utils/types";

async function resolveIdempotency(
  key: string,
  walletId: string,
  type: TransactionType,
  amount: number,
  receiverWalletId?: string | null,
  trx?: Knex.Transaction,
): Promise<Transaction | null> {
  const existing = await TransactionModel.findByReference(key, trx);
  if (!existing) return null;

  if (existing.wallet_id !== walletId || existing.type !== type) {
    throw new Error("Idempotency key conflict");
  }
  if (
    Number(existing.amount) !== amount ||
    (type === "transfer" && existing.receiver_wallet_id !== receiverWalletId)
  ) {
    throw new Error("Idempotency key reused with different details");
  }
  return existing;
}

export class WalletService {
  static async getBalance(userId: string): Promise<Wallet> {
    const wallet = await WalletModel.findByUserId(userId);
    if (!wallet) throw new Error("Wallet not found");
    return wallet;
  }

  static async fundWallet(
    userId: string,
    dto: FundWalletDTO,
  ): Promise<Transaction> {
    const { amount, idempotencyKey } = dto;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    const wallet = await WalletModel.findByUserId(userId);
    if (!wallet) throw new Error("Wallet not found");

    const cached = await resolveIdempotency(
      idempotencyKey,
      wallet.id,
      "fund",
      amount,
    );
    if (cached) return cached;

    return db.transaction(async (trx) => {
      const existing = await resolveIdempotency(
        idempotencyKey,
        wallet.id,
        "fund",
        amount,
        undefined,
        trx,
      );
      if (existing) return existing;

      await WalletModel.updateBalance(
        wallet.id,
        Number(wallet.balance) + Number(amount),
        trx,
      );

      return TransactionModel.create(
        {
          id: randomUUID(),
          wallet_id: wallet.id,
          type: "fund",
          amount,
          reference: idempotencyKey,
          status: "completed",
          description: "Wallet funding",
        },
        trx,
      );
    });
  }

  static async transfer(
    userId: string,
    dto: TransferDTO,
  ): Promise<Transaction> {
    const { idempotencyKey, receiver_email, amount, description } = dto;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    const senderWallet = await WalletModel.findByUserId(userId);
    if (!senderWallet) throw new Error("Sender wallet not found");

    const receiver = await UserModel.findByEmail(receiver_email);
    if (!receiver) throw new Error("Receiver account not found");

    const senderUser = await UserModel.findById(userId);
    if (senderUser?.email === receiver_email) {
      throw new Error("Cannot transfer funds to your own account");
    }

    const receiverWallet = await WalletModel.findByUserId(receiver.id);
    if (!receiverWallet) throw new Error("Receiver wallet not found");

    const cached = await resolveIdempotency(
      idempotencyKey,
      senderWallet.id,
      "transfer",
      amount,
      receiverWallet.id,
    );
    if (cached) return cached;

    return db.transaction(async (trx) => {
      const existing = await resolveIdempotency(
        idempotencyKey,
        senderWallet.id,
        "transfer",
        amount,
        receiverWallet.id,
        trx,
      );
      if (existing) return existing;

      const sender = await WalletModel.findByUserId(userId, trx);
      const recipient = await WalletModel.findByUserId(receiver.id, trx);
      if (!sender || !recipient) throw new Error("Wallet not found");

      if (Number(sender.balance) < amount) {
        throw new Error("Insufficient balance");
      }

      await WalletModel.updateBalance(
        sender.id,
        Number(sender.balance) - Number(amount),
        trx,
      );
      await WalletModel.updateBalance(
        recipient.id,
        Number(recipient.balance) + Number(amount),
        trx,
      );

      return TransactionModel.create(
        {
          id: randomUUID(),
          wallet_id: sender.id,
          type: "transfer",
          amount,
          reference: idempotencyKey,
          receiver_wallet_id: recipient.id,
          status: "completed",
          description: description ?? `Transfer to ${receiver_email}`,
        },
        trx,
      );
    });
  }

  static async withdraw(
    userId: string,
    dto: WithdrawDTO,
  ): Promise<Transaction> {
    const { amount, idempotencyKey, description } = dto;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    const wallet = await WalletModel.findByUserId(userId);
    if (!wallet) throw new Error("Wallet not found");

    const cached = await resolveIdempotency(
      idempotencyKey,
      wallet.id,
      "withdrawal",
      amount,
    );
    if (cached) return cached;

    return db.transaction(async (trx) => {
      const existing = await resolveIdempotency(
        idempotencyKey,
        wallet.id,
        "withdrawal",
        amount,
        undefined,
        trx,
      );
      if (existing) return existing;

      if (Number(wallet.balance) < amount) {
        throw new Error("Insufficient balance");
      }

      await WalletModel.updateBalance(
        wallet.id,
        Number(wallet.balance) - Number(amount),
        trx,
      );

      return TransactionModel.create(
        {
          id: randomUUID(),
          wallet_id: wallet.id,
          type: "withdrawal",
          amount,
          reference: idempotencyKey,
          status: "completed",
          description: description ?? "Wallet withdrawal",
        },
        trx,
      );
    });
  }

  static async getTransactions(userId: string): Promise<Transaction[]> {
    const wallet = await WalletModel.findByUserId(userId);
    if (!wallet) throw new Error("Wallet not found");
    return TransactionModel.findByWalletId(wallet.id);
  }
}
