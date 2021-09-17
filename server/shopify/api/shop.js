import dotenv from "dotenv";
import _ from "lodash";

import { get, put, post, del, getUrl } from "../query";

dotenv.config();

/**
 *  GET /admin/api/2021-07/shop.json
Retrieves the shop's configuration

*/

export const getShop = async () => {
  const result = await get(`/shop.json`);

  return result.data.shop;
};
