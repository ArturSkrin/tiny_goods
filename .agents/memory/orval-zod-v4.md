---
name: Orval zod v4 output vs zod 3.25
description: Codegen fails with "Property 'int' does not exist" — fix lives in the codegen script
---

Orval v8's zod client emits zod v4 API calls (`zod.int()`) but imports from `'zod'`, which resolves to zod 3.25's v3 root. Any spec using integer types breaks `typecheck:libs` right after orval succeeds.

**Why:** zod 3.25 ships the v4 API only under the `zod/v4` subpath.

**How to apply:** the `codegen` script in `lib/api-spec/package.json` sed-rewrites the import to `zod/v4` after orval runs. Keep that step if the script is touched; orval config `hooks.afterAllFilesWrite` did NOT work reliably.
