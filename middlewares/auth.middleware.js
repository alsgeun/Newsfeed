// dotenv.config();
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/index.js";

export default async function (req, res, next) {
  try {
    //헤더에서 엑세스 토큰 가져오기
    const authorization = req.headers.authorization;
    if (!authorization)
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    // 엑세스 토큰의 인증방식이 올바른가?
    const [tokenType, tokenValue] = authorization.split(" ");

    if (tokenType !== "Bearer")
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    if (!tokenValue)
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    const token = jwt.verify(tokenValue, "accessToken");

    if (!token.userId)
      throw new Error("인증 정보가 올바르지 않습니다. 확인해주세요!!");

    const user = await prisma.users.findFirst({
      where: { userId: +token.userId },
    });

    if (!user) {
      //res.clearCookie("authorization");
      throw new Error("토큰 사용자가 존재하지 않습니다.");
    }

    // req.locals.user에 사용자 정보를 저장합니다.
    res.locals.user = user;

    next();
  } catch (error) {
    //res.clearCookie("authorization");
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
//     //토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
//     switch (error.name) {
//       case "TokenExpiredError":
//         return res.status(401).json({ message: "토큰이 만료되었습니다." });
//       case "JsonWebTokenError":
//         return res.status(401).json({ message: "토큰이 조작되었습니다." });
//       default:
//         return res
//           .status(401)
//           .json({ message: error.message ?? "비정상적인 요청입니다." });
//     }
