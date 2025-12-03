export const FX_BASE = "DKK";
export const FX_SYMBOLS = ["USD", "EUR", "GBP"] as const;

export type SupportedCurrency = (typeof FX_SYMBOLS)[number] | "DKK";

export const SHEET_ORDER_DETAILS_RANGE = "Order Details!A:Z";
export const SHEET_WEEKLY_SUMMARY_RANGE = "Weekly Summary!A:Z";
