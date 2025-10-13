# Shared Modules

This directory stores lightweight configuration objects and constants shared between the frontend (`apps/frontend`) and the API Worker (`apps/api-worker`). Only pure data structures live here—no runtime dependencies.

## Directory Guidelines

- `credit-config.ts`: Credit-related constants, pricing configuration, and validation helpers.
- `girl-styles.ts`: Style configuration and prompt helper utilities.

## Usage

Each subpackage configures the `@shared/*` alias in its `tsconfig.json`, so you can import directly:

```ts
import { CREDIT_COSTS } from "@shared/credit-config";
import { GIRL_STYLES } from "@shared/girl-styles";
```

## Acceptance Criteria

- **Side-effect free:** Files must not access environment variables, network calls, storage, or other runtime capabilities.
- **Type-safe:** Exports should ship with the required TypeScript types or literal constraints to avoid duplication across packages.
- **Shared value:** Only include items needed by both the frontend and the worker, or those explicitly planned for sharing.
- **Coordinated changes:** Call out affected packages in the PR description when adding or updating entries, and update related docs accordingly.

If you need to add heavier logic (e.g., monitoring, caching, CDN wrappers), confirm in architecture review whether it belongs here or should remain package-specific.
