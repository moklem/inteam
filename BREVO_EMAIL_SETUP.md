# Brevo Email Service Setup Guide

## Overview
This guide explains how to set up Brevo (formerly Sendinblue) email service for the Volleyball Team Manager app to send password reset emails.

## Why Brevo?
- **Free Plan**: 300 emails/day (9,000/month)
- **Production Ready**: High deliverability rates
- **Transactional Emails**: Perfect for password resets
- **Easy Integration**: Works seamlessly with Nodemailer

## Setup Steps

### 1. Create Brevo Account
1. Go to [Brevo.com](https://www.brevo.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get SMTP Credentials
1. Log into your Brevo account
2. Go to **Settings** → **SMTP & API**
3. Click on **SMTP** tab
4. Note down your SMTP settings:
   - **Host**: `smtp-relay.brevo.com`
   - **Port**: `587`
   - **Username**: Your Brevo account email
   - **Password**: Your SMTP key (not your account password!)

### 3. Environment Variables Configuration

Add these environment variables to your production server (Render.com):

```env
# Brevo Email Configuration (RECOMMENDED)
BREVO_EMAIL=your-brevo-account-email@example.com
BREVO_API_KEY=your-brevo-smtp-key-here

# Optional: Email From Address
EMAIL_FROM=Volleyball Team Manager <noreply@your-domain.com>

# Frontend URL for password reset links
FRONTEND_URL=https://inteam-test.onrender.com
```

### 4. Render.com Deployment
1. Go to your Render.com dashboard
2. Navigate to your backend service
3. Go to **Environment** tab
4. Add the environment variables listed above
5. Deploy the service

## Testing the Configuration

### Local Testing
1. Create a `.env` file in the `server` directory
2. Add the Brevo environment variables
3. Start your local server
4. Test the password reset functionality

### Production Testing
1. Deploy to your test server with the new environment variables
2. Try the password reset functionality
3. Check server logs for successful email sending

## Email Settings Priority

The email service checks for configuration in this order:

1. **Brevo** (if `BREVO_EMAIL` and `BREVO_API_KEY` are set) - RECOMMENDED
2. **Generic Email Service** (if `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS` are set)
3. **Custom SMTP** (if `SMTP_HOST`, `SMTP_PORT`, etc. are set)
4. **Test Mode** (fallback - emails are logged but not sent)

## Troubleshooting

### Common Issues

#### "Authentication failed"
- Verify your BREVO_EMAIL matches your account email
- Ensure BREVO_API_KEY is your SMTP key, not your account password
- Check that your Brevo account is verified

#### "Connection timeout"
- Verify the host is `smtp-relay.brevo.com`
- Ensure port is `587`
- Check firewall settings on your server

#### "Daily limit exceeded"
- Brevo free plan allows 300 emails/day
- Check your daily usage in Brevo dashboard
- Consider upgrading if you need more

### Server Logs
The server will log email transporter creation:
```
Creating Brevo email transporter for: your-email@example.com
```

### Testing Connection
Add this to test your connection:
```javascript
const transporter = createTransporter();
transporter.verify(function(error, success) {
  if (error) {
    console.log('Connection error:', error);
  } else {
    console.log('Server is ready to take our messages');
  }
});
```

## Security Notes
- Never commit your BREVO_API_KEY to version control
- Use environment variables for all sensitive data
- The SMTP key is different from your account password
- Regularly rotate your API keys

## Support
- Brevo Documentation: https://developers.brevo.com/docs
- Brevo Support: Available in your account dashboard