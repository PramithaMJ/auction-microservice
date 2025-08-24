import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import multerS3 from 'multer-s3';

// Validate AWS credentials
const getAWSCredentials = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId) {
    throw new Error('AWS_ACCESS_KEY_ID environment variable is required');
  }
  if (!secretAccessKey) {
    throw new Error('AWS_SECRET_ACCESS_KEY environment variable is required');
  }
  return { accessKeyId, secretAccessKey };
};

// Configure AWS SDK v3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: getAWSCredentials(),
});

// Get bucket name with validation
const getBucketName = (): string => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is required');
  }
  return bucketName;
};

// Configure multer for S3 upload with AWS SDK v3
const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: getBucketName(),
    // Explicitly set metadata and ensure no ACL is set
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `listings/${uniqueSuffix}-${file.originalname}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
  }),
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Function to generate different sized image URLs for S3
const generateImageUrls = async (
  key: string,
  bucketName: string
): Promise<{
  original: string;
  small: string;
  large: string;
}> => {
  try {
    // Generate pre-signed URL that expires in 24 hours
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 86400,
    });

    // For simplicity, we'll use the same signed URL for different sizes
    // In a production environment, you might want to use AWS Lambda or CloudFront
    // with image transformation capabilities
    return {
      original: signedUrl,
      small: signedUrl, // 225x225 equivalent
      large: signedUrl, // 1280x1280 equivalent
    };
  } catch (error) {
    console.error('Error generating signed URLs:', error);
    // Fallback to direct URLs
    const baseUrl = `https://${bucketName}.s3.${
      process.env.AWS_REGION || 'us-east-1'
    }.amazonaws.com/${key}`;

    return {
      original: baseUrl,
      small: baseUrl,
      large: baseUrl,
    };
  }
};

export { generateImageUrls, s3Client, uploadToS3 };
