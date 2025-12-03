import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchWeeklyOrders } from "../src/medusa";
import { fetchHistoricalDkkRates } from "../src/fx";
import {
  appendOrderDetailsRows,
  appendWeeklySummary,
  getLatestWeeklySummaryRow,
  getWeeklySummaryByLabel,
} from "../src/sheets";
import {
  generateWeeklyReport,
  generateExecutiveSummary,
} from "../src/report";
import { postToSlack } from "../src/slack";

// Last full week: previous Monday 00:00 UTC → this Monday 00:00 UTC
function getLastWeekRange(): {
  start: Date;
  end: Date;
  weekLabel: string;
} {
  const now = new Date();

  const todayMidnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  // We expect this to run Monday 08:00 UTC.
  // end = this Monday 00:00 UTC
  const end = new Date(todayMidnight);

  // start = previous Monday 00:00 UTC
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 7);

  const weekLabel = `${start.getUTCFullYear()}-W${getIsoWeekNumber(start)}`;
  return { start, end, weekLabel };
}

// ISO week number (for weekLabel)
function getIsoWeekNumber(d: Date): string {
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return String(weekNo).padStart(2, "0");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { start, end, weekLabel } = getLastWeekRange();

    // If summary already exists, only regenerate Slack report
    const existingSummary = await getWeeklySummaryByLabel(weekLabel);
    if (existingSummary) {
      const report = await generateWeeklyReport(existingSummary);
      const execSummary = await generateExecutiveSummary(report);
      await postToSlack(report, execSummary, weekLabel);

      return res.status(200).json({
        ok: true,
        info: "Weekly summary already existed; report re-sent.",
        week: weekLabel,
      });
    }

    // 1) Fetch orders for last week (Mon→Mon)
    const orders = await fetchWeeklyOrders(start, end);

    // 2) Historical FX rates (DKK -> USD/EUR/GBP) as of week end
    const { usdPerDkk, eurPerDkk, gbpPerDkk } = await fetchHistoricalDkkRates(
      end
    );

    // 3) Append raw order rows
    const orderRows = orders.map((o) => {
      const created = o.created_at;
      const currency = o.currency_code?.toUpperCase() || "UNKNOWN";
      const totalMajor = o.total / 100;
      return [o.id, created, currency, totalMajor, weekLabel];
    });
    await appendOrderDetailsRows(orderRows);

    // 4) Aggregate: convert all revenue into DKK
    let totalRevenueDkk = 0;
    let orderCount = orders.length;
    let dkkOrders = 0;
    let usdOrders = 0;
    let eurOrders = 0;
    let gbpOrders = 0;

    for (const o of orders) {
      if (o.total == null || !o.currency_code) continue;

      const currency = o.currency_code.toUpperCase();
      const totalMajor = o.total / 100;

      let amountInDkk = totalMajor;
      if (currency === "USD") amountInDkk = totalMajor / usdPerDkk;
      else if (currency === "EUR") amountInDkk = totalMajor / eurPerDkk;
      else if (currency === "GBP") amountInDkk = totalMajor / gbpPerDkk;

      totalRevenueDkk += amountInDkk;

      if (currency === "DKK") dkkOrders++;
      if (currency === "USD") usdOrders++;
      if (currency === "EUR") eurOrders++;
      if (currency === "GBP") gbpOrders++;
    }

    const totalRevenueUsd = totalRevenueDkk * usdPerDkk;
    const totalRevenueEur = totalRevenueDkk * eurPerDkk;
    const totalRevenueGbp = totalRevenueDkk * gbpPerDkk;

    // 5) Week-over-week: previous summary row (if any)
    const prevRow = await getLatestWeeklySummaryRow();
    const prevWeekRevenueDkk = prevRow?.totalRevenueDkk;

    const summaryRow = {
      weekLabel,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      totalRevenueDkk: Number(totalRevenueDkk.toFixed(2)),
      totalRevenueUsd: Number(totalRevenueUsd.toFixed(2)),
      totalRevenueEur: Number(totalRevenueEur.toFixed(2)),
      orderCount,
      dkkOrders,
      usdOrders,
      eurOrders,
      prevWeekRevenueDkk,
      totalRevenueGbp: Number(totalRevenueGbp.toFixed(2)),
      gbpOrders,
    };

    // 6) Save weekly summary
    await appendWeeklySummary(summaryRow);

    // 7) AI report + CEO summary
    const report = await generateWeeklyReport(summaryRow);
    const execSummary = await generateExecutiveSummary(report);

    // 8) Send to Slack
    await postToSlack(report, execSummary, weekLabel);

    res.status(200).json({
      ok: true,
      week: weekLabel,
      orders: orderCount,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err?.message ?? String(err),
    });
  }
}
