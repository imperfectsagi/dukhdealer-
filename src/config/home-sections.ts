/**
 * Home page sections — keys, labels and order resolution.
 *
 * Every home page section is rendered independently and looked up by key, so
 * the vertical order of the homepage is just a list of keys.
 *
 * Order comes from Admin Panel -> Home Sections (stored in
 * site_settings.home_section_order). HOME_SECTION_ORDER below is the fallback
 * used when no admin order has been saved yet.
 *
 * To add a section: add a key to HomeSectionKey, a label to
 * HOME_SECTION_LABELS, an entry to the `sections` record in src/app/page.tsx,
 * and the key to HOME_SECTION_ORDER. It then appears in the admin reorder
 * screen automatically, and is appended to the end of any order an admin saved
 * before it existed.
 */

export type HomeSectionKey =
  | "hero"
  | "howItWorks"
  | "conversationTypes"
  | "packages"
  | "mysteryMask"
  | "reviews"
  | "faq"
  | "instagram"
  | "finalCta";

/** Default order, used until an admin saves their own. */
export const HOME_SECTION_ORDER: HomeSectionKey[] = [
  "hero",
  "howItWorks",
  "conversationTypes",
  "packages",
  "mysteryMask",
  "reviews",
  "faq",
  "instagram",
  "finalCta",
];

/** Human labels for the admin reorder screen. */
export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: "Hero banner",
  howItWorks: "How it works",
  conversationTypes: "Conversation types",
  packages: "Packages",
  mysteryMask: "The mystery mask",
  reviews: "Reviews",
  faq: "FAQ",
  instagram: "Instagram follow",
  finalCta: "Final call to action",
};

function isHomeSectionKey(value: string): value is HomeSectionKey {
  return (HOME_SECTION_ORDER as string[]).includes(value);
}

/**
 * Turn a stored order into a safe, complete list of section keys:
 *   - unknown / renamed keys are dropped
 *   - duplicates are removed
 *   - sections missing from the saved order are appended in default order
 *   - an empty or invalid saved order falls back to the default entirely
 *
 * Used by both the public homepage and the admin reorder screen, so the two
 * always agree on what exists.
 */
export function resolveHomeSectionOrder(stored?: string[] | null): HomeSectionKey[] {
  const seen = new Set<HomeSectionKey>();
  const out: HomeSectionKey[] = [];

  for (const key of stored || []) {
    if (isHomeSectionKey(key) && !seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  for (const key of HOME_SECTION_ORDER) {
    if (!seen.has(key)) out.push(key);
  }
  return out;
}
