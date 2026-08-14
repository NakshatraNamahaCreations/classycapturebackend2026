// ---------------------------------------------------------------------------
// Turns database errors into messages a user can act on.
//
// Controllers historically replied with "Failed to create X" and buried the
// real reason, so a save could fail with nothing on screen explaining which
// field was wrong. These helpers name the field instead.
// ---------------------------------------------------------------------------

// Nested paths look like "equipmentDetails.0.models.1" — the index means
// nothing to a user, so drop it and name the thing that failed.
const FRIENDLY_LABELS = {
  "equipmentDetails.qty": "Equipment quantity",
  "equipmentDetails.name": "Equipment name",
  "equipmentDetails.models": "Equipment model name",
  "specialization.name": "Specialization name",
  "specialization.salary": "Specialization salary",
  "bankDetails.ifsc": "IFSC code",
  "packages.services": "Package services",
  "installments.percentage": "Installment percentage",
};

const prettify = (s) =>
  String(s)
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();

const fieldLabel = (path) => {
  const parts = String(path)
    .split(".")
    .filter((p) => p !== "" && !/^\d+$/.test(p));

  if (!parts.length) return "Field";

  const last = parts[parts.length - 1];
  const parent = parts.length > 1 ? parts[parts.length - 2] : "";

  const mapped = FRIENDLY_LABELS[`${parent}.${last}`];
  if (mapped) return mapped;

  // single-level and bank fields read fine on their own
  if (!parent || parent === "bankDetails") return prettify(last);

  return `${prettify(parent)} ${prettify(last).toLowerCase()}`;
};

const messageForValidator = (path, err) => {
  const label = fieldLabel(path);

  if (err.kind === "required") return `${label} is required`;
  if (err.kind === "enum") {
    const allowed = (err.properties?.enumValues || []).join(", ");
    return allowed ? `${label} must be one of: ${allowed}` : `${label} has an invalid value`;
  }
  if (err.kind === "Number" || err.name === "CastError") return `${label} must be a number`;
  if (err.kind === "minlength" || err.kind === "maxlength" || err.kind === "min" || err.kind === "max") {
    return `${label}: ${err.message}`;
  }
  return `${label}: ${err.message}`;
};

// Takes a live Mongoose error object.
const describeSaveError = (error) => {
  if (error?.name === "ValidationError" && error.errors) {
    const fields = Object.keys(error.errors);
    const messages = fields.map((path) => messageForValidator(path, error.errors[path]));
    return { fields, message: messages.join(". ") };
  }

  if (error?.code === 11000) {
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    return {
      fields,
      message: fields.length
        ? `${fields.map(fieldLabel).join(", ")} already exists`
        : "This record already exists",
    };
  }

  if (error?.name === "CastError") {
    return {
      fields: [error.path],
      message: `${fieldLabel(error.path)} has an invalid value`,
    };
  }

  return null;
};

// Takes a raw message string, for controllers that only pass error.message
// through. e.g. "Vendor validation failed: bankDetails.branch: Path `branch`
// is required., name: Path `name` is required."
const describeRawMessage = (raw) => {
  if (typeof raw !== "string" || !raw) return null;

  if (/duplicate key error/i.test(raw)) {
    const m = raw.match(/index:\s*(\w+?)_\d*/) || raw.match(/dup key:\s*\{\s*(\w+)/);
    const field = m ? m[1] : null;
    return {
      fields: field ? [field] : [],
      message: field ? `${fieldLabel(field)} already exists` : "This record already exists",
    };
  }

  const idx = raw.indexOf("validation failed:");
  if (idx === -1) return null;

  const body = raw.slice(idx + "validation failed:".length).trim();
  const parts = body.split(/,\s*(?=[A-Za-z0-9_.]+:)/);

  const fields = [];
  const messages = [];

  parts.forEach((chunk) => {
    const m = chunk.match(/^([A-Za-z0-9_.]+):\s*(.+)$/);
    if (!m) return;

    const [, path, detail] = m;
    fields.push(path);
    const label = fieldLabel(path);

    if (/is required/i.test(detail)) messages.push(`${label} is required`);
    else if (/is not a valid enum value/i.test(detail)) {
      messages.push(`${label} has an invalid value`);
    } else if (/Cast to \w+ failed/i.test(detail)) {
      messages.push(`${label} has an invalid value`);
    } else {
      messages.push(`${label}: ${detail.replace(/\.$/, "")}`);
    }
  });

  if (!messages.length) return null;
  return { fields, message: messages.join(". ") };
};

module.exports = { fieldLabel, describeSaveError, describeRawMessage };
