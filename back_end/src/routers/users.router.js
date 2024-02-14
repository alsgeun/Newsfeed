import express from 'express';
import { prisma } from "../utils/prisma/index.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import { emailVerificationMiddleware }  from '../middlewares/emailtransport.middleware.js'
import { uploadProfileImage } from '../middlewares/s3.js'

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

export default router;
