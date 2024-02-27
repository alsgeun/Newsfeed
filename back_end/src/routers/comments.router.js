import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
const router = express.Router();


// 댓글 작성
router.post('/post/:postId/comments', authMiddleware, async (req, res, next) => {
    const { postId } = req.params;
    const { content_cmm } = req.body;
    const { userId } = req.user;

    const post = await prisma.posts.findFirst({
        where: { 
            postId: +postId, 
        },
        });
    if(!post) 
        return res.status(404).json({message: '게시글이 존재하지 않습니다.'})
    
    if(!content_cmm) 
     return res.status(400).json({message: '댓글 내용이 누락되었습니다.'})

    const comment = await prisma.comments.create({
        data: {
            postId: +postId,
            userId: +userId,
            content_cmm: content_cmm,
        }
    })


    return res.status(201).json({message: "댓글이 생성되었습니다."});
});


// 댓글 조회 
router.get('/post/:postId/comments', async (req, res, next) => {
    const { postId } = req.params;

    const post = await prisma.posts.findFirst({
        where: { 
            postId: +postId,
        },
        });
    if(!post) 
        return res.status(404).json({message: '게시글이 존재하지 않습니다.'})
    const comments = await prisma.comments.findMany({
        where: { postId : +postId},
        orderBy: { createdAt: 'desc' },
        include: {
            user: {
                select: {
                    profile: {
                        select: {
                            nickname: true
                        }
                    }
                }
            }
        }
    });
    
    return res.render('comments', { post, comments });
})




// 댓글 수정
router.put('/post/:postId/comments/:commentId', authMiddleware, async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { content } = req.body;
        const { postId, commentId } = req.params;

        const post = await prisma.posts.findFirst({
            where: { 
                postId: +postId, 
            },
            });

        if(!post) 
            return res.status(404).json({message: '게시글이 존재하지 않습니다.'})
        
    const changedcomment = await prisma.comments.update({
      where: { commentId: +commentId },
      data: {
        userId: +userId,
        postId: +postId,
        content,
      },
    });
    return res.status(200).json({ message: "댓글 수정에 성공하였습니다." });
  }catch(err) {
        next(err)
    }})

//댓글 삭제 API
router.post(
    "/post/:postId/comment/:commentId",
    authMiddleware,
    async (req, res, next) => {
        const { postId, commentId } = req.params;
        const { userId } = req.user;
        if (!postId) {
            return res.status(404).json({ message: "게시글이 없습니다." });
        }
        const user = await prisma.comments.findFirst({
        where: {
            userId: +userId,
        },
        });
      
        if (!user) {
            return res
            .status(404)
            .json({ message: "유저 정보가 유효하지 않습니다." });
        }
        const delectedcomment = await prisma.comments.delete({
        where: { commentId: +commentId },
        });
          return res.status(200).json({ message: "댓글 삭제에 성공하였습니다." });
        }
      );


export default router