import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getMyAccount } from "@/lib/portal";

export async function POST(req: NextRequest) {
  const me = await getMyAccount();
  if (!me || me.role !== "admin") {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const { to, subject, text, filename, pdfBase64 } = (await req.json()) as {
      to?: string;
      subject?: string;
      text?: string;
      filename?: string;
      pdfBase64?: string;
    };

    if (!to || !pdfBase64) {
      return NextResponse.json(
        { ok: false, error: "받는 사람 이메일과 첨부파일이 필요합니다." },
        { status: 400 }
      );
    }

    const user = process.env.GMAIL_USER?.trim();
    // 구글이 앱 비밀번호를 "abcd efgh ijkl mnop" 형태로 보여줘서 공백째 붙여넣는 경우가 많음
    const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
    if (!user || !pass) {
      return NextResponse.json(
        {
          ok: false,
          error: "메일 발송 계정이 설정되지 않았습니다. GMAIL_USER / GMAIL_APP_PASSWORD 환경변수를 등록해주세요.",
        },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"희연재" <${user}>`,
      to,
      subject: subject || "거래명세서",
      text: text || "첨부된 거래명세서를 확인해 주세요.",
      attachments: [
        {
          filename: filename || "거래명세서.pdf",
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        },
      ],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("메일 발송 실패:", err);
    const raw = (err as Error)?.message ?? "";
    const isAuthFail =
      (err as { code?: string })?.code === "EAUTH" || raw.includes("535");
    return NextResponse.json(
      {
        ok: false,
        error: isAuthFail
          ? "Gmail 로그인에 실패했습니다. 구글 계정 비밀번호를 바꾸면 기존 앱 비밀번호가 자동으로 해제됩니다. 앱 비밀번호를 새로 발급받아 GMAIL_APP_PASSWORD 를 교체한 뒤 재배포해 주세요."
          : raw || "발송 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
