import { BidCreatedEvent, Listener, Subjects } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import nodemailer from 'nodemailer';
import axios from 'axios';

import { queueGroupName } from './queue-group-name';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

interface ListingData {
  id: string;
  title: string;
  currentPrice: number;
  user: {
    id: string;
    name: string;
    email?: string;
  };
}

interface UserData {
  id: string;
  name: string;
  email: string;
}

export class BidCreatedListener extends Listener<BidCreatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.BidCreated = Subjects.BidCreated;

  private async sendBidNotificationEmail(listing: ListingData, bidder: UserData, bidAmount: number) {
    // Get seller email from user service
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth:3101';
    let sellerEmail: string;
    
    try {
      const sellerResponse = await axios.get(`${authServiceUrl}/internal/api/users/${listing.user.id}`);
      sellerEmail = sellerResponse.data.email;
    } catch (error) {
      console.log(`[EMAIL] Could not fetch seller email for ${listing.user.id}, skipping email`);
      return;
    }

    if (!sellerEmail) {
      console.log(`[EMAIL] No email address found for seller ${listing.user.id}`);
      return;
    }

    const emailContent = `
      Hello ${listing.user.name},

      Great news! Someone just placed a bid on your auction listing.

      📦 Listing: ${listing.title}
      💰 New Bid Amount: $${(bidAmount / 100).toFixed(2)}
      👤 Bidder: ${bidder.name}
      💳 Current Price: $${(listing.currentPrice / 100).toFixed(2)}

      Your auction is getting attention! You can view all bids and manage your listing by visiting your dashboard.

      Happy selling!

      Best regards,
      The JJ Auction Team
    `;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: sellerEmail,
      subject: `🔔 New Bid on "${listing.title}"`,
      text: emailContent,
    });

    console.log(`[EMAIL] Bid notification sent successfully to ${sellerEmail}`);
  }

  async onMessage(data: BidCreatedEvent['data'], msg: Message) {
    const { listingId, userId, amount } = data;

    try {
      console.log(`[EMAIL] Processing bid notification for listing ${listingId} by user ${userId}`);

      // Get listing information (including seller details)
      const listingsServiceUrl = process.env.LISTINGS_SERVICE_URL || 'http://listings:3103';
      const listingResponse = await axios.get(`${listingsServiceUrl}/internal/api/listings/${listingId}`);
      const listing: ListingData = listingResponse.data;

      // Check if listing exists and has valid user data
      if (!listing) {
        console.log(`[EMAIL] Listing ${listingId} not found, skipping email`);
        return msg.ack();
      }

      if (!listing.user || !listing.user.id) {
        console.log(`[EMAIL] Invalid user data for listing ${listingId}, skipping email`);
        return msg.ack();
      }

      // Only send email if the bidder is not the seller
      if (listing.user.id === userId) {
        console.log(`[EMAIL] Skipping notification - user is bidding on their own listing`);
        return msg.ack();
      }

      // Get bidder information
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth:3101';
      let bidderResponse;
      try {
        bidderResponse = await axios.get(`${authServiceUrl}/api/users/${userId}`);
      } catch (error) {
        console.log(`[EMAIL] Could not fetch bidder info for ${userId}, using fallback`);
        bidderResponse = { data: { name: 'Anonymous Bidder', email: 'unknown@email.com' } };
      }
      const bidder: UserData = bidderResponse.data;

      // Send notification email to listing owner
      if (listing.user && listing.user.id !== userId) {
        // Don't send email if the bidder is the listing owner
        await this.sendBidNotificationEmail(listing, bidder, amount);
        console.log(' [BidCreatedListener] Email notification sent successfully');
      } else {
        console.log('⏭️ [BidCreatedListener] Skipping email - bidder is listing owner');
      }

      console.log(`[EMAIL] Bid notification sent successfully to ${listing.user.name}`);
      msg.ack();
    } catch (error) {
      console.error(`[EMAIL] Failed to send bid notification:`, error);
      
      // Ack the message to prevent infinite retries for now
      // In production, you might want to implement retry logic or dead letter queues
      msg.ack();
    }
  }
}
