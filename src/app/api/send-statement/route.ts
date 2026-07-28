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

    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
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
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message ?? "발송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
