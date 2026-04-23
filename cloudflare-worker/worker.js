// ── 네이버 지역 검색 API 프록시 — Cloudflare Workers ──────────────────────
// 환경 변수는 Cloudflare Dashboard > Workers > Settings > Variables 에서 설정
//   NAVER_CLIENT_ID     ← 네이버 Client ID
//   NAVER_CLIENT_SECRET ← 네이버 Client Secret

const ALLOWED_ORIGIN = "https://kdssosbell-wq.github.io";

const CORS = {
  "Access-Control-Allow-Origin":  ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonRes(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {

    // ── CORS Preflight ──────────────────────────────
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── GET만 허용 ──────────────────────────────────
    if (request.method !== "GET") {
      return jsonRes(405, { error: "Method Not Allowed" });
    }

    // ── Origin 검증 (브라우저 요청만 허용) ───────────
    const origin = request.headers.get("Origin") ?? "";
    if (origin && origin !== ALLOWED_ORIGIN) {
      return jsonRes(403, { error: "Forbidden: 허용되지 않은 출처입니다." });
    }

    // ── 검색어 파싱 ─────────────────────────────────
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") ?? "").trim();
    if (!query) {
      return jsonRes(400, { error: "query 파라미터가 필요합니다." });
    }

    // ── 환경 변수 확인 ──────────────────────────────
    const clientId     = env.NAVER_CLIENT_ID;
    const clientSecret = env.NAVER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error("환경 변수 NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정");
      return jsonRes(500, { error: "서버 API 키 설정 오류" });
    }

    // ── 네이버 지역 검색 API 호출 ────────────────────
    try {
      const apiUrl =
        `https://openapi.naver.com/v1/search/local.json` +
        `?query=${encodeURIComponent(query)}&display=5&sort=random`;

      const naverRes = await fetch(apiUrl, {
        headers: {
          "X-Naver-Client-Id":     clientId,
          "X-Naver-Client-Secret": clientSecret,
        },
      });

      // 오류 응답 처리
      if (!naverRes.ok) {
        if (naverRes.status === 429) {
          return jsonRes(429, { error: "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해 주세요." });
        }
        const errText = await naverRes.text();
        console.error("네이버 API 오류:", naverRes.status, errText);
        return jsonRes(naverRes.status, { error: "네이버 API 호출 실패" });
      }

      const data  = await naverRes.json();
      const items = (data.items ?? []).map((item) => ({
        title:       item.title,
        category:    item.category,
        roadAddress: item.roadAddress,
        address:     item.address,
        mapx:        item.mapx,
        mapy:        item.mapy,
      }));

      return jsonRes(200, { items });

    } catch (err) {
      console.error("Worker 오류:", err);
      return jsonRes(500, { error: "서버 내부 오류" });
    }
  },
};
