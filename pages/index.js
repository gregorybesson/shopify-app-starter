import { EmptyState, Page, Layout } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import fetch from "node-fetch";
import joinCookies from "../utils/joinCookies";

const img = "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg";

const Index = ({ data }) => (
  <Page>
    <Layout>
      <EmptyState
        heading="Welcome on your app"
        action={{
          content: `Go to the Dashboard`,
          onAction: () => console.log("clicked"),
        }}
        image={img}
      >
        <p>
          Access the dashboard
        </p>
      </EmptyState>
    </Layout>
  </Page>
);

// This function gets called for each request
// You need an absolute URL + to pass the cookies in the request
// to avoid an error produced by shopify trying to auth the server routes...
// https://github.com/Shopify/shopify-app-node/issues/96
export async function getServerSideProps(ctx) {
  const redirectOnError = () =>
    typeof window !== "undefined"
      ? Router.push("/auth")
      : ctx.res.writeHead(302, { Location: "/auth" }).end();

  const baseUrl = ctx.req ? `https://${ctx.req.headers.host}` : "";
  const result = await fetch(`${baseUrl}/api/installjs`, {
    headers: {
      Cookie: ctx.req.headers.cookie,
    },
  });
  const data = await result.json();
  // if (!data.user.id) {
  //   return await redirectOnError();
  // }
  //console.log("data", data);

  return {
    props: {
      data,
    },
  };
}

export default Index;
