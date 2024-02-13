import express from "express";
import { prisma } from "../../../prisma/index.js";
// import UsersRouter from "./routes/users.router.js";
// import PostsRouter from "./routes/.posts.router.js";
// import CommentsRouter from "./routes/.comments.router.js";

import authMiddleware from "../../../middlewares/auth.middleware.js";

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

router.get("/favorites", authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;

  const orderKey = req.query.orderKey ?? "postId";
  const orderValue = req.query.orderValue ?? "desc";

  // const cnt = await prisma.favorites.findFirst({
  //   where: { favoriteId },
  // });

  const show = await prisma.posts.findFirst({
    where: { userId: userId },
    select: {
      userId: true,
      postId: true,
      title: true,
      content: true,
      contentImage: true,
      url: true,
      status: true,
      favorites: {
        select: {
          fav_cnt: true,
        },
        createdAt: true,
        updatedAt: true,
      },
    },
    orderBy: [
      {
        [orderKey]: orderValue.toLowerCase(),
      },
    ],
  });

  return res.status(200).json({ data: show });
});

router.put("/favorites", authMiddleware, async (req, res) => {
  // const userId = res.locals.user.userId;
  const { userId, postId } = req.body;
  const existsFav = await prisma.favorites.findUnique({
    where: { userId, postId: postId },
  });

  try {
    if (!existsFav) {
      await prisma.favorites.update({
        userId: userId,
        postId: postId,
      });

      await prisma.posts.increment({ fav_cnt: 1 }, { where: { postId } });
      return res.status(200).send("좋아요 ♥");
    } else {
      favorites.destroy({
        where: { postId: postId },
      });

      await prisma.posts.decrement({ fav_cnt: 1 }, { where: { postId } });
      return res.status(200).send("좋아요 취소!");
    }
  } catch (error) {
    res.status(400).send({
      errorMessage: "게시글 좋아요에 실패하였습니다. 다시 시도해주세요!!",
    });
  }
});

export default router;
