import { callOracleAPI } from "../../mcp-server/src/tools/oracle.client.js";

export async function createFullSupplierService(data) {
  const {
    userId,
    supplierName,
    supplierNumber,
    address1,
    city,
    country,
    email
  } = data;

  try {
    /* =========================================
       STEP 1️⃣ CREATE SUPPLIER HEADER
    ========================================= */
    const supplierResponse = await callOracleAPI({
      userId,
      product: "MHI",
      method: "POST",
      endpoint: "/suppliers",
      payload: {
        Supplier: supplierName,
        SupplierNumber: supplierNumber,
        SupplierTypeCode: "SERVICES",
        BusinessRelationshipCode: "SPEND_AUTHORIZED",
        TaxOrganizationTypeCode: "CORPORATION",
        TaxpayerCountryCode: country
      }
    });

    const supplierId = supplierResponse.SupplierId;

    if (!supplierId) {
      throw new Error("Supplier creation failed.");
    }

    console.log("✅ Supplier Created:", supplierId);

    /* =========================================
       STEP 2️⃣ CREATE ADDRESS
    ========================================= */
    const addressResponse = await callOracleAPI({
      userId,
      product: "MHI",
      method: "POST",
      endpoint: `/suppliers/${supplierId}/child/addresses`,
      payload: {
        AddressName: "PRIMARY_ADDRESS",
        AddressLine1: address1,
        City: city,
        CountryCode: country,
        AddressPurposeOrderingFlag: "Y"
      }
    });

    if (!addressResponse.SupplierAddressId) {
      throw new Error("Address creation failed.");
    }

    console.log("✅ Address Created:", addressResponse.SupplierAddressId);

    /* =========================================
       STEP 3️⃣ CREATE CONTACT  (🔥 FIXED HERE)
    ========================================= */
    await callOracleAPI({
      userId,
      product: "MHI",
      method: "POST",
      endpoint: `/suppliers/${supplierId}/child/contacts`,
      payload: {
        FirstName: "Primary",
        LastName: "Contact",
        Email: email   // ✅ CORRECT ATTRIBUTE FOR YOUR POD
      }
    });

    console.log("✅ Contact Created");

    /* =========================================
       FINAL RESPONSE
    ========================================= */
    return {
      success: true,
      supplierId,
      supplierNumber: supplierResponse.SupplierNumber,
      message: "Supplier created successfully (Header + Address + Contact). Site handled separately."
    };

  } catch (error) {
    console.error("🚨 Supplier Creation Error:", error.message);
    throw error;
  }
}