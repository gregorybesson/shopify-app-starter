import Router from "koa-router";
import shopifyRouter from "./shopifyRouter";
import appRoutes from "../../app/routes";

const defaultRouter = new Router({ prefix: "/app" });

const nestedRoutes = [shopifyRouter, ...appRoutes];
for (var router of nestedRoutes) {
  defaultRouter.use(router.routes(), router.allowedMethods());
}

export default defaultRouter;
