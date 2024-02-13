import express from "express";
import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import "dotenv/config";
import { upload } from '../middlewares/s3.js'

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
            name: true,
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
    return res.status(200).json({ data: user });
  } catch (err) {
    next(err);
  }
});

// 프로필 수정 put
// 1.  새비밀번호, 새 비밀번호확인 과정 필수

router.put("/profile", authMiddleware, upload, async (req, res, next) => {
  try {
    const { userId } = res.user;
    const { newPwd, checkedPwd } = req.body;

    if (!newPwd || !checkedPwd) {
      return res
        .status(400)
        .json({ errorMessage: "필수사항을 모두 작성해주세요!!" });
    }

    if (!userId) {
      return res
        .status(400)
        .json({ errorMessage: "유저가 존재하지 않습니다!!" });
    }

    const profile = await prisma.profile.findFirst({
      where: {
        userProfileId: +userProfileId,
      },
    });

    if (!profile) {
      return res.status(400).json({
        errorMessage: "존재하지 않는 프로필 정보입니다. 확인해주세요!!",
      });
    }
    if (newPwd !== checkedPwd) {
      return res.status(400).json({
        errorMessage: "새로운 비밀번호가 일치하지 않습니다. 확인해주세요!! ",
      });
    }

    const hashedPwd = await bcrypt.hash(newPwd, 10);

    await prisma.profile.update({
      where: {
        userProfileId: +userProfileId,
      },
      data: {
        password: hashedPwd,
        profileimage: req.file.Location, // 이미지 URL 저장
      },
    });

    return res
      .status(200)
      .json({ message: "프로필 수정이 성공적으로 완료되었습니다. (^O^)" });
  } catch (err) {
    next(err);
  }
});




export default router;