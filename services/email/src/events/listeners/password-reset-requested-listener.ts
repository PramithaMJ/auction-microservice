import { Listener, Subjects, PasswordResetRequestedEvent } from '@jjmauction/common';
import { Message } from 'node-nats-streaming';
import * as nodemailer from 'nodemailer';

import { queueGroupName } from './queue-group-name';

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export class PasswordResetRequestedListener extends Listener<PasswordResetRequestedEvent> {
  subject: Subjects.PasswordResetRequested = Subjects.PasswordResetRequested;
  queueGroupName = queueGroupName;

  async onMessage(data: PasswordResetRequestedEvent['data'], msg: Message) {
    const { userId, email, name, token, expires } = data;

    try {
      console.log(`Sending password reset email to ${email}`);

      // Generate reset URL - use frontend URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

      const emailContent = `
        Hello ${name},
        
        You recently requested to reset your password for your AuctionHub account.
        
        Please click the link below to reset your password:
        
        ${resetUrl}
        
        This link will expire in 1 hour.
        
        If you did not request a password reset, please ignore this email or contact support if you have concerns.
        
        Best regards,
        The AuctionHub Team
      `;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
            <h1 style="color: #333;">Reset Your Password</h1>
          </div>
          <div style="padding: 20px;">
            <p>Hello ${name},</p>
            <p>You recently requested to reset your password for your AuctionHub account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #fbbf24; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold;">
                Reset Your Password
              </a>
            </div>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            <p>Best regards,<br>The AuctionHub Team</p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Reset Your AuctionHub Password',
        text: emailContent,
        html: htmlContent,
      });

      console.log(`Password reset email sent successfully to ${email}`);
      msg.ack();
    } catch (error) {
      console.error(`Failed to send password reset email to ${email}:`, error);
      // Don't ack the message so it can be retried
    }
  }
}
