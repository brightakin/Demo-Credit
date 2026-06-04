import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { UserModel } from "../models/UserModel";
import { WalletModel } from "../models/WalletModel";
import { checkKarmaBlacklist } from "../utils/adjutor";
import { CreateUserDTO, LoginDTO } from "../utils/types";

export class AuthService {
  static async register(
    dto: CreateUserDTO,
  ): Promise<{ user: object; token: string }> {
    const { first_name, last_name, email, password, phone_number } = dto;

    // Check for duplicate email / phone
    const emailTaken = await UserModel.existsByEmail(email);
    if (emailTaken) {
      throw new Error("Email is already registered");
    }

    const phoneTaken = await UserModel.existsByPhone(phone_number);
    if (phoneTaken) {
      throw new Error("Phone number is already registered");
    }

    // Check Lendsqr Adjutor karma blacklist by email and phone
    const emailBlacklisted = await checkKarmaBlacklist(email);
    if (emailBlacklisted) {
      throw new Error(
        "User cannot be onboarded due to a compliance restriction",
      );
    }

    const phoneBlacklisted = await checkKarmaBlacklist(phone_number);
    if (phoneBlacklisted) {
      throw new Error(
        "User cannot be onboarded due to a compliance restriction",
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    const userId = randomUUID();
    const user = await UserModel.create({
      id: userId,
      first_name,
      last_name,
      email,
      password_hash,
      phone_number,
    });

    // Create wallet for user
    await WalletModel.create({ id: randomUUID(), user_id: userId });

    const token = this.generateToken(user.id, user.email);

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  static async login(dto: LoginDTO): Promise<{ user: object; token: string }> {
    const { email, password } = dto;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    const token = this.generateToken(user.id, user.email);

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  private static generateToken(userId: string, email: string): string {
    const secret = process.env.JWT_SECRET as string;
    return jwt.sign({ userId, email }, secret, { expiresIn: "24h" });
  }
}
