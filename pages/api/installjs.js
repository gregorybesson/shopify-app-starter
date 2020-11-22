import fs from "fs";
import path from "path";
import { encrypt, decrypt } from "../../utils/encryption";
import { getAsset, setAsset } from "../../server/shopify";
import * as db from "../../server/database";

export default async (req, res) => {
  const shopId = req.cookies.shopOrigin;
  const user = req.cookies.user;
  const jsonUser = typeof user !== "undefined" ? JSON.parse(user) : {};
  const shop = await db.getItem({ store: shopId, sk: "settings" });
  //console.log("accessToken database", shop);
  //console.log("shopId", shopId);
  console.log("user", user);

  let result = { shop: shop, user: jsonUser };

  res.status(200).json(result);
};
