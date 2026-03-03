export function validateSupplierInputService(data) {
  const errors = [];

  // Required for supplier creation
  if (!data.supplierName || data.supplierName.trim() === "") {
    errors.push("Supplier name is required.");
  }

  if (!data.address1 || data.address1.trim() === "") {
    errors.push("Address line 1 is required.");
  }

  if (!data.city || data.city.trim() === "") {
    errors.push("City is required.");
  }

  if (!data.country || !/^[A-Z]{2}$/.test(data.country)) {
    errors.push("Country must be ISO 2-letter uppercase code (e.g., AE, US).");
  }

  if (!data.taxRegistrationNumber || data.taxRegistrationNumber.trim() === "") {
    errors.push("Tax Registration Number is required.");
  }

  if (!data.procurementBUName || data.procurementBUName.trim() === "") {
    errors.push("Procurement Business Unit is required.");
  }

  if (errors.length > 0) {
    return {
      status: "INVALID",
      errors
    };
  }

  return { status: "VALID" };
}