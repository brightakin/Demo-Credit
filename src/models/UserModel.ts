import db from "../config/database";
import { User, CreateUserDTO } from "../utils/types";

export class UserModel {
  private static readonly TABLE = "users";

  static async findById(id: string): Promise<User | undefined> {
    return db<User>(this.TABLE).where({ id }).first();
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    return db<User>(this.TABLE).where({ email }).first();
  }

  static async create(
    data: Omit<CreateUserDTO, "password"> & {
      id: string;
      password_hash: string;
    },
  ): Promise<User> {
    await db<User>(this.TABLE).insert(data);
    return this.findById(data.id) as Promise<User>;
  }

  static async existsByEmail(email: string): Promise<boolean> {
    const user = await db<User>(this.TABLE).where({ email }).first();
    return !!user;
  }

  static async existsByPhone(phone_number: string): Promise<boolean> {
    const user = await db<User>(this.TABLE).where({ phone_number }).first();
    return !!user;
  }
}
