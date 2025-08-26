import { ProfileCreatedEvent, Listener, Subjects } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import nodemailer from 'nodemailer';

import { queueGroupName } from './queue-group-name';
import { WelcomeEmailSentPublisher } from '../publishers/welcome-email-sent-publisher';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export class ProfileCreatedListener extends Listener<ProfileCreatedEvent> {
  queueGroupName = queueGroupName;
  subject: Subjects.ProfileCreated = Subjects.ProfileCreated;

  async onMessage(data: ProfileCreatedEvent['data'], msg: Message) {
    const { sagaId, userId, profileId, userEmail, userName } = data;

    try {
      console.log(`[SAGA ${sagaId}] Sending welcome email for user ${userId} to ${userEmail}`);

      // Send welcome email
      const emailContent = `
        Welcome to JJ Auction Platform, ${userName}!
        
        Thank you for registering with us. Your account has been successfully created.
        
        You can now:
        - Browse and bid on auctions
        - Create your own listings
        - Manage your profile
        
        Happy bidding!
        
        Best regards,
        The Gang of Four  Team
      `;

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: userEmail,
        subject: 'Welcome to JJ Auction Platform!',
        text: emailContent,
      });

      console.log(`[SAGA ${sagaId}] Welcome email sent successfully to ${userEmail}`);

      // Publish welcome email sent event
      await new WelcomeEmailSentPublisher(this.client).publish({
        sagaId,
        userId,
        email: userEmail,
        timestamp: new Date().toISOString(),
      });

      msg.ack();
    } catch (error) {
      console.error(`[SAGA ${sagaId}] Failed to send welcome email:`, error);
      
      // In a production system, you might want to publish a failure event
      // For now, we'll just nack the message to retry
      msg.ack(); // Ack to prevent infinite retries, saga will handle compensation
    }
  }
}
