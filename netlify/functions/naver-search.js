// ── 네이버 지역 검색 API 프록시 ──────────────────────────────────────────
// Client ID / Secret 은 Netlify 환경 변수에서만 관리합니다.

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", ...CORS },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const { query } = event.queryStringParameters || {};
  if (!query || !query.trim()) {
    return respond(400, { error: "query 파라미터가 필요합니다" });
  }

  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("환경 변수 NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정");
    return respond(500, { error: "서버 API 키 설정 오류" });
  }

  try {
    const apiUrl =
      `https://openapi.naver.com/v1/search/local.json` +
      `?query=${encodeURIComponent(query.trim())}&display=5&sort=random`;

    const response = await fetch(apiUrl, {
      headers: {
        "X-Naver-Client-Id":     clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("네이버 API 오류:", response.status, text);
      return respond(response.status, { error: "네이버 API 호출 실패" });
    }

    const data  = await response.json();
    const items = (data.items || []).map((item) => ({
      title:       item.title,
      category:    item.category,
      roadAddress: item.roadAddress,
      address:     item.address,
      mapx:        item.mapx,
      mapy:        item.mapy,
    }));

    return respond(200, { items });
  } catch (err) {
    console.error("Function 오류:", err);
    return respond(500, { error: "서버 내부 오류" });
  }
};
