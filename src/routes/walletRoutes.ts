import { Router } from "express";
import { WalletController } from "../controllers/WalletController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { FundWalletSchema, TransferSchema, WithdrawSchema } from "../schemas";

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

router.get("/balance", WalletController.getBalance);
router.post("/fund", validate(FundWalletSchema), WalletController.fundWallet);
router.post("/transfer", validate(TransferSchema), WalletController.transfer);
router.post("/withdraw", validate(WithdrawSchema), WalletController.withdraw);
router.get("/transactions", WalletController.getTransactions);

export default router;
