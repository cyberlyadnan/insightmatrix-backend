import mongoose from "mongoose";

/** Year-scoped invoice sequence (e.g. _id = "2026", seq = 42 → INV-2026-00042) */
const invoiceCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 }
});

export const InvoiceCounter = mongoose.model("InvoiceCounter", invoiceCounterSchema);
