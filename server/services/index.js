import * as shopify from "../shopify";
import _ from "lodash";
let cacheProvider = require("../cacheProvider");

/**
 * We deactivate products filtered by a tag if there is no more stock
 * @param {*} tag
 */
export const deactivateProductsByTag = async (tag) => {
  const products = await shopify.getProductsByTag(tag);
  let deactivated = 0;

  for (const product of products) {
    const totalStock = _.get(product, "node.totalInventory");
    console.log("product", product);
    if (totalStock === 0) {
      //console.log("product", product);
      const changeset = {
        id: product.node.legacyResourceId,
        published: false,
      };
      await shopify.updateProduct(product.node.legacyResourceId, changeset);

      console.log(
        "deactivateProductsByTag",
        "produit désactivé",
        product.node.legacyResourceId
      );

      deactivated++;
    }
  }

  return deactivated;
};

export const filterProductsCollectionByHandle = async (
  collectionHandle,
  filters,
  sortKey,
  clearCache = false
) => {
  let publishedProducts = await getCachedProductsCollectionByHandle(
    collectionHandle,
    sortKey,
    clearCache
  );

  if (filters.length > 0) {
    publishedProducts = publishedProducts.filter((product) => {
      let resultAND = true;
      filters.map((filter) => {
        let resultOR = false;
        // A OR filter like color_bleu OR color_rouge
        filter.values.map((value) => {
          if (filter.type === "tag" && product.tags.includes(value)) {
            resultOR = true;
          } else if (filter.type === "collection" && product.productType.toLowerCase() === value.toLowerCase()) {
            resultOR = true;
          }
        });

        if (!resultOR) {
          resultAND = resultOR;
        }
      });

      return resultAND;
    });
  }

  return publishedProducts;
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
 */
export const getCachedProductsCollectionByHandle = async (collectionHandle, sortKey = 'BEST_SELLING', clearCache = false) => {

  // 24h
  const CACHE_DURATION = 24 * 3600;
  const CACHE_KEY = `COLLECTION_${collectionHandle}_${sortKey}`;
  let publishedProducts = cacheProvider.instance().get(CACHE_KEY);
  if (publishedProducts == undefined || clearCache) {
    console.log("Pas de cache pour cette requete", CACHE_KEY);

    const products = await shopify.getProductsCollectionByHandle(
      collectionHandle,
      sortKey
    );
    publishedProducts = products.filter(
      (product) => product.publishedAt !== null
    );
    cacheProvider.instance().set(CACHE_KEY, publishedProducts, CACHE_DURATION);
  }

  return publishedProducts;
};

/**
 * TODO: These 2 next functions retrieve the full Shopify catalog and set it in cache
 * TO BE CONTINUED : We should persist it in DynamoDB or S3 ?
 * @param {*} clearCache
 */
export const getFullCatalog = async (clearCache = false) => {
  const CACHE_DURATION = 600;
  const CACHE_KEY = "GRG";
  var start = new Date()
  var hrstart = process.hrtime()
  console.log('cache keys', cacheProvider.instance().keys());
  let publishedProducts = cacheProvider.instance().get(CACHE_KEY);
  var end = new Date() - start
  var hrend = process.hrtime(hrstart)
  console.info('Execution time: %dms', end)
  console.log('cache stats', cacheProvider.instance().getStats());

  if (publishedProducts == undefined || clearCache) {
    console.log('CACHE NON TROUVE', publishedProducts, clearCache)
    const service = await shopify.getFulfillmentServiceByName("fastmag");
    const locationId = _.get(service, "location_id", null);
    const shopifyInventory = await shopify.getFullCatalog(locationId);
    const productsJsonl = parseJsonlProducts(shopifyInventory);
    publishedProducts = Object.values(productsJsonl);
    cacheProvider.instance().set(CACHE_KEY, publishedProducts, CACHE_DURATION);
    console.log('CACHE FULL PRODUCTS', 'DOOOOOOOOOOONE');
  } else {
    console.log('CACHE TROUVE !!!', 'DOOOOOOOOOOONE');
  }

  return true;
};

const parseJsonlProducts = (inventory) => {
  const products = {};

  inventory.map((formatedLine) => {
    let currentProduct;

    if (!_.get(formatedLine, "__parentId")) {
      //console.log('formatedLine NO PARENTID', formatedLine);
      formatedLine["__parentId"] = formatedLine["id"];
      currentProduct = formatedLine;
      currentProduct["variants"] = [];
      currentProduct["collections"] = [];
    } else {
      currentProduct = products[formatedLine["__parentId"]];

      if (_.get(formatedLine, "sku") && currentProduct) {
        currentProduct["variants"].push(formatedLine);
      }

      if (_.get(formatedLine, "title") && currentProduct) {
        currentProduct["collections"].push(formatedLine);
      }
    }

    if (currentProduct) {
      products[formatedLine["__parentId"]] = currentProduct;
    }
  });

  return products;
};