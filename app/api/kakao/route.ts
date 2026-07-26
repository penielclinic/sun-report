import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// 카카오 알림톡 발송 (Solapi 사용)
// 필요 환경변수:
//   SOLAPI_API_KEY      — Solapi API 키
//   SOLAPI_API_SECRET   — Solapi API 시크릿
//   SOLAPI_SENDER       — 발신 번호 (카카오채널 연결된 번호)
//   SOLAPI_PFID         — 카카오채널 ID (pfId)

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getSolapiToken() {
  const apiKey = process.env.SOLAPI_API_KEY!;
  const apiSecret = process.env.SOLAPI_API_SECRET!;
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).substring(2);
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(date + salt));
  const signature = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendAlimtalk(to: string, templateCode: string, variables: Record<string, string>) {
  const token = await getSolapiToken();
  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: JSON.stringify({
      message: {
        to,
        from: process.env.SOLAPI_SENDER,
        kakaoOptions: {
          pfId: process.env.SOLAPI_PFID,
          templateId: templateCode,
          variables,
        },
      },
    }),
  });
  return res.ok;
}

// POST /api/kakao — 알림톡 발송 (내부 호출용)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, data } = await request.json() as {
    type: "sun_submitted" | "mission_submitted" | "reminder";
    data: Record<string, string>;
  };

  // 환경변수 미설정 시 skip
  if (!process.env.SOLAPI_API_KEY) {
    return NextResponse.json({ ok: true, skipped: true, reason: "Solapi not configured" });
  }

  const admin = adminClient();
  const results: boolean[] = [];

  if (type === "sun_submitted") {
    // 순보고서 제출 → 해당 선교회장에게 알림톡
    const { data: leaders } = await admin
      .from("sunbogo_profiles")
      .select("name")
      .eq("role", "mission_leader")
      .eq("mission_id", parseInt(data.missionId));

    // 실제 운영 시 profiles에 phone 컬럼 추가 필요
    // 현재는 구조만 구현, phone은 data.phone으로 전달
    if (data.phone) {
      const ok = await sendAlimtalk(data.phone, "SUN_SUBMITTED", {
        "#{순번호}": data.sunNumber,
        "#{순장이름}": data.sunLeader,
        "#{선교회장}": leaders?.[0]?.name ?? "",
      });
      results.push(ok);
    }
  } else if (type === "mission_submitted") {
    // 선교회보고서 제출 → 담임목사에게 알림톡
    if (data.phone) {
      const ok = await sendAlimtalk(data.phone, "MISSION_SUBMITTED", {
        "#{선교회}": data.missionId,
        "#{선교회장}": data.missionLeader,
      });
      results.push(ok);
    }
  } else if (type === "reminder") {
    // 미제출 리마인더
    if (data.phone) {
      const ok = await sendAlimtalk(data.phone, "SUN_REMINDER", {
        "#{순장이름}": data.name,
        "#{날짜}": data.date,
      });
      results.push(ok);
    }
  }

  return NextResponse.json({ ok: true, results });
}
