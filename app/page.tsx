"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, X, Download, Loader2 } from "lucide-react";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [urls, setUrls] = useState<string[]>(["", "", ""]);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const validUrls = urls.filter((u) => u.trim() !== "");

  function updateUrl(index: number, value: string) {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }

  function addUrl() {
    setUrls((prev) => [...prev, ""]);
  }

  function removeUrl(index: number) {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCapture() {
    if (validUrls.length === 0) return;
    setStatus("loading");
    setProgress(0);
    setTotal(validUrls.length);
    setErrorMsg("");

    try {
      // URL당 약 20초 예상으로 진행률 애니메이션
      const tickMs = Math.floor((validUrls.length * 20000) / validUrls.length / 15);
      const interval = setInterval(() => {
        setProgress((p) => Math.min(p + 1, validUrls.length - 1));
      }, tickMs);

      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: validUrls }),
      });

      clearInterval(interval);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "서버 오류가 발생했습니다.");
      }

      setProgress(validUrls.length);
      setStatus("done");

      // Content-Disposition 헤더에서 파일명 추출
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      const filename = match
        ? decodeURIComponent(match[1])
        : validUrls.length === 1 ? "screenshot.png" : "daangn_jd_screenshots.zip";

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "알 수 없는 오류");
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-[#F9F9F9] flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-xl">
        {/* 헤더 */}
        <div className="mb-8 flex items-center gap-3">
          <span className="text-3xl">🥕</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">당근 JD Screenshot</h1>
            <p className="text-sm text-gray-500 mt-0.5">채용공고 링크를 입력하면 이미지로 저장해드려요</p>
          </div>
        </div>

        <Card className="shadow-sm border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">URL 입력</CardTitle>
            <CardDescription className="text-sm">
              <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">about.daangn.com/jobs/...</code> 형식의 링크를 붙여넣으세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 select-none">
                    {i + 1}
                  </span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(i, e.target.value)}
                    placeholder="https://about.daangn.com/jobs/0000000000/"
                    className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-4 py-2.5 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
                    disabled={status === "loading"}
                  />
                </div>
                {urls.length > 1 && (
                  <button
                    onClick={() => removeUrl(i)}
                    disabled={status === "loading"}
                    className="text-gray-300 hover:text-gray-500 transition disabled:opacity-30 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={addUrl}
              disabled={status === "loading"}
              className="w-full mt-1 text-gray-500 hover:text-gray-700 border border-dashed border-gray-200 hover:border-gray-300"
            >
              <Plus size={14} className="mr-1.5" />
              URL 추가
            </Button>
          </CardContent>
        </Card>

        {/* 실행 버튼 */}
        <Button
          onClick={handleCapture}
          disabled={validUrls.length === 0 || status === "loading"}
          className="w-full mt-4 h-12 text-base font-semibold bg-[#FF6F0F] hover:bg-[#E56300] text-white rounded-xl transition cursor-pointer"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              처리 중... ({progress}/{total})
            </>
          ) : (
            <>
              <Download size={18} className="mr-2" />
              이미지 저장하기
            </>
          )}
        </Button>

        {/* 상태 메시지 */}
        {status === "done" && (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <span>✅</span>
            <span>
              {total === 1 ? "이미지가 다운로드됐어요" : <><strong>{total}개</strong> 이미지가 ZIP으로 다운로드됐어요</>}
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <span>❌</span>
            <span>{errorMsg}</span>
          </div>
        )}

      </div>
    </main>
  );
}
