import AWS from 'aws-sdk';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { v4 as uuidv4 } from 'uuid';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Create S3 service object
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

// Configure multer for S3 uploads
export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME!,
    acl: 'private',
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileExtension = file.originalname.split('.').pop();
      const timestamp = Date.now();
      const randomID = Math.floor(Math.random() * 1000000000);
      cb(null, `profiles/${timestamp}-${randomID}-${uuidv4()}.${fileExtension}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

// Generate signed URLs for S3 images
export const generateImageUrls = async (
  imageId: string,
  bucketName: string
): Promise<{ small: string; large: string; original: string }> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: imageId,
      Expires: 604800, // URL expires in 7 days
      ResponseCacheControl: 'max-age=86400', // Cache for 24 hours
    };

    const url = await s3.getSignedUrlPromise('getObject', params);

    return {
      small: url,
      large: url,
      original: url,
    };
  } catch (error) {
    console.error(`Error generating signed URL for ${imageId}:`, error);
    throw error;
  }
};

export { s3 as s3Client };
