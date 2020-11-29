import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { getUrl, getNextPage } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-07/collections/{collection_id}.json
    Retrieves a single collection

    GET /admin/api/2020-07/collections/{collection_id}/products.json
    Retrieve a list of products belonging to a collection
 */

export const getCollection = async (id) => {
  const result = await axios.get(`${getUrl()}/collections/${id}.json`);

  return result.data.collection;
};

export const getProductsCollection = async (id) => {
  const result = await axios.get(`${getUrl()}/collections/${id}/products.json`);

  return result.data.products;
};

export const getProductsCollectionByHandle = async (collectionHandle) => {
  const collectionProducts = [];
  let req = null;
  let cursor = null;
  let firstCall = true;

  try {
    while (firstCall || cursor) {
      if (firstCall) {
        firstCall = false;
      }

      //console.log('cursor', cursor);
      const query = {
        query: `{
            collectionByHandle(handle: "${collectionHandle}") {
            products(first: 250, after:${cursor}) {
              pageInfo {
                hasNextPage
              }
              edges {
                cursor
                node {
                  handle
                  tags
                  publishedAt
                }
              }
            }
          }
        }`
      }

      req = await axios.post(`${getUrl()}/graphql.json`, query);
      const products = req.data.data.collectionByHandle.products.edges;
      cursor =
        products[products.length - 1] &&
        products[products.length - 1].cursor
          ? `"${products[products.length - 1].cursor}"`
          : false;
      const nodes = products.map( product => product.node)
      collectionProducts.push(...nodes);
    }
  } catch (e) {
    console.log(
      "getProductsByTag error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return collectionProducts;
}
