import express from "express";
import { prisma } from "../prisma/index.js";
// import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";

// 게시물 전체 조회
const router = express.Router();

router.get("/posts", async (req, res, next) => {
  try {
    //const { orderKey, orderValue } = req.query;

    const orderKey = req.query.orderKey ?? "postId";
    const orderValue = req.query.orderValue ?? "desc";

    if (!["postId", "status"].includes(orderKey)) {
      return res.status(400).json({
        errorMessage: "Order Key가 올바르지 않습니다. 확인해주세요!!",
      });
    }

    if (!["asc", "desc"].includes(orderValue.toLowerCase())) {
      return res.status(400).json({
        errorMessage: "Order Value가 올바르지 않습니다. 확인해주세요!!",
      });
    }

    const posts = await prisma.posts.findMany({
      select: {
        postId: true,
        title: true,
        content: true,
        // contentImage: true,
        // status: true,
        fav_cnt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        {
          [orderKey]: orderValue.toLowerCase(),
        },
      ],
    });

    return res.status(200).json({ data: posts });
  } catch (err) {
    next(err);
  }
});

// 게시물 상세 조회
router.get("/posts/:postId", async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res
        .status(400)
        .json({ errorMessage: "이력서 Id는 필수 값 입니다. 확인해주세요!!" });
    }

    const post = await prisma.posts.findFirst({
      where: {
        postId: +postId,
      },
      select: {
        postId: true,
        title: true,
        content: true,
        contentImage: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!post) {
      return res.json({ data: {} });
    }
    return res.status(200).json({ data: post });
  } catch (err) {
    next(err);
  }
});

/// 게시글 생성(create) API
router.post("/posts", authMiddleware, async (req, res, next) => {
  try {
    const user = res.locals.user;
    const { title, content, contentImage, status } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ errorMessage: "필수사항을 모두 작성해주세요!!" });
    }

    await prisma.posts.create({
      data: {
        title: title,
        content: content,
        contentImage: contentImage,
        status: status,
        userId: user.userId,
      },
    });
    return res.status(200).json({ message: "게시물 생성 완료(^o^) " });
  } catch (err) {
    next(err);
  }
});

// 게시물 삭제
router.delete("/posts/:postId", authMiddleware, async (req, res, next) => {
  const user = res.locals.user;
  const { postId } = req.params;

  const post = await prisma.posts.findUnique({
    where: {
      postId: +postId,
    },
  });

  if (!post) {
    return res
      .status(400)
      .json({ errorMessage: "존재하지 않는 게시글 입니다. 확인해주세요!!" });
  }
  if (post.userId !== user.userId) {
    return res
      .status(401)
      .json({ message: "올바르지 않은 접근입니다. 확인해주세요!!" });
  }
  await prisma.posts.delete({ where: { postId: +postId } });

  return res.status(201).json({ message: "게시글이 삭제되었습니다. (^o^)" });
});

export default router;
