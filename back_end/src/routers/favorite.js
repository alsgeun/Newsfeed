import express from "express";
import { prisma } from "../prisma/index.js";
// import UsersRouter from "./routes/users.router.js";
// import PostsRouter from "./routes/.posts.router.js";
// import CommentsRouter from "./routes/.comments.router.js";
import authMiddleware from "../middlewares/auth.middleware.js";
const router = express.Router();
// 좋아요 기능구현
//1. 게시글 및 좋아요 / 좋아요 취소 가능
// **게시글이 생성될때
//cnt를 바디로 받고
// await prisma.favorites.create({
//   data: {
//     postId: posts.postId,
//     fav_cnt:
//   },
// });
// //------------------------------------------------------
// router.post("/favorites", authMiddleware, async (req, res) => {
//   const { userId } = res.locals.user;
//   const { postId } = req.body;
//   const data = await prisma.posts.findFirst({
//     where: { postId },
//   });
//   await prisma.favorites.create({
//     data: {
//           fav_cnt: data.postId
//       },
//     },
//     orderBy: [
//       {
//         [orderKey]: orderValue.toLowerCase(),
//       },
//     ],
//   });
//   return res.status(200).json({ data: show });
// });
//------------------------------------------------------
// 게시글 좋아요
router.post("/post/:postId/favorites", authMiddleware, async (req, res) => {
 
    const { postId } = req.params;
    const { userId } = req.user;
    try {
        const existingLike = await prisma.favorites.findFirst({
            where: {
              postId: +postId,
              userId: userId,
            },
        })
        if (!existingLike) {
            return res
            .status(400)
            . json({ errorMessage: "이미 좋아요 했습니다.!!" });
    }

    // await prisma.favorites.create({
    //     data: {
    //         postId: +postId,
    //         userId: userId,
    //     },
    // });

const favoritesPosts = await prisma.$transaction([
    prisma.favorites.create({
    data: {
            postId: +postId,
            userId: userId,
            },
        }),
        prisma.posts.update({
            where: { postId: +postId },
            data: { fav_cnt: { increment: 1 } },
        }),
  ]);   
  return res.status(201).json({ message: "팔로우 성공", favoritesPosts });
  } catch (err) {
    next(err);
  }
});










//게시글 좋아요 취소
// 댓글 좋아요 취소
// 댓글 좋아요
router.post("/post/:postId", authMiddleware, async (req, res, next) => {
  try {
    const { postId } = req.params;
    // const followingUserId = req.params.userId;
    const post = await prisma.posts.findFirst({
      where: { postId: +postId },
    });

    if (!post)  // 진짜 없을때
    return res
      .status(404)
      .json({ message: "좋아요 하려는 포스트가 없습니다." });

    const favorite = await prisma.posts.update({
      data: {
        userId: user.userId,
        postId: post.postId,
        title: post.title,
        content: post.content,
        contentImage: post.contentImage,
        status: post.status,
      },
    });
    return res.status(200).json({ data: favorite });
  } catch (err) {
    next(err);
  }
});
//좋아요 수정
router.put("/:postId/favorites", authMiddleware, async (req, res) => {
  try {
    const { userId } = res.user;
    const { postId } = req.params;
    // const { fav_cnt } = req.body;
    const post = await prisma.posts.findFirst({
      where: { postId: +postId },
    });
    if (!post) {
      return res
        .status(400)
        .json({ errorMessage: "해당 게시글이 존재하지 않습니다!!" });
    }
    const favorite = await prisma.favorites.findFirst({
      where: { postId: +postId, userId: +userId },
    });
    if (!favorite) {
      await prisma.posts.update({
        where: { postId: +postId },
        data: { fav_cnt: { increment: 1 } },
      });
      await prisma.favorites.create({
        where: { postId: +postId, userId: +userId },
      });
    } else {
      await prisma.posts.update({
        where: { postId: +postId },
        data: { fav_cnt: { decrement: 1 } },
      });
    }
    return res.status(200).json({ message: "좋아요 :하트1:" });
  } catch (error) {
    res.status(400).send({
      errorMessage: "게시글 좋아요에 실패하였습니다. 다시 시도해주세요!!",
    });
  }
});
export default router;