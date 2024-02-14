import express from 'express';
import { prisma } from "../utils/prisma/index.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import { emailVerificationMiddleware }  from '../middlewares/emailtransport.middleware.js'
import { uploadProfileImage } from '../middlewares/s3.js'
import axios from 'axios';

dotenv.config();
const router = express.Router();


router.post('/sign-up',uploadProfileImage, async (req, res, next) => {
    try{
    const { email, password, name,confirmpassword, profileImage, likedmuscle,weight,height,birth,address,nickname,introduction } = req.body; 
    console.log(email);
    if(!email || !password || !confirmpassword || !name ){
        return res.status(400).json({message: '모든 필드를 입력해주세요'})
    }
    if(password.length < 6){
        return res.status(400).json({ message: '비밀번호는 최소 6자 이상이여야 합니다'})
    }
    if(password !== confirmpassword){
        return res.status(400).json({message: '비밀번호가 일치하지 않습니다.'});
    }

    const isExistUser = await prisma.users.findFirst({
        where: { email : email }
    })
    
    if(isExistUser){
        return res.status(409).json({message: '이미 있는 이메일 입니다.'});
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const imageUrl = req.file.Location;
    const [user] = await prisma.$transaction(async (tx) => {
        const token = Math.floor(Math.random() * 900000) + 100000;
        const user = await tx.users.create({
                data: { 
                    email, 
                    password: hashedPassword,
                    name,
                    likedmuscle,
                    verifiedstatus: "nonpass", // 상태를 '가입대기중'으로 설정
                    emailTokens: token.toString(),
                    profile: {
                        create: {
                            profileImage: imageUrl,
                            weight: +weight,
                            height: +height,
                            birth: +birth,
                            address,
                            nickname,
                            introduction,
                        }
                    } // 
                 }
            });
            
            await emailVerificationMiddleware(email, token)
            return [user];
        },{
            isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
        })
        res.redirect('sign-up-verify');
}catch(err){
    next(err);
}
});

router.put('/user-sign-up/verify', async(req, res, next) => {
    try{
    const { email, verifiedusertoken } = req.body; 
    console.log("이메일 인증 토큰임");

    const isExistUser = await prisma.users.findFirst({
        where: { email : email }
    })
    
    if(!isExistUser.emailTokens){
        req.flash('error', '정상적으로 메일이 가지 않았습니다. 메일을 확인해주세요.');
        res.redirect('sign-up-verify');
    }
    if(verifiedusertoken === isExistUser.emailTokens){
        await prisma.users.update({
            where: { userId: isExistUser.userId },
            data: { verifiedstatus: "pass" },
          });
        req.flash('error', '이메일 인증에 성공하였습니다.');
        res.redirect('/sign-in');
    }
    else{
        req.flash('message', '인증번호가 다릅니다.');
        res.redirect('/sign-up-verify');
    }
    }catch(err) {
        next(err);
    }});



router.post('/sign-in', async (req, res, next) => {
    let user;
    const {email, password } = req.body;
    user = await prisma.users.findFirst({
            where: {
                email,
            }
        });
        
        console.log(user);
        
        if(!user){
            req.flash('error', '이메일이 존재하지 않습니다.');
            return res.redirect('sign-in');
        }
        
        if (!(await bcrypt.compare(password, user.password))) {
            user.failedAttempts = user.failedAttempts ? user.failedAttempts + 1 : 1;

            await prisma.users.update({
                where: {
                    email: email,
                },
                data: {
                    failedAttempts: user.failedAttempts,
                },
            });

            if(user.failedAttempts >= 5) {
                req.flash('error', '비밀번호를 5번 이상 틀렸습니다. 회원가입 페이지로 돌아갑니다.');
                return res.redirect('sign-up');
            }
            req.flash('error', `비밀번호가 일치하지 않습니다. 남은 기회는 ${5 - user.failedAttempts}번입니다.`);
            return res.redirect('sign-in');
        } else {
            // JWT 생성하기
            const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '12h' });
    
            // refresh TOKEN 생성
            const refreshToken = jwt.sign({ userId: user.userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    
            res.cookie('authorization', `Bearer ${token}`);
            res.cookie('refreshToken',`Bearer ${refreshToken}`);
    
            res.redirect('mainpage');
        }
    });


router.post('/refresh-token', async(req, res, next) => {
    const { refreshToken } = req.cookies;

    if(!refreshToken){
        return res.status(401).json({ message: '리프레쉬 토큰이 없습니다.'});
    }

    try{
        const { userId } = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
        // 재발급할 액서스 토큰 생성  
        const newToken = jwt.sign({ userId: userId }, process.env.JWT_SECRET, { expiresIn: '12h' });

        // 재발급된 엑세스 토큰 저장
        res.cookie('authorization', `Bearer ${newToken}`);
        
        return res.status(200).json({ message: '새로운 토큰 재발급에 성공했습니다.'});
    }catch(error){
        return res.status(401).json({ message: '리프레시 토큰이 유효하지 않습니다.'});
    }
});


router.get('/users', authMiddleware, async (req, res, next) => {
    const { userId } = req.user;

    const user = await prisma.users.findFirst({
        where: { userId: +userId},
        select: {
            userId: true,
            email: true,
            createdAt: true,
            updatedAt: true,
            userInfos: {
                select: {
                    name: true,
                }
            }
        }
    });

    return res.status(200).json({ data: user });
})


router.patch('/users', authMiddleware,async (req, res, next) => {
    const updatedData = req.body;
    const { userId } = req.user;

    const userInfo = await prisma.userInfos.findFirst({
        where: { userId: +userId }
    });
    if(!userInfo) return res.status(404).json({ message: "사용자 정보가 존재하지 않습니다."})

    await prisma.$transaction(async(tx) => {
        await tx.userInfos.update({
            data: {
                ...updatedData
            },
            where: {
                userId: +userId,
            }
        });

        for(let key in updatedData){
            if(userInfo[key] !== updatedData[key])
            await tx.userHistories.create({
        data:{
            userId: +userId,
            changedField: key,
            oldValue: String(userInfo[key]),
            newValue: String(updatedData[key]),
            }
        });
    }
    },{
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    })

    return res.status(200).json({message: "사용자 정보 변경에 성공했습니다."})
})

// 회원 탈퇴
router.delete('/withdrawal', authMiddleware, async (req, res, next) => {
    const { userId } = req.user;
    const { checkedPwd } = req.body;
    const user = await prisma.users.findFirst({
        where: { userId: userId }
    })

    const isValidPwd = await bcrypt.compare(checkedPwd, user.password);
    if (!isValidPwd){
        req.flash('message', '비밀번호가 틀렸습니다.');
        return res.redirect('/sign-withdrawal');
    }
    else{

        await prisma.posts.deleteMany({
            where: { userId: +userId }
        });
        await prisma.comments.deleteMany({
            where: { userId: +userId }
        });
        await prisma.favorites.deleteMany({
            where: { userId: +userId }
        });
        await prisma.follows.deleteMany({
            where: { followingId: +userId }
        });
        await prisma.follows.deleteMany({
            where: { followerId: +userId }
        });
        await prisma.users.delete({
            where: { userId: +userId }
        })
      
        req.flash('message', '회원탈퇴되었습니다, 로그인 페이지로 이동합니다.');
        res.redirect('/sign-up');
    }
})



// 구글 로그인 
// 루트 페이지
// 로그인 버튼을 누르면 GET /login으로 이동
router.get('/', (req, res) => {
    res.send();
});

// 로그인 버튼을 누르면 도착하는 목적지 라우터
// 모든 로직을 처리한 뒤 구글 인증 서버인 https://accounts.google.com/o/oauth2/v2/auth
// 으로 redirect 되는데, 이 url에 첨부할 몇가지 QueryString들이 필요
router.get('/google/login', (req, res) => {
    let url = 'https://accounts.google.com/o/oauth2/v2/auth';
    // client_id는 위 스크린샷을 보면 발급 받았음을 알 수 있음
    // 단, 스크린샷에 있는 ID가 아닌 당신이 직접 발급 받은 ID를 사용해야 함.
    url += `?client_id=${process.env.GOOGLE_CLIENT_ID}`
    // 아까 등록한 redirect_uri
    // 로그인 창에서 계정을 선택하면 구글 서버가 이 redirect_uri로 redirect 시켜줌
    url += `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}`
    // 필수 옵션.
    url += '&response_type=code'
    // 구글에 등록된 유저 정보 email, profile을 가져오겠다 명시
    url += '&scope=email profile'
    // 완성된 url로 이동
    // 이 url이 위에서 본 구글 계정을 선택하는 화면임.
    res.redirect(url);
});

// 구글 계정 선택 화면에서 계정 선택 후 redirect 된 주소
// 아까 등록한 GOOGLE_REDIRECT_URI와 일치해야 함
// 우리가 http://localhost:3000/login/redirect를
// 구글에 redirect_uri로 등록했고,
// 위 url을 만들 때도 redirect_uri로 등록했기 때문
router.get('/redirect', (req, res) => {
    const { code } = req.query;
    console.log(`code: ${code}`);
    res.send('ok');
});
// http://localhost:3098/google/redirect?code=4%2F0AeaYSHA2Hr286q5Idsy-ns2QyvargowoILdlKiXL2TUNjQeMd3yzIGGK9EqeE1TiZBPxDQ&scope=email+profile+openid+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&authuser=0&prompt=consent
// 토큰을 요청하기 위한 구글 인증 서버 url
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
router.get('/google/redirect', async (req, res) => {
    const { code } = req.query;
    console.log(`code: ${code}`);

    // access_token, refresh_token 등의 구글 토큰 정보 가져오기
    const resp = await axios.post(GOOGLE_TOKEN_URL, {
        // x-www-form-urlencoded(body)
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
    });

    console.log(resp)
    const resp2 = await axios.get(GOOGLE_USERINFO_URL, {
        headers: {
            Authorization: `Bearer ${resp.data.access_token}`,
        },
    });
    res.json(resp2.data);
    res.redirect('/mainpage');
});


// 카카오 로그인 
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
        // Checkpass: "default",
        verifiedstatus: "pass",
    },
    }); 
    //이후 사용자 정보를 저장합니다.
  
    const userJWT = jwt.sign({ userId: users.id }, process.env.JWT_SECRET, { expiresIn: "12h" }
    );


    res.cookie("authorization", `Bearer ${userJWT}`);
    res.status(200).json({ message: '로그인 완료되었습니다.' });
   return res.redirect("/mainpage");
  }); //axios를 이용하여 예제1을 기준으로 작성하여 카카오 서버에 토큰 요청을 보냅니다.

router.get('/oauth/logout', async(req,res) => {
    const logout_Url = `https://kauth.kakao.com/oauth/logout?client_id=${process.env.KAKAO_APIKEY}&logout_redirect_uri=${process.env.KAKAO_LOGOUT}`;
    res.redirect(logout_Url);
})

router.get('/oauth/logout/callback', (req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: '로그아웃에 성공하였습니다.' });
});
export default router;
