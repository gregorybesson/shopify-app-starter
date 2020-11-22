import * as shopify from "../shopify";
import _ from "lodash";

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