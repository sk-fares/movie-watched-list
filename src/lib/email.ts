import nodemailer from "nodemailer";

interface SendOtpOptions {
  to: string;
  otp: string;
  type: "signup" | "signin" | "reset";
}

/**
 * Creates Nodemailer transporter for Gmail / custom SMTP
 */
function createTransporter() {
  const user = process.env.EMAIL_SERVER_USER || "uselessid301@gmail.com";
  const pass = process.env.EMAIL_SERVER_PASSWORD;

  if (!pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a clean, cinematic OTP verification email.
 * If SMTP password is not set or fails, falls back gracefully and logs OTP for seamless developer experience.
 */
export async function sendOtpEmail({ to, otp, type }: SendOtpOptions): Promise<{
  success: boolean;
  delivered: boolean;
  simulated?: boolean;
  otp?: string;
  error?: string;
}> {
  const titles = {
    signup: "Verify Your Email — Welcome to Movie Watched List",
    signin: "Your Sign In Verification Code — Movie Watched List",
    reset: "Password Reset Code — Movie Watched List",
  };

  const actionText = {
    signup: "complete creating your Movie Watched List account",
    signin: "sign in to your Movie Watched List account",
    reset: "reset your Movie Watched List account password",
  };

  const subject = titles[type] || "Your Verification Code";
  const transporter = createTransporter();

  console.log(`\n=================================================`);
  console.log(`🔐 [EMAIL OTP] To: ${to} | Type: ${type}`);
  console.log(`🔑 Verification Code: ${otp}`);
  console.log(`⏰ Code expires in 10 minutes`);
  console.log(`=================================================\n`);

  if (!transporter) {
    console.warn(
      `[EMAIL NOTICE] EMAIL_SERVER_PASSWORD not configured in .env. Falling back to console simulation mode.`
    );
    return {
      success: true,
      delivered: false,
      simulated: true,
      otp,
    };
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #09090b;
          color: #fafafa;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .container {
          max-width: 540px;
          margin: 40px auto;
          background: #121217;
          border: 1px solid #27272a;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        }
        .header {
          background: linear-gradient(135deg, #3b0764, #1e1b4b, #09090b);
          padding: 36px 30px;
          text-align: center;
          border-bottom: 1px solid #3b0764;
        }
        .logo-badge {
          display: inline-block;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #d8b4fe;
          background: rgba(147, 51, 234, 0.25);
          border: 1px solid rgba(168, 85, 247, 0.4);
          padding: 6px 14px;
          border-radius: 9999px;
          margin-bottom: 12px;
        }
        .title {
          font-size: 22px;
          font-weight: 800;
          color: #ffffff;
          margin: 0;
        }
        .body-content {
          padding: 36px 30px;
          text-align: center;
        }
        .instruction {
          font-size: 15px;
          line-height: 1.6;
          color: #a1a1aa;
          margin-bottom: 24px;
        }
        .otp-box {
          display: inline-block;
          background: #18181b;
          border: 2px solid #9333ea;
          border-radius: 16px;
          padding: 16px 32px;
          letter-spacing: 8px;
          font-size: 32px;
          font-weight: 900;
          font-family: 'Courier New', Courier, monospace;
          color: #c084fc;
          box-shadow: 0 0 30px rgba(147, 51, 234, 0.35);
          margin-bottom: 24px;
        }
        .expiry-note {
          font-size: 12px;
          color: #71717a;
          margin-bottom: 30px;
        }
        .footer {
          border-top: 1px solid #27272a;
          padding: 20px 30px;
          font-size: 12px;
          color: #52525b;
          text-align: center;
          background: #09090b;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-badge">🎬 MOVIE WATCHED LIST</div>
          <h1 class="title">Email Verification</h1>
        </div>
        <div class="body-content">
          <p class="instruction">
            Use the 6-digit code below to ${actionText[type]}.
          </p>
          <div class="otp-box">${otp}</div>
          <p class="expiry-note">
            ⏱ This code will expire in <strong>10 minutes</strong>.<br />
            If you did not request this verification code, you can safely ignore this email.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Movie Watched List • Your cinematic universe tracker.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const fromAddress = process.env.EMAIL_FROM || `"Movie Watched List" <${process.env.EMAIL_SERVER_USER || "uselessid301@gmail.com"}>`;
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });

    console.log(`✅ [EMAIL DELIVERED] Successfully sent OTP to ${to}`);
    return { success: true, delivered: true };
  } catch (err: any) {
    console.error(`❌ [EMAIL ERROR] Failed to send via Gmail SMTP:`, err?.message || err);
    // Return simulated success so the user is never blocked even if SMTP is undergoing configuration
    return {
      success: true,
      delivered: false,
      simulated: true,
      otp,
      error: err?.message,
    };
  }
}
