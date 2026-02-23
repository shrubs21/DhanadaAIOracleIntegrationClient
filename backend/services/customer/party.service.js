import { callOracleAPI } from "../../mcp-server/src/tools/oracle.client.js";

export async function createPartyService(data) {

  const {
    userId,
    organizationName,
    taxId,
    email,
    phone,
    country,
    address1,
    city,
    postalCode,
    currency = "AED"
  } = data;

  if (!userId) {
    throw new Error("userId is required");
  }

  /* =============================
     CREATE ORGANIZATION (CRM REST)
  ============================== */

  const payload = {
    OrganizationName: organizationName,
    PartyUsageCode: "EXTERNAL_LEGAL_ENTITY",
    TaxpayerIdentificationNumber: taxId,
    RawPhoneNumber: phone,
    EmailAddress: email,
    CreatedByModule: "ORA_ZCH_WS",
    Address: [
      {
        AddressType: "SHIP_TO",
        Address1: address1,
        City: city,
        Country: country,
        PostalCode: postalCode
      }
    ],
    CurrencyCode: currency,
    CorpCurrencyCode: currency,
    CurcyConvRateType: "Corporate"
  };

  const response = await callOracleAPI({
    userId,
    product: "CRM",
    endpoint: "/hubOrganizations",
    method: "POST",
    payload
  });

  if (!response.PartyId) {
    throw new Error("Party creation failed — PartyId not returned");
  }

  return {
    partyId: response.PartyId,
    partyNumber: response.PartyNumber
  };
}