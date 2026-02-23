import {
  validateCustomerInputService
} from "../../services/customer/validation.service.js";

import {
  findBusinessUnitService
} from "../../services/customer/businessUnit.service.js";

import {
  checkDuplicatePartyService
} from "../../services/customer/duplicate.service.js";

import {
  createPartyService
} from "../../services/customer/party.service.js";

import {
  createCustomerAccountSOAP as createCustomerAccountSOAPService
} from "../../services/customer/customerAccount.service.js";

import {
  createCustomerAccountSite,
  createCustomerSiteUse
} from "../../services/customer/customerSite.service.js";

import {
  createCustomerProfileSOAP as createCustomerProfileSOAPService
} from "../../services/customer/profile.service.js";

/* ================= VALIDATE INPUT ================= */
export async function validateCustomerInput(req, res) {
  try {
    const result = validateCustomerInputService(req.body);

    if (result.status === "INVALID") {
      return res.status(400).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error("Validation Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}


/* ================= VALIDATE BU ================= */
export async function validateBusinessUnit(req, res) {
  try {
    const { userId, businessUnitName } = req.body;
    const result = await findBusinessUnitService(userId, businessUnitName);
    res.json(result);

  } catch (error) {
    console.error("BU Validation Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}


/* ================= CHECK DUPLICATE ================= */
export async function checkDuplicateParty(req, res) {
  try {
    const result = await checkDuplicatePartyService(req.body);
    res.json(result);

  } catch (error) {
    console.error("Duplicate Check Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}


/* ================= CREATE PARTY ================= */
export async function createParty(req, res) {
  try {
    const result = await createPartyService(req.body);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Create Party Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}


/* ================= CREATE ACCOUNT (SITE AUTO CREATED INSIDE SOAP) ================= */
export async function createCustomerAccount(req, res) {
  try {
    const {
      userId,
      partyId,
      accountName
    } = req.body;

    if (!userId || !partyId || !accountName) {
      return res.status(400).json({
        error: "userId, partyId and accountName are required"
      });
    }

    const accountNumber = `ACC${Date.now()}`;

    const result = await createCustomerAccountSOAPService({
      userId,
      partyId,
      accountName,
      accountNumber
    });

    res.json({
      success: true,
      customerAccountId: result.customerAccountId,
      accountNumber: result.accountNumber
    });

  } catch (error) {
    console.error("Create Account Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}


/* ================= CREATE CUSTOMER SITE (DEPRECATED) ================= */
/* ================= CREATE CUSTOMER SITE ================= */

export async function createCustomerSite(req, res) {
  try {

    const {
      userId,
      customerAccountId,
      partySiteId,
      setId
    } = req.body;

    await createCustomerAccountSite({
      userId,
      customerAccountId,
      partySiteId,
      setId
    });

    await createCustomerSiteUse({
      userId,
      customerAccountId,
      partySiteId
    });

    res.json({ success: true });

  } catch (error) {
    console.error("Create Site Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}
/* ================= CREATE PROFILE ================= */
export async function createCustomerProfile(req, res) {
  try {
    await createCustomerProfileSOAPService(req.body);
    res.json({ success: true });

  } catch (error) {
    console.error("Profile Error:", error.message);
    res.status(500).json({ error: error.message });
  }
}