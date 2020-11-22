import dotenv from "dotenv";

dotenv.config();
const { SHOP } = process.env;
var CronJob = require("cron").CronJob;

// at 1:00 am everyday:   0 1 * * *
// every minute:          */1 * * * *
// every 2 hours:         0 */2 * * *
// every day at 3:30AM:   30 3 * * *
// every day at 10:15PM:  15 22 * * *
export const init = () => {
  /**
   * Check the stock movements every 2 minutes
   */
  // const differentialStock = new CronJob(
  //   "*/2 * * * *",
  //   function () {
  //     console.log("***** CRON differentialStock *****");
  //     services.syncDifferentialStocks();
  //   },
  //   null,
  //   true,
  //   "Europe/Paris"
  // );
};
