"use client";

import React, {useCallback, useEffect, useState} from "react";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button, cn, NavbarMenu, NavbarMenuItem, NavbarMenuToggle, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Divider } from "@heroui/react";
import { UserIcon, CreditCardIcon, ClockIcon, ArrowRightOnRectangleIcon, WalletIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
// import { ArrowUpRight } from "lucide-react";
// Feature dropdown currently disabled
import Image from "next/image";
import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { useAppContext } from "@/contexts/app";

type NavbarVariant = "auto" | "solid";

export default function SiteNavbar({ variant = "auto" }: { variant?: NavbarVariant }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(variant === "solid");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { setIsLoginOpen: setLogin } = useAppContext();
  const { status, user, logout } = useAuth();
  const isLoggedIn = status === 'authenticated';
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  const lastFetchRef = React.useRef(0);
  const fetchCredits = useCallback(async (reason?: string) => {
    const now = Date.now();
    // throttle to avoid noisy refreshes (e.g., route transitions/visibility changes)
    if (now - lastFetchRef.current < 5000) return; // 5s throttle
    lastFetchRef.current = now;
    try {
      setLoadingCredits(true);
      const res = await apiFetch('/user/credits', { cache: 'no-store' });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const value = data?.data?.credits ?? null;
      setCredits(typeof value === 'number' ? value : null);
    } catch (_) {
      setCredits(null);
    } finally {
      setLoadingCredits(false);
    }
  }, []);

  // Initial load and auth change
  useEffect(() => {
    if (isLoggedIn) fetchCredits();
  }, [isLoggedIn, fetchCredits]);

  // Listen for global credits update events and refetch on focus/visibility
  useEffect(() => {
    if (!isLoggedIn) return;
    const onCustomUpdate = (e: Event) => {
      const detail: any = (e as CustomEvent)?.detail;
      const n = Number(detail);
      if (Number.isFinite(n)) {
        setCredits(n);
        return;
      }
      // Only refetch when explicitly requested: { force: true }
      if (detail && detail.force) fetchCredits('forced-event');
    };
    const onFocus = () => fetchCredits('focus');
    const onVisibility = () => { if (document.visibilityState === 'visible') fetchCredits('visible'); };

    window.addEventListener('credits:update', onCustomUpdate as EventListener);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('credits:update', onCustomUpdate as EventListener);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isLoggedIn, fetchCredits]);

  useEffect(() => {
    if (variant === "solid") {
      setIsScrolled(true);
      return; // Keep navbar opaque without scroll listener
    }
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const isActive = (segment: string) => {
    if (!pathname) return false;
    if (segment === "home") return pathname === "/";
    return pathname.includes(segment);
  };

  const shouldBeSolid = variant === "solid" || isScrolled;
  const navContainerClass = cn(
    "fixed inset-x-0 z-50 flex justify-center transition-all duration-300",
    shouldBeSolid
      ? "top-0 bg-[#111827]/95 border-b border-white/10"
      : "top-4 bg-transparent"
  );

  return (
    <div data-testid="navbar" className={navContainerClass}>
      <Navbar
        maxWidth="full"
        position="static"
        isBlurred={false}
        isMenuOpen={isMenuOpen}
        onMenuOpenChange={setIsMenuOpen}
        className="px-0 h-[72px] items-center !shadow-none !border-none backdrop-blur-0 backdrop-saturate-100 !bg-transparent"
        classNames={{
          wrapper: "w-full max-w-8xl px-4 md:px-8",
        }}
        height="72px"
      >
        <NavbarBrand as={Link} href="/" className="cursor-pointer">
          <Image src="/white-logo-64.png" alt="Logo" width={40} height={40} priority className="mr-2" />
          <span className="text-lg font-semibold text-white">Girl Generator</span>
        </NavbarBrand>

        <NavbarContent className="hidden md:flex gap-8 ml-auto" justify="end">
          <NavbarItem>
            <Link
              href={`/`}
              className={cn(
                "font-medium tracking-wide text-base antialiased transition-colors",
                !isActive("home") && "text-white/80 hover:text-brand-300",
                isActive("home") && "text-brand-400 hover:text-brand-400"
              )}
            >
              Home
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link
              href={`/gallery`}
              className={cn(
                "font-medium tracking-wide text-base antialiased transition-colors",
                !isActive("gallery") && "text-white/80 hover:text-brand-300",
                isActive("gallery") && "text-brand-400 hover:text-brand-400"
              )}
            >
              Gallery
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link
              href={`/text-to-image`}
              className={cn(
                "font-medium tracking-wide text-base antialiased transition-colors",
                !isActive("text-to-image") && "text-white/80 hover:text-brand-300",
                isActive("text-to-image") && "text-brand-400 hover:text-brand-400"
              )}
            >
              AI Image Generator
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link
              href={`/image-to-image`}
              className={cn(
                "font-medium tracking-wide text-base antialiased transition-colors",
                !isActive("image-to-image") && "text-white/80 hover:text-brand-300",
                isActive("image-to-image") && "text-brand-400 hover:text-brand-400"
              )}
            >
              Image to Image
            </Link>
          </NavbarItem>
          <NavbarItem>
            <Link
              href={`/image-to-video`}
              className={cn(
                "font-medium tracking-wide text-base antialiased transition-colors",
                !isActive("image-to-video") && "text-white/80 hover:text-brand-300",
                isActive("image-to-video") && "text-brand-400 hover:text-brand-400"
              )}
            >
              Image to Video
            </Link>
          </NavbarItem>
          {/* Removed duplicate/extra video entries per request */}
          <NavbarItem>
            <Link
              href={`/pricing`}
              className={cn(
                "font-medium tracking-wide text-base antialiased transition-colors",
                !isActive("pricing") && "text-white/80 hover:text-brand-300",
                isActive("pricing") && "text-brand-400 hover:text-brand-400"
              )}
            >
              Pricing
            </Link>
          </NavbarItem>
          {!isLoggedIn ? (
            <>
              <NavbarItem>
                <Button
                  className="text-white/80 hover:text-white bg-transparent border border-white/20 hover:bg-white/10 rounded-lg px-4 py-2 font-medium transition-colors"
                  variant="bordered"
                  onPress={() => setLogin(true)}
                >
                  Login
                </Button>
              </NavbarItem>
          <NavbarItem>
            <Button
              className="!bg-white !text-black font-semibold px-6 py-2 rounded-lg"
              onPress={() => setLogin(true)}
            >
              Get started free
            </Button>
          </NavbarItem>
            </>
          ) : (
            <>
              {/* Credits pill + Add button (brand style) */}
              <NavbarItem>
                <div className="flex items-center gap-3 text-white/90">
                  <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-md border border-white/10">
                    <WalletIcon className="w-4 h-4 text-white/80" aria-hidden />
                    <span className="text-sm font-medium">{loadingCredits ? '—' : (credits ?? '—')}</span>
                  </div>
                  <Button disableAnimation className="!bg-gradient-to-r !from-purple-600 !to-blue-600 !text-white font-semibold px-3 py-1 h-8 min-w-0 !rounded-md" onPress={() => (window.location.href = '/pricing')}>
                    Add
                  </Button>
                </div>
              </NavbarItem>
              {/* Avatar dropdown */}
              <NavbarItem>
                <Dropdown
                  placement="bottom-end"
                  classNames={{
                    content: "bg-gray-900 text-white border border-gray-800 shadow-xl shadow-black/40 outline-none ring-0",
                    base: "text-white"
                  }}
                >
                  <DropdownTrigger>
                    <button className="w-9 h-9 rounded-full overflow-hidden border border-gray-700 focus:outline-none focus:ring-2 focus:ring-white/20">
                      <Image src={user?.image || "/white-logo-32.png"} alt="avatar" width={36} height={36} className="w-9 h-9 object-cover" />
                    </button>
                  </DropdownTrigger>
                  <DropdownMenu aria-label="User menu" className="min-w-[300px] bg-gray-900 text-white">
                    <DropdownItem key="profile" className="cursor-default" isReadOnly>
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{user?.name || 'User'}</div>
                          <div className="text-xs text-white/70 truncate">{user?.email}</div>
                          <div className="text-xs text-white/60 mt-1 truncate">{`free Plan · ${loadingCredits ? '—' : (credits ?? '—')} Credits`}</div>
                        </div>
                      </div>
                      <Button className="mt-3 w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg" size="sm" onPress={() => (window.location.href = '/pricing')}>
                        Upgrade
                      </Button>
                      <Divider className="my-3 bg-gray-800" />
                    </DropdownItem>
                    <DropdownItem key="account" onPress={() => (window.location.href = '/account')} startContent={<UserIcon className="w-4 h-4 text-white/80" aria-hidden />}>My Account</DropdownItem>
                    <DropdownItem key="credits" onPress={() => (window.location.href = '/credits')} startContent={<CreditCardIcon className="w-4 h-4 text-white/80" aria-hidden />}>My Credits</DropdownItem>
                    <DropdownItem key="history" onPress={() => (window.location.href = '/content')} startContent={<ClockIcon className="w-4 h-4 text-white/80" aria-hidden />}>My History</DropdownItem>
                    <DropdownItem key="logout" className="text-red-400" onPress={() => logout()} startContent={<ArrowRightOnRectangleIcon className="w-4 h-4 text-red-400" aria-hidden />}>Logout</DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </NavbarItem>
            </>
          )}
        </NavbarContent>

        {/* Mobile toggle */}
        <NavbarContent className="md:hidden h-full" justify="end">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="text-white h-10"
          />
        </NavbarContent>

        {/* Mobile menu */}
        <NavbarMenu className="bg-[#0b1220] !z-[9999]">
          <NavbarMenuItem>
            <Link
              href="/"
              className={cn(
                "hover:text-brand-300",
                isActive("home") ? "text-brand-400" : "text-white/90"
              )}
              onPress={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link
              href="/gallery"
              className={cn(
                "hover:text-brand-300",
                isActive("gallery") ? "text-brand-400" : "text-white/90"
              )}
              onPress={() => setIsMenuOpen(false)}
            >
              Gallery
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link
              href="/text-to-image"
              className={cn(
                "hover:text-brand-300",
                isActive("text-to-image") ? "text-brand-400" : "text-white/90"
              )}
              onPress={() => setIsMenuOpen(false)}
            >
              AI Image Generator
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link
              href="/image-to-image"
              className={cn(
                "hover:text-brand-300",
                isActive("image-to-image") ? "text-brand-400" : "text-white/90"
              )}
              onPress={() => setIsMenuOpen(false)}
            >
              Image to Image
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link
              href="/image-to-video"
              className={cn(
                "hover:text-brand-300",
                isActive("image-to-video") ? "text-brand-400" : "text-white/90"
              )}
              onPress={() => setIsMenuOpen(false)}
            >
              Image to Video
            </Link>
          </NavbarMenuItem>
          <NavbarMenuItem>
            <Link
              href="/pricing"
              className={cn(
                "hover:text-brand-300",
                isActive("pricing") ? "text-brand-400" : "text-white/90"
              )}
              onPress={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
          </NavbarMenuItem>
          {!isLoggedIn ? (
            <>
              <NavbarMenuItem className="mt-2">
                <Button
                  className="text-white/90 hover:text-white bg-transparent border border-white/20 hover:bg-white/10 w-full"
                  variant="bordered"
                  onPress={() => { setIsMenuOpen(false); setLogin(true); }}
                >
                  Log in
                </Button>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Button className="mt-2 bg-white text-black font-semibold w-full" onPress={() => { setIsMenuOpen(false); setLogin(true); }}>Get started free</Button>
              </NavbarMenuItem>
            </>
          ) : (
            <>
              <NavbarMenuItem>
                <div className="flex items-center gap-3 text-white/90 max-w-full">
                  <Image src={user?.image || "/white-logo-32.png"} alt="avatar" width={28} height={28} className="rounded-full flex-shrink-0" />
                  <span className="text-sm truncate">{user?.name || user?.email}</span>
                </div>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <div className="flex items-center justify-between text-white/90">
                  <span className="text-xs text-white/70">Credits</span>
                  <span className="ml-3 px-2 py-1 rounded-md bg-white/10 text-white text-xs min-w-[2rem] text-center">
                    {loadingCredits ? '—' : (credits ?? '—')}
                  </span>
                </div>
              </NavbarMenuItem>
              <NavbarMenuItem>
                <Button className="mt-2 text-white/90 hover:text-white bg-transparent border border-white/20 hover:bg-white/10 w-full" onPress={() => { setIsMenuOpen(false); logout(); }}>Sign out</Button>
              </NavbarMenuItem>
            </>
          )}
        </NavbarMenu>
      </Navbar>
    </div>
  );
}
