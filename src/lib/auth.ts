import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const providers: any[] = [];

// Safely configure Google Provider only when credentials exist
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Credentials Provider: Supports BOTH standard Password AND direct Email OTP verification
providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      otp: { label: "OTP", type: "text" },
    },
    async authorize(credentials) {
      if (!credentials?.email) {
        throw new Error("Email address is required");
      }

      const email = credentials.email.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new Error("No account found with this email");
      }

      // ─── 1. Sign In via Email OTP ───
      if (credentials.otp) {
        const otpCode = credentials.otp.trim();
        const verificationRecord = await prisma.verificationToken.findFirst({
          where: {
            identifier: email,
            token: otpCode,
          },
        });

        if (!verificationRecord) {
          throw new Error("Invalid verification code. Please check and try again.");
        }

        if (new Date() > verificationRecord.expires) {
          await prisma.verificationToken.deleteMany({
            where: { identifier: email },
          });
          throw new Error("Verification code has expired. Please request a new code.");
        }

        // Consume the verification token
        await prisma.verificationToken.deleteMany({
          where: { identifier: email },
        });

        // Mark email verified if not yet marked
        if (!user.emailVerified) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: new Date() },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }

      // ─── 2. Sign In via Standard Password ───
      if (!credentials.password) {
        throw new Error("Password or verification code is required");
      }

      if (!user.hashedPassword) {
        throw new Error("Invalid email or password");
      }

      const isValid = await bcrypt.compare(
        credentials.password,
        user.hashedPassword
      );

      if (!isValid) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
