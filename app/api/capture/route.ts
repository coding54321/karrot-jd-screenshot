import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { captureJobPage } from "@/lib/screenshot";

export const maxDuration = 300; // Vercel Pro: 최대 300초

function filenameFromTitle(title: string, index: number): string {
  const sanitized = title
    .replace(/[/\\:*?"<>|]/g, "")  // 파일명 금지 문자 제거
    .replace(/\s+/g, " ")           // 연속 공백 정리
    .trim()
    .slice(0, 100);                  // 최대 100자
  return `${String(index).padStart(2, "0")}_${sanitized || "job"}.png`;
}

export async function POST(req: NextRequest) {
  let urls: string[];
  try {
    const body = await req.json();
    urls = body.urls;
    if (!Array.isArray(urls) || urls.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "urls 배열이 필요합니다." }, { status: 400 });
  }

  // 단일 URL이면 PNG 직접 반환
  if (urls.length === 1) {
    const url = urls[0].trim();
    try {
      const { buffer, title } = await captureJobPage(url);
      const filename = filenameFromTitle(title, 1);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  }

  const zip = new JSZip();
  const errors: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    if (!url) continue;
    try {
      const { buffer, title } = await captureJobPage(url);
      zip.file(filenameFromTitle(title, i + 1), buffer);
    } catch (e) {
      errors.push(`${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (zip.files && Object.keys(zip.files).length === 0) {
    return NextResponse.json({ error: "모든 URL 처리에 실패했습니다.", details: errors }, { status: 500 });
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="daangn_jd_screenshots.zip"`,
    },
  });
}
