import { Router } from "express";
import getFilesRouter from './getFiles.mjs';
import authRouter from './manageUser.mjs'
import feedbackRouter from './feedback.mjs'
import authAdmin from './admin.mjs'
import eventRoute from './event.mjs'

const router = Router();

router.use(getFilesRouter);
router.use(authRouter);
router.use(feedbackRouter);
router.use(authAdmin);
router.use(eventRoute);

export default router;