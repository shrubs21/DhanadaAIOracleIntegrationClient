import { callOracleAPI } 
from "../../mcp-server/src/tools/oracle.client.js";

/**
 * Check if organization already exists in Oracle
 */
export async function checkDuplicatePartyService({ userId, organizationName }) {

  if (!userId || !organizationName) {
    throw new Error("userId and organizationName are required");
  }

  const response = await callOracleAPI({
    userId,
    product: "ERP",
    endpoint: "/hubOrganizations",
    queryParams: {
      q: `OrganizationName='${organizationName}'`
    }
  });

  const items = response.items || [];

  if (items.length > 0) {
    return {
      exists: true,
      partyId: items[0].PartyId,
      partyNumber: items[0].PartyNumber
    };
  }

  return { exists: false };
}