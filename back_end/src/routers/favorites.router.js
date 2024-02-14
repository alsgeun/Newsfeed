import express from "express";
import { prisma } from "../prisma/index.js";
// import UsersRouter from "./routes/users.router.js";
// import PostsRouter from "./routes/.posts.router.js";
// import CommentsRouter from "./routes/.comments.router.js";

import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// 좋아요 기능구현
//1. 게시글 및 댓글 좋아요
//2. 좋아요 취소 가능

// 게시글 좋아요

router.post("/posts/:postId/favorites", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { userId } = res.locals.user;
  try {
    const existingFav = await prisma.posts.findFirst({
      where: {
        postId: +postId,
      },
    });
    const favoritesPosts = await prisma.favorites.findFirst({
      where: {
        postId: +postId,
        userId: +userId,
      },
    });

    if (!existingFav) {
      return res.status(400).json({
        errorMessage: "게시물이 존재하지 않습니다. 확인해주세요!!",
      });
    }

    if (!favoritesPosts) {
      await prisma.favorites.create({
        data: {
          postId: +postId,
          userId: +userId,
        },
      });
      await prisma.posts.update({
        where: { postId: +postId },
        data: { fav_cnt: { increment: 1 } },
      });
    } else {
      return res.status(400).json({
        errorMessage: "이미 좋아요 했습니다. 좋아요는 1번만 가능해요 ㅠㅠ!!",
      });
    }
    return res.status(200).json({
      message: "게시물 좋아요 성공 (^O^)",
    });
  } catch (err) {
    next(err);
  }
});

// 댓글 좋아요
router.post(
  "/comments/:commentId/favorites",
  authMiddleware,
  async (req, res) => {
    const { commentId } = req.params;
    const { userId } = res.locals.user;
    try {
      const existingFav = await prisma.comments.findFirst({
        where: {
          commentId: +commentId,
        },
      });
      const favoritesComments = await prisma.favorites.findFirst({
        where: {
          commentId: +commentId,
          userId: +userId,
        },
      });

      if (!existingFav) {
        return res.status(400).json({
          errorMessage: "댓글이 존재하지 않습니다. 확인해주세요!!",
        });
      }

      if (!favoritesComments) {
        await prisma.favorites.create({
          data: {
            commentId: +commentId,
            userId: +userId,
          },
        });
        await prisma.comments.update({
          where: { commentId: +commentId },
          data: { click: { increment: 1 } },
        });
      } else {
        return res.status(400).json({
          errorMessage: "이미 좋아요 했습니다. 좋아요는 1번만 가능해요 ㅠㅠ!!",
        });
      }
      return res.status(200).json({
        message: "댓글 좋아요 성공 (^O^)",
      });
    } catch (err) {
      next(err);
    }
  }
);

//수정
//게시물 좋아요 수정
router.put("/posts/:postId/favorites", authMiddleware, async (req, res) => {
  const { userId } = res.locals.user;
  const { postId } = req.params;
  // const { fav_cnt } = req.body;
  try {
    const existingFav = await prisma.posts.findFirst({
      where: {
        postId: +postId,
      },
    });

    if (!existingFav) {
      return res
        .status(400)
        .json({ errorMessage: "게시물이 존재하지 않습니다. 확인해주세요!!" });
    }

    const favoritesPosts = await prisma.favorites.findFirst({
      where: {
        postId: +postId,
        userId: +userId,
      },
    });

    if (favoritesPosts) {
      await prisma.posts.update({
        where: { postId: +postId },
        data: { fav_cnt: { decrement: 1 } },
      });
    } else {
      return res.status(400).json({ errorMessage: "좋아요가 없습니다!" });
    }
    return res.status(201).json({ message: "좋아요 취소 (ㅠOㅠ)" });
  } catch (error) {
    next(err);
  }
});

// 댓글 좋아요 수정
router.put(
  "/comments/:commentId/favorites",
  authMiddleware,
  async (req, res) => {
    const { userId } = res.locals.user;
    const { commentId } = req.params;
    // const { fav_cnt } = req.body;
    try {
      const existingFav = await prisma.comments.findFirst({
        where: {
          commentId: +commentId,
        },
      });

      if (!existingFav) {
        return res
          .status(400)
          .json({ errorMessage: "댓글이 존재하지 않습니다. 확인해주세요!!" });
      }

      const favoritesComments = await prisma.favorites.findFirst({
        where: {
          commentId: +commentId,
          userId: +userId,
        },
      });

      if (favoritesComments) {
        await prisma.comments.update({
          where: { commentId: +commentId },
          data: { click: { decrement: 1 } },
        });
      } else {
        return res.status(400).json({ errorMessage: "좋아요가 없습니다!" });
      }
      return res.status(201).json({ message: "좋아요 취소 (ㅠOㅠ)" });
    } catch (error) {
      next(err);
    }
  }
);

export default router;
