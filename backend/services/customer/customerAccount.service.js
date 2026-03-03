import fetch from "node-fetch";
import { redis } from "../../mcp-server/src/tools/oracle.client.js";

export async function createCustomerAccountSOAP(data) {

  const { userId, partyId, accountName } = data;

  // -----------------------------
  // Basic Validation
  // -----------------------------
  if (!userId) {
    throw new Error("userId is required");
  }

  if (!partyId) {
    throw new Error("partyId is required");
  }

  if (!accountName) {
    throw new Error("accountName is required");
  }

  // -----------------------------
  // Get ERP Config from Redis
  // -----------------------------
  const redisKey = `user:${userId}:oracle:ERP`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    throw new Error("Oracle ERP config not found in Redis");
  }

  const { username, password, baseUrl } = JSON.parse(raw);

  if (!username || !password || !baseUrl) {
    throw new Error("Invalid ERP configuration in Redis");
  }

  const auth = Buffer
    .from(`${username}:${password}`)
    .toString("base64");

  // -----------------------------
  // SOAP BODY (CLEAN VERSION)
  // -----------------------------
  const soapBody = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:typ="http://xmlns.oracle.com/apps/cdm/foundation/parties/customerAccountService/applicationModule/types/"
    xmlns:cus="http://xmlns.oracle.com/apps/cdm/foundation/parties/customerAccountService/">
    <soapenv:Header/>
    <soapenv:Body>
      <typ:createCustomerAccount>
        <typ:customerAccount>
          <cus:PartyId>${partyId}</cus:PartyId>
          <cus:AccountName>${accountName}</cus:AccountName>
          <cus:CreatedByModule>TCA_FORM_WRAPPER</cus:CreatedByModule>
        </typ:customerAccount>
      </typ:createCustomerAccount>
    </soapenv:Body>
  </soapenv:Envelope>`;

  // -----------------------------
  // Call Oracle SOAP
  // -----------------------------
  const response = await fetch(
    `${baseUrl}/crmService/CustomerAccountService`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "text/xml;charset=UTF-8"
      },
      body: soapBody
    }
  );

  const xml = await response.text();

  // 🔎 Debug (keep for now)
  console.log("SOAP RESPONSE:\n", xml);

  if (!response.ok) {
    console.error("SOAP ERROR:", xml);
    throw new Error("SOAP Customer Account creation failed");
  }

  // -----------------------------
  // Namespace-safe Parsing
  // -----------------------------
  const idMatch = xml.match(/CustomerAccountId[^>]*>(\d+)</);
  const numberMatch = xml.match(/AccountNumber[^>]*>([^<]+)</);

  if (!idMatch) {
    throw new Error("CustomerAccountId not found in SOAP response");
  }

  return {
    success: true,
    customerAccountId: Number(idMatch[1]),
    accountNumber: numberMatch ? numberMatch[1] : null
  };
}