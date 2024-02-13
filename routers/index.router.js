import express, { Router } from "express"
const router = express.Router();
import loginRouter from "./login.router.js";


router.use('/log-in', loginRouter);



export default router;