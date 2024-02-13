import express from "express";
import cookieParser from "cookie-parser";
import UsersRouter from "./router/user.router.js";
import followRouter from "./router/follow.router.js";

const app = express();
const PORT = 3306;

app.use(express.json());
app.use(cookieParser());

app.use('/api', [UsersRouter, followRouter]);

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");
});
