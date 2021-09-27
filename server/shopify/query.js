import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import _ from "lodash";

dotenv.config();

const {
  SHOPIFY_PRIVATE_API_KEY,
  SHOPIFY_PRIVATE_API_PASSWORD,
  SHOP,
} = process.env;
let settings = {
  shopName: SHOP,
  apiKey: SHOPIFY_PRIVATE_API_KEY,
  password: SHOPIFY_PRIVATE_API_PASSWORD,
};

export const setSettings = (args) => {
  settings = args;
};

export const getSettings = () => {
  return settings;
};

export const get = async (query) => {
  return axios.get(`${getUrl2()}${query}`, {
    headers: getHeaders(),
  });
};

export const put = async (query, payload) => {
  return axios.put(
    `${getUrl2()}${query}`,
    payload,
    {
      headers: getHeaders(),
    }
  );
};

export const post = async (query, payload) => {
  return axios.post(
    `${getUrl2()}${query}`,
    payload,
    {
      headers: getHeaders(),
    }
  );
};

export const del = async (query) => {
  return axios.delete(`${getUrl2()}${query}`, {
    headers: getHeaders(),
  });
};

export const getUrl2 = () => {
  //console.log('settings', settings);

  if (
    !settings ||
    !settings.shopName ||
    (!settings.accessToken && (!settings.apiKey || !settings.password)) ||
    (settings.accessToken && (settings.apiKey || settings.password))
  ) {
    throw new Error("Missing or invalid options");
  }
  if (settings.shopName && settings.accessToken) {
    return `https://${settings.shopName}/admin/api/2020-10`;
  }

  return `https://${SHOPIFY_PRIVATE_API_KEY}:${SHOPIFY_PRIVATE_API_PASSWORD}@${SHOP}/admin/api/2020-10`;
};

export const getUrl = (activeShop = null, accessToken = null) => {
  if (activeShop && accessToken) {
    return `https://${activeShop}/admin/api/2020-10`;
  }

  return `https://${SHOPIFY_PRIVATE_API_KEY}:${SHOPIFY_PRIVATE_API_PASSWORD}@${SHOP}/admin/api/2020-10`;
};

export const getHeaders = () => {
  if (settings && settings.shopName && settings.accessToken) {
    return { "X-Shopify-Access-Token": settings.accessToken };
  }

  return {};
};

export const getNextPage = (headers) => {
  let m;
  let nextPage = "";
  const regex = new RegExp(`<([^>]*)>; rel="next"`, "g");

  while ((m = regex.exec(headers.link)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex === 1) {
        nextPage = match;
      }
    });
  }

  if (nextPage != "") {
    nextPage = `${getUrl()}/${nextPage.split("?")[0].split("/").pop()}?${
      nextPage.split("?")[1]
    }`;
  }

  //console.log('nextPage', nextPage)
  return nextPage;
};

export const getPreviousPage = (headers) => {
  let m;
  let previousPage = "";
  const regex = new RegExp(`<([^>]*)>; rel="previous"`, "g");

  while ((m = regex.exec(headers.link)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match, groupIndex) => {
      if (groupIndex === 1) {
        previousPage = match;
      }
    });
  }
  if (previousPage != "") {
    previousPage = `${getUrl()}/${previousPage
      .split("?")[0]
      .split("/")
      .pop()}?${previousPage.split("?")[1]}`;
  }

  return previousPage;
};

export const verifyShopifyHook = (ctx) => {
  const { headers, request } = ctx;
  const { "x-shopify-hmac-sha256": hmac } = headers;
  const { rawBody } = request;

  const digest = crypto
    .createHmac("SHA256", process.env.SHOPIFY_PRIVATE_API_KEY)
    .update(new Buffer(rawBody, "utf8"))
    .digest("base64");

  return safeCompare(digest, hmac);
};

/**
 * This function is great to throttle GraphQL calls to Shopify
 * @param {*} ms
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const setSettingsFromShop = async (shop) => {
  const item = await db.getItem({ store: shop, sk: "settings" });
  if (_.get(item, "Item.accessToken")) {
    setSettings({ shopName: shop, accessToken: _.get(item, "Item.accessToken") })

    return true
  }

  return false
}