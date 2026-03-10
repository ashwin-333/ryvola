import { NextRequest, NextResponse } from "next/server";
import { parseAssignmentFromImage } from "@/lib/gemini/parse-assignment";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PNG, JPG, WEBP, GIF, or PDF." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const parsed = await parseAssignmentFromImage(buffer, file.type);
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("Parse assignment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse assignment" },
      { status: 500 }
    );
  }
}
