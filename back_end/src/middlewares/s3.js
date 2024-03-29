import aws from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3'
import "dotenv/config";
import fs from "fs";
import { tmpdir } from "os";
import { Upload } from "@aws-sdk/lib-storage";

const s3 = new S3Client({
  accessKeyId: process.env.ACCESSKEY_ID,
  secretAccessKey: process.env.SECRETACCESSKEY,
  region: 'ap-northeast-2'
});
const multerUpload = multer({
    dest: tmpdir(),
}) 


// 프로필 이미지 업로드 함수
const uploadProfileImage = async (req, res, next) => {
    //업로드 함수를 정의
    return new Promise((resolve, reject) => {
      multerUpload.single("profileImage")(req, res, async (error) => {
        // 멀터.싱글을 요청해서 파일을 가져오고
        if (error) {
          reject(res.status(500).json({ message: error.message }));
        }
        console.log(req.file);
        const fileStream = fs.createReadStream(req.file.path); //파일을 읽는 스트림 생성

        const uploader = new Upload({
          // 파일을 S3에 업로드
          client: s3,
          params: {
            Bucket: process.env.BUCKET_NAME,
            Key: req.file.originalname,
            Body: fileStream,
            ContentType: req.file.mimetype,
          },
        });
  
        try {
          const result = await uploader.done();
          req.file.Location = result.Location; // S3에서 반환한 URL을 객체에 추가
          resolve(next());
        } catch (error) {
          reject(res.status(500).json({ message: error.message }));
        }
      });
    });
  };
  
// 컨텐츠 이미지 업로드 함수
const uploadContentImage = async (req, res, next) => {
  return new Promise((resolve, reject) => {
    multerUpload.array('contentImage', 3)(req, res, async (error) => {
      if (error) {
        return reject(res.status(500).json({ message: error.message }));
      }

      const uploadPromises = req.files.map(async (file) => {
        const fileStream = fs.createReadStream(file.path);
        const uploader = new Upload({
          client: s3,
          params: {
            Bucket: process.env.BUCKET_NAME,
            Key: file.originalname,
            Body: fileStream,
            ContentType: file.mimetype,
          },
        });

        try {
          const result = await uploader.done();
          file.Location = result.Location;
        } catch (error) {
          return reject(res.status(500).json({ message: error.message }));
        }
      });

      Promise.all(uploadPromises)
        .then(() => resolve(next()))
        .catch((error) => reject(res.status(500).json({ message: error.message })));
    });
  });
};


  export { uploadProfileImage,  uploadContentImage };