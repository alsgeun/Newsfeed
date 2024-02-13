import express from "express";
import { prisma } from "../prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 팔로우 신청 
router.post("/:userId", authMiddleware, async (req, res, next) => {
  const followingUserId = req.params.userId; // 팔로우 하려는 사람의 아이디를 보내라
  const followedUserId  = req.user.userId; // 인증이 완료된 본인 아이디

  // 에러 메세지 출력
  if (!followingUserId)
    // 오타라던지, 여러 이유로 잘못 됐을때
    return res
      .status(400)
      .json({ message: "팔로우 하려는 사람의 아이디가 없습니다." });
  if (followingUserId == followedUserId)
    return res
      .status(400)
      .json({ message: "자신의 아이디는 입력 하면 안됩니다." });

  // 팔로우 대상 찾기(확인)
  const followingUser = await prisma.users.findFirst({
    where: { userId: +followingUserId }, // users 테이블에 있는 userId 중에서 팔로우 대상 아이디가 있는지 확인   // userId : 
  });
  if (!followingUser)  // 진짜 없을때
    return res
      .status(404)
      .json({ message: "팔로우 하려는 대상이 존재하지 않습니다." });
  //!! 여기서 부턴 다시한번 이해 필요!!
  // 이미 팔로우 한 상태인지 확인
  const isExistFollwer = await prisma.follows.findMany({
    where: {
      followingId: +followingUserId,   // 팔로우 하려는 사람의 아이디 : 맞는지 확인
      followerId: +followedUserId,        // 나를 팔로우 하는 사람의 아이디 : 내가 맞는지 확인ㄴㅇㄹㄴㅇㅎㄴㅇ
    }, 
  }); // 도대체 왜 아이디를 한번 더 끌고 오는거지?

  if (isExistFollwer.length !== 0)
    return res.status(400).json({ message: "이미 팔로우 중인 사용자 입니다" });

  // 팔로우 데이터 저장
    const followUser = await prisma.$transaction([
        prisma.follows.create({
        data: {
            followingId: +followingUserId,
            followerId: +followedUserId,
        },
        }),
        prisma.users.update({
            where: { userId: +followedUserId },
            data: { followingCount: { increment: 1 } },
        }),
        prisma.users.update({
            where: { userId: +followingUserId },
            data: { followerCount: { increment: 1 } },
    }),
  ]);   
  return res.status(201).json({ message: "팔로우 성공", followUser });
});

// 팔로우를 하려면
// 1. 나와 상대의 계정(정보)이 필요함
// 2. 내가 누군지, 상대가 누군지 식별할수 있는 것(아이디값 이라던지)을 (서버가) 받아와야 함
// 3. 중복되거나 잘못된 사람은 아닌지 체크
// 4. 팔로우 했다는 사실을 저장
// 5. 완료


//언팔로우


router.delete('/:userId', authMiddleware, async(req, res, next) =>{
    const followingUserId = req.params.userId; // 팔로우 하려는 사람의 아이디를 보내라
    const followedUserId  = req.user.userId// 인증이 완료된 본인 아이디

    if(!followingUserId)   // 언팔 하려는 대상이 틀릴때
    return res.status(400).json({ message : "언팔로우 하려는 아이디를 입력 하세요."})

    // 팔로우 중이 맞는지 확인
    const followUser = await prisma.follows.findMany({
        where : {
            followingId : +followingUserId,    // users 테이블(DB)의 팔로우중인 아이디중에서(followingId) 언팔하려는 사람의 아이디가 있는가
            followerId : +followedUserId          // 또 DB에 있는 팔로워 아이디(followerId) 중 로그인한 사용자의 아이디(myUserId)가 있는가
        }
    })
    if (followUser.length == 0)           // 일단 이해하는거 보류
    return res.status(404).json({ message : "팔로우 중인 사용자가 아닙니다."})

    // 팔로우 데이터 삭제
    const unfollowUser = await prisma.$transaction([
        prisma.follows.delete({
          where: {
            followingId_followerId: {
              followingId: +followingUserId, 
              followerId: +followedUserId,
            },
          },
        }),
        prisma.users.update({
          where: { userId: +followedUserId }, // 내가 팔로우 할려는 id -1
          data: { followingCount: { decrement: 1 } },
        }),
        prisma.users.update({
          where: { userId: +followingUserId }, // 팔로우 당한 사람입장에서 팔로워가 -1
          data: { followerCount: { decrement: 1 } },
        }),
      ]);

      if(unfollowUser) {
        return res.status(200).json({ message: "언팔로우 성공" });
      } else {
        return res.status(500).json({ message: "언팔로우 실패" });
      }
})


// 팔로우 목록 조회


router.get('/following', authMiddleware, async (req, res, next) => {
  const followedUserId = req.user.userId
  //console.log(req.user.userId)
  const followingUsers = await prisma.users.findMany({
    where : {
      follower : {
        some : {
          followingId : +followedUserId
        }
      }
    },
    select : {
      userId : true,
      email : true
    }
  })
  //console.log(followingUsers)
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


//팔로우 한 사람들의 게시글 조회


router.get('/following/post', authMiddleware, async (req, res, next) => {
  const followUserId = req.user.userId
  let followingUserIdList = await prisma.users.findMany({
    where : {
      follower : {
        some : {
          followingId : +followUserId
        }
      }
    },
    select : {
      userId : true
    }
  })
  if (followingUserIdList.length == 0)
  return res.status(404).json ({ message : "게시글이 없습니다."})
  followingUserIdList = followingUserIdList.map((v) => v.userId) // 유저 id 배열로 만듬
  const post = await prisma.posts.findMany({ // 그 배열 인덱스 기준으로 나열해서 보여줌
    where : {
      userId : {
        in : followingUserIdList
      }
    }
  })
  return res.status(200).json ({ post })
})
export default router;