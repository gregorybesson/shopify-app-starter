import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import Bottleneck from "bottleneck";
import { get, put, post, del, getUrl, getNextPage, sleep  } from "../query";

dotenv.config();

const { SHOP, ACCESS_TOKEN } = process.env;

/**
 *  GET /admin/api/2020-07/collections/{collection_id}.json
    Retrieves a single collection

    GET /admin/api/2020-07/collections/{collection_id}/products.json
    Retrieve a list of products belonging to a collection
 */

export const getCollection = async (id) => {
  const result = await get(`/collections/${id}.json`);

  return result.data.collection;
};

export const getProductsCollection = async (id) => {
  const result = await get(`/collections/${id}/products.json`);

  return result.data.products;
};

/**
 * returns the products of a collection. By default in best selling order
 * other sorting options are :
 *  TITLE
 *  PRICE
 *  BEST_SELLING
 *  CREATED
 *  MANUAL
 *  COLLECTION_DEFAULT
 * @param {*} collectionHandle
 * @param {*} sortKey
 */
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
            products(first: 250  sortKey:${sortKey} after:${cursor}) {
              pageInfo {
                hasNextPage
              }
              edges {
                cursor
                node {
                  title
                  handle
                  tags
                  publishedAt
                  totalInventory
                  productType
                }
              }
            }
          }
        }`,
      };

      req = await post(`/graphql.json`, query);
      const queryCost = req.data.extensions.cost;
      const products = req.data.data.collectionByHandle.products.edges;
      cursor =
        products[products.length - 1] &&
        products[products.length - 1].cursor
          ? `"${products[products.length - 1].cursor}"`
          : false;
      const nodes = products.map( product => product.node)
      collectionProducts.push(...nodes);
      //wait because of graphql request limit rate
      if (cursor && queryCost.throttleStatus.currentlyAvailable < queryCost.requestedQueryCost) {
        console.log("sleep for a while");
        const diff = queryCost.requestedQueryCost - queryCost.throttleStatus.currentlyAvailable;
        const waitTime = diff*1000 / queryCost.throttleStatus.restoreRate;
        console.log("Wait for: " + waitTime + " miliseconds");
        await sleep(waitTime);
    }
    }
  } catch (e) {
    console.log(
      "getProductsByTag error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return collectionProducts;
}
