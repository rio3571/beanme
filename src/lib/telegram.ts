/**
 * 텔레그램 알림 (기존 비서봇 재사용).
 * 서버에서만 호출. 실패해도 주문 자체는 막지 않도록 조용히 처리.
 */
export async function notifyOwner(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[telegram] token/chat_id 미설정 — 알림 건너뜀");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch (e) {
    console.error("[telegram] 알림 실패:", e);
  }
}
