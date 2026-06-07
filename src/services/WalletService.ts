import { randomUUID } from "crypto";
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
} from "../utils/types";

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
    const { amount } = dto;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    // The transaction scopes the balance read and both writes onto the same
    // DB connection. If the INSERT fails, the UPDATE is rolled back — you
    // never end up with a changed balance and no transaction record.
    return db.transaction(async (trx) => {
      const wallet = await WalletModel.findByUserId(userId, trx);
      if (!wallet) throw new Error("Wallet not found");

      const newBalance = Number(wallet.balance) + Number(amount);
      await WalletModel.updateBalance(wallet.id, newBalance, trx);

      return TransactionModel.create(
        {
          id: randomUUID(),
          wallet_id: wallet.id,
          type: "fund",
          amount,
          reference: randomUUID(),
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
    const { receiver_email, amount, description } = dto;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    // Resolve user identities before opening the transaction — these are
    // read-only lookups that don't need to be rolled back.
    const receiver = await UserModel.findByEmail(receiver_email);
    if (!receiver) throw new Error("Receiver account not found");

    const senderUser = await UserModel.findById(userId);
    if (senderUser?.email === receiver_email) {
      throw new Error("Cannot transfer funds to your own account");
    }

    // All four writes (two balance updates + one transaction record) are scoped
    // to one DB transaction. Any failure rolls back every change.
    return db.transaction(async (trx) => {
      const senderWallet = await WalletModel.findByUserId(userId, trx);
      if (!senderWallet) throw new Error("Sender wallet not found");

      const receiverWallet = await WalletModel.findByUserId(receiver.id, trx);
      if (!receiverWallet) throw new Error("Receiver wallet not found");

      if (Number(senderWallet.balance) < amount) {
        throw new Error("Insufficient balance");
      }

      const senderNewBalance = Number(senderWallet.balance) - Number(amount);
      const receiverNewBalance =
        Number(receiverWallet.balance) + Number(amount);

      await WalletModel.updateBalance(senderWallet.id, senderNewBalance, trx);
      await WalletModel.updateBalance(
        receiverWallet.id,
        receiverNewBalance,
        trx,
      );

      return TransactionModel.create(
        {
          id: randomUUID(),
          wallet_id: senderWallet.id,
          type: "transfer",
          amount,
          reference: randomUUID(),
          receiver_wallet_id: receiverWallet.id,
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
    const { amount, description } = dto;
    if (amount <= 0) throw new Error("Amount must be greater than zero");

    return db.transaction(async (trx) => {
      const wallet = await WalletModel.findByUserId(userId, trx);
      if (!wallet) throw new Error("Wallet not found");

      if (Number(wallet.balance) < amount) {
        throw new Error("Insufficient balance");
      }

      const newBalance = Number(wallet.balance) - Number(amount);
      await WalletModel.updateBalance(wallet.id, newBalance, trx);

      return TransactionModel.create(
        {
          id: randomUUID(),
          wallet_id: wallet.id,
          type: "withdrawal",
          amount,
          reference: randomUUID(),
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
