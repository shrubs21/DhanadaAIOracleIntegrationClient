import { callOracleAPI } from "../../oracle.client.js";

/**
 * Get Absences with LOCAL filtering
 * Oracle absences API does NOT support q filters
 */
export async function getAbsences({ userId, query }) {
  console.log("🏖️ absences.service | query:", query);

  // 1️⃣ Fetch ALL absences (this API WORKS)
  const response = await callOracleAPI({
    userId,
    product: "HCM",
    endpoint: "/absences"
  });

  let items = response.items || [];

  // 2️⃣ Extract employee number (if any)
  const empMatch = query.match(/\b\d{4,6}\b/);
  const personNumber = empMatch ? empMatch[0] : null;

  if (personNumber) {
    items = items.filter(a => a.personNumber === personNumber);
  }

  // 3️⃣ Handle "last month"
  if (query.toLowerCase().includes("last month")) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    items = items.filter(a => {
      const d = new Date(a.startDate);
      return d >= start && d <= end;
    });
  }

  // 4️⃣ Reduce payload (VERY IMPORTANT – avoids token overflow)
  const clean = items.map(a => ({
    personNumber: a.personNumber,
    absenceType: a.absenceType,
    startDate: a.startDate,
    endDate: a.endDate,
    duration: a.formattedDuration,
    status: a.absenceDispStatusMeaning
  }));

  return {
    success: true,
    count: clean.length,
    data: clean,
    summary: `Retrieved ${clean.length} absence records`
  };
}
