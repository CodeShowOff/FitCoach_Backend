import express from "express";
import { getIndianFoods } from "../controllers/indianFood.controller.js";

const router = express.Router();

// ------------------------------
// 🍛 Public Indian foods endpoint
// ------------------------------
router.get("/", getIndianFoods);

export default router;
