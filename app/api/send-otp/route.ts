import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * API Route to send OTP emails
 * POST /api/send-otp
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, otp, userName } = body;

        if (!email || !otp) {
            return NextResponse.json(
                { error: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        // Create transporter using environment variables
        // For production, use a real email service like SendGrid, Mailgun, etc.
        // For development/testing, you can use Gmail with app password
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD, // App password for Gmail
            },
        });

        // Email content
        const mailOptions = {
            from: {
                name: 'CampusLink',
                address: process.env.SMTP_EMAIL || 'noreply@campuslink.com',
            },
            to: email,
            subject: 'Your CampusLink Verification Code',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
                    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); padding: 32px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">CampusLink</h1>
                            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Email Verification</p>
                        </div>
                        
                        <!-- Content -->
                        <div style="padding: 32px;">
                            <p style="color: #374151; font-size: 16px; margin: 0 0 8px;">Hello ${userName || 'there'},</p>
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
                                Use the verification code below to complete your registration on CampusLink.
                            </p>
                            
                            <!-- OTP Box -->
                            <div style="background: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                                <p style="color: #64748b; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                                <div style="font-size: 36px; font-weight: 700; color: #0ea5e9; letter-spacing: 8px; font-family: monospace;">
                                    ${otp}
                                </div>
                            </div>
                            
                            <p style="color: #9ca3af; font-size: 13px; margin: 0 0 16px; text-align: center;">
                                This code expires in <strong>10 minutes</strong>
                            </p>
                            
                            <!-- Warning -->
                            <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                                <p style="color: #92400e; font-size: 13px; margin: 0;">
                                    ⚠️ If you didn't request this code, please ignore this email.
                                </p>
                            </div>
                        </div>
                        
                        <!-- Footer -->
                        <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} CampusLink. All rights reserved.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
Your CampusLink Verification Code

Hello ${userName || 'there'},

Use the verification code below to complete your registration on CampusLink.

Your OTP: ${otp}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email.

© ${new Date().getFullYear()} CampusLink
            `,
        };

        // Send email
        await transporter.sendMail(mailOptions);

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully',
        });

    } catch (error) {
        console.error('Error sending OTP email:', error);
        
        // Return more specific error for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return NextResponse.json(
            { 
                error: 'Failed to send OTP email',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
            },
            { status: 500 }
        );
    }
}
