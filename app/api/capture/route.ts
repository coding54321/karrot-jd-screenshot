import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { captureJobPages } from "@/lib/screenshot";

export const maxDuration = 300;

function filenameFromTitle(title: string, index: number): string {
  const sanitized = title
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `${String(index).padStart(2, "0")}_${sanitized || "job"}.png`;
}

export async function POST(req: NextRequest) {
  let urls: string[];
  try {
    const body = await req.json();
    urls = (body.urls as string[]).map((u: string) => u.trim()).filter(Boolean);
    if (urls.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "urls 배열이 필요합니다." }, { status: 400 });
  }

  const results = await captureJobPages(urls);

  const successes = results.filter(
    (r): r is { url: string; buffer: Buffer; title: string } => !("error" in r)
  );
  const failures = results.filter(
    (r): r is { url: string; error: string } => "error" in r
  );

  if (successes.length === 0) {
    return NextResponse.json(
      { error: "모든 URL 처리에 실패했습니다.", details: failures.map((f) => `${f.url}: ${f.error}`) },
      { status: 500 }
    );
  }

  // 단일 성공이면 PNG 직접 반환
  if (successes.length === 1 && failures.length === 0) {
    const { buffer, title } = successes[0];
    const filename = filenameFromTitle(title, 1);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  }

  // 복수이면 ZIP
  const zip = new JSZip();
  successes.forEach(({ buffer, title }, i) => {
    zip.file(filenameFromTitle(title, i + 1), buffer);
  });

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="daangn_jd_screenshots.zip"`,
    },
  });
}
