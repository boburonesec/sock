import { PageHeader } from "@/components/page-header";
import { TelegramLinkTokensPage } from "@/features/settings/telegram/telegram-link-tokens-page";

export default function SettingsTelegramPage() {
  return (
    <>
      <PageHeader
        title="Telegram boshqaruvi"
        description="Telegram accountlar, link tokenlar va bot readiness holati"
      />
      <TelegramLinkTokensPage />
    </>
  );
}
