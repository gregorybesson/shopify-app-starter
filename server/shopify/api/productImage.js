import dotenv from "dotenv";
import _ from "lodash";
import { get, put, post, del, getUrl, getNextPage } from "../query";

dotenv.config();

/**
 *  GET /admin/api/2020-07/products/{product_id}/images.json
    Receive a list of all Product Images

    GET /admin/api/2020-07/products/{product_id}/images/count.json
    Receive a count of all Product Images

    GET /admin/api/2020-07/products/{product_id}/images/{image_id}.json
    Receive a single Product Image

    POST /admin/api/2020-07/products/{product_id}/images.json
    Create a new Product Image

    PUT /admin/api/2020-07/products/{product_id}/images/{image_id}.json
    Modify an existing Product Image

    DELETE /admin/api/2020-07/products/{product_id}/images/{image_id}.json
    Remove an existing Product Image
 */

export const getProductImages = async (id) => {
  let result = [];
  try {
    const req = await get(`/products/${id}/images.json`);
    result = req.data.images;
  } catch (e) {
    console.log(
      "getProductImages error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const createProductImage = async (id, changeset) => {
  // changeset = {
  //     "position": 1,
  //     "src": "http://example.com/rails_logo.gif"
  // }
  let result = null;

  //console.log('image url', changeset);

  try {
    const req = await post(`/products/${id}/images.json`, {
      image: changeset,
    });

    result = req.data.image;
  } catch (e) {
    console.log(
      "createProductImage error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }
  //console.log("createProductImage", result);

  return result;
};

/**
 * When you change the price, be cautious that the compare_at_price is null or is > price
 * @param {*} variantId
 * @param {*} changeset
 */
export const updateProductImage = async (id, imageId, changeset) => {
  // changeset = {
  //     "position": 1,
  //     "src": "http://example.com/rails_logo.gif"
  // }
  //console.log(variantId, changeset)

  let result = null;

  console.log("product id", id, "imageId", imageId, "changeset", changeset);

  try {
    const image = await put(
      `/products/${id}/images/${imageId}.json`,
      {
        image: changeset,
      }
    );

    console.log("image", image);
    result = image.data;
  } catch (e) {
    console.log(
      "updateProductImage error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const deleteProductImage = async (id, imageId) => {
  let result = null;
  try {
    const url = `/products/${id}/images/${imageId}.json`;

    const query = await del(url);
    result = query.data;
  } catch (e) {
    console.log(
      "deleteProductImage error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};
