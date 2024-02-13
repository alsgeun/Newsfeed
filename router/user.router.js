import express from "express";
import { prisma } from "../prisma/index.js"; // 프리즈마 클라이언트 소환
import bcrypt from "bcrypt"; // 비크립트 소환
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";

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
      address,
      introduction,
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

// 로그인 api
router.post('/sign-in', async(req, res, next) =>{
  const { email, password } = req.body;   // 이렇게 써서 로그인해라
  
  const user = await prisma.users.findFirst({ where : {email}})   // users테이블에 저장된 email 중 중복여부(회원가입 여부) 확인, findFirst({where :{ }})는 그저 필터역할
  
  // 로그인 정보가 일치하지 않았을 때 메세지 출력
  if (!await bcrypt.compare(password, user.password) || !user)
       return res.status(401).json({ message : "이메일 또는 비밀번호가 일치하지 않습니다."})
  // if(!user)   // 해당 사용자(이메일)이 없을때 == 회원가입이 안된 이메일이라면
  //     return res.status(401).json({ message : "존재하지 않는 이메일 입니다."})
  // if (!await bcrypt.compare(password, user.password)) // bcrypt로 비교한다. 뭐를? (우리가 전달받은 비밀번호(req.body), user라는 변수에 담긴 비밀번호(users.db에 있는 비밀번호)를 그렇게 비교해서 일치하지 않다면?
  //     return res.status(401).json({ message : "일치하지 않는 비밀번호 입니다." })
  

  // jwt 생성
  const accessToken = jwt.sign  //jwt을 만들겠다 선언(sign)
  ({ userId : user.userId }, // 안에 내용물은 userId인데 userId 출처는 바로 위에서 만든 user라는 변수에 담긴 userId를 쓸 것이다.
  process.env.ACCESS_TOKEN_SECRET_KEY,    // 노출되면 안되는 비밀키
  { expiresIn : '12h'}                    // 유효기간 12시간
  )
  
  // 발급한 리프레쉬 토큰 관리 객체
  // const tokenStorages = {}    
  
  // tokenStorages[refreshToken] = {     // 리프레쉬 토큰을 발급 받은 사용자의 정보를 조회하는 것
  //     userId : user.userId,   // 발급한 유저의 유저 아이디
  //     ip : req.ip,    // 요청한 클라이언트의 ip를 따올것
  //     userAgent : req.headers['user-agent'],   // 사용자가 어떠한 방식으로 요청을 보냈는지 브라우저 우클릭-검사-네트워크-header-req.headers 라는 부분의 user-agent 부분에서 가져옴
  // }

  res.cookie('accessToken', `Bearer ${accessToken}`)  // 로그인 성공시 쿠키를 만들어 보낼거고 쿠키의 내용물은 'accessToken'이라는 key(name)와 'Bearer'가 앞에 붙고 뒤에는 직전에 만든 jwt가 들어감
  return res.status(200).json({ message : '로그인에 성공하였습니다.'})
})

// 사용자 정보 조회 api
router.get('/users', authMiddleware, async(req, res, next) => {
  const {userId} = req.user

  const user = await prisma.users.findFirst({
      where : { userId : +userId },   // 우리가 갖고 있는 userId와 전달받은 userId가 일치 하는지 찾아볼거다.
      select : {                      // 조회할 users의 컬럼들 지정
          userId : true,
          email : true,
          createdAt : true,
          updatedAt : true,
          profile : {               // 중첩셀렉문 사용 가능. user와 userinfos 테이블은 관계(1:1)를 맺었기 때문에 불러오기 가능
              select : {
                  name : true,
                  weight : true,
                  height : true,
                  birth : true,
                  address : true,
                  nickname : true,
                  introduction : true,
                  profileImage : true,
              }
          }
      }
  })
  return res.status(200).json({ data : user });
})

export default router;