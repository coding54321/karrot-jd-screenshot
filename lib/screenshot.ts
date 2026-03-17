import { chromium as playwrightChromium, Browser } from "playwright-core";
import sharp from "sharp";

const PADDING = 60;
const SCALE = 2;

async function createBrowser(): Promise<Browser> {
  const isVercel = process.env.VERCEL === "1";
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const chromiumPkg = isVercel ? require("@sparticuz/chromium-min") : null;

  let executablePath: string | undefined;
  let launchArgs: string[] = [];

  if (isVercel) {
    executablePath = await chromiumPkg.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar`
    );
    launchArgs = chromiumPkg.args;
  }

  return playwrightChromium.launch({ executablePath, args: launchArgs, headless: true });
}

async function capturePage(browser: Browser, url: string): Promise<{ buffer: Buffer; title: string }> {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: SCALE,
  });

  try {
    // 미디어·웹소켓 등 불필요한 리소스 차단
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["media", "websocket", "other"].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, { waitUntil: "load", timeout: 30000 });

    // 한글/이모지 웹폰트 강제 주입 (Vercel 환경에 시스템 폰트 없음)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    await page.addStyleTag({
      content: `
        @font-face {
          font-family: 'Pretendard Variable';
          src: url('${baseUrl}/fonts/PretendardVariable.woff2') format('woff2');
          font-weight: 45 920;
          font-display: block;
        }
        @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
        * { font-family: 'Pretendard Variable', Pretendard, 'Noto Color Emoji', sans-serif !important; }
      `,
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector("main", { timeout: 10000 });

    const mainRect = await page.evaluate(() => {
      const el = document.querySelector("main");
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + window.pageXOffset,
        y: r.top + window.pageYOffset,
        width: r.width,
        height: r.height,
      };
    });

    if (!mainRect) throw new Error(`<main> 요소를 찾을 수 없습니다: ${url}`);

    const title = await page.evaluate(() => document.querySelector("main h1")?.textContent?.trim() ?? "");

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

    // <main> 하단을 기본 cutoff로 사용 (fullPage 스크린샷에 포함되는 다음 페이지 콘텐츠 방지)
    const mainBottom = Math.round((mainRect.y + mainRect.height) * s);
    const bottom = btnY != null ? Math.min(Math.round(btnY * s), mainBottom) : mainBottom;
    const cropHeight = bottom - top;

    const pad = PADDING * s;
    const buffer = await sharp(rawBuffer)
      .extract({ left, top, width: right - left, height: cropHeight })
      .extend({
        top: pad, bottom: pad, left: pad, right: pad,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .withMetadata({ density: 144 })
      .png({ compressionLevel: 9 })
      .toBuffer();

    return { buffer, title };
  } finally {
    await page.close();
  }
}

export async function captureJobPages(
  urls: string[]
): Promise<Array<{ url: string; buffer: Buffer; title: string } | { url: string; error: string }>> {
  const browser = await createBrowser();
  try {
    return await Promise.all(
      urls.map(async (url) => {
        try {
          const { buffer, title } = await capturePage(browser, url);
          return { url, buffer, title };
        } catch (e) {
          const error = e instanceof Error ? e.message : String(e);
          console.error("[capture] error:", url, error);
          return { url, error };
        }
      })
    );
  } finally {
    await browser.close();
  }
}
