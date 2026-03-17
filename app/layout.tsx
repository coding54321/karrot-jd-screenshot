import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "당근 JD Screenshot",
  description: "당근 채용공고 페이지를 이미지로 저장하는 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="antialiased" style={{ fontFamily: "'Pretendard Variable', Pretendard, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
