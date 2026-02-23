export function extractSupplierCandidate(message) {
  const text = message.toLowerCase();

  // common stop words
  const stopWords = [
    "create", "payable", "invoice", "for",
    "amount", "rs", "usd", "aed", "inr"
  ];

  // remove numbers
  let cleaned = text.replace(/\d+/g, "");

  // remove stop words
  for (const word of stopWords) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}\\b`, "g"), "");
  }

  // normalize spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}
