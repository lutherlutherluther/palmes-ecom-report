import fetch from "node-fetch";

export interface MedusaOrder {
  id: string;
  created_at: string;
  currency_code: string;
  total: number; // smallest unit, e.g. cents
}

const PAGE_LIMIT = 100;

export async function fetchWeeklyOrders(
  startDate: Date,
  endDate: Date
): Promise<MedusaOrder[]> {
  const baseUrl = process.env.MEDUSA_BASE_URL!;
  const token = process.env.MEDUSA_API_TOKEN;

  const allOrders: MedusaOrder[] = [];
  let offset = 0;

  while (true) {
    const url = new URL("/store/orders", baseUrl);

    url.searchParams.set("created_at[gte]", startDate.toISOString());
    url.searchParams.set("created_at[lt]", endDate.toISOString());
    url.searchParams.set("limit", String(PAGE_LIMIT));
    url.searchParams.set("offset", String(offset));

    const res = await fetch(url.toString(), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Medusa fetch failed: ${res.status} ${body}`);
    }

    const data = await res.json();
    const orders = (data.orders ?? []) as MedusaOrder[];
    allOrders.push(...orders);

    if (orders.length < PAGE_LIMIT) break;
    offset += PAGE_LIMIT;
  }

  return allOrders;
}
