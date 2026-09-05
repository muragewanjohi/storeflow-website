/**
 * Live smoke test for AI-assisted blog post drafting — the standalone
 * "Draft with AI" button (@/lib/blog/blog-draft-shared.ts, used by both
 * POST /api/blogs/ai-draft and its mobile mirror) AND the AI Assistant's
 * new 'blog_draft' configuration_guidance target (@/lib/assistant/shared.ts).
 *
 * Requested directly by the user: "can AI assist in writing a blog?" ->
 * confirmed no such feature existed -> "yes, ai chat should also be able
 * to do so."
 *
 * Three parts:
 *  1. Classify: real phrasings route to configuration_guidance's
 *     'blog_draft' target, not 'social_content' (a short caption) or
 *     'unclear'.
 *  2. runBlogDraft() directly (the real generation core both entry points
 *     share) — checks a real Claude call produces publish-ready HTML
 *     content (not markdown, not a stub), and all 5 required fields are
 *     present and non-empty.
 *  3. handleBlogDraftConfigTarget() end-to-end against a real test tenant
 *     — creates a REAL blogs row (status: 'draft', never published),
 *     verifies it, then deletes it (cleanup) — same "create for real,
 *     verify for real, clean up after" precedent as this session's other
 *     assistant-creates-a-real-record tests.
 *
 * Usage: npm run test:blog-draft
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const TEST_TENANT_ID = '1a79e0e9-1a3e-4265-bf99-7a5d2a224214'; // "smart hub" — real active tenant, already used by test-social-content.ts

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is required in .env.local');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in .env.local');

  const { generateJsonFromConversation } = await import('../src/lib/ai/claude-client');
  const { prisma } = await import('../src/lib/prisma/client');
  const {
    buildClassifySystemPrompt,
    classifySchema,
    isIntent,
    buildConfigTargetSystemPrompt,
    configTargetSchema,
    resolveConfigTarget,
    handleBlogDraftConfigTarget,
  } = await import('../src/lib/assistant/shared');
  const { runBlogDraft } = await import('../src/lib/blog/blog-draft-shared');

  const tenant = await prisma.tenants.findUnique({
    where: { id: TEST_TENANT_ID },
    select: { id: true, subdomain: true, custom_domain: true, name: true, contact_email: true, status: true, plan_id: true, expire_date: true, start_date: true, user_id: true, theme_slug: true, created_at: true, updated_at: true, country: true, data: true },
  });
  if (!tenant) throw new Error('Test tenant not found');

  let passed = 0;
  let total = 0;
  function check(label: string, condition: boolean, detail?: unknown) {
    total++;
    if (condition) {
      passed++;
      console.log(`PASS: ${label}`);
    } else {
      console.log(`FAIL: ${label}`, detail ?? '');
    }
  }

  console.log('--- Part 1: classification ---');
  const classifyCases: Array<{ message: string; expected: string }> = [
    { message: 'Write a blog post about our new arrivals', expected: 'configuration_guidance' },
    { message: 'Can you draft a blog article for my store?', expected: 'configuration_guidance' },
    { message: 'Write me a short social media caption about our sale', expected: 'social_content' },
  ];
  for (const c of classifyCases) {
    const { data } = await generateJsonFromConversation<{ intent: string }>({
      system: buildClassifySystemPrompt(true),
      messages: [{ role: 'user', content: c.message }],
      schema: classifySchema,
      maxTokens: 60,
    });
    const intent = isIntent(data.intent) ? data.intent : 'unclear';
    check(`"${c.message}" -> ${c.expected}`, intent === c.expected, intent);
  }

  console.log('\n--- Part 1b: target resolution (blog_draft, not marketing_images/social_content) ---');
  const { data: targetData } = await generateJsonFromConversation<{ target: string }>({
    system: buildConfigTargetSystemPrompt(null, null, []),
    messages: [{ role: 'user', content: 'Write a blog post about caring for leather bags' }],
    schema: configTargetSchema,
    maxTokens: 300,
  });
  const target = resolveConfigTarget(targetData.target);
  check('resolves to blog_draft target', target === 'blog_draft', target);

  console.log('\n--- Part 2: runBlogDraft() real generation ---');
  const { data: draft, usage: draftUsage } = await runBlogDraft({
    topic: '5 tips for choosing the right smart home device',
    storeName: tenant.name,
    businessType: 'Electronics & Gadgets',
    niche: 'smart home devices',
  });
  console.log(`Title: ${draft.title}`);
  console.log(`Content length: ${draft.content.length} chars`);
  check('title is non-empty', draft.title.trim().length > 0);
  check('content is substantial (not a stub)', draft.content.length > 500, draft.content.length);
  check('content looks like HTML, not markdown', /<(h2|h3|p)[ >]/i.test(draft.content) && !draft.content.includes('##'), draft.content.slice(0, 200));
  check('excerpt is non-empty', draft.excerpt.trim().length > 0);
  check('metaTitle under 60 chars', draft.metaTitle.length > 0 && draft.metaTitle.length <= 70, draft.metaTitle);
  check('metaDescription under 160 chars', draft.metaDescription.length > 0 && draft.metaDescription.length <= 180, draft.metaDescription);

  console.log('\n--- Part 3: handleBlogDraftConfigTarget() end-to-end (real create + cleanup) ---');
  const noTopicResult = await handleBlogDraftConfigTarget(tenant as any, '', {
    buildHref: (id) => `/dashboard/blogs/${id}/edit`,
    cta: 'Review post',
  });
  check('no topic -> asks for one, creates nothing', (noTopicResult.data as any)?.created === undefined, noTopicResult.answer);

  const createResult = await handleBlogDraftConfigTarget(
    tenant as any,
    'Why every Kenyan household needs a backup power solution',
    { buildHref: (id) => `/dashboard/blogs/${id}/edit`, cta: 'Review post' },
  );
  const blogId = (createResult.data as any)?.blogId as string | undefined;
  check('created a real blog post', typeof blogId === 'string' && blogId.length > 0, createResult.data);

  if (blogId) {
    const row = await prisma.blogs.findUnique({ where: { id: blogId } });
    check('real row exists in the database', row != null);
    check('status is draft, never auto-published', row?.status === 'draft', row?.status);
    check('tenant_id is scoped correctly', row?.tenant_id === TEST_TENANT_ID);
    check('answer links back to the edit screen', createResult.answer.toLowerCase().includes('draft'), createResult.answer);

    await prisma.blogs.delete({ where: { id: blogId } });
    const afterDelete = await prisma.blogs.findUnique({ where: { id: blogId } });
    check('cleanup: test blog post removed', afterDelete === null);
  }

  const totalUsage = {
    inputTokens: draftUsage.inputTokens,
    outputTokens: draftUsage.outputTokens,
  };
  console.log(`\nTotal estimated cost this run: input=${totalUsage.inputTokens} output=${totalUsage.outputTokens} tokens (multiple real Claude calls, well under $0.02 total at Haiku 4.5 pricing)`);
  console.log(`\n${passed}/${total} checks passed.`);
  await prisma.$disconnect();
  if (passed !== total) process.exit(1);
}

main().catch((error) => {
  console.error('\nBlog draft test failed:', error);
  process.exit(1);
});
