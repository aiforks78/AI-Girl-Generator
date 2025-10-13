# 🌸 Girl Generator — AI Character Image Generator (Cloudflare + R2 + Edge)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](https://developers.cloudflare.com/workers/)
[![R2 Storage](https://img.shields.io/badge/R2-Storage-lightblue)](https://developers.cloudflare.com/r2/)
[![Website](https://img.shields.io/badge/Live-Demo-girlgenerator.net-ff69b4)](https://girlgenerator.net/?utm_source=github&utm_medium=readme)

> 🔥 **Zero-backend** AI character generator built on the edge—  
> blazing-fast R2 uploads, Cloudflare image transformations, watermark overlay, and SEO-friendly rendering.

---

## ✨ Introduction

**Girl Generator** is a lightweight AI character generator platform designed to provide:

| Feature | Description |
|---------|-------------|
| 🚀 Ultra-fast upload | Pre-signed R2 direct uploads (no backend proxy). |
| 🖼️ Edge watermarking | Real-time image transformations via Cloudflare Images (`cf.image`). |
| 🧠 Consistent characters | Prompt / LoRA templates for reproducible AI characters. |
| 🌐 SEO-friendly | SSR rendering, descriptive alt text, structured metadata. |
| 🪶 Minimal stack | No server-side post-processing; all edge-native. |

👉 **Live Demo** » <https://girlgenerator.net>

---

## 🧭 Architecture

```mermaid
graph TD
    A[Next.js (OpenNext Edge Runtime)] --> |/api/r2/sign| B[Cloudflare Worker<br/>AWS V4 presign]
    A --> |/api/checkout| C[Creem payment integration<br/>(optional)]
    A --> |Edge runtime| D[Image lazy-loading + SSR]

    E[R2 Bucket] --> |/uploads/...| F[Generated images]
    E --> G[Cloudflare Images<br/>watermark & transform]
```

---

## 🛠️ Quick Start

### 1 · Clone & Install

```bash
git clone https://github.com/your-org/girl-generator.git
cd girl-generator
pnpm install
```

### 2 · Configure Environment Variables

```bash
cp .env.example .env
# Fill in your own values:
R2_ACCOUNT_ID=xxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxx
R2_BUCKET_NAME=girl-generator
R2_PUBLIC_BASE_URL=https://cdn.girlgenerator.net
WATERMARK_IMAGE_URL=https://cdn.girlgenerator.net/watermark.png
```

### 3 · Run Development

```bash
pnpm dev
```

Run the Worker locally (R2 presign service):

```bash
cd apps/api-worker
pnpm wrangler dev
```

---

## 📤 R2 Direct Upload Example

```bash
curl -X PUT \
  "https://<ACCOUNT_ID>.r2.cloudflarestorage.com/uploads/demo.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&..." \
  -H "Host: <ACCOUNT_ID>.r2.cloudflarestorage.com" \
  -H "Content-Type: image/png" \
  --data-binary "@demo.png"
```

Include the `Host` header to avoid `SignatureDoesNotMatch`. When the presigned query string already contains `X-Amz-Content-Sha256=UNSIGNED-PAYLOAD`, the `X-Amz-Content-Sha256` header remains optional.

---

## 🖼️ Watermark & Transform

```bash
https://cdn.girlgenerator.net/uploads/demo.png
  ?fit=cover
  &width=800
  &height=800
  &draw[image]=https://cdn.girlgenerator.net/watermark.png
  &draw[gravity]=south
```

Cloudflare edge nodes cache every unique transformation—no multiple sizes required.

---

## 🧰 Example Projects

| Path | What it Shows |
|------|---------------|
| `/examples/r2-upload` | Minimal signed `PUT` upload. |
| `/examples/watermark` | Edge watermark overlay. |
| `/examples/opennext` | Full OpenNext edge SSR. |
| `/examples/queues` | Off-loading long tasks via Queues (coming soon). |
| `/examples/creem` | Creem payment + membership (optional, coming soon). |

---

## 🧑‍💻 Tech Stack

- Next.js 14 + OpenNext (edge runtime).
- Cloudflare Workers, R2, and Images.
- AWS Signature Version 4 host-only signing (TypeScript).
- Optional Creem checkout integration.
- `pnpm` monorepo workspace.

---

## 📈 SEO Strategy

- Fully server-rendered pages (`app/` directory).
- Descriptive filenames such as `ava-collins-lounge.png`.
- Automated `alt` attributes generated from prompts.
- Image and creator JSON-LD schema.
- Long-term CDN caching with `ETag`.
- README ↔ website cross-links to build authority.

---

## 🌍 Deployment

```bash
pnpm build
pnpm wrangler deploy          # Deploy Worker
pnpm dlx vercel build         # (if using Pages adaptor)
```

Cloudflare Free plan is sufficient for short tasks; prefer Queues or Durable Objects when processing exceeds 30 seconds.

---

## 🛡️ Security & Compliance

- Secrets loaded from environment variables only.
- R2 uploads watermarked by default.
- Generated characters remain fictional and non-NSFW.
- GDPR-ready legal pages (`/privacy`, `/terms`).

---

## 📢 Community Links

- **Website**: https://girlgenerator.net
- **Blog**: https://girlgenerator.net/blog
- **Discussions**: https://github.com/your-org/girl-generator/discussions
- **Contributing**: See `CONTRIBUTING.md`.

---

## 📜 License

MIT © 2025 Girl Generator.

**Additional Disclaimer**: Brand names and character names remain reserved.
