export function validateSupplierInputService(data) {
  const errors = [];

  if (!data.supplierName)
    errors.push("Supplier name is required.");

  if (!data.taxId)
    errors.push("Tax ID is required.");

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.push("Invalid email format.");

  if (!data.phone || !/^\d+$/.test(data.phone))
    errors.push("Phone must contain only digits.");

  if (!data.country || data.country.length !== 2)
    errors.push("Country must be ISO 2-letter code.");

  if (!data.businessUnit)
    errors.push("Business Unit is required.");

  if (errors.length > 0) {
    return {
      status: "INVALID",
      errors
    };
  }

  return { status: "VALID" };
}