"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, Button, Divider } from "@heroui/react";
import { useAppContext } from "@/contexts/app";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";

export default function LoginModal() {
  const { isLoginOpen, setIsLoginOpen } = useAppContext();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onOpenChange = (open: boolean) => setIsLoginOpen(open);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await login({ returnTo: typeof window !== "undefined" ? window.location.href : undefined });
      setIsLoginOpen(false);
      try { router.refresh(); } catch {}
    } catch (error) {
      console.error("[auth] login failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isLoginOpen} onOpenChange={onOpenChange} backdrop="blur" size="xl" placement="center">
      <ModalContent className="relative bg-[#0b1220] text-white border border-white/10 rounded-2xl">
        {() => (
          <>
            <ModalHeader className="flex flex-col gap-1 px-8 md:px-10 pt-8 md:pt-10">
              <div className="flex items-center gap-2">
                <Image src="/white-logo-64.png" alt="Girl Generator" width={28} height={28} />
                <span className="text-white/90 text-lg md:text-xl">Sign in to Girl Generator</span>
              </div>
            </ModalHeader>
            <ModalBody className="px-8 md:px-10 pb-9 md:pb-12">
              <p className="text-white/70 text-[15px] md:text-base">
                Continue to save your creations, access history, and manage credits.
              </p>
              <div className="mt-4 grid gap-4">
                <Button
                  size="lg"
                  className="h-12 bg-white text-black font-semibold disabled:opacity-50 rounded-[12px]"
                  type="button"
                  isDisabled={loading}
                  onClick={(e) => { e.preventDefault(); void handleLogin(); }}
                >
                  {loading ? 'Opening…' : 'Continue with Google'}
                </Button>
              </div>
              <Divider className="my-5 bg-white/10" />
              <p className="text-xs md:text-sm text-white/60">
                By continuing, you agree to our <a className="underline hover:text-white" href="/terms">Terms</a> and <a className="underline hover:text-white" href="/privacy">Privacy Policy</a>.
              </p>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
