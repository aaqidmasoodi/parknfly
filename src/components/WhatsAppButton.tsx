"use client";

import { Booking } from "@/lib/types";
import { useMessages, MessageTemplate } from "@/lib/message-store";
import { buildWhatsAppUrl } from "@/lib/whatsapp-templates";
import { Button } from "@/components/ui/button";
import { useWhatsApp } from "@/lib/whatsapp-context";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  booking: Booking;
  templateId: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "icon";
  className?: string;
}

export function WhatsAppButton({
  booking,
  templateId,
  label,
  variant = "outline",
  className,
}: WhatsAppButtonProps) {
  const { isConnected, sendMessage } = useWhatsApp();
  const { buildMessage, getTemplate } = useMessages();

  const template = getTemplate(templateId);

  const handleClick = async () => {
    const message = buildMessage(templateId, booking);
    if (!message) {
      toast.error("Message template not found");
      return;
    }

    if (isConnected) {
      try {
        await sendMessage(booking.customerPhone, message);
        toast.success(`Message sent to ${booking.customerName.split(" ")[0]}`);
      } catch {
        window.open(buildWhatsAppUrl(booking.customerPhone, message), "_blank");
      }
    } else {
      window.open(buildWhatsAppUrl(booking.customerPhone, message), "_blank");
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        title={`WhatsApp ${booking.customerName}`}
        className={cn(
          "inline-flex items-center justify-center w-7 h-7 rounded-md text-[#25D366] hover:bg-[#25D366]/10 transition-colors",
          className
        )}
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    );
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={cn(
        "gap-2 text-[#25D366] border-[#25D366]/30 hover:bg-[#25D366]/10 hover:text-[#25D366]",
        className
      )}
      onClick={handleClick}
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {label ?? template?.name ?? "WhatsApp"}
      {isConnected && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] shrink-0" />
      )}
    </Button>
  );
}

/**
 * A dropdown-style selector that lets users pick a template and send it.
 */
export function WhatsAppTemplateSelector({
  booking,
  className,
}: {
  booking: Booking;
  className?: string;
}) {
  const { templates, buildMessage } = useMessages();
  const { isConnected, sendMessage } = useWhatsApp();

  const handleSend = async (templateId: string) => {
    const message = buildMessage(templateId, booking);
    if (!message) return;

    if (isConnected) {
      try {
        await sendMessage(booking.customerPhone, message);
        toast.success(`Sent to ${booking.customerName.split(" ")[0]}`);
      } catch {
        window.open(buildWhatsAppUrl(booking.customerPhone, message), "_blank");
      }
    } else {
      window.open(buildWhatsAppUrl(booking.customerPhone, message), "_blank");
    }
  };

  if (templates.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => handleSend(t.id)}
          className="w-full flex items-center gap-2.5 rounded-lg border p-2.5 text-left hover:bg-[#25D366]/5 hover:border-[#25D366]/30 transition-all group"
        >
          <div className="w-7 h-7 rounded-md bg-[#25D366]/10 flex items-center justify-center shrink-0">
            <MessageCircle className="h-3.5 w-3.5 text-[#25D366]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium group-hover:text-[#25D366] transition-colors">
              {t.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {buildMessage(t.id, booking).slice(0, 60)}…
            </p>
          </div>
          {isConnected && (
            <span className="text-[10px] text-[#25D366] font-medium shrink-0">
              Auto
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
