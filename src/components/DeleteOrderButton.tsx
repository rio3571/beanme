"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOrder } from "@/app/portal/orderActions";

export default function DeleteOrderButton({
  orderId,
  label = "삭제",
}: {
  orderId: string;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("이 주문을 삭제할까요? 되돌릴 수 없어요.")) return;
        start(async () => {
          const res = await deleteOrder(orderId);
          if (!res.ok) alert(res.error ?? "삭제 실패");
          router.refresh();
        });
      }}
      disabled={pending}
      className="shrink-0 text-xs text-stone-400 hover:text-red-600 px-1.5 py-1 disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}
