import express from "express"
import bodyParser from "express"
import cookieParser from "cookie-parser";
import LogMiddleware from "./middlewares/log.middleware.js";
import ErrorHandlingMiddleware from "./middlewares/error-handling.middleware.js";
import indexRouter from "./routers/index.router.js"
import cors from "cors";
// const cors = require('cors');
const app = express()
const port = 3018;

let corsOptions = {
    origin: 'http://localhost:5500',
    credentials: true
}

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(LogMiddleware);
app.use(bodyParser.json());



app.use(indexRouter);



app.use(ErrorHandlingMiddleware);
app.listen(port, () => {
    console.log(port, '서버실행')
});