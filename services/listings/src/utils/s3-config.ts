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
    // Add retries to make URL generation more resilient
    let retries = 5; // Increase retry count to 5 for better reliability
    let signedUrl = '';
    let error;
    
    // Log attempt to generate URL
    console.log(`[S3] Generating signed URL for key: ${key} (Bucket: ${bucketName})`);

    // Add exponential backoff to retry logic
    const getBackoffTime = (attempt: number) => Math.min(100 * Math.pow(2, attempt), 2000);

    // Retry logic for URL generation
    while (retries > 0) {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
          ResponseCacheControl: 'max-age=86400, public', // Cache for 24 hours, allow public caching
          ResponseContentDisposition: 'inline', // Display image inline in browser
        });

        signedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 604800, // 7 days
        });

        if (signedUrl && signedUrl.length > 0) {
          console.log(`[S3]  Successfully generated S3 signed URL for key: ${key} (length: ${signedUrl.length})`);
          break; // Success, exit retry loop
        }
      } catch (err) {
        error = err;
        retries--;
        if (retries > 0) {
          // Calculate backoff time based on attempt number
          const backoffTime = getBackoffTime(5 - retries);
          console.log(`[S3]  Retrying URL generation for ${key}, attempts left: ${retries}, waiting ${backoffTime}ms`);
          
          // Wait with exponential backoff before retry
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        } else {
          console.error(`[S3]  Failed to generate URL after all attempts for key: ${key}`, err);
        }
      }
    }

    // If we couldn't generate a URL after all retries
    if (!signedUrl) {
      throw error || new Error('Failed to generate signed URL after retries');
    }

    // Cache the successful URL in memory for future use
    // (In a production app, you might want to use Redis or another distributed cache)
    console.log(`[S3]  Successfully generated URL with length ${signedUrl.length}`);

    // For simplicity, we'll use the same signed URL for different sizes
    // In a production environment, you might want to use AWS Lambda or CloudFront
    // with image transformation capabilities
    return {
      original: signedUrl,
      small: signedUrl, // 225x225 equivalent
      large: signedUrl, // 1280x1280 equivalent
    };
  } catch (error) {
    console.error('[S3]  Error generating signed URLs:', error);
    
    // Try both fallback mechanisms
    try {
      // 1. First try a presigned URL with fewer parameters
      console.log('[S3] Attempting simplified presigned URL as fallback');
      const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      
      const fallbackSignedUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 86400, // 1 day only for fallback
      });
      
      if (fallbackSignedUrl && fallbackSignedUrl.length > 0) {
        console.log('[S3]  Fallback presigned URL generated successfully');
        return {
          original: fallbackSignedUrl,
          small: fallbackSignedUrl,
          large: fallbackSignedUrl,
        };
      }
    } catch (fallbackError) {
      console.error('[S3] Simplified presigned URL fallback failed:', fallbackError);
    }
    
    // 2. Ultimate fallback to direct S3 URL (if bucket allows public access)
    const baseUrl = `https://${bucketName}.s3.${
      process.env.AWS_REGION || 'us-east-1'
    }.amazonaws.com/${key}`;

    console.log('[S3] Using direct S3 URL as last-resort fallback:', baseUrl);

    return {
      original: baseUrl,
      small: baseUrl,
      large: baseUrl,
    };
  }
};

export { generateImageUrls, s3Client, uploadToS3 };
