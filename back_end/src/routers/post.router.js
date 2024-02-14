import express from 'express'
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';
import { uploadContentImage } from '../middlewares/s3.js'

import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 게시물 등록
router.post('/post', authMiddleware, uploadContentImage ,async (req, res, next) => {
    try{
    const { title, content } = req.body;
    const { userId } = req.user;
        if(!title || !content){
            return res.status(400).json({message: '모든 필드를 입력해주세요'})
        }
        const imageUrls = req.files.map(file => file.Location);
            const post = await prisma.posts.create({
                data: {
                    userId: +userId,
                    title: title,
                    content: content,
                    contentImages: {
                        create: imageUrls.map(imageUrl => ({ imageUrl })),
                        // 각 이미지 URL로 새 이미지를 생성
                    },
                }
            });

            res.redirect('mainpage');
    }catch(err){
        console.error(err);
        next(err);
    }
});

// 전체 게시물 조회
router.get('/post', async (req, res, next) => {
    const { orderKey = 'createdAt', orderValue = 'DESC' } = req.query;
    const normalizedOrderValue = (orderValue && orderValue.toUpperCase() === 'ASC') ? 'asc' : 'desc';

    let orderByCondition = {};
    orderByCondition[orderKey] = normalizedOrderValue;

    try{
        const post = await prisma.posts.findMany({
            select: {
                postId: true,
                userId: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                contentImages: {
                    select: {
                        imageUrl: true,
                    }
                }
            },
            orderBy: orderByCondition,
    });

    return res.status(200).json({ data: post });
}catch(error){
    next(error);
}
});
// 특정 게시물 수정 페이지 get만 받을 수 이성서 만들어야됨
router.get('/post/:postId/edit', authMiddleware, async (req, res, next) => {
    try {
        const postId = req.params.postId;

        const post = await prisma.posts.findFirst({
            where: { postId: +postId },
        });

        if (!post) {
            return res.status(404).send('해당 게시물을 찾을 수 없습니다.');
        }
        const message = req.flash('message');
        res.render('postedit', { post, message });
    } catch (err) {
        next(err);
    }
});






// 특정 게시물 조회
router.get('/post/:postId', async (req, res, next) => {
    const { postId } = req.params;

    const post = await prisma.posts.findFirst({
        where: { postId: +postId },
        select: {
            postId: true,
            title: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            contentImages: {
                select: {
                    imageUrl: true,
                }
            },
            user: {
                select: {
                    userId: true,
                    profile: {
                        select: {
                            nickname: true,
                        }
                    }
                }
            }
        }
    });

    // 페이지 렌더링
    res.render('onepostpage', { post });
});


// 특정 게시물 수정
router.put('/post/:postId/edit', authMiddleware, uploadContentImage, async (req, res, next) => {
    try {
        const postId = req.params.postId;
        const { title, content } = req.body;

        // 필수 항목 체크
        if (!title || !content) {
            req.flash('message', '필수 입력칸을 전부 입력해주세요.');
            return res.redirect('/post/' + postId + '/edit');
        }

        const updatedData = {
            title,
            content,
        };

        if (req.file) { // 사용자가 이미지를 업로드했을 경우
            updatedData.contentImage = req.file.location;
        }

        await prisma.posts.update({
            data: updatedData,
            where: { postId: +postId },
        });

        req.flash('message', '게시물이 수정되었습니다!');
        res.redirect('/post/' + postId);
    } catch(err) {
        next(err)
    }
});


// 특정 게시물 삭제
router.delete('/post/:postId', authMiddleware, async (req, res, next) => {
    const { userId } = req.user;
    const { postId } = req.params;

     // 게시물 찾기
     const post = await prisma.posts.findFirst({
        where: { postId: +postId }
    });

    if(!post){
        return res.status(404).json({ mesage: "이력서 조회에 실패하였습니다." });
    }

    if(post.userId !== userId){
        return res.status(403).json({ message: "본인이 작성한 이력서만 수정할 수 있습니다."});
    }

    await prisma.posts.delete({
        where: { postId: +postId }
    })

    return res.status(200).json({ message: "이력서가 삭제되었습니다. "});
})

export default router;