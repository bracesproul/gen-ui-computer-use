import { NextRequest, NextResponse } from "next/server";
import { ScrapybaraClient } from "scrapybara";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { instanceId } = body as { instanceId: string };

    if (!instanceId) {
      return NextResponse.json(
        { error: "`instanceId` is required." },
        { status: 400 },
      );
    }

    if (!process.env.SCRAPYBARA_API_KEY) {
      return NextResponse.json(
        {
          error: "Scrapybara API key is missing",
        },
        { status: 400 },
      );
    }
    const client = new ScrapybaraClient({
      apiKey: process.env.SCRAPYBARA_API_KEY,
    });

    const instance = await client.get(instanceId);
    await instance.pause();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to process pause instance request:", error);

    return NextResponse.json(
      { error: "Failed to pause instance." + error.message },
      { status: 500 },
    );
  }
}
