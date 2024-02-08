import express from "express"
import bodyParser from "express"
import loginRouter from "./routers/login.router.js"
import cookieParser from "cookie-parser";
import LogMiddleware from "./middlewares/log.middleware.js";
import ErrorHandlingMiddleware from "./middlewares/error-handling.middleware.js";
import UserRouter from "./routers/user.router.js";


const app = express()
const port = 3018;

app.use(cookieParser());
app.use(LogMiddleware);
app.use(bodyParser.json());
app.use('/',
    loginRouter,
    UserRouter
);



app.use(ErrorHandlingMiddleware);
app.listen(port, () => {
    console.log(port, '서버실행')
});