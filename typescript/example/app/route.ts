import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import path from "path";
import fs from "fs/promises";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const prompt = searchParams.get("prompt");

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const filename = `${crypto.randomUUID()}.png`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filepath = path.join(uploadsDir, filename);

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
    return NextResponse.json(
      { error: "Failed to create uploads directory" },
      { status: 500 }
    );
  }

  openai.images
    .generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
    })
    .then(async (imageResponse) => {
      if (imageResponse.data?.[0]?.url) {
        const response = await fetch(imageResponse.data[0].url);
        const buffer = await response.arrayBuffer();

        await fs.writeFile(filepath, Buffer.from(buffer));
      }
    })
    .catch(console.error);

  return NextResponse.redirect(
    new URL(`/image?filename=${filename}`, request.nextUrl.origin)
  );
}
