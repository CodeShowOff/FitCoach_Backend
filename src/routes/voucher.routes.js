import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createVoucher,
  getCoachVouchers,
  updateVoucher,
  deleteVoucher,
  getAvailableVouchersForClient,
} from "../controllers/voucher.controller.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("coach"), createVoucher);
router.get("/coach", protect, authorizeRoles("coach"), getCoachVouchers);
router.patch("/:id", protect, authorizeRoles("coach"), updateVoucher);
router.delete("/:id", protect, authorizeRoles("coach"), deleteVoucher);

router.get("/available", protect, authorizeRoles("client"), getAvailableVouchersForClient);

export default router;
