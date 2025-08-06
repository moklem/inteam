let nodemailer;
try {
  nodemailer = require("nodemailer");
} catch (error) {
  console.error("Failed to load nodemailer:", error);
  throw new Error("Email service is not available. Please ensure nodemailer is installed.");
}

// Create a transporter for sending emails
const createTransporter = () => {
  // Check if we have email configuration in environment variables
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Use configured email service (Gmail, Outlook, etc.)
    console.log(`Creating email transporter with service: ${process.env.EMAIL_SERVICE}`);
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    // Use SMTP configuration
    console.log(`Creating SMTP transporter: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // For development/testing - use ethereal email (fake SMTP service)
    // This creates a test account that doesn't actually send emails
    console.log("No email configuration found. Using test account (emails will not be sent).");
    return nodemailer.createTransporter({
      host: "smtp.ethereal.email",
      port: 587,
      auth: {
        user: "test@ethereal.email",
        pass: "test"
      }
    });
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetUrl) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || "Volleyball Team Manager <noreply@volleyball-app.com>",
      to: email,
      subject: "Passwort zurücksetzen - Volleyball Team Manager",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1976d2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏐 Volleyball Team Manager</h1>
            </div>
            <div class="content">
              <h2>Hallo ${name},</h2>
              <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
              <p>Klicken Sie auf den untenstehenden Button, um Ihr Passwort zurückzusetzen:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Passwort zurücksetzen</a>
              </div>
              <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
              <p style="word-break: break-all; background-color: #fff; padding: 10px; border: 1px solid #ddd; border-radius: 3px;">${resetUrl}</p>
              <p><strong>Dieser Link ist nur 1 Stunde gültig.</strong></p>
              <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren. Ihr Passwort bleibt unverändert.</p>
              <div class="footer">
                <p>Mit freundlichen Grüßen,<br>Ihr Volleyball Team Manager Team</p>
                <p style="color: #999;">Dies ist eine automatisch generierte E-Mail. Bitte antworten Sie nicht auf diese Nachricht.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hallo ${name},
        
        Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.
        
        Bitte öffnen Sie den folgenden Link in Ihrem Browser, um Ihr Passwort zurückzusetzen:
        ${resetUrl}
        
        Dieser Link ist nur 1 Stunde gültig.
        
        Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
        
        Mit freundlichen Grüßen,
        Ihr Volleyball Team Manager Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    if (process.env.NODE_ENV !== "production" && !process.env.EMAIL_SERVICE) {
      console.log("Test email preview URL:", nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};
