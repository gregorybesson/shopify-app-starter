import Bottleneck from "bottleneck";

export * from "./api/appSubscription";
export * from "./api/carrierService";
export * from "./api/collect";
export * from "./api/collection";
export * from "./api/customer";
export * from "./api/customCollection";
export * from "./api/fulfillment";
export * from "./api/fulfillmentEvent";
export * from "./api/fulfillmentRequest";
export * from "./api/fulfillmentService";
export * from "./api/giftcard";
export * from "./api/image";
export * from "./api/inventory";
export * from "./api/inventoryLevel";
export * from "./api/location";
export * from "./api/metafield";
export * from "./api/order";
export * from "./api/priceRule";
export * from "./api/product";
export * from "./api/productImage";
export * from "./api/productVariant";
export * from "./api/shop";
export * from "./api/smartCollection";
export * from "./api/themes";
export * from "./api/transaction";
export * from "./api/user";
export * from "./api/webhook";

export * from "./query";

export const limiter = new Bottleneck({
  reservoir: 80, // initial value
  reservoirIncreaseAmount: 2,
  reservoirIncreaseInterval: 1000, // must be divisible by 250
  reservoirIncreaseMaximum: 80,

  // also use maxConcurrent and/or minTime for safety
  maxConcurrent: 5,
  minTime: 250, // pick a value that makes sense for your use case
});
