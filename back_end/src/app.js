// src/app.js
import express from 'express';
import PostsRouter from './routers/post.router.js';
import cookieParser from 'cookie-parser';
// import ProfileRouter from './routers/profile.router.js';
import "dotenv/config";
import usersRouter from './routers/users.router.js';
import path from "path";
import { fileURLToPath } from "url";
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

app.get('/sign-in', (req, res) => {
  res.render('sign-in'); // Render login.ejs
});

app.get('/sign-up', (req, res) => {
  res.render('sign-up'); // Render signup.ejs
});
app.use('/', [PostsRouter, usersRouter]);

const PORT = 3098;
app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});