import express from "express"
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/index.js";
import bcrypt from "bcrypt";
const router = express.Router();

router.post('/log-in', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.users.findFirst({ where: { email } });
  if (!user)
    return res.status(401).json({ message: "존재하지 않는 이메일입니다." });
  // 입력받은 사용자의 비밀번호와 데이터베이스에 저장된 비밀번호를 비교합니다.
  else if (!await bcrypt.compare(password, user.password))
    return res.status(401).json({ message: "비밀번호가 일치하지 않습니다." });
  // 로그인에 성공하면, 사용자의 userId를 바탕으로 토큰을 생성합니다.
  const token = jwt.sign(
    {
      userId: user.userId,
    },
    "custom-secret-key"
  );
  res.cookie("authorization", `Bearer ${token}`);
  return res.status(200).json({ message: "로그인 성공" });
});



export default router;