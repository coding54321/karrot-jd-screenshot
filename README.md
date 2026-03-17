# 당근 JD Screenshot

당근마켓 채용공고 페이지를 이미지로 캡쳐해 다운로드하는 웹 도구입니다.

## 기능

- URL 입력 시 `<main>` 콘텐츠 영역만 정밀 크롭
- 지원하기 버튼 영역 이전까지만 캡쳐
- 공고 제목(`<h1>`)을 파일명으로 자동 지정
- 2x 고해상도 + 흰색 여백 자동 추가
- URL 1개 → PNG 직접 다운로드 / 복수 → ZIP 일괄 다운로드

## 로컬 실행

```bash
npm install
npm run dev
```

## 기술 스택

- Next.js 16 (App Router)
- Playwright Core + @sparticuz/chromium-min (헤드리스 브라우저)
- Sharp (이미지 크롭 및 패딩)
- JSZip
- Tailwind CSS + shadcn/ui
