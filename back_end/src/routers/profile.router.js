import express from "express";
import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import "dotenv/config";
import { uploadProfileImage } from '../middlewares/s3.js'


const router = express.Router();

// 프로필 조회 get
// 1. *이름, 생년월일, *email, 한줄소개, 닉네임

router.get("/profile", authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const user = await prisma.users.findFirst({
      where: { userId: +userId },
      select: {
        userId: true,
        email: true,
        profile: {
          select: {
            weight: true,
            height: true,
            birth: true,
            address: true,
            nickname: true,
            introduction: true,
            profileImage: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: "사용자가 존재하지 않습니다."})
    }
    return res.render('profile', { user: user });
  } catch (err) {
    next(err);
  }
});

// 프로필 수정 put
// 1.  새비밀번호, 새 비밀번호확인 과정 필수

router.put("/profile-modify", authMiddleware, uploadProfileImage, async (req, res, next) => {
  try {
    const { userId } = req.user; // 사용자를 인증하는 미들웨어에서 res.user에 사용자 정보를 저장한다고 가정
    const { newPwd, checkedPwd, currentPwd, weight, height, birth, address, nickname, introduction } = req.body;

    // 필수 항목 체크
    if (!currentPwd || !newPwd || !checkedPwd ) {
      req.flash('message', '필수 입력칸을 전부 입력해주세요.');
      return res.redirect('/profilemodify'); 
    }

    // 사용자 정보 조회
    const user = await prisma.users.findFirst({
      where: { userId }
    });
    
    // 기존 비밀번호 확인
    const isValidPwd = await bcrypt.compare(currentPwd, user.password);
    if (!isValidPwd) {
      req.flash('message', '현제 비밀번호하고 다릅니다.');
      return res.redirect('/profilemodify'); 
    }

    // 새 비밀번호 확인
    if (newPwd !== checkedPwd) {
      req.flash('message', '새 비밀번호와 비밀번호확인이 일치하지 않습니다.');
      return res.redirect('/profilemodify');
    }

    // 새 비밀번호 암호화
    const hashedPwd = await bcrypt.hash(newPwd, 10);
    const imageUrl = req.file.location; // 이미지 URL

    // 비밀번호 업데이트
await prisma.users.update({
  where: {
    userId: userId,
  },
  data: {
    password: hashedPwd, // 이름 변경
  },
});

// 프로필 업데이트
await prisma.profile.update({
  where: {
    userId: userId,
  },
  data: {
    profileImage: imageUrl,
    weight: +weight, // 몸무게 변경
    height: +height, // 키 변경
    birth: +birth, // 생년월일 변경
    address: address, // 주소 변경
    nickname: nickname, // 닉네임 변경
    introduction: introduction, // 소개 변경
  },
});

    req.flash('message', '프로필 수정이 완료되었습니다 메인페이지로 이동합니다.');
    res.redirect('/mainpage');
  } catch (err) {
    next(err);
  }
});





export default router;