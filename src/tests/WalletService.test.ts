import { WalletService } from "../services/WalletService";
import { WalletModel } from "../models/WalletModel";
import { UserModel } from "../models/UserModel";
import { TransactionModel } from "../models/TransactionModel";
import db from "../config/database";

jest.mock("../models/WalletModel");
jest.mock("../models/UserModel");
jest.mock("../models/TransactionModel");

// ─── MOCKING KNEX TRANSACTIONS ──────────────────────────────────────────────
// WalletService uses db.transaction(async (trx) => { ... }).
// In tests we don't have a real database, so we mock the entire db module.
//
// The trick: we make db.transaction immediately invoke its callback and pass
// a fake `trx` object. This lets the service code run as normal while our
// mocked model methods intercept the actual DB calls inside the transaction.
// ────────────────────────────────────────────────────────────────────────────
jest.mock("../config/database", () => {
  const mockTrx = {}; // fake transaction object passed to the callback
  return {
    __esModule: true,
    default: {
      transaction: jest.fn((callback: (trx: object) => Promise<unknown>) =>
        callback(mockTrx),
      ),
    },
  };
});

const MockedWalletModel = WalletModel as jest.Mocked<typeof WalletModel>;
const MockedUserModel = UserModel as jest.Mocked<typeof UserModel>;
const MockedTransactionModel = TransactionModel as jest.Mocked<
  typeof TransactionModel
>;
const mockDb = db as jest.Mocked<typeof db>;

