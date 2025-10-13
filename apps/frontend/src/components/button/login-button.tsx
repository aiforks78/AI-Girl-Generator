"use client";

import { Button } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useAppContext } from "@/contexts/app";

export default function LoginButton() {
  const t = useTranslations("Nav");
  const { setIsLoginOpen } = useAppContext();
  return (
    <Button
      className="text-white/80 hover:text-white bg-transparent border border-white/20 hover:bg-white/10 rounded-lg px-6 py-2 font-medium transition-all duration-200"
      variant="bordered"
      onClick={() => setIsLoginOpen(true)}
    >
      {t("login")}
    </Button>
  );
}
