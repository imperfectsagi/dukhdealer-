/**
 * Home page section order — single source of truth.
 *
 * Every home page section is rendered independently and looked up by key, so
 * changing the vertical order of the home page means editing ONLY the array
 * below. No JSX has to move.
 *
 * To reorder: move the keys.
 * To hide a section: delete (or comment out) its key.
 * To add a section: add a key to HomeSectionKey, add an entry to the `sections`
 *   record in src/app/page.tsx, then list the key here.
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
