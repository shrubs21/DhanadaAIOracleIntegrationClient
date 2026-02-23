import express from "express";
import { getAllBusinessUnitsController } from "../controllers/businessUnit.list.controller.js";

const router = express.Router();

router.post("/business-units", getAllBusinessUnitsController);

export default router;
