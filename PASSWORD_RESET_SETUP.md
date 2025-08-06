# Password Reset Email Configuration Guide

## Overview
The password reset functionality has been implemented but requires email configuration to send reset emails. Without proper email configuration, the system will use a test mode that doesn't actually send emails.

## Email Configuration Options

### Option 1: Gmail (Recommended for Production)

1. **Create or use a Gmail account** for sending emails
2. **Enable 2-Factor Authentication** on your Gmail account
3. **Generate an App Password**:
   - Go to https://myaccount.google.com/security
   - Click on "2-Step Verification"
   - Scroll to "App passwords" and generate a new password
   - Select "Mail" and your device
   - Copy the 16-character password

4. **Configure Environment Variables** in Render.com:
   ```
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-character-app-password
   EMAIL_FROM=Volleyball Team Manager <your-email@gmail.com>
   ```

### Option 2: Outlook/Hotmail

1. **Use your Outlook/Hotmail account**
2. **Configure Environment Variables**:
   ```
   EMAIL_SERVICE=outlook
   EMAIL_USER=your-email@outlook.com
   EMAIL_PASS=your-password
   EMAIL_FROM=Volleyball Team Manager <your-email@outlook.com>
   ```

### Option 3: Custom SMTP Server

For custom email servers or services like SendGrid, Mailgun, etc.:

```
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
EMAIL_FROM=Volleyball Team Manager <noreply@your-domain.com>
```

## Setting up on Render.com

1. **Go to your Render Dashboard**
2. **Select your backend service** (inteam)
3. **Navigate to Environment** tab
4. **Add the email configuration variables** from one of the options above
5. **Add FRONTEND_URL** if not already set:
   ```
   FRONTEND_URL=https://inteamfe.onrender.com
   ```
6. **Save and Deploy** - The service will restart with email capabilities

## Testing the Password Reset

1. Go to the login page
2. Click "Passwort vergessen?" (Forgot Password?)
3. Enter a registered email address
4. Check your email for the reset link
5. Click the link to reset your password

## Troubleshooting

### Emails not sending?
- Check environment variables are correctly set in Render
- Verify the email service credentials are correct
- For Gmail, ensure you're using an App Password, not your regular password
- Check Render logs for any error messages

### Reset link not working?
- Ensure FRONTEND_URL is correctly set to your frontend URL
- Verify the token hasn't expired (1 hour expiry)
- Check that MongoDB is accessible and user records are being updated

### Development/Testing
Without email configuration, the system will:
- Still accept password reset requests
- Generate reset tokens
- Log a message saying emails won't be sent
- Allow testing of the flow without actual email delivery

## Security Notes

- Reset tokens expire after 1 hour
- Tokens are hashed before storage in the database
- Each reset request invalidates previous tokens
- The system doesn't reveal if an email exists in the database
- Failed email sends will clear the reset token for security

## Current Implementation Status

✅ Backend password reset endpoints implemented
✅ User model updated with reset token fields
✅ Email service with nodemailer configured
✅ Frontend ForgotPassword component updated
✅ ResetPassword component created
✅ Routes configured in App.js
✅ German language UI maintained
✅ Security best practices followed

## Next Steps

1. **Configure email service** in Render environment variables
2. **Test the complete flow** with a real email account
3. **Monitor logs** for any issues
4. **Consider adding rate limiting** to prevent abuse (future enhancement)
