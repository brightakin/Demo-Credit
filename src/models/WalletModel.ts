import db from "../config/database";
import { Knex } from "knex";
import { Wallet } from "../utils/types";

export class WalletModel {
  private static readonly TABLE = "wallets";

  static async findById(
    id: string,
    trx?: Knex.Transaction,
  ): Promise<Wallet | undefined> {
    return (trx ? trx<Wallet>(this.TABLE) : db<Wallet>(this.TABLE))
      .where({ id })
      .first();
  }

  static async findByUserId(
    user_id: string,
    trx?: Knex.Transaction,
  ): Promise<Wallet | undefined> {
    return (trx ? trx<Wallet>(this.TABLE) : db<Wallet>(this.TABLE))
      .where({ user_id })
      .first();
  }

  static async create(data: { id: string; user_id: string }): Promise<Wallet> {
    await db<Wallet>(this.TABLE).insert({ ...data, balance: 0 });
    return this.findById(data.id) as Promise<Wallet>;
  }

  static async updateBalance(
    id: string,
    balance: number,
    trx?: Knex.Transaction,
  ): Promise<void> {
    await (trx ? trx<Wallet>(this.TABLE) : db<Wallet>(this.TABLE))
      .where({ id })
      .update({ balance });
  }
}
