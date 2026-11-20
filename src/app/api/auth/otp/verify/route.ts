import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";

const verifyOtpSchema = z.object({
  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .toLowerCase()
    .trim(),
  otp: z
    .string()
    .min(6, { message: "Verification code must be 6 digits" })
    .max(6, { message: "Verification code must be 6 digits" })
    .trim(),
  type: z.enum(["signup", "signin"]),
  name: z.string().min(2).max(50).optional(),
  password: z.string().min(6).max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { email, otp, type, name, password } = parsed.data;

    // Check verification token in database
    const verificationRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: otp,
      },
    });

    if (!verificationRecord) {
      return NextResponse.json(
        { error: "Invalid verification code. Please check your email and try again." },
        { status: 400 }
      );
    }

    if (new Date() > verificationRecord.expires) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // OTP is valid! Consume token
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    // ─── SIGN UP COMPLETION ───
    if (type === "signup") {
      if (!name || !password) {
        return NextResponse.json(
          { error: "Name and password are required to complete registration" },
          { status: 400 }
        );
      }

      // Check if user was created while verifying
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please sign in." },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          hashedPassword,
          emailVerified: new Date(), // Verified via OTP!
          preferences: {
            create: {
              theme: "dark",
              defaultContentType: "all",
              enableNotifications: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          createdAt: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Email verified and account created successfully!",
          user: newUser,
        },
        { status: 201 }
      );
    }

    // ─── SIGN IN VERIFICATION ───
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    if (!user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error: any) {
    console.error("POST /api/auth/otp/verify error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify code. Please try again." },
      { status: 500 }
    );
  }
}
