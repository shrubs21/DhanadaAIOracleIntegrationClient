import fetch from "node-fetch";
import { redis } from "../../mcp-server/src/tools/oracle.client.js";

export async function createCustomerProfileSOAP(data) {

  const {
    userId,
    partyId,
    customerAccountId,
    accountNumber,
    creditLimit = 5000,
    currency = "AED"
  } = data;

  const redisKey = `user:${userId}:oracle:ERP`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    throw new Error("Oracle ERP config not found in Redis");
  }

  const { username, password, baseUrl } = JSON.parse(raw);

  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const soapBody = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
    xmlns:typ="http://xmlns.oracle.com/apps/financials/receivables/customers/customerProfileService/types/"
    xmlns:cus="http://xmlns.oracle.com/apps/financials/receivables/customers/customerProfileService/">
    <soapenv:Header/>
    <soapenv:Body>
      <typ:createCustomerProfile>
        <typ:customerProfile>
          <cus:AccountNumber>${accountNumber}</cus:AccountNumber>
          <cus:PartyId>${partyId}</cus:PartyId>
          <cus:CreditLimit>${creditLimit}</cus:CreditLimit>
          <cus:CreditCurrencyCode>${currency}</cus:CreditCurrencyCode>
        </typ:customerProfile>
      </typ:createCustomerProfile>
    </soapenv:Body>
  </soapenv:Envelope>`;

  const response = await fetch(
    `${baseUrl}/fscmService/ReceivablesCustomerProfileService`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "text/xml;charset=UTF-8",
        SOAPAction: ""
      },
      body: soapBody
    }
  );

  const result = await response.text();

  if (!response.ok) {
    console.error(result);
    throw new Error("SOAP Customer Profile creation failed");
  }

  return { success: true };
}