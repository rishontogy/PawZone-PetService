import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import listingsRouter from "./listings";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import transporterRouter from "./transporter";
import reviewsRouter from "./reviews";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import usersRouter from "./users";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(listingsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(transporterRouter);
router.use(reviewsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(usersRouter);

export default router;
