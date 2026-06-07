import db from "../config/database";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "../utils/types";
import { Knex } from "knex";

export interface CreateTransactionData {
  id: string;
  wallet_id: string;
  type: TransactionType;
  amount: number;
  reference: string;
  receiver_wallet_id?: string | null;
  status: TransactionStatus;
  description?: string | null;
}

export class TransactionModel {
  private static readonly TABLE = "transactions";

  static async create(
    data: CreateTransactionData,
    trx?: Knex.Transaction,
  ): Promise<Transaction> {
    const query = trx
      ? trx<Transaction>(this.TABLE)
      : db<Transaction>(this.TABLE);
    await query.insert(data);
    const find = trx
      ? trx<Transaction>(this.TABLE)
      : db<Transaction>(this.TABLE);
    return find.where({ id: data.id }).first() as Promise<Transaction>;
  }

  static async findByWalletId(wallet_id: string): Promise<Transaction[]> {
    return db<Transaction>(this.TABLE)
      .where({ wallet_id })
      .orderBy("created_at", "desc");
  }

  static async findByReference(
    reference: string,
    trx?: Knex.Transaction,
  ): Promise<Transaction | undefined> {
    const query = trx
      ? trx<Transaction>(this.TABLE)
      : db<Transaction>(this.TABLE);
    return query.where({ reference }).first();
  }
}
