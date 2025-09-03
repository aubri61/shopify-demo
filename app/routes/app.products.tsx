// app/routes/app.products.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import shopify from "../shopify.server"; // 별칭(~) 이슈 피하려고 상대경로 사용

import {
  Page,
  Card,
  Button,
  Thumbnail,
  InlineStack,
  BlockStack,
  Text,
  Banner,
} from "@shopify/polaris";

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await shopify.authenticate.admin(request);
  const res = await admin.graphql(
    `#graphql
    query Products($first: Int!) {
      products(first: $first, sortKey: TITLE) {
        nodes {
          id
          title
          tags
          featuredImage { url altText }
          variants(first: 1) { nodes { id price } }
        }
      }
    }`,
    { variables: { first: 10 } },
  );
  const data = await res.json();
  return json({ products: data.data.products.nodes });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const intent = String(form.get("_intent"));
  const { admin } = await shopify.authenticate.admin(request);

  if (intent === "priceUp10") {
    const productId = String(form.get("productId"));

    const getRes = await admin.graphql(
      `#graphql
      query GetVariants($id: ID!) {
        product(id: $id) { variants(first: 100) { nodes { id price } } }
      }`,
      { variables: { id: productId } },
    );
    const getJson = await getRes.json();
    const variants = getJson.data.product.variants.nodes as Array<{
      id: string;
      price: string;
    }>;

    const updated = variants.map((v) => ({
      id: v.id,
      price: (Math.round(parseFloat(v.price) * 1.1 * 100) / 100).toFixed(2),
    }));

    await admin.graphql(
      `#graphql
      mutation UpdatePrices($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
          userErrors { message }
        }
      }`,
      { variables: { productId, variants: updated } },
    );

    return redirect("/app/products");
  }

  if (intent === "addTag") {
    const productId = String(form.get("productId"));
    await admin.graphql(
      `#graphql
      mutation AddTag($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) { userErrors { message } }
      }`,
      { variables: { id: productId, tags: ["SALE"] } },
    );
    return redirect("/app/products");
  }

  if (intent === "removeTag") {
    const productId = String(form.get("productId"));
    await admin.graphql(
      `#graphql
      mutation RemoveTag($id: ID!, $tags: [String!]!) {
        tagsRemove(id: $id, tags: $tags) { userErrors { message } }
      }`,
      { variables: { id: productId, tags: ["SALE"] } },
    );
    return redirect("/app/products");
  }

  if (intent === "createSample") {
    const now = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    await admin.graphql(
      `#graphql
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product { id }
          userErrors { message }
        }
      }`,
      {
        variables: {
          input: {
            title: `Sample ${now}`,
            tags: ["SAMPLE"],
            variants: [{ price: "9.99" }],
          },
        },
      },
    );
    return redirect("/app/products");
  }

  return json({ ok: true });
}

export default function Products() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <Page title="상품 관리">
      <BlockStack gap="400">
        <Banner tone="info">
          <Text as="p">
            아래에서 가격 +10%, SALE 태그 추가/삭제, 상단 버튼으로 샘플 상품
            생성이 가능합니다.
          </Text>
        </Banner>

        <Form method="post">
          <input type="hidden" name="_intent" value="createSample" />
          <Button submit>샘플 상품 생성</Button>
        </Form>

        {products.map((p: any) => (
          <Card key={p.id}>
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="400" blockAlign="center">
                <Thumbnail
                  source={p.featuredImage?.url}
                  alt={p.featuredImage?.altText ?? p.title}
                  size="small"
                />
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">
                    {p.title}
                  </Text>
                  <Text as="p" tone="subdued" variant="bodySm">
                    가격: {p.variants.nodes[0]?.price ?? "-"} / 태그:{" "}
                    {p.tags?.join(", ") || "없음"}
                  </Text>
                </BlockStack>
              </InlineStack>

              <InlineStack gap="300">
                <Form method="post">
                  <input type="hidden" name="_intent" value="priceUp10" />
                  <input type="hidden" name="productId" value={p.id} />
                  <Button submit>가격 +10%</Button>
                </Form>

                <Form method="post">
                  <input type="hidden" name="_intent" value="addTag" />
                  <input type="hidden" name="productId" value={p.id} />
                  <Button submit>SALE 태그 추가</Button>
                </Form>

                <Form method="post">
                  <input type="hidden" name="_intent" value="removeTag" />
                  <input type="hidden" name="productId" value={p.id} />
                  <Button submit>SALE 태그 제거</Button>
                </Form>
              </InlineStack>
            </InlineStack>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}
