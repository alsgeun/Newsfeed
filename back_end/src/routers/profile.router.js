import express from "express";
import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from '../utils/prisma/index.js';
import { Prisma } from '@prisma/client';
import { S3Client } from '@aws-sdk/client-s3'
import "dotenv/config";
import { upload } from '../middlewares/s3.js'


// // 회원가입 api
// router.post("/profile-sign-up", upload, async (req, res, next) => {
//   // 회원가입시 "이런걸 적어라" 하고 body에 담아 서버에게 요청
//   const {
//     email,
//     password,
//     name,
//     nickname,
//     birth,
//     profileImage,
//     height,
//     weight,

//   } = req.body;

//   // 동일한 e메일 사용자 있는지 확인
//   const isExistUser = await prisma.users.findFirst({  // 프리즈마 클라이언트로 users 테이블에서 찾아내고 변수에 저장
//     where: { email },
//   });


//   if (isExistUser) {      // 동일한 이메일로 가입한 사용자가 있을 경우
//     return res.status(409).json({ message: "이미 존재하는 이메일 입니다." });
//   }
//   // 비밀번호 암호화
//   const hashedPassword = await bcrypt.hash(password, 10); // 비크립트를 통해 다져서 못알아보게 한다.(.hash) 뭐를? 비밀번호를(password,) 몇번? 10번.(10)
//   // 사용자 생성(저장)
//   const user = await prisma.users.create({    // users 모델에서 생성(저장)
//     data: {
//       email,
//       password: hashedPassword,
//     }, // email과 password를 이용해서 생성, 비밀번호는 hashedPassword(암호화된 비밀번호 형태)로 저장
//   });


  
//   // 사용자 정보 생성(저장)
//   const profile = await prisma.profile.create({
//     data: {
//       userId: user.userId, // userId : 생성된 사용자(user)의 userId값 그대로 복사
//       name,
//       weight,
//       height,
//       birth,
//       address,
//       nickname,
//       introduction,
//       profileImage: req.file.location,   // profile 모델에 있던 정보들
//     },
//   });

//   return res.status(201).json({
//     message: "회원가입이 완료되었습니다.",
//     profile,
//   });
// }
// );

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

router.put("/profile", authMiddleware, async (req, res, next) => {
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