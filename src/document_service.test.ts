import { strict as assert } from "node:assert";
import { classifyDocument } from "./document_service.js";

const receipt = classifyDocument("Donation receipt\nDonor: Ada Lovelace\nAmount: 50\nDate: 2026-09-03");
assert.equal(receipt.kind, "donor_receipt");
assert.equal(receipt.fields.donor, "Ada Lovelace");
const reminder = classifyDocument("Volunteer reminder\nName: Lin\nShift: Saturday");
assert.equal(reminder.kind, "volunteer_reminder");
console.log("document decisions pass");
