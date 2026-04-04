import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();
    const dbState = mongoose.connection.readyState;

    if (dbState === 1) {
      return NextResponse.json({
        status: "ok",
        db: "connected",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
