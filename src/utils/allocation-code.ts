import {
  ALLOCATION_CODE_PREFIX,
  ALLOCATION_CODE_START_NUMBER
} from "../constants/vendor-allocation";
import { VendorSurveyAllocation } from "../models/VendorSurveyAllocation";

const CODE_PATTERN = /^ALLOC-(\d+)$/;

/** Generates readable allocation codes: ALLOC-1001, ALLOC-1002, … */
export async function generateNextAllocationCode(): Promise<string> {
  const latest = await VendorSurveyAllocation.findOne({
    allocationCode: { $regex: `^${ALLOCATION_CODE_PREFIX}-` }
  })
    .sort({ allocationCode: -1 })
    .select("allocationCode")
    .lean();

  let nextNum = ALLOCATION_CODE_START_NUMBER;
  if (latest?.allocationCode) {
    const match = String(latest.allocationCode).match(CODE_PATTERN);
    if (match) {
      nextNum = Math.max(ALLOCATION_CODE_START_NUMBER, Number.parseInt(match[1], 10) + 1);
    }
  }

  return `${ALLOCATION_CODE_PREFIX}-${nextNum}`;
}
