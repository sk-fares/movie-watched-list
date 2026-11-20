import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

const sendOtpSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .toLowerCase()
    .trim(),
  type: z.enum(["signup", "signin", "reset"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid email" },
        { status: 400 }
      );
    }

    const { email, type } = parsed.data;

    // Check user existence based on type
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (type === "signup" && existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    if (type === "signin" && !existingUser) {
      return NextResponse.json(
        { error: "No account found with this email. Please create an account first." },
        { status: 404 }
      );
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up old tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // Save token in DB
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: otp,
        expires,
      },
    });

    // Dispatch email
    const emailResult = await sendOtpEmail({
      to: email,
      otp,
      type,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}`,
      delivered: emailResult.delivered,
      simulated: emailResult.simulated,
      // Provide devOtp if SMTP is not yet active so testing is completely unblocked
      devOtp: emailResult.simulated ? emailResult.otp : undefined,
    });
  } catch (error: any) {
    console.error("POST /api/auth/otp/send error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }
}
