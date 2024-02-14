// src/app.js
import express from 'express';
import PostsRouter from './routers/post.router.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import flash from 'connect-flash';
import "dotenv/config";
import usersRouter from './routers/users.router.js';
import path from "path";
import { fileURLToPath } from "url";
import methodOverride from "method-override";
import ProfileRouter from './routers/profile.router.js'
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 세션
app.use(session({
  secret: process.env.SESSION_SECRET_KEY,
  resave: false,
  saveUninitialized: true,
}));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(methodOverride('_method')); // ejs에서 get이랑 put 되게 하는거
app.use(flash()); // 플래시 경고창 띠우는거


app.get('/sign-in', (req, res) => {
  const errorMessage = req.flash('error');
  res.render('sign-in', { message: errorMessage });
});

app.get('/sign-up', (req, res) => {
  res.render('sign-up'); // Render signup.ejs
});


app.get('/sign-up-verify', (req, res) => {
  const message = req.flash('message');
  res.render('sign-up-verify', { message });
});

app.get('/sign-withdrawal', (req, res) => {
  const message = req.flash('message');
  res.render('sign-withdrawal', { message });
});

app.get('/profilemodify', (req, res) => {
  const message = req.flash('message');
  res.render('profilemodify', { message });
});

app.get('/mainpage', (req, res) => {
  res.render('mainpage'); // Render signup.ejs
});

app.get('/onepostpage', (req, res) => {
  res.render('onepostpage'); // Render onepostpage.ejs
});

app.get('/postedit', (req, res) => {
  const message = req.flash('message');
  res.render('postedit', { message }); // Render onepostpage.ejs
});

app.use('/', [PostsRouter, usersRouter, ProfileRouter]);

const PORT = 3098;
app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});