import express from "express";
import { prisma } from "../prisma/index.js"; // 프리즈마 클라이언트 소환
import bcrypt from "bcrypt"; // 비크립트 소환

const router = express.Router();

// 회원가입 api
router.post("/sign-up", async (req, res, next) => {
    // 회원가입시 "이런걸 적어라" 하고 body에 담아 서버에게 요청
    const {
      email,
      password,
      name,
      nickname,
      birth,
      profileImage,
      height,
      weight,

    } = req.body;

    // 동일한 e메일 사용자 있는지 확인
    const isExistUser = await prisma.users.findFirst({  // 프리즈마 클라이언트로 users 테이블에서 찾아내고 변수에 저장
      where: { email },
    });

    if (isExistUser) {      // 동일한 이메일로 가입한 사용자가 있을 경우
      return res.status(409).json({ message: "이미 존재하는 이메일 입니다." });
    }
    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, 10); // 비크립트를 통해 다져서 못알아보게 한다.(.hash) 뭐를? 비밀번호를(password,) 몇번? 10번.(10)
    // 사용자 생성(저장)
    const user = await prisma.users.create({    // users 모델에서 생성(저장)
      data: {
        email,
        password: hashedPassword,
      }, // email과 password를 이용해서 생성, 비밀번호는 hashedPassword(암호화된 비밀번호 형태)로 저장
    });
    // 사용자 정보 생성(저장)
    const profile = await prisma.profile.create({
      data: {
        userId: user.userId, // userId : 생성된 사용자(user)의 userId값 그대로 복사
        name,
        weight,
        height,
        birth,
        address,
        nickname,
        introduction,
        profileImage,   // profile 모델에 있던 정보들
      },
    });
    return res.status(201).json({
      message: "회원가입이 완료되었습니다.",
      profile,
    });
  }
);

export default router;
