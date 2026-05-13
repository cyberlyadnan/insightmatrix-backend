import type { Document } from "mongoose";

export function toPanelBookLeadDto(doc: Document | Record<string, unknown>) {
  const d = typeof (doc as Document).toObject === "function" ? (doc as Document).toObject() : doc;
  const o = d as Record<string, unknown>;
  return {
    id: String(o._id),
    firstName: o.firstName,
    lastName: o.lastName,
    workEmail: o.workEmail,
    companyName: o.companyName,
    organizationType: o.organizationType,
    jobTitle: o.jobTitle,
    country: o.country,
    acceptedTerms: o.acceptedTerms,
    createdAt: o.createdAt ? new Date(o.createdAt as string).toISOString() : null
  };
}
