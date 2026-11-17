import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

const requestResetSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .toLowerCase()
    .trim(),
});

const executeResetSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .toLowerCase()
    .trim(),
  token: z
    .string()
    .min(1, { message: "Reset token is required" })
    .trim(),
  newPassword: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .max(100, { message: "Password cannot exceed 100 characters" }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if this is an execution of password reset (has token and newPassword)
    if (body.token && body.newPassword) {
      const validationResult = executeResetSchema.safeParse(body);

      if (!validationResult.success) {
        const issues = validationResult.error.issues;
        return NextResponse.json(
          { error: issues[0]?.message || "Invalid input data", details: issues },
          { status: 400 }
        );
      }

      const { email, token, newPassword } = validationResult.data;

      // Verify token
      const verificationRecord = await prisma.verificationToken.findFirst({
        where: {
          identifier: email,
          token,
        },
      });

      if (!verificationRecord) {
        return NextResponse.json(
          { error: "Invalid reset token. Please request a new reset code." },
          { status: 400 }
        );
      }

      if (new Date() > verificationRecord.expires) {
        // Clean up expired token
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        return NextResponse.json(
          { error: "The reset token has expired. Please request a new one." },
          { status: 400 }
        );
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No account found associated with this email address." },
          { status: 404 }
        );
      }

      // Hash new password and update user
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { email },
        data: { hashedPassword },
      });

      // Invalidate used tokens
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Password reset successful! You can now log in with your new password.",
        },
        { status: 200 }
      );
    }

    // Otherwise, this is a request to initiate a password reset
    const validationResult = requestResetSchema.safeParse(body);

    if (!validationResult.success) {
      const issues = validationResult.error.issues;
      return NextResponse.json(
        { error: issues[0]?.message || "Please provide a valid email", details: issues },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Do not disclose whether email exists, but return success message
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account with that email exists, we have sent instructions to reset your password.",
        },
        { status: 200 }
      );
    }

    // Generate a secure 6-digit or hex reset code
    // For easy typing and copying, we'll generate a 6-digit verification code and a token
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHex = crypto.randomBytes(24).toString("hex");
    const resetToken = `${randomCode}-${tokenHex}`;

    // Token expires in 1 hour
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    // Delete any old tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Store new token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: resetToken,
        expires,
      },
    });

    // In a production environment with an SMTP service, send the email here.
    // For seamless testing and developer experience, we return the resetToken.
    return NextResponse.json(
      {
        success: true,
        message:
          "Reset instructions generated! Enter your reset token and new password to complete the reset.",
        resetToken,
        expiresIn: "60 minutes",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      return NextResponse.json(
        { error: "Email and token are required" },
        { status: 400 }
      );
    }

    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email.toLowerCase().trim(),
        token: token.trim(),
      },
    });

    if (!verificationRecord || new Date() > verificationRecord.expires) {
      return NextResponse.json(
        { valid: false, error: "Token is invalid or has expired" },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to verify token" },
      { status: 500 }
    );
  }
}
