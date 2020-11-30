import ApolloClient from "apollo-boost";
import fetch from "node-fetch";
import { ApolloProvider } from "react-apollo";
import App from "next/app";
import Head from 'next/head';
import { AppProvider } from "@shopify/polaris";
import { Provider } from "@shopify/app-bridge-react";
import Cookies from "js-cookie";
import ClientRouter from "../components/ClientRouter";
import "@shopify/polaris/dist/styles.css";
import translations from "@shopify/polaris/locales/fr.json";

const client = new ApolloClient({
  fetch: fetch,
  fetchOptions: {
    credentials: "include",
  },
});
class MyApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    const config = {
      apiKey: API_KEY,
      shopOrigin: Cookies.get("shopOrigin"),
      forceRedirect: true,
    };
    return (
      <>
        <Head>
          <title>MyStoreLocator</title>
          <meta charSet="utf-8" />
        </Head>

        <Provider config={config}>
          <ClientRouter />
          <AppProvider i18n={translations}>
            <ApolloProvider client={client}>
              <Component {...pageProps} />
            </ApolloProvider>
          </AppProvider>
        </Provider>
      </>
    );
  }
}

export default MyApp;
