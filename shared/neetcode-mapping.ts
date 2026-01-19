import neetcodeMapping from '@/shared/neetcode_mapping.json';

type MappingEntry = {
  title: string;
  neetcode_url: string;
};

const mapping = neetcodeMapping as Record<string, MappingEntry>;

const leetcodeSlugToNeetcodeUrl = new Map<string, string>();
const neetcodeSlugToLeetcodeSlug = new Map<string, string>();
const leetcodeSlugToTitle = new Map<string, string>();

function getNeetcodeSlugFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Invalid NeetCode URL:', url, error);
    return null;
  }
}

Object.entries(mapping).forEach(([leetcodeSlug, entry]) => {
  leetcodeSlugToTitle.set(leetcodeSlug, entry.title);

  if (!entry.neetcode_url) {
    return;
  }

  leetcodeSlugToNeetcodeUrl.set(leetcodeSlug, entry.neetcode_url);

  const neetcodeSlug = getNeetcodeSlugFromUrl(entry.neetcode_url);
  if (neetcodeSlug) {
    neetcodeSlugToLeetcodeSlug.set(neetcodeSlug, leetcodeSlug);
  }
});

export function getNeetcodeUrlForLeetcodeSlug(slug: string): string | null {
  return leetcodeSlugToNeetcodeUrl.get(slug) ?? null;
}

export function getLeetcodeSlugForNeetcodeSlug(slug: string): string | null {
  return neetcodeSlugToLeetcodeSlug.get(slug) ?? null;
}

export function getTitleForLeetcodeSlug(slug: string): string | null {
  return leetcodeSlugToTitle.get(slug) ?? null;
}
