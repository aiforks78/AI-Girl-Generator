import Image from "next/image";
import Link from "next/link";
// import { Twitter, Instagram, Github, Globe2 } from "lucide-react";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer data-testid="footer" className="bg-black border-t border-white/10 text-white/80">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Column: Product */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-brand-400 mb-4">GIRL GENERATOR</h3>
            <ul className="space-y-3 text-sm">
              <li><Link className="hover:text-brand-300" href="/">Home</Link></li>
              <li><Link className="hover:text-brand-300" href="/text-to-image">Text to Image</Link></li>
              <li><Link className="hover:text-brand-300" href="/image-to-image">Image to Image</Link></li>
              <li><Link className="hover:text-brand-300" href="/image-to-video">Image to Video</Link></li>
              <li><Link className="hover:text-brand-300" href="/gallery">Gallery</Link></li>
            </ul>
          </div>

          {/* Column: About */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-brand-400 mb-4">ABOUT</h3>
            <ul className="space-y-3 text-sm">

              <li><Link className="hover:text-brand-300" href="/pricing">Pricing</Link></li>
              <li><Link className="hover:text-brand-300" href="/contact">Contact</Link></li>
              <li><Link className="hover:text-brand-300" href="/terms">Terms</Link></li>
              <li><Link className="hover:text-brand-300" href="/privacy">Privacy</Link></li>
              <li><Link className="hover:text-brand-300" href="/cookies">Cookies</Link></li>
            </ul>
          </div>

          {/* Column: Brand & legal */}
          <div className="md:pl-8">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/white-logo-64.png" alt="Logo" width={54} height={54} />
              <span className="text-lg font-semibold text-white">Girl Generator</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed mb-4">
              © {year} Girl Generator Inc. All rights reserved.
            </p>

            {/* Badges removed per request */}

            {/* Socials */}
            {/* <div className="flex items-center gap-4 text-white/70">
              <a href="#" aria-label="Twitter" className="hover:text-brand-300"><Twitter size={18} /></a>
              <a href="#" aria-label="Instagram" className="hover:text-brand-300"><Instagram size={18} /></a>
              <a href="#" aria-label="GitHub" className="hover:text-brand-300"><Github size={18} /></a>
              <a href="#" aria-label="Website" className="hover:text-brand-300"><Globe2 size={18} /></a>
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
