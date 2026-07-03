import { PageHeader } from "@/components/page-header";
import { TelegramLinkTokensPage } from "@/features/settings/telegram/telegram-link-tokens-page";

export default function SettingsTelegramPage() {
  return (
    <>
      <PageHeader
        title="Telegram boshqaruvi"
        description="Telegram akkauntlar, link tokenlar va bot tayyorligi holati"
      />
      <TelegramLinkTokensPage />
    </>
  );
}
