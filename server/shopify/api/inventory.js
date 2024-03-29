import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";
import readline from "readline";
import { get, put, post, del, getUrl } from "../query";
import { getFulfillmentServiceByName } from "./fulfillmentService";

dotenv.config();

/**
 * Get the inventoryLevelId from a SKU
 * @param {*} inventoryLevelId
 * @param {*} qty
 */
export const updateInventoryFromInventoryLevel = async (
  inventoryLevelId,
  qty
) => {
  const query = {
    query: `mutation inventoryAdjustQuantity($input: InventoryAdjustQuantityInput!) {
        inventoryAdjustQuantity(input: $input) {
          inventoryLevel {
            id
            available
          }
          userErrors {
            field
            message
          }
        }
      }`,
    variables: {
      input: {
        inventoryLevelId: inventoryLevelId,
        availableDelta: qty,
      },
    },
  };

  const result = await post(`/graphql.json`, query);

  return result;
};

export const getInventoryLevelFromSku = async (filter) => {
  //filter = `sku:'BOXE20BEWARE|MARINE/GRIS CHINE|S' OR sku:'BOXE20BEWARE|MARINE/GRIS CHINE|XL'`
  const query = {
    query: `query($filter: String!) {
      productVariants(first: 100, query: $filter) {
        edges {
          node {
            id
            sku
            displayName
            inventoryItem {
              id
              inventoryLevels(first: 1) {
                edges {
                  node {
                    id
                    available
                  }
                }
              }
            }
          }
        }
      }
    }`,
    variables: {
      filter: filter,
    },
  };

  let result = null;
  try {
    const req = await post(`/graphql.json`, query);

    result = req.data.data.productVariants.edges;
  } catch (e) {
    console.log(
      "getInventoryLevelFromSku error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

/**
 * Update the inventoryLevel with a SKU and a stock
 * @param {*} inventoryLevelId
 * @param {*} qty
 */
export const updateInventoryFromSku = async (sku, stock) => {
  const stockInventory = await getInventoryLevelFromSku(sku);
  const inventoryLevel =
    stockInventory.data.data.productVariants.edges[0].node.inventoryItem
      .inventoryLevels.edges[0].node.id;
  const inventoryQty =
    stockInventory.data.data.productVariants.edges[0].node.inventoryItem
      .inventoryLevels.edges[0].node.available;

  const diff = stock - inventoryQty;

  const result = await updateInventoryFromInventoryLevel(inventoryLevel, diff);

  return result;
};

export const createBulkOperation = async (query) => {
  const mutation = {
    query: `mutation {
      bulkOperationRunQuery(
        query: """
          ${query}
        """
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }`,
  };

  const op = await post(`/graphql.json`, mutation);

  //console.log('bulkOperation errors', op.data.data.bulkOperationRunQuery.userErrors)

  return op;
};

export const poll = async ({ fn, validate, interval, maxAttempts }) => {
  //console.log('Start polling...');
  let attempts = 0;

  const executePoll = async (resolve, reject) => {
    console.log("- poll");
    const result = await fn();
    //console.log('result', result.data);
    attempts++;

    if (validate(result)) {
      return resolve(result);
    } else if (result.data.data.currentBulkOperation === null) {
      return reject(new Error("currentBulkOperation is null"));
    } else if (maxAttempts && attempts === maxAttempts) {
      return reject(new Error("Exceeded max attempts"));
    } else {
      setTimeout(executePoll, interval, resolve, reject);
    }
  };

  return new Promise(executePoll);
};

/**
 *
 */
export const getCurrentBulkOperation = async () => {
  const query = {
    query: `query {
      currentBulkOperation {
        id
        status
        errorCode
        createdAt
        completedAt
        objectCount
        fileSize
        url
        partialDataUrl
      }
    }`,
  };

  return post(`/graphql.json`, query);
};

/**
 * tous les variants avec leur stock et leur id erp contenu dans barcode
 * On part du principe qu'il n'y a qu'un seul stock
 * Get the full inventory
 * @param {*} inventoryLevelId
 * @param {*} qty
 */
export const getFullInventory = async (locationId) => {
  //console.log('locationId', locationId)
  const gidLocation = `gid://shopify/Location/${locationId}`;
  const inventory = new Object();
  const query = `{
    productVariants {
      edges {
        node {
          id
          legacyResourceId
          sku
          displayName
          barcode
          price
          compareAtPrice
          inventoryItem {
            inventoryLevel(locationId: "${gidLocation}") {
              id
              available
            }
          }
          product {
            id
            legacyResourceId
            tags
          }
        }
      }
    }
  }`;

  await createBulkOperation(query);
  //console.log("createBulkOperation", "===============> ok");

  const validate = (currentOp) =>
    _.get(currentOp.data, "data.currentBulkOperation.status", null) ===
    "COMPLETED";
  let op = null;
  try {
    op = await poll({
      fn: getCurrentBulkOperation,
      validate: validate,
      interval: 30000,
      maxAttempts: 30,
    });
  } catch (err) {
    console.error(err);
  }

  const resultUrl = _.get(op, "data.data.currentBulkOperation.url");
  //console.log('resultUrl', resultUrl);

  if (resultUrl) {
    await axios({
      method: "get",
      url: op.data.data.currentBulkOperation.url,
      responseType: "stream",
    })
      .then(async (response) => {
        var myInterface = readline.createInterface({
          input: response.data,
        });

        var lineno = 0;
        await new Promise(function (resolve, reject) {
          myInterface.on("line", function (line) {
            lineno++;
            //console.log('Line number ' + lineno + ': ' + line);
            const res = JSON.parse(line);
            inventory[res.sku] = res;
          });
          myInterface.on("close", function () {
            resolve();
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return inventory;
};

/**
 * update an inventory through GQL
 * @param {*} inventoryLevelId
 * @param {*} qty
 */
export const updateInventoryBulk = async (chunkInventory) => {
  const service = await getFulfillmentServiceByName("fastmag");
  const locationId = _.get(service, "location_id", null);
  const gidLocation = `gid://shopify/Location/${locationId}`;
  const query = {
    query: `mutation inventoryBulkAdjustQuantityAtLocation($inventoryItemAdjustments: [InventoryAdjustItemInput!]!, $locationId: ID!) {
      inventoryBulkAdjustQuantityAtLocation(inventoryItemAdjustments: $inventoryItemAdjustments, locationId: $locationId) {
        inventoryLevels {
          id
        }
        userErrors {
          field
          message
        }
      }
    }`,
    variables: {
      inventoryItemAdjustments: chunkInventory,
      locationId: gidLocation,
    },
  };

  let result = null;
  try {
    const req = await post(`/graphql.json`, query);

    result = req.data.data;
  } catch (e) {
    console.log(
      "inventoryBulkAdjustQuantityAtLocation error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

/**
 * Get the full catalog of variants for published products on the web channel
 * @param {*} locationId
 */
export const getFullCatalog = async (locationId, published = true) => {
  //console.log('locationId', locationId)
  const gidLocation = `gid://shopify/Location/${locationId}`;
  const inventory = [];
  const queryStr = published ? 'published_status:published' : 'published_status:unpublished'
  const query = `{
    products(query:"${queryStr}") {
      edges {
        node {
          id,
          legacyResourceId,
          status,
          title,
          handle,
          tags,
          publishedAt,
          onlineStoreUrl,
          description,
          featuredImage {
            originalSrc
          },
          composition: metafield(namespace: "custom_fields", key: "composition") {
            value
          }
          totalInventory,
          variants(first:12) {
            edges {
              node {
                sku,
                price,
                barcode,
                compareAtPrice,
                selectedOptions {
                  name,
                  value
                },
                fastmagId: metafield(namespace: "global", key: "fastmag-id") {
                  value
                }
              }
            }
          }
          collections(first: 7) {
            edges {
              node {
                id
                handle
                title
              }
            }
          }
        }
      }
    }
  }`;

  await createBulkOperation(query);
  const validate = (currentOp) =>
    _.get(currentOp.data, "data.currentBulkOperation.status", null) ===
    "COMPLETED";
  let op = null;
  try {
    op = await poll({
      fn: getCurrentBulkOperation,
      validate: validate,
      interval: 30000,
      maxAttempts: 100,
    });
  } catch (err) {
    console.error(err);
  }

  const resultUrl = _.get(op, "data.data.currentBulkOperation.url");
  //console.log('resultUrl', resultUrl);

  if (resultUrl) {
    await axios({
      method: "get",
      url: op.data.data.currentBulkOperation.url,
      responseType: "stream",
    })
      .then(async (response) => {
        var myInterface = readline.createInterface({
          input: response.data,
        });

        var lineno = 0;
        await new Promise(function (resolve, reject) {
          myInterface.on("line", function (line) {
            lineno++;
            //console.log('Line number ' + lineno + ': ' + line);
            const res = JSON.parse(line);
            inventory.push(res);
          });
          myInterface.on("close", function () {
            resolve();
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return inventory;
};

export const getProductByTag = async (tag) => {
  let inventory = [];
  let req = null;

  try {
    //console.log('cursor', cursor);
    const query = {
      query: `{
        products(first:1, query:"tag:${tag}"){
          edges {
            cursor
            node {
              id,
              legacyResourceId,
              title,
              tags,
              onlineStoreUrl,
              description,
              featuredImage {
                originalSrc
              },
              totalInventory,
            }
          }
        }
      }`,
    };
    req = await post(`/graphql.json`, query);
    //console.log('response', req.data);

    inventory = req.data.data.products.edges;
  } catch (e) {
    console.log(
      "getProductByTag error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return inventory;
};

export const getProductsByTag = async (tag) => {
  const inventory = [];
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
          products(first:100, query:"tag:${tag} and published_status:published", after:${cursor}){
            pageInfo {
              hasNextPage
            }
            edges {
              cursor
              node {
                id,
                legacyResourceId,
                title,
                tags,
                onlineStoreUrl,
                description,
                featuredImage {
                  originalSrc
                },
                totalInventory,
              }
            }
          }
        }`,
      };
      req = await post(`/graphql.json`, query);
      //console.log('response', req.data);

      const pageInventory = req.data.data.products.edges;
      inventory.push(...pageInventory);
      cursor =
        pageInventory[pageInventory.length - 1] &&
        pageInventory[pageInventory.length - 1].cursor
          ? `"${pageInventory[pageInventory.length - 1].cursor}"`
          : false;
    }
  } catch (e) {
    console.log(
      "getProductsByTag error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return inventory;
};

export const getProductsByTagBulk = async (tag) => {
  const inventory = [];
  const query = `{
    products(query:"tag:${tag} and published_status:published"){
      edges {
        node {
          id,
          legacyResourceId,
          title,
          tags,
          onlineStoreUrl,
          description,
          featuredImage {
            originalSrc
          },
        }
      }
    }
  }`;

  await createBulkOperation(query);
  const validate = (currentOp) =>
    _.get(currentOp.data, "data.currentBulkOperation.status", null) ===
    "COMPLETED";
  let op = null;
  try {
    op = await poll({
      fn: getCurrentBulkOperation,
      validate: validate,
      interval: 30000,
      maxAttempts: 30,
    });
  } catch (err) {
    console.error(err);
  }

  const resultUrl = _.get(op, "data.data.currentBulkOperation.url");
  //console.log('resultUrl', resultUrl);

  if (resultUrl) {
    await axios({
      method: "get",
      url: op.data.data.currentBulkOperation.url,
      responseType: "stream",
    })
      .then(async (response) => {
        var myInterface = readline.createInterface({
          input: response.data,
        });

        var lineno = 0;
        await new Promise(function (resolve, reject) {
          myInterface.on("line", function (line) {
            lineno++;
            //console.log('Line number ' + lineno + ': ' + line);
            const res = JSON.parse(line);
            inventory.push(res);
          });
          myInterface.on("close", function () {
            resolve();
          });
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return inventory;
};
