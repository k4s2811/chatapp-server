import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import logger from '../config/logger.js';

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!config.email.host || !config.email.user || !config.email.password) {
      logger.warn('Email configuration missing. Email functionality will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password
      }
    });
  }

  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      logger.warn(`Email not sent (no transporter configured): ${subject} to ${to}`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        text,
        html
      });

      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }

  async sendVerificationEmail(email, token) {
    const verificationUrl = `${config.app.frontendUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Verify Your Email Address</h2>
          <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" class="button">Verify Email</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <div class="footer">
            <p>If you didn't create an account, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Verify Your Email Address

      Thank you for registering! Please verify your email address by visiting this link:
      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't create an account, please ignore this email.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text
    });
  }

  async sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.app.frontendUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>Or copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <div class="footer">
            <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request

      We received a request to reset your password. Visit this link to reset it:
      ${resetUrl}

      This link will expire in 1 hour.

      If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
      text
    });
  }

  async sendWelcomeEmail(email, firstName) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Welcome${firstName ? `, ${firstName}` : ''}!</h2>
          <p>Your email has been verified successfully. You can now enjoy full access to your account.</p>
          <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          <div class="footer">
            <p>Thank you for joining us!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome${firstName ? `, ${firstName}` : ''}!

      Your email has been verified successfully. You can now enjoy full access to your account.

      If you have any questions or need assistance, feel free to reach out to our support team.

      Thank you for joining us!
    `;

    return this.sendEmail({
      to: email,
      subject: 'Welcome! Your Email is Verified',
      html,
      text
    });
  }
}

export const emailService = new EmailService();
export default emailService;
