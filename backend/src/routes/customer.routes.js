import express from "express";
import {
  validateCustomerInput,
  validateBusinessUnit,
  checkDuplicateParty,
  createParty,
  createCustomerAccount,
  createCustomerSite,
  createCustomerProfile
} from "../controllers/customer.controller.js";

const router = express.Router();

/* ================================
   VALIDATIONS
================================ */
router.post("/validate-customer-input", validateCustomerInput);
router.post("/validate-business-unit", validateBusinessUnit);
router.post("/check-duplicate-party", checkDuplicateParty);

/* ================================
   LAYER 1 – PARTY
================================ */
router.post("/create-party", createParty);

/* ================================
   LAYER 2 – CUSTOMER ACCOUNT
================================ */
router.post("/create-customer-account", createCustomerAccount);

/* ================================
   LAYER 3 – CUSTOMER SITE
================================ */
router.post("/create-customer-site", createCustomerSite);

/* ================================
   OPTIONAL – PROFILE
================================ */
router.post("/create-customer-profile", createCustomerProfile);

export default router;