import fetch from "node-fetch";
import { redis } from "../../mcp-server/src/tools/oracle.client.js";

export async function createCustomerAccountSOAP(data) {

  const {
    userId,
    partyId,
    accountName,
    accountNumber
  } = data;

  if (!partyId) {
    throw new Error("partyId is required");
  }

  const redisKey = `user:${userId}:oracle:ERP`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    throw new Error("Oracle ERP config not found in Redis");
  }

  const { username, password, baseUrl } = JSON.parse(raw);

  const auth = Buffer
    .from(`${username}:${password}`)
    .toString("base64");

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
          <cus:AccountNumber>${accountNumber}</cus:AccountNumber>
          <cus:CustomerType>R</cus:CustomerType>
          <cus:CreatedByModule>TCA_FORM_WRAPPER</cus:CreatedByModule>
        </typ:customerAccount>
      </typ:createCustomerAccount>
    </soapenv:Body>
  </soapenv:Envelope>`;

  const response = await fetch(
    `${baseUrl}/crmService/CustomerAccountService`,
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

  const xml = await response.text();

  if (!response.ok) {
    console.error("SOAP ERROR:", xml);
    throw new Error("SOAP Customer Account creation failed");
  }

  const idMatch = xml.match(
    /<ns2:CustomerAccountId>(\d+)<\/ns2:CustomerAccountId>/
  );

  const numberMatch = xml.match(
    /<ns2:AccountNumber>(.*?)<\/ns2:AccountNumber>/
  );

  const customerAccountId = idMatch ? Number(idMatch[1]) : null;
  const returnedAccountNumber = numberMatch
    ? numberMatch[1]
    : accountNumber;

  if (!customerAccountId) {
    throw new Error("CustomerAccountId not found in SOAP response");
  }

  return {
    success: true,
    customerAccountId,
    accountNumber: returnedAccountNumber
  };
}