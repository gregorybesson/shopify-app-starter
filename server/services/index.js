import * as shopify from "../shopify";
import _ from "lodash";
let cacheProvider = require('../cacheProvider')

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

export const filterProductsCollectionByHandle = async (collectionHandle, filters) => {
  let publishedProducts = await getCachedProductsCollectionByHandle(collectionHandle)

  if (filters.length > 0) {
    publishedProducts = publishedProducts.filter(product => {
      let resultAND = true
      filters.map(filter => {
        let resultOR = false
        // A OR filter like color_bleu OR color_rouge
        filter.map(value => {
          if (product.tags.includes(value)) {
            resultOR = true
          }
        })

        if (!resultOR) {
          resultAND = resultOR
        }
      })

      return resultAND
    })
  }

  return publishedProducts
};

export const getCachedProductsCollectionByHandle = async (collectionHandle) => {
  const CACHE_DURATION = 600;
  const CACHE_KEY = `COLLECTION_${collectionHandle}`;
  let publishedProducts = cacheProvider.instance().get(CACHE_KEY)
  if ( publishedProducts == undefined ){
    console.log('Pas de cache pour cette requete', CACHE_KEY);

    const products = await shopify.getProductsCollectionByHandle(collectionHandle)
    publishedProducts = products.filter( product => (product.publishedAt !== null))
    cacheProvider.instance().set(CACHE_KEY, publishedProducts, CACHE_DURATION);
  }

  return publishedProducts
};
