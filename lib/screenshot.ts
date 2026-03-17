import { chromium as playwrightChromium } from "playwright-core";
import sharp from "sharp";

const PADDING = 60;
const SCALE = 2;

export async function captureJobPage(url: string): Promise<{ buffer: Buffer; title: string }> {
  const isVercel = process.env.VERCEL === "1";

  let executablePath: string | undefined;
  if (isVercel) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const chromium = require("@sparticuz/chromium-min");
    executablePath = await chromium.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v143.0.0/chromium-v143.0.0-pack.tar`
    );
  }

  const browser = await playwrightChromium.launch({
    executablePath,
    args: isVercel
      ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
      : [],
    headless: true,
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: SCALE,
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector("main", { timeout: 10000 });

    // 절대 좌표(스크롤 포함)로 main 위치 계산
    const mainRect = await page.evaluate(() => {
      const el = document.querySelector("main");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + window.pageXOffset,
        y: r.top + window.pageYOffset,
        width: r.width,
      };
    });

    if (!mainRect) throw new Error(`<main> 요소를 찾을 수 없습니다: ${url}`);

    const title = await page.evaluate(() => {
      const el = document.querySelector("main h1");
      return el?.textContent?.trim() ?? "";
    });

    // 지원하기/자주묻는질문 버튼(.c-blLNpm) 직전까지만
    const btnY = await page.evaluate(() => {
      const el = document.querySelector(".c-blLNpm");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.top + window.pageYOffset;
    });

    const rawBuffer = await page.screenshot({ fullPage: true });

    const s = SCALE;
    const left = Math.round(mainRect.x * s);
    const top = Math.round(mainRect.y * s);
    const right = Math.round((mainRect.x + mainRect.width) * s);

    const { height: imgHeight = 9999 } = await sharp(rawBuffer).metadata();
    const bottom = btnY != null ? Math.round(btnY * s) : imgHeight;
    const cropHeight = bottom - top;

    // sharp로 크롭 + 흰색 여백 추가
    const pad = PADDING * s;
    const cropped = await sharp(rawBuffer)
      .extract({ left, top, width: right - left, height: cropHeight })
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer();

    return { buffer: cropped, title };
  } finally {
    await browser.close();
  }
}
