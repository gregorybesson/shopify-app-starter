import axios from "axios";
import dotenv from "dotenv";
import _ from "lodash";

import { get, put, post, del, getUrl, getNextPage } from "../query";

dotenv.config();

/**
 *  GET /admin/api/2020-04/inventory_levels.json
    Retrieves a list of inventory levels

    POST /admin/api/2020-04/inventory_levels/adjust.json
    Adjusts the inventory level of an inventory item at a location

    DELETE /admin/api/2020-04/inventory_levels.json?inventory_item_id=808950810&location_id=905684977
    Deletes an inventory level from a location

    POST /admin/api/2020-04/inventory_levels/connect.json
    Connects an inventory item to a location

    POST /admin/api/2020-04/inventory_levels/set.json
    Sets the inventory level for an inventory item at a location

*/

/**
 * Get all inventory items linked to a location_id (or several location_ids)
 * Uses the cursor pagination
 */
export const getInventoryLevels = async (location_ids) => {
  let nextPage = `/inventory_levels.json?limit=250&location_ids=${location_ids}`;
  let arResult = [];

  while (nextPage) {
    const result = await get(nextPage);
    arResult = [...arResult, ...result.data.inventory_levels];
    nextPage = getNextPage(result.headers);
  }

  return arResult;
};

export const connectInventoryLevel = async (locationId, inventoryItemId) => {
  const result = await post(`/inventory_levels/connect.json`, {
    location_id: locationId,
    inventory_item_id: inventoryItemId,
    relocate_if_necessary: true,
  });

  return result.data;
};

export const updateInventoryLevel = async (
  locationId,
  inventoryItemId,
  availableAdjustment
) => {
  let result = null;

  try {
    const req = await post(`/inventory_levels/adjust.json`, {
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available_adjustment: availableAdjustment,
    });

    result = req.data;
  } catch (e) {
    console.log(
      "updateInventoryLevel error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};
