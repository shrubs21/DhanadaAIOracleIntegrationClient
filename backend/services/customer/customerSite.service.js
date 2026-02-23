import fetch from "node-fetch";
import { redis } from "../../mcp-server/src/tools/oracle.client.js";

/* ==========================================================
   STEP 1: CREATE CUSTOMER ACCOUNT SITE
========================================================== */
export async function createCustomerAccountSite(data) {

  const { userId, customerAccountId, partySiteId, setId } = data;

  if (!userId || !customerAccountId || !partySiteId || !setId) {
    throw new Error("userId, customerAccountId, partySiteId and setId are required");
  }

  const redisKey = `user:${userId}:oracle:ERP`;
  const raw = await redis.get(redisKey);

  if (!raw) throw new Error("Oracle ERP config not found");

  const { username, password, baseUrl } = JSON.parse(raw);
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const soapBody = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:typ="http://xmlns.oracle.com/apps/cdm/foundation/parties/customerAccountService/applicationModule/types/"
    xmlns:cus="http://xmlns.oracle.com/apps/cdm/foundation/parties/customerAccountService/">
    <soapenv:Header/>
    <soapenv:Body>
      <typ:mergeCustomerAccount>
        <typ:customerAccount>
          <cus:CustomerAccountId>${customerAccountId}</cus:CustomerAccountId>
          <cus:CustomerAccountSite>
            <cus:PartySiteId>${partySiteId}</cus:PartySiteId>
            <cus:SetId>${setId}</cus:SetId>
            <cus:CreatedByModule>TCA_FORM_WRAPPER</cus:CreatedByModule>
          </cus:CustomerAccountSite>
        </typ:customerAccount>
      </typ:mergeCustomerAccount>
    </soapenv:Body>
  </soapenv:Envelope>`;

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

  if (!response.ok) {
    console.error("SOAP SITE ERROR:", xml);
    throw new Error("Customer Account Site creation failed");
  }

  return { success: true };
}


/* ==========================================================
   STEP 2: CREATE SITE USE (BILL_TO)
========================================================== */
export async function createCustomerSiteUse(data) {

  const { userId, customerAccountId, partySiteId } = data;

  const redisKey = `user:${userId}:oracle:ERP`;
  const raw = await redis.get(redisKey);

  if (!raw) throw new Error("Oracle ERP config not found");

  const { username, password, baseUrl } = JSON.parse(raw);
  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const soapBody = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:typ="http://xmlns.oracle.com/apps/cdm/foundation/parties/customerAccountService/applicationModule/types/"
    xmlns:cus="http://xmlns.oracle.com/apps/cdm/foundation/parties/customerAccountService/">
    <soapenv:Header/>
    <soapenv:Body>
      <typ:mergeCustomerAccountSite>
        <typ:customerAccountSite>
          <cus:CustomerAccountId>${customerAccountId}</cus:CustomerAccountId>
          <cus:PartySiteId>${partySiteId}</cus:PartySiteId>

          <cus:CustomerAccountSiteUse>
            <cus:SiteUseCode>BILL_TO</cus:SiteUseCode>
            <cus:CreatedByModule>TCA_FORM_WRAPPER</cus:CreatedByModule>
          </cus:CustomerAccountSiteUse>

        </typ:customerAccountSite>
      </typ:mergeCustomerAccountSite>
    </soapenv:Body>
  </soapenv:Envelope>`;

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

  if (!response.ok) {
    console.error("SOAP SITE USE ERROR:", xml);
    throw new Error("Customer Site Use creation failed");
  }

  return { success: true };
}