import { BadRequestError, requireAuth } from '@jjmauction/common';
import express, { Request, Response } from 'express';

import { ListingCreatedPublisher } from '../events/publishers/listing-created-publisher';
import { Listing, db } from '../models';
import { natsWrapper } from '../nats-wrapper';
import { generateImageUrls, uploadToS3 } from '../utils/s3-config';

// Define S3 file interface
interface S3File extends Express.Multer.File {
  key: string;
  location: string;
  bucket: string;
}

// Extend Request interface to include file property for S3
interface MulterS3Request extends Request {
  file: S3File;
}

const router = express.Router();

router.post(
  '/api/listings',
  (req, res, next) => {
    // Add multer error handling
    uploadToS3.single('image')(req, res, (err) => {
      if (err) {
        console.error('=== MULTER ERROR ===');
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        console.error('Error details:', err);
        return res.status(400).json({
          errors: [
            { message: 'File upload failed: ' + err.message, field: 'image' },
          ],
        });
      }
      next();
    });
  },
  requireAuth,
  async (req: MulterS3Request, res: Response) => {
    try {
      console.log('=== CREATE LISTING REQUEST ===');
      console.log('Request body:', req.body);
      console.log('Request body keys:', Object.keys(req.body || {}));
      console.log('Request body values:', Object.values(req.body || {}));
      console.log('Request file:', req.file);
      console.log('Request headers:', req.headers);
      console.log('Content-Type:', req.get('Content-Type'));
      console.log('User:', req.currentUser);

      // Manual validation after multer processes the form data
      const errors = [];

      // Validate price
      const price = parseInt(req.body.price);
      console.log(
        'Price validation - value:',
        req.body.price,
        'parsed:',
        price
      );
      if (isNaN(price) || price <= 0) {
        errors.push({
          message: 'Price must be a positive number',
          field: 'price',
        });
      } else if (price > 999999999) {
        errors.push({
          message: 'Price cannot exceed $999,999,999',
          field: 'price',
        });
      }

      // Validate title
      const title = req.body.title?.trim();
      console.log(
        'Title validation - value:',
        req.body.title,
        'trimmed:',
        title,
        'length:',
        title?.length
      );
      if (!title) {
        errors.push({ message: 'Title is required', field: 'title' });
      } else if (title.length < 5 || title.length > 1000) {
        errors.push({
          message: 'The listing title must be between 5 and 1000 characters',
          field: 'title',
        });
      }

      // Validate description
      const description = req.body.description?.trim();
      console.log(
        'Description validation - value:',
        req.body.description,
        'trimmed:',
        description,
        'length:',
        description?.length
      );
      if (!description) {
        errors.push({
          message: 'Description is required',
          field: 'description',
        });
      } else if (description.length < 5 || description.length > 500) {
        errors.push({
          message:
            'The listing description must be between 5 and 500 characters',
          field: 'description',
        });
      }

      // Validate expiresAt
      const expiresAt = req.body.expiresAt;
      console.log(
        'Date validation - value:',
        expiresAt,
        'type:',
        typeof expiresAt
      );
      if (!expiresAt) {
        errors.push({
          message: 'Expiration date is required',
          field: 'expiresAt',
        });
      } else {
        const enteredDate = new Date(expiresAt);
        console.log(
          'Parsed date:',
          enteredDate,
          'valid:',
          !isNaN(enteredDate.getTime())
        );
        if (isNaN(enteredDate.getTime())) {
          errors.push({ message: 'Invalid Date', field: 'expiresAt' });
        } else {
          const tomorrowsDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
          console.log(
            'Tomorrow date:',
            tomorrowsDate,
            'entered > tomorrow:',
            enteredDate > tomorrowsDate
          );
          if (enteredDate <= tomorrowsDate) {
            errors.push({
              message: 'Auctions must last at least 24 hours',
              field: 'expiresAt',
            });
          }
        }
      }

      // Check for file upload
      console.log('Image validation - file:', !!req.file);
      if (!req.file) {
        errors.push({ message: 'Image file is required', field: 'image' });
      }

      console.log('Validation errors:', errors);

      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      console.log('=== CREATING LISTING ===');

      await db.transaction(async (transaction) => {
        // Get S3 file information from multer-s3
        const uploadedFile = req.file;
        if (!uploadedFile) {
          throw new BadRequestError('Image file is required');
        }

        // Generate image URLs from S3 location
        const bucketName = process.env.AWS_S3_BUCKET_NAME;
        if (!bucketName) {
          throw new BadRequestError('S3 bucket not configured');
        }
        console.log('Generating image URLs for key:', uploadedFile.key);
        const imageUrls = await generateImageUrls(uploadedFile.key, bucketName);
        console.log('Generated image URLs:', imageUrls);

        console.log('Creating listing with data:', {
          userId: req.currentUser.id,
          startPrice: price,
          currentPrice: price,
          title,
          description,
          expiresAt,
          imageId: uploadedFile.key,
          smallImage: imageUrls.small,
          largeImage: imageUrls.large,
        });

        const listing = await Listing.create(
          {
            userId: req.currentUser.id,
            startPrice: price,
            currentPrice: price,
            title,
            description,
            expiresAt,
            imageId: uploadedFile.key,
            smallImage: imageUrls.small,
            largeImage: imageUrls.large,
          },
          { transaction }
        );

        console.log('Listing created successfully:', listing.toJSON());

        console.log('Publishing listing created event...');
        await new ListingCreatedPublisher(natsWrapper.client).publish({
          id: listing.id,
          userId: req.currentUser.id,
          slug: listing.slug,
          title,
          price,
          expiresAt,
          version: listing.version,
        });

        console.log('Event published successfully');
        res.status(201).send(listing);
      });
    } catch (error) {
      console.error('=== CREATE LISTING ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
      res.status(500).json({
        errors: [{ message: 'Something went wrong' }],
      });
    }
  }
);

export { router as createListingRouter };
