import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import shopify from "../shopify.server";
import { Page, Card, DataTable, Text, BlockStack } from "@shopify/polaris";

type Row = [string, string, string];

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await shopify.authenticate.admin(request);

  const now = new Date();
  const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000); // 
  const startStr = start.toISOString().slice(0, 10); 
  const query = `created_at:>=${startStr}`;

  const res = await admin.graphql(
    `#graphql
    query Orders($query: String!, $first: Int!) {
      orders(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          createdAt
          currentTotalPriceSet { shopMoney { amount currencyCode } }
        }
      }
    }`,
    { variables: { query, first: 100 } },
  );
  const data = await res.json();
  const orders = data.data.orders.nodes as Array<{
    createdAt: string;
    currentTotalPriceSet: {
      shopMoney: { amount: string; currencyCode: string };
    };
  }>;

  // 일자별 합계
  const byDay = new Map<string, { count: number; sum: number; ccy: string }>();
  for (const o of orders) {
    const day = o.createdAt.slice(0, 10);
    const amt = parseFloat(o.currentTotalPriceSet.shopMoney.amount || "0");
    const ccy = o.currentTotalPriceSet.shopMoney.currencyCode || "KRW";
    const prev = byDay.get(day) || { count: 0, sum: 0, ccy };
    byDay.set(day, { count: prev.count + 1, sum: prev.sum + amt, ccy });
  }

  const days = [...byDay.keys()].sort(); // 오래된 날짜 -> 최신
  const rows: Row[] = days.map((d) => {
    const v = byDay.get(d)!;
    return [d, String(v.count), `${v.sum.toFixed(2)} ${v.ccy}`];
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.count += Number(r[1]);
      acc.sum += parseFloat(r[2]);
      return acc;
    },
    { count: 0, sum: 0 },
  );

  return json({
    rows,
    totalCount: totals.count,
    totalSum: totals.sum.toFixed(2),
  });
}

export default function Dashboard() {
  const { rows, totalCount, totalSum } = useLoaderData<typeof loader>();
  return (
    <Page title="최근 7일 매출 대시보드">
      <BlockStack gap="400">
        <Card>
          <Text as="p" variant="bodyMd">
            최근 7일 주문: {totalCount}건 / 매출 합계: {totalSum}
          </Text>
        </Card>
        <Card>
          <DataTable
            columnContentTypes={["text", "numeric", "text"]}
            headings={["날짜", "주문 수", "매출 합계"]}
            rows={rows}
          />
        </Card>
      </BlockStack>
    </Page>
  );
}
