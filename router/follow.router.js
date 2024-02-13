import express from "express";
import { prisma } from "../prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 팔로잉
router.post("/:userId", authMiddleware, async (req, res, next) => {
  const followUserId = req.params.userId; // 팔로우 하려는 사람의 아이디를 보내라
  const myUserId = req.user.userId; // 인증이 완료된 본인 아이디

  // 에러 메세지 출력
  if (!followUserId)
    // 오타라던지, 여러 이유로 잘못 됐을때
    return res
      .status(400)
      .json({ message: "팔로우 하려는 사람의 아이디가 없습니다." });
  if (myUserId == followUserId)
    return res
      .status(400)
      .json({ message: "자신의 아이디는 입력 하면 안됩니다." });

  // 팔로우 대상 찾기(확인)
  const followUser = await prisma.users.findFirst({
    where: { userId: +followUserId }, // users 테이블에 있는 userId 중에서 팔로우 대상 아이디가 있는지 확인   // userId : 
  });
  if (!followUser)  // 진짜 없을때
    return res
      .status(404)
      .json({ message: "팔로우 하려는 대상이 존재하지 않습니다." });
  //!! 여기서 부턴 다시한번 이해 필요!!
  // 이미 팔로우 한 상태인지 확인
  const isExistFollwer = await prisma.follows.findMany({
    where: {
      followingId: +followUserId,   // 팔로우 하려는 사람의 아이디 : 맞는지 확인
      followerId: +myUserId,        // 나를 팔로우 하는 사람의 아이디 : 내가 맞는지 확인ㄴㅇㄹㄴㅇㅎㄴㅇ
    }, 
  }); // 도대체 왜 아이디를 한번 더 끌고 오는거지?

  if (isExistFollwer.length !== 0)
    return res.status(400).json({ message: "이미 팔로우 중인 사용자 입니다" });

  // 팔로우 데이터 저장
  const followerUser = await prisma.follows.create({
    data: {
      followingId: +followUserId, // 내가 팔로우 하는 사람의 아이디 : +받아내고 검증한 사람의 아이디
      followerId: +myUserId, // 나를 팔로우 하는 사람의 아이디 : +나의 아이디 ...?
    },
  });
  return res.status(201).json({ message: "팔로우 성공", followerUser });
});

// 팔로우를 하려면
// 1. 나와 상대의 계정(정보)이 필요함
// 2. 내가 누군지, 상대가 누군지 식별할수 있는 것(아이디값 이라던지)을 (서버가) 받아와야 함
// 3. 중복되거나 잘못된 사람은 아닌지 체크
// 4. 팔로우 했다는 사실을 저장
// 5. 완료

//언팔로우
router.delete('/:userId', authMiddleware, async(req, res, next) =>{
    const followUserId = req.params.userId // 언팔 하려는 사람의 아이디를 적어라
    const myUserId = req.user.userId // 인증이 완료된 본인 아이디

    if(!followUserId)   // 언팔 하려는 대상이 틀릴때
    return res.status(400).json({ message : "언팔로우 하려는 아이디를 입력 하세요."})

    // 팔로우 중이 맞는지 확인
    const followUser = await prisma.users.findMany({
        where : {
            followingId : +followUserId,    // users 테이블(DB)의 팔로우중인 아이디중에서(followingId) 언팔하려는 사람의 아이디가 있는가
            followerId : +myUserId          // 또 DB에 있는 팔로워 아이디(followerId) 중 로그인한 사용자의 아이디(myUserId)가 있는가
        }
    })
    if (followUser.length == 0)           // 일단 이해하는거 보류
    return res.status(404).json({ message : "팔로우 중인 사용자가 아닙니다."})

    // 팔로우 데이터 삭제
    await prisma.follows.deleteMany({
      where : {
        followingId : +followUserId,
        followerId : +myUserId
      }
    })
    return res.status(201).json ({ message : "팔로우 취소가 완료 되었습니다."})
})

// 팔로우 목록 조회
router.get('/following', authMiddleware, async (req, res, next) => {
  const myUserId = req.user.userId
  const followingUsers = await prisma.users.findMany({
    where : {
      follower : {
        some : {
          followingId : +myUserId,
        }
      }
    },
    select : {
      userId : true,
      email : true
    }
  })
  return res.status(201).json({ followingUsers })
})

// 팔로워 목록 조회
router.get('/follower', authMiddleware, async(req, res, next) => {
  const followUserId = req.user.userId
  const followers = await prisma.users.findMany({
    where : { 
      following : {
        some : {
          followerId : +followUserId
        }
      }
    },
    select : {
      userId : true,
      email : true
    }
  })
  return res.status(201).json ({ followers })
})

// 팔로우 한 사람들의 게시글 조회
// router.get('/following/post', authMiddleware, async (req, res, next) => {
//   const myUserId = req.user.userId
//   let followingUserIdList = await prisma.users.findMany({
//     where : {
//       follower : {
//         some : {
//           followingId : +myUserId
//         }
//       }
//     },
//     select : {
//       userId : true
//     }
//   })
//   if (followingUserIdList.length == 0)
//   return res.status(404).json ({ message : "게시글이 없습니다."})
//   followingUserIdList = followingUserIdList.map((v) => v.userId)
//   const post = await prisma.posts.findMany({
//     where : {
//       userId : {
//         in : followingUserIdList
//       }
//     }
//   })
//   return res.status(200).json ({ post })
// })
export default router;
