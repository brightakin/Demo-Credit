import { AuthService } from "../services/AuthService";
import { UserModel } from "../models/UserModel";
import { WalletModel } from "../models/WalletModel";
import { checkKarmaBlacklist } from "../utils/adjutor";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ─── WHY WE MOCK ────────────────────────────────────────────────────────────
// Unit tests test ONE unit (AuthService) in isolation.
// We mock its dependencies so our test doesn't need a real database or real
// HTTP calls. This makes tests fast, reliable, and deterministic.
// jest.mock() replaces the entire module with an auto-mocked version where
// every exported function becomes a jest.fn() you can control.
// ────────────────────────────────────────────────────────────────────────────
jest.mock("../models/UserModel");
jest.mock("../models/WalletModel");
jest.mock("../utils/adjutor");
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");

// After jest.mock(), we cast the import to jest.Mocked<T> so TypeScript knows
// these are mock functions with .mockResolvedValue() etc. available.
const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;
const MockedWalletModel = WalletModel as jest.Mocked<typeof WalletModel>;
const mockCheckKarma = checkKarmaBlacklist as jest.MockedFunction<
  typeof checkKarmaBlacklist
>;
const mockBcryptHash = bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<
  typeof bcrypt.compare
>;
const mockJwtSign = jwt.sign as jest.MockedFunction<typeof jwt.sign>;

// Reusable test data — define once, use everywhere
const mockUser = {
  id: "user-uuid-123",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  password_hash: "hashed_password",
  phone_number: "08012345678",
  is_blacklisted: false,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockWallet = {
  id: "wallet-uuid-123",
  user_id: "user-uuid-123",
  balance: 0,
  created_at: new Date(),
  updated_at: new Date(),
};

const registerDTO = {
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  password: "password123",
  phone_number: "08012345678",
};

// ─── HOW describe/it/beforeEach WORK ────────────────────────────────────────
// describe() groups related tests. It's just organisation.
// it() (alias: test()) is a single test case.
// beforeEach() runs before EVERY test in its describe block — used here to
// clear all mock state so tests don't bleed into each other.
// ────────────────────────────────────────────────────────────────────────────
describe("AuthService", () => {
  beforeEach(() => {
    // jest.clearAllMocks() resets call counts and return values between tests
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test_secret";
  });

  // ═══════════════════════════════════════════════════════════════════════
  // register()
  // ═══════════════════════════════════════════════════════════════════════
  describe("register()", () => {
    // ── POSITIVE SCENARIO ──────────────────────────────────────────────
    it("should register a new user and return user data with token", async () => {
      // ARRANGE: set up what each mock should return for this test
      MockedUserModel.existsByEmail.mockResolvedValue(false); // email is free
      MockedUserModel.existsByPhone.mockResolvedValue(false); // phone is free
      mockCheckKarma.mockResolvedValue(false); // not blacklisted
      (mockBcryptHash as jest.Mock).mockResolvedValue("hashed_password");
      MockedUserModel.create.mockResolvedValue(mockUser);
      MockedWalletModel.create.mockResolvedValue(mockWallet);
      (mockJwtSign as jest.Mock).mockReturnValue("fake.jwt.token");

      // ACT: call the function we're testing
      const result = await AuthService.register(registerDTO);

      // ASSERT: verify the output
      expect(result).toHaveProperty("token", "fake.jwt.token");
      expect(result.user).not.toHaveProperty("password_hash"); // never expose hash
      expect(MockedUserModel.create).toHaveBeenCalledTimes(1);
      expect(MockedWalletModel.create).toHaveBeenCalledTimes(1);
    });

    // ── NEGATIVE SCENARIOS ─────────────────────────────────────────────
    it("should throw an error if email is already registered", async () => {
      MockedUserModel.existsByEmail.mockResolvedValue(true); // email IS taken

      // expect(...).rejects.toThrow() — the idiomatic way to test async errors
      await expect(AuthService.register(registerDTO)).rejects.toThrow(
        "Email is already registered",
      );

      // Verify we stopped early — no DB write should happen
      expect(MockedUserModel.create).not.toHaveBeenCalled();
    });

    it("should throw an error if phone number is already registered", async () => {
      MockedUserModel.existsByEmail.mockResolvedValue(false);
      MockedUserModel.existsByPhone.mockResolvedValue(true); // phone IS taken

      await expect(AuthService.register(registerDTO)).rejects.toThrow(
        "Phone number is already registered",
      );

      expect(MockedUserModel.create).not.toHaveBeenCalled();
    });

    it("should throw an error if email is on the karma blacklist", async () => {
      MockedUserModel.existsByEmail.mockResolvedValue(false);
      MockedUserModel.existsByPhone.mockResolvedValue(false);
      mockCheckKarma.mockResolvedValueOnce(true); // email blacklisted on first call

      await expect(AuthService.register(registerDTO)).rejects.toThrow(
        "User cannot be onboarded due to a compliance restriction",
      );

      expect(MockedUserModel.create).not.toHaveBeenCalled();
    });

    it("should throw an error if phone is on the karma blacklist", async () => {
      MockedUserModel.existsByEmail.mockResolvedValue(false);
      MockedUserModel.existsByPhone.mockResolvedValue(false);
      // mockResolvedValueOnce() lets you return different values per call order:
      // 1st call (email check) → false, 2nd call (phone check) → true
      mockCheckKarma.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      await expect(AuthService.register(registerDTO)).rejects.toThrow(
        "User cannot be onboarded due to a compliance restriction",
      );

      expect(MockedUserModel.create).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // login()
  // ═══════════════════════════════════════════════════════════════════════
  describe("login()", () => {
    const loginDTO = { email: "john@example.com", password: "password123" };

    // ── POSITIVE SCENARIO ──────────────────────────────────────────────
    it("should login successfully and return user data with token", async () => {
      MockedUserModel.findByEmail.mockResolvedValue(mockUser);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(true); // password matches
      (mockJwtSign as jest.Mock).mockReturnValue("fake.jwt.token");

      const result = await AuthService.login(loginDTO);

      expect(result).toHaveProperty("token", "fake.jwt.token");
      expect(result.user).not.toHaveProperty("password_hash");
      expect(MockedUserModel.findByEmail).toHaveBeenCalledWith(
        "john@example.com",
      );
    });

    // ── NEGATIVE SCENARIOS ─────────────────────────────────────────────
    it("should throw an error if user is not found", async () => {
      MockedUserModel.findByEmail.mockResolvedValue(undefined); // user doesn't exist

      await expect(AuthService.login(loginDTO)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw an error if password does not match", async () => {
      MockedUserModel.findByEmail.mockResolvedValue(mockUser);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false); // wrong password

      await expect(AuthService.login(loginDTO)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should return the same error for missing user and wrong password (security)", async () => {
      // IMPORTANT: never reveal whether the email exists or not —
      // both cases must throw the identical message to prevent user enumeration attacks
      MockedUserModel.findByEmail.mockResolvedValue(undefined);
      const noUserError = await AuthService.login(loginDTO).catch(
        (e: Error) => e.message,
      );

      MockedUserModel.findByEmail.mockResolvedValue(mockUser);
      (mockBcryptCompare as jest.Mock).mockResolvedValue(false);
      const wrongPassError = await AuthService.login(loginDTO).catch(
        (e: Error) => e.message,
      );

      expect(noUserError).toBe(wrongPassError);
    });
  });
});
