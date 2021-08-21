import Router from "koa-router";
import koaBody from "koa-body";
import shopifyRouter from "./shopifyRouter";
import appRoutes from "../../app/routes";
import { validateSignature } from "../../utils/validateSignature"


const defaultRouter = new Router({ prefix: "/app" });

const nestedRoutes = [shopifyRouter, ...appRoutes];
defaultRouter.get("/ping", koaBody(), async (ctx) => {

  console.log('validate signatuuuuuure', validateSignature(ctx.query))

  ctx.body = {
    status: "success",
    result: true,
  };
});
for (var router of nestedRoutes) {
  defaultRouter.use(router.routes(), router.allowedMethods());
}

export default defaultRouter;