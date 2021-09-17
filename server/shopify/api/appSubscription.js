import { get, put, post, del, getUrl, getHeaders, sleep } from "../query";
import _ from "lodash";

/**
 * Offer free testing for development stores
 * Shopify Partners are more likely to recommend apps they've used before. Consider allowing free app testing on development stores to help increase your app sales.
 * You can identify a development store by querying the Shop resource. Development stores return { "plan_name" : "affiliate" }.
 * After you've identified development stores, you can add logic to your app to avoid charging them.
 * If you make your app free for development stores, then contact us to get your app listed on our Partner-friendly app list.
 *
 * @param {*} returnUrl
 * @returns
 */
export const createAppSubscription = async (returnUrl) => {
  const query = `mutation {
    appSubscriptionCreate(
      name: "Basic Plan"
      trialDays: 0
      returnUrl: "${returnUrl}"
      test: true
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: 10.00, currencyCode: USD }
              interval: EVERY_30_DAYS
            }
          }
        }
      ]
    )
    {
      userErrors {
        field
        message
      }
      confirmationUrl
      appSubscription {
        id
        status
      }
    }
  }`;

  let result = null;
  try {
    const response = await post(`/graphql.json`, query);
    const { id, status } = response.body.data.appSubscriptionCreate.appSubscription;
    result = response.body.data.appSubscriptionCreate
    // const result = await StoreDetailsModel.findOne({
    //   subscriptionChargeId: id,
    // });

    // if (result === null) {
    //   await StoreDetailsModel.create({
    //     shop,
    //     subscriptionChargeId: id,
    //     status,
    //   });
    // } else {
    //   await StoreDetailsModel.findOneAndUpdate(
    //     { shop },
    //     {
    //       subscriptionChargeId: id,
    //       status,
    //     }
    //   );
    // }
    // return response.body.data.appSubscriptionCreate.confirmationUrl;
  } catch (e) {
    console.log(
      "getSubscriptionUrl error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
};

export const cancelAppSubscription = () => {
  const query = `mutation {
    appSubscriptionCancel(
      id: "gid://shopify/AppSubscription/4019585080"
    ) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }`;

  let result = null;
  try {
    const response = await post(`/graphql.json`, query);
    result = response.body.data.appSubscriptionCancel
  } catch (e) {
    console.log(
      "cancelSubscription error :",
      _.get(e, "response.data.errors", _.get(e, "response.data.error", e))
    );
  }

  return result;
}