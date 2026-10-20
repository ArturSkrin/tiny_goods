import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import adminAuthRouter from "./adminAuth";
import liqpayRouter from "./liqpay";
import settingsRouter from "./settings";
import imagesRouter from "./images";
import novaPoshtaRouter from "./novaposhta";
import accountRouter from "./account";

const router: IRouter = Router();

router.use(healthRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(adminAuthRouter);
router.use(liqpayRouter);
router.use(adminRouter);
router.use(settingsRouter);
router.use(imagesRouter);
router.use(novaPoshtaRouter);
router.use(accountRouter);

export default router;
