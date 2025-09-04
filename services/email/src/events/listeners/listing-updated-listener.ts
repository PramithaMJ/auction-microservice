import { 
  Listener, 
  ListingUpdatedEvent,
  ListingStatus,
  Subjects 
} from '@jjmauction/common';
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

interface UserData {
  id: string;
  name: string;
  email: string;
}

interface ListingData {
  id: string;
  title: string;
  slug: string;
  currentPrice: number;
  user: UserData;
}

export class ListingUpdatedListener extends Listener<ListingUpdatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.ListingUpdated = Subjects.ListingUpdated;

  private async sendAuctionWinnerEmail(listing: ListingData, winner: UserData) {
    const emailContent = `
      Congratulations ${winner.name}!

       You won the auction! 

       Listing: ${listing.title}
       Winning Bid: $${(listing.currentPrice / 100).toFixed(2)}

      Your payment is now required to complete the purchase. Please visit your dashboard to complete the payment process.

      👉 Visit your bids dashboard: http://${process.env.FRONTEND_URL}:3000/dashboard/bids

      You have 48 hours to complete payment. After this time, the auction may be offered to the next highest bidder.

      Thank you for participating!

      Best regards,
      The AuctionHub Team
    `;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: winner.email,
      subject: ` Congratulations! You won "${listing.title}"`,
      text: emailContent,
    });

    console.log(`[EMAIL] Winner notification sent successfully to ${winner.email}`);
  }

  private async sendSellerNotificationEmail(listing: ListingData, winner: UserData) {
    // Get the frontend URL with proper fallback
    const frontendUrl = process.env.FRONTEND_URL || process.env.FRONTEND_HOST || 'http://localhost:3000';
    const dashboardUrl = frontendUrl.includes('://') ? `${frontendUrl}/dashboard/sold` : `http://${frontendUrl}/dashboard/sold`;

    const emailContent = `
      Hello ${listing.user.name},

      Great news! Your auction has ended with a winner! 

       Listing: ${listing.title}
       Final Price: $${(listing.currentPrice / 100).toFixed(2)}
      🏆 Winner: ${winner.name}

      The winner has been notified and has 48 hours to complete payment. You'll receive another notification once payment is completed.

      You can monitor the status in your dashboard: ${dashboardUrl}

      Happy selling!

      Best regards,
      The AuctionHub Team
    `;

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: listing.user.email,
      subject: ` Your auction "${listing.title}" has a winner!`,
      text: emailContent,
    });

    console.log(`[EMAIL] Seller notification sent successfully to ${listing.user.email}`);
  }

  async onMessage(data: ListingUpdatedEvent['data'], msg: Message) {
    const { id, status, currentWinnerId } = data;

    try {
      // Only process when auction moves to AwaitingPayment (has a winner)
      if (status !== ListingStatus.AwaitingPayment || !currentWinnerId) {
        return msg.ack();
      }

      console.log(`[EMAIL] Processing auction winner notification for listing ${id}`);

      // Get listing information (including seller details)
      const listingsServiceUrl = process.env.LISTINGS_SERVICE_URL || 'http://listings:3103';
      const listingResponse = await axios.get(`${listingsServiceUrl}/internal/api/listings/${id}`);
      const listing: ListingData = listingResponse.data;

      if (!listing) {
        console.log(`[EMAIL] Listing ${id} not found, skipping winner email`);
        return msg.ack();
      }

      // Get winner information
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth:3101';
      const winnerResponse = await axios.get(`${authServiceUrl}/internal/api/users/${currentWinnerId}`);
      const winner: UserData = winnerResponse.data;

      if (!winner) {
        console.log(`[EMAIL] Winner ${currentWinnerId} not found, skipping winner email`);
        return msg.ack();
      }

      // Send winner notification email
      await this.sendAuctionWinnerEmail(listing, winner);

      // Send seller notification email
      if (listing.user && listing.user.email) {
        await this.sendSellerNotificationEmail(listing, winner);
      }

      console.log(`[EMAIL] Auction winner notifications sent successfully for listing ${id}`);
      msg.ack();
    } catch (error) {
      console.error(`[EMAIL] Failed to send auction winner notification:`, error);
      
      // Ack the message to prevent infinite retries for now
      msg.ack();
    }
  }
}
