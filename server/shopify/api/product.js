import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { get, put, post, del, getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-04/products.json
    Retrieves a list of products

    GET /admin/api/2020-04/products/count.json
    Retrieves a count of products

    GET /admin/api/2020-04/products/#{product_id}.json
    Retrieves a single product

    POST /admin/api/2020-04/products.json
    Creates a new product

    PUT /admin/api/2020-04/products/#{product_id}.json
    Updates a product

    DELETE /admin/api/2020-04/products/#{product_id}.json
    Deletes a product

 */

export const getProducts = async () => {
  let nextPage = `/products.json?limit=250`;
  let arResult = [];

  while (nextPage) {
    const result = await get(nextPage);
    arResult = [...arResult, ...result.data.products];
    nextPage = getNextPage(result.headers);
  }

  return arResult;
};

export const getProductsBySku = async (sku) => {
  const query = {
    query: `query($filter: String!) {
      products(first:50, query:$filter) {
        edges {
          node {
            id
            legacyResourceId
            title
            tags
          }
        }
      }
    }`,
    variables: {
      filter: `sku:${sku}|*`,
    },
  };

  let result = null;
  try {
    const req = await post(`/graphql.json`, query);

    result = req.data.data.products.edges;
  } catch (e) {
    console.log(
      "getProductsBySku error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const getProduct = async (id) => {
  let result = null;

  try {
    const req = await get(`/products/${id}.json`);

    result = req.data.product;
  } catch (e) {
    console.log(
      "getProduct error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const createProduct = async (changeset) => {
  // changeset = {
  //   "title": "Burton Custom Freestyle 151",
  //   "body_html": "<strong>Good snowboard!</strong>",
  //   "vendor": "Burton",
  //   "product_type": "Snowboard",
  //   "tags": [
  //     "Barnes & Noble",
  //     "John's Fav",
  //     "\\"Big Air\\""
  //   ]
  // }
  let result = null;
  try {
    const req = await post(`/products.json`, {
      product: changeset,
    });

    result = req.data;
  } catch (e) {
    console.log(
      "createProduct error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }
  //console.log("createProduct", result);

  return result;
};

export const updateProduct = async (productId, changeset) => {
  // changeset = {
  //   "id": "5035807277101",
  //   "tags": "Barnes & Noble, John's Fav"
  // }
  const result = await put(`/products/${productId}.json`, {
    product: changeset,
  });

  //console.log("updateProduct", result);

  return result.data;
};

export const deleteAllProducts = async () => {
  const products = getProducts();

  products.map((item) => {
    limiter.schedule(deleteProduct, item.id).then((result) => {
      console.log("suppression réalisée", result);
    });
  });

  return products;
};

export const deleteProduct = async (productId) => {
  const result = await del(`/products/${productId}.json`);

  return result.data;
};