// ─── SHARED FIXTURES ────────────────────────────────────────────────────────
const mockWallet = {
  id: "wallet-abc",
  user_id: "user-abc",
  balance: 1000,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockReceiverWallet = {
  id: "wallet-xyz",
  user_id: "user-xyz",
  balance: 500,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockTransaction = {
  id: "txn-uuid",
  wallet_id: "wallet-abc",
  type: "fund" as const,
  amount: 500,
  reference: "ref-uuid",
  receiver_wallet_id: null,
  status: "completed" as const,
  description: "Wallet funding",
  created_at: new Date(),
  updated_at: new Date(),
};

const mockSenderUser = {
  id: "user-abc",
  first_name: "John",
  last_name: "Doe",
  email: "john@example.com",
  password_hash: "hashed",
  phone_number: "08012345678",
  is_blacklisted: false,
};

const mockReceiverUser = {
  id: "user-xyz",
  first_name: "Jane",
  last_name: "Smith",
  email: "jane@example.com",
  password_hash: "hashed",
  phone_number: "08098765432",
  is_blacklisted: false,
};

describe("WalletService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getBalance()
  // ═══════════════════════════════════════════════════════════════════════
  describe("getBalance()", () => {
    it("should return the wallet for a valid user", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);

      const result = await WalletService.getBalance("user-abc");

      expect(result).toEqual(mockWallet);
      expect(MockedWalletModel.findByUserId).toHaveBeenCalledWith("user-abc");
    });

    it("should throw if wallet does not exist", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(undefined);

      await expect(WalletService.getBalance("user-abc")).rejects.toThrow(
        "Wallet not found",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // fundWallet()
  // ═══════════════════════════════════════════════════════════════════════
  describe("fundWallet()", () => {
    it("should fund the wallet and return a transaction", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);
      MockedWalletModel.updateBalance.mockResolvedValue(undefined);
      MockedTransactionModel.create.mockResolvedValue(mockTransaction);

      const result = await WalletService.fundWallet("user-abc", {
        amount: 500,
      });

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);

      // Balance updated to 1000 + 500 = 1500
      expect(MockedWalletModel.updateBalance).toHaveBeenCalledWith(
        "wallet-abc",
        1500,
        expect.anything(), // trx object
      );

      expect(result).toEqual(mockTransaction);
    });

    it("should throw if amount is zero", async () => {
      await expect(
        WalletService.fundWallet("user-abc", { amount: 0 }),
      ).rejects.toThrow("Amount must be greater than zero");
      // Guard clause fired before DB is touched
      expect(MockedWalletModel.findByUserId).not.toHaveBeenCalled();
    });

    it("should throw if amount is negative", async () => {
      await expect(
        WalletService.fundWallet("user-abc", { amount: -100 }),
      ).rejects.toThrow("Amount must be greater than zero");
    });

    it("should throw if wallet is not found", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(undefined);

      await expect(
        WalletService.fundWallet("user-abc", { amount: 500 }),
      ).rejects.toThrow("Wallet not found");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // transfer()
  // ═══════════════════════════════════════════════════════════════════════
  describe("transfer()", () => {
    const transferDTO = {
      receiver_email: "jane@example.com",
      amount: 200,
    };

    it("should transfer funds between wallets successfully", async () => {
      MockedWalletModel.findByUserId
        .mockResolvedValueOnce(mockWallet) // sender's wallet
        .mockResolvedValueOnce(mockReceiverWallet); // receiver's wallet

      MockedUserModel.findByEmail.mockResolvedValue(mockReceiverUser);
      MockedUserModel.findById.mockResolvedValue(mockSenderUser);
      MockedWalletModel.updateBalance.mockResolvedValue(undefined);
      MockedTransactionModel.create.mockResolvedValue({
        ...mockTransaction,
        type: "transfer",
        receiver_wallet_id: "wallet-xyz",
      });

      const result = await WalletService.transfer("user-abc", transferDTO);

      // Sender: 1000 - 200 = 800
      expect(MockedWalletModel.updateBalance).toHaveBeenCalledWith(
        "wallet-abc",
        800,
        expect.anything(),
      );
      // Receiver: 500 + 200 = 700
      expect(MockedWalletModel.updateBalance).toHaveBeenCalledWith(
        "wallet-xyz",
        700,
        expect.anything(),
      );

      expect(result.type).toBe("transfer");
    });

    it("should throw if amount is zero or negative", async () => {
      await expect(
        WalletService.transfer("user-abc", { ...transferDTO, amount: 0 }),
      ).rejects.toThrow("Amount must be greater than zero");
    });

    it("should throw if sender has insufficient balance", async () => {
      // Wallet balance is 1000, trying to transfer 5000
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);

      await expect(
        WalletService.transfer("user-abc", { ...transferDTO, amount: 5000 }),
      ).rejects.toThrow("Insufficient balance");
    });

    it("should throw if receiver account does not exist", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);
      MockedUserModel.findByEmail.mockResolvedValue(undefined); // no such user

      await expect(
        WalletService.transfer("user-abc", transferDTO),
      ).rejects.toThrow("Receiver account not found");
    });

    it("should throw if sender tries to transfer to themselves", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);
      // findByEmail returns the SAME user as the sender
      MockedUserModel.findByEmail.mockResolvedValue(mockSenderUser);
      MockedUserModel.findById.mockResolvedValue(mockSenderUser);

      await expect(
        WalletService.transfer("user-abc", {
          receiver_email: "john@example.com", // sender's own email
          amount: 200,
        }),
      ).rejects.toThrow("Cannot transfer funds to your own account");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // withdraw()
  // ═══════════════════════════════════════════════════════════════════════
  describe("withdraw()", () => {
    it("should withdraw funds and return a transaction", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);
      MockedWalletModel.updateBalance.mockResolvedValue(undefined);
      MockedTransactionModel.create.mockResolvedValue({
        ...mockTransaction,
        type: "withdrawal",
      });

      const result = await WalletService.withdraw("user-abc", { amount: 300 });

      // Balance: 1000 - 300 = 700
      expect(MockedWalletModel.updateBalance).toHaveBeenCalledWith(
        "wallet-abc",
        700,
        expect.anything(),
      );
      expect(result.type).toBe("withdrawal");
    });

    it("should throw if amount is zero or negative", async () => {
      await expect(
        WalletService.withdraw("user-abc", { amount: -50 }),
      ).rejects.toThrow("Amount must be greater than zero");
    });

    it("should throw if wallet is not found", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(undefined);

      await expect(
        WalletService.withdraw("user-abc", { amount: 300 }),
      ).rejects.toThrow("Wallet not found");
    });

    it("should throw if balance is insufficient", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet); // balance: 1000

      await expect(
        WalletService.withdraw("user-abc", { amount: 9999 }),
      ).rejects.toThrow("Insufficient balance");
    });

    it("should throw if attempting to withdraw exact 0", async () => {
      await expect(
        WalletService.withdraw("user-abc", { amount: 0 }),
      ).rejects.toThrow("Amount must be greater than zero");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // getTransactions()
  // ═══════════════════════════════════════════════════════════════════════
  describe("getTransactions()", () => {
    it("should return the list of transactions for a user wallet", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);
      MockedTransactionModel.findByWalletId.mockResolvedValue([
        mockTransaction,
      ]);

      const result = await WalletService.getTransactions("user-abc");

      expect(result).toHaveLength(1);
      expect(MockedTransactionModel.findByWalletId).toHaveBeenCalledWith(
        "wallet-abc",
      );
    });

    it("should throw if wallet is not found", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(undefined);

      await expect(WalletService.getTransactions("user-abc")).rejects.toThrow(
        "Wallet not found",
      );
    });

    it("should return an empty array when there are no transactions", async () => {
      MockedWalletModel.findByUserId.mockResolvedValue(mockWallet);
      MockedTransactionModel.findByWalletId.mockResolvedValue([]);

      const result = await WalletService.getTransactions("user-abc");

      expect(result).toEqual([]);
    });
  });
});
