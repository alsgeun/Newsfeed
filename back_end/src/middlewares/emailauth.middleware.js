import express from 'express'
import expressSession from 'express-session'
import bcrypt from 'bcrypt'
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from '@prisma/client';

router.get('/verify', async(req, res, next) => {
    const { token } = req.query;

    // 세션에서 이메일 토큰이 일치하는 사용자 정보 가져오기
    const tempUser = req.session.tempUser;
    if (!tempUser || tempUser.emailToken !== token){
        return res.status(400).json({ message: '이메일 인증 요청이 잘못되었습니다.'});
    }
    //회원가입 처리
    try {
        const [user, userInfo] = await prisma.$transaction(async (tx) => {
        const user = await tx.users.create({
            data: { 
            email: tempUser.email, 
            password: tempUser.password,
            name: tempUser.name
        }
        });

        const userInfo = await tx.userInfos.create({
            data:{
            userId: user.userId,
            name: tempUser.name,
            }
        });

        return [user, userInfo];
        });

    // 세션에서 사용자 정보 삭제
        delete req.session.tempUser;

        return res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    }     catch(err) {
        next(err);
    }
    });