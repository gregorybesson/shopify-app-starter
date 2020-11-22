import Router from "koa-router";
import * as shopify from "../shopify";
import dotenv from "dotenv";
import koaBody from "koa-body";
import Bottleneck from "bottleneck";
import _ from "lodash";
import * as db from "../database";
import * as services from "../services";

dotenv.config();

const { SHOP, HOST } = process.env;
const shopifyRouter = new Router({ prefix: "/shopify" });

shopifyRouter.get("/test-delete-store", koaBody(), async (ctx) => {
  let store = await db.deleteTable();

  ctx.body = {
    status: "success",
    result: store,
  };
});

shopifyRouter.get("/test-get-store", koaBody(), async (ctx) => {
  await db.createTable();
  let item = await db.getItem({ store: "store1" });

  if (!item) {
    console.log("item not found", item);

    item = await db.addItem({
      store: "store1",
      fastmag: {
        enseigne: "FORM_IZAC",
        magasin: "WEB",
        compte: "DISKO",
        motpasse: "123456!",
      },
    });
  }

  ctx.body = {
    status: "success",
    result: item,
  };
});

shopifyRouter.get("/get-inventory", koaBody(), async (ctx) => {
  //const inventoryToUpdate = []
  // Je récupère tous les variants shopify avec id et qty stock, prix et id fastmag
  // sous forme d'1 tableau avec l'id fastmag comme index
  const shopifyInventory = await shopify.getFullInventory();
  for (var key in shopifyInventory) {
    //const item = shopifyInventory[key];
    // console.log(key, item);

    const colorSku = key.split("|");
    if (typeof colorSku[1] !== "undefined" && colorSku[1].includes("_")) {
      console.log("key à corriger", key);
    }
  }

  ctx.body = {
    status: "success",
    result: shopifyInventory,
  };
});

shopifyRouter.get("/get-full-catalog", koaBody(), async (ctx) => {
  const service = await shopify.getFulfillmentServiceByName("fastmag");
  const locationId = _.get(service, "location_id", null);
  const shopifyInventory = shopify.getFullCatalog(locationId);

  ctx.body = {
    status: "success",
    result: true,
  };
});

shopifyRouter.get("/get-fulfillmentService", koaBody(), async (ctx) => {
  const fulfillmentServiceId = 54102655021;
  const service = await shopify.getFulfillmentService(fulfillmentServiceId);

  ctx.body = {
    status: "success",
    result: service,
  };
});

shopifyRouter.get(
  "/test-get-fulfillmentServiceByName",
  koaBody(),
  async (ctx) => {
    const fulfillmentService = "fastmag";
    const service = await shopify.getFulfillmentServiceByName(
      fulfillmentService
    );

    ctx.body = {
      status: "success",
      result: service,
    };
  }
);

shopifyRouter.get("/post-fulfillmentService", koaBody(), async (ctx) => {
  const changeset = {
    name: "myservice",
    callback_url: `${HOST}/app/myservice`,
    inventory_management: true,
    tracking_support: true,
    requires_shipping_method: true,
    format: "json",
  };
  const service = await shopify.createFulfillmentService(changeset);

  ctx.body = {
    status: "success",
    result: service,
  };
});

shopifyRouter.get("/put-fulfillmentService", koaBody(), async (ctx) => {
  const fulfillmentServiceId = ctx.query["id"];
  const service = await shopify.updateFulfillmentService(fulfillmentServiceId);

  ctx.body = {
    status: "success",
    result: service,
  };
});

shopifyRouter.get("/get-inventorylevels", koaBody(), async (ctx) => {
  const locationId = 46639939629;
  const levels = await shopify.getInventoryLevels(locationId);

  ctx.body = {
    status: "success",
    result: levels,
  };
});

shopifyRouter.get("/connect-inventorylevels", koaBody(), async (ctx) => {
  const inventoryItemId = 35060749533229;

  const fulfillmentsservices = await shopify.getFulfillmentServices();
  const locationId = fulfillmentsservices[0]["location_id"];
  await shopify.connectInventoryLevel(locationId, inventoryItemId);

  ctx.body = {
    status: "success",
    result: true,
  };
});

/**
 * This route will connect all products from a shopify stock to a fulfillment service stock
 */
