import { google } from "googleapis";
import {
  SHEET_ORDER_DETAILS_RANGE,
  SHEET_WEEKLY_SUMMARY_RANGE,
} from "./config";

const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, "\n");

  const jwt = new google.auth.JWT(
    email,
    undefined,
    key,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  return google.sheets({ version: "v4", auth: jwt });
}

export async function appendOrderDetailsRows(rows: (string | number)[][]) {
  if (!rows.length) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_ORDER_DETAILS_RANGE,
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}

export interface WeeklySummaryRow {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalRevenueDkk: number;
  totalRevenueUsd: number;
  totalRevenueEur: number;
  orderCount: number;
  dkkOrders: number;
  usdOrders: number;
  eurOrders: number;
  prevWeekRevenueDkk?: number;
  totalRevenueGbp: number;
  gbpOrders: number;
}

export async function appendWeeklySummary(row: WeeklySummaryRow) {
  const sheets = getSheetsClient();
  const values: (string | number)[][] = [
    [
      row.weekLabel,
      row.startDate,
      row.endDate,
      row.totalRevenueDkk,
      row.totalRevenueUsd,
      row.totalRevenueEur,
      row.orderCount,
      row.dkkOrders,
      row.usdOrders,
      row.eurOrders,
      row.prevWeekRevenueDkk ?? "",
      row.totalRevenueGbp,
      row.gbpOrders,
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: SHEET_WEEKLY_SUMMARY_RANGE,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}

export async function getAllWeeklySummaries(): Promise<WeeklySummaryRow[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: SHEET_WEEKLY_SUMMARY_RANGE,
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  return rows.slice(1).map((r) => {
    const [
      weekLabel,
      startDate,
      endDate,
      totalRevenueDkk,
      totalRevenueUsd,
      totalRevenueEur,
      orderCount,
      dkkOrders,
      usdOrders,
      eurOrders,
      prevWeekRevenueDkk,
      totalRevenueGbp,
      gbpOrders,
    ] = r;

    return {
      weekLabel,
      startDate,
      endDate,
      totalRevenueDkk: Number(totalRevenueDkk || 0),
      totalRevenueUsd: Number(totalRevenueUsd || 0),
      totalRevenueEur: Number(totalRevenueEur || 0),
      orderCount: Number(orderCount || 0),
      dkkOrders: Number(dkkOrders || 0),
      usdOrders: Number(usdOrders || 0),
      eurOrders: Number(eurOrders || 0),
      prevWeekRevenueDkk: prevWeekRevenueDkk
        ? Number(prevWeekRevenueDkk)
        : undefined,
      totalRevenueGbp: Number(totalRevenueGbp || 0),
      gbpOrders: Number(gbpOrders || 0),
    };
  });
}

export async function getLatestWeeklySummaryRow(): Promise<WeeklySummaryRow | null> {
  const all = await getAllWeeklySummaries();
  if (!all.length) return null;
  return all[all.length - 1];
}

export async function getWeeklySummaryByLabel(
  weekLabel: string
): Promise<WeeklySummaryRow | null> {
  const all = await getAllWeeklySummaries();
  return all.find((r) => r.weekLabel === weekLabel) ?? null;
}
