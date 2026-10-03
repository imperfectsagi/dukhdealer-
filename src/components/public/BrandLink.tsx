import { absoluteUrl } from "@/lib/seo";

/**
 * In-copy link back to the homepage, anchored with the brand name.
 * Used in body text on About, blog posts, sessions, packages and listeners so the
 * homepage is the page every other page points at for "Dukh Dealer".
 */
export default function BrandLink({ children = "Dukh Dealer" }: { children?: React.ReactNode }) {
  return (
    <a
      href={absoluteUrl("/")}
      className="font-medium text-[var(--color-primary)] underline underline-offset-2 hover:text-[var(--color-accent)]"
    >
      {children}
    </a>
  );
}
