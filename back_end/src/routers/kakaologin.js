import axios from 'axios';
import express from 'express';
import { prisma } from "../utils/prisma/index.js";
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get("/oauth", (req, res) => {
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_APIKEY}&redirect_uri=${process.env.KAKAO_URL}&response_type=code`;
    res.redirect(kakaoAuthUrl);
  });


  router.get("/oauth/callback", async (req, res) => {
    const code = req.query.code;
    const tokenRequest = await axios({
      method: "POST",
      url: "https://kauth.kakao.com/oauth/token",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      data: {
        grant_type: "authorization_code",
        client_id: process.env.KAKAO_APIKEY,
        redirect_uri: process.env.KAKAO_URL,
        code,
      },
    });
    const { access_token } = tokenRequest.data;
    // 카카오 서버에서 액세스 토큰을 반환합니다.
    const profileRequest = await axios({
      method: "GET",
      url: "https://kapi.kakao.com/v2/user/me",
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });// axios를 이용하여 카카오 서버에 토큰 요청을 보냅니다.
  
    const { email, profile } = profileRequest.data.kakao_account;
    const name = profile.nickname;
    const user = await prisma.users.findFirst({ where: { email } });
  //카카오 서버에서 프로필에 있는 이메일과 이름을 추출합니다.
  
    const users = await prisma.users.upsert({
      where: { email },
      update: { email, name },
      create: { 
        email, 
        name, 
        password: "default",
        Checkpass: "default",
        emailstatus: "yes",
    },
    }); 
    //이후 사용자 정보를 저장합니다.
  
    const userJWT = jwt.sign({ userId: users.id }, process.env.JWT_SECRET, { expiresIn: "12h" }
    );


    res.cookie("authorization", `Bearer ${userJWT}`);
  
   return res.redirect("/newspeed");
  }); //axios를 이용하여 예제1을 기준으로 작성하여 카카오 서버에 토큰 요청을 보냅니다.

router.get('/kakao_logout', async(req,res) => {
    const logout_Url = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.KAKAO_APIKEY}&logout_redirect_uri=${process.env.KAKAO_LOGOUT}`;
    res.redirect(logout_Url);
})

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: '로그아웃에 성공하였습니다.' });
});