shopifyRouter.get("/connect-inventorylevels", koaBody(), async (ctx) => {
  const shopifyLocationId = 35648602167;

  const service = await shopify.getFulfillmentServiceByName("fastmag");
  const locationId = _.get(service, "location_id", null);
  const levels = await shopify.getInventoryLevels(shopifyLocationId);
  // Never more than 2 requests running at a time.
  // Wait at least 1000ms between each request.
  const limiter = new Bottleneck({
    reservoir: 80, // initial value
    reservoirIncreaseAmount: 4,
    reservoirIncreaseInterval: 1000, // must be divisible by 250
    reservoirIncreaseMaximum: 80,

    // also use maxConcurrent and/or minTime for safety
    maxConcurrent: 5,
    minTime: 250, // pick a value that makes sense for your use case
  });

  levels.map((item) => {
    limiter
      .schedule(
        shopify.connectInventoryLevel,
        locationId,
        item["inventory_item_id"]
      )
      .then((result) => {
        console.log("connexion réalisée", result);
      });
  });

  ctx.body = {
    status: "success",
    result: true,
  };
});

shopifyRouter.get("/get-locations", koaBody(), async (ctx) => {
  const locations = await shopify.getLocations();

  ctx.body = {
    status: "success",
    result: locations,
  };
});

// shopifyRouter.get("/delete-all-products", koaBody(), async (ctx) => {
//   const products = await shopify.deleteAllProducts();

//   ctx.body = {
//     status: "success",
//     result: products,
//   };
// });

shopifyRouter.get("/get-products", koaBody(), async (ctx) => {
  const products = await shopify.getProducts();

  ctx.body = {
    status: "success",
    result: products,
  };
});

shopifyRouter.get("/get-product-variants", koaBody(), async (ctx) => {
  const productId = 5073666015277;
  const get = await shopify.getProductVariants(productId);

  ctx.body = {
    status: "success",
    result: get,
  };
});

shopifyRouter.get("/get-variant", koaBody(), async (ctx) => {
  const variantId = 5073665884205;
  const get = await shopify.getVariant(variantId);

  ctx.body = {
    status: "success",
    result: get,
  };
});

shopifyRouter.get("/put-variant-price", koaBody(), async (ctx) => {
  //good 34292705853485
  //bad 34291181256749
  const variantId = 34291181256749;
  const update = await shopify.updateVariant(variantId, {
    price: "79.99",
    compare_at_price: "109.00",
  });

  ctx.body = {
    status: "success",
    result: update,
  };
});

/**
 * collection_OUTLET
 */
shopifyRouter.get("/deactivate/:tag", koaBody(), async (ctx) => {
  const tag = ctx.params.tag;
  const nbProductsDeactivated = await services.deactivateProductsByTag(tag);

  let result = {
    result: `${nbProductsDeactivated} produits désactivés`,
  };

  ctx.body = result;
});

shopifyRouter.get("/put-variant-metafield", koaBody(), async (ctx) => {
  //good 34292705853485
  //bad 34291181256749
  const variantId = 34291181256749;
  const update = await shopify.updateVariant(variantId, {
    metafields: [
      {
        key: "fastmag-id",
        value: "newvalue",
        value_type: "string",
        namespace: "global",
      },
    ],
  });

  ctx.body = {
    status: "success",
    result: update,
  };
});

shopifyRouter.get("/put-product", koaBody(), async (ctx) => {
  const id = 5035807277101;
  const tag = "promo_presoldes_30_2020-06-06_2020-06-20";
  const tags = `${product.tags.join(",")},${tag}`;
  const changeset = {
    id: "5035807277101",
    tags: tags,
  };
  const update = await shopify.updateProduct(id, changeset);

  ctx.body = {
    status: "success",
    result: update,
  };
});

shopifyRouter.get("/getall-orders", koaBody(), async (ctx) => {
  const get = await shopify.getAllOrders(["fulfillment_status=unshipped"]);

  ctx.body = {
    status: "success",
    result: get,
  };
});

shopifyRouter.get("/get-orders-unshipped", koaBody(), async (ctx) => {
  const get = await shopify.getAllOrdersGQL(
    "created_at:>'2020-05-30T00:00:00+0100' AND fulfillment_status:unshipped"
  );

  ctx.body = {
    status: "success",
    result: get,
  };
});

shopifyRouter.get("/get-orders-by-tag/:tags", koaBody(), async (ctx) => {
  let tags = ctx.params.tags.split(",");
  let filter = "created_at:>'2020-05-30T00:00:00+0100' AND status:open";
  tags.map((tag) => {
    filter = `${filter} AND tag:'${tag}'`;
  });
  console.log("get-orders-by-tag filter", filter);

  const orders = await shopify.getAllOrdersGQL(filter);

  ctx.body = {
    status: "success",
    result: orders,
  };
});

shopifyRouter.get("/get-order", koaBody(), async (ctx) => {
  let id = ctx.query["id"];
  const result = await shopify.getOrder(id);
  const orderMetafields = await shopify.getOrderMetafields(id);
  console.log("orderMetafields", orderMetafields);
  const found = _.get(orderMetafields, "key") === "fastmag-order-id";
  const fastmagMeta = _.find(orderMetafields, ["key", "fastmag-order-id"]);
  console.log("found", found);
  result["fastmagId"] = _.get(fastmagMeta, "value", "");

  console.log("order", result);
  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/get-transactions", koaBody(), async (ctx) => {
  let id = ctx.query["id"];
  const result = await shopify.getTransactions(id);

  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/put-order", koaBody(), async (ctx) => {
  const id = 2395038744621;
  const update = await shopify.updateOrder(id, {
    note: "Customer contacted us about a custom engraving on this iPod",
    note_attributes: [
      {
        name: "colour",
        value: "red",
      },
    ],
    tags: "External, Inbound, Outbound",
    metafields: [
      {
        key: "fastmag-order-id",
        value: "234564746",
        value_type: "string",
        namespace: "global",
      },
    ],
  });

  ctx.body = {
    status: "success",
    result: update,
  };
});

shopifyRouter.get("/get-fulfillments", koaBody(), async (ctx) => {
  let id = ctx.query["id"];
  const fulfillments = await shopify.getFulfillments(id);

  ctx.body = {
    status: "success",
    result: fulfillments,
  };
});

shopifyRouter.get("/get-fulfillment-events", koaBody(), async (ctx) => {
  let orderId = ctx.query["order-id"];
  let fulfillmentId = ctx.query["fulfillment-id"];
  const events = await shopify.getFulfillmentEvents(orderId, fulfillmentId);

  ctx.body = {
    status: "success",
    result: events,
  };
});

shopifyRouter.get("/get-fulfillment", koaBody(), async (ctx) => {
  let orderId = ctx.query["order-id"];
  let fulfillmentId = ctx.query["fulfillment-id"];
  const fulfillment = await shopify.getFulfillment(orderId, fulfillmentId);

  ctx.body = {
    status: "success",
    result: fulfillment,
  };
});

shopifyRouter.get("/post-fulfillment", koaBody(), async (ctx) => {
  const orderId = 2323757989933;
  const fulfillment = await shopify.createFulfillment(orderId);

  ctx.body = {
    status: "success",
    result: fulfillment,
  };
});

shopifyRouter.get("/post-openFulfillment", koaBody(), async (ctx) => {
  const orderId = 2323757989933;
  const fulfillmentId = 2134466068525;
  const fulfillment = await shopify.openFulfillment(orderId, fulfillmentId);

  ctx.body = {
    status: "success",
    result: fulfillment,
  };
});

shopifyRouter.get("/post-completeFulfillment", koaBody(), async (ctx) => {
  const orderId = 2323757989933;
  const fulfillmentId = 2134466068525;
  const fulfillment = await shopify.completeFulfillment(orderId, fulfillmentId);

  ctx.body = {
    status: "success",
    result: fulfillment,
  };
});

shopifyRouter.get("/updateTracking", koaBody(), async (ctx) => {
  const fulfillmentId = 2134466068525;
  const changeset = {
    notify_customer: true,
    tracking_info: {
      number: "1111",
      url: "http://www.my-url.com",
      company: "my-company",
    },
  };
  const fulfillment = await shopify.updateTracking(fulfillmentId, changeset);

  ctx.body = {
    status: "success",
    result: fulfillment,
  };
});

shopifyRouter.get("post-createFulfillmentEvent", koaBody(), async (ctx) => {
  const orderId = 2323757989933;
  const fulfillmentId = 2134466068525;
  const changeset = {
    status: "in_transit",
    message: "Votre colis est en route",
  };
  const event = await shopify.createFulfillmentEvent(
    orderId,
    fulfillmentId,
    changeset
  );

  ctx.body = {
    status: "success",
    result: event,
  };
});

shopifyRouter.get("post-closeOrder", koaBody(), async (ctx) => {
  const orderId = 2323757989933;
  const order = await shopify.closeOrder(orderId);

  ctx.body = {
    status: "success",
    result: order,
  };
});

shopifyRouter.get("/get-giftcard", koaBody(), async (ctx) => {
  const giftcardId = 421472174125;
  const giftcard = await shopify.getGiftCard(giftcardId);

  const note = JSON.parse(giftcard.note);
  console.log("note", note);

  ctx.body = {
    status: "success",
    result: note,
  };
});

shopifyRouter.get("/post-giftcard", koaBody(), async (ctx) => {
  const changeset = {
    note: "This is a note",
    initial_value: 100.0,
    code: "W123456",
    template_suffix: "birthday",
  };
  const card = await shopify.createGiftCard(changeset);

  ctx.body = {
    status: "success",
    result: card,
  };
});

shopifyRouter.get("/post-reopenOrder", koaBody(), async (ctx) => {
  const orderId = 2323757989933;
  const order = await shopify.reopenOrder(orderId);

  ctx.body = {
    status: "success",
    result: order,
  };
});

shopifyRouter.put("/items/:sku/stock", async (ctx) => {
  try {
    const json = ctx.request.body;
    const stock = json.data.stock;
    const sku = ctx.params.sku;

    const result = await shopify.updateInventoryFromSku(sku, stock);

    ctx.body = {
      status: "success",
    };
  } catch (err) {
    console.log(err.message);
    ctx.body = {
      status: `error: ${err.message}`,
    };
  }
});

shopifyRouter.get("/post-pricerule", koaBody(), async (ctx) => {
  const changeset = {
    title: "15OFFCOLLECTION",
    target_type: "line_item",
    target_selection: "entitled",
    allocation_method: "across",
    value_type: "percentage",
    value: "-15.0",
    customer_selection: "all",
    starts_at: "2020-01-19T17:59:10Z",
  };
  const result = await shopify.getOrder(changeset);

  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/post-images", koaBody(), async (ctx) => {
  const result = await shopify.uploadImages();

  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/get-customCollections", koaBody(), async (ctx) => {
  const result = await shopify.getCustomCollections();

  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/get-smartCollections", koaBody(), async (ctx) => {
  const result = await shopify.getSmartCollections();

  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/post-smartCollection", koaBody(), async (ctx) => {
  let result = null;
  const groupId = `Group_GGG`;
  const query = `title=${groupId}`;
  const exists = await shopify.getSmartCollections(query);

  //console.log('exists', exists);

  if (!_.get(exists[0], "id")) {
    const changeset = {
      title: groupId,
      rules: [
        {
          column: "tag",
          relation: "equals",
          condition: groupId,
        },
      ],
    };

    result = await shopify.createSmartCollection(changeset);
  }

  ctx.body = {
    status: "success",
    result: result,
  };
});

shopifyRouter.get("/get-asset", koaBody(), async (ctx) => {
  const result = await shopify.getAsset("config/settings_data.json");

  const json = JSON.parse(result.asset.value);
  const stores = [];
  for (const section in json.current.sections) {
    if (section.startsWith("section-storelocator-map")) {
      stores.push(json.current.sections[section]);
    }
  }

  ctx.body = {
    status: "success",
    result: stores,
  };
});

shopifyRouter.get("/set-page-meta", koaBody(), async (ctx) => {
  const result = await shopify.setMetafield("193562673197", "collections", {
    namespace: "cms",
    key: "list_push",
    value:
      '[{"title":"total look2","block_type":"push_promo_wide","image":"//cdn.shopify.com/s/files/1/0344/0692/4333/products/echh19kunder_gris-a_8f50c34d-aa31-400a-867e-8293ea9efc29_720x.jpg?v=1590614602","cta_label":"Découvrir","cta_link":"shopify://products/baskets-montantes-camel-chaussh15cosmos-camel","position":2},{"title":"total look2","block_type":"push_promo","image":"//cdn.shopify.com/s/files/1/0344/0692/4333/products/echh19kunder_gris-a_8f50c34d-aa31-400a-867e-8293ea9efc29_720x.jpg?v=1590614602","cta_label":"Découvrir","cta_link":"shopify://products/baskets-montantes-camel-chaussh15cosmos-camel","position":7},{"title":"total look2","block_type":"push_promo_mega","image":"//cdn.shopify.com/s/files/1/0344/0692/4333/products/echh19kunder_gris-a_8f50c34d-aa31-400a-867e-8293ea9efc29_720x.jpg?v=1590614602","cta_label":"Découvrir","cta_link":"shopify://products/baskets-montantes-camel-chaussh15cosmos-camel","position":16}]',
  });

  ctx.body = {
    status: "success",
    result: true,
  };
});

shopifyRouter.get("/post-carrierService", koaBody(), async (ctx) => {
  const changeset = {
    name: "Izac Click&Collect",
    callback_url: `${HOST}/app/storelocator/get-shipping`,
    service_discovery: true,
  };
  const service = await shopify.createCarrierService(changeset);

  ctx.body = {
    status: "success",
    result: service,
  };
});

shopifyRouter.get("/get-carrierServices", koaBody(), async (ctx) => {
  const result = await shopify.getCarrierServices();

  ctx.body = {
    status: "success",
    result: result,
  };
});

export default shopifyRouter;
