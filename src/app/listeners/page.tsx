import Link from "next/link";
import Button from "@/components/ui/Button";
import ListenerCard from "@/components/public/ListenerCard";
import BrandLink from "@/components/public/BrandLink";
import { getListeners } from "@/lib/d1";
import { pageMetadata } from "@/lib/page-seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata({
    title: "Our Listeners | Dukh Dealer",
    description:
      "Meet the listeners at Dukh Dealer: calm, non-judgmental people for private chat, voice and mystery video conversations.",
    path: "/listeners",
  });
}

/** Approved listeners only, read live from Admin > Listeners. */
export default async function ListenersPage() {
  const listeners = await getListeners(true).catch(() => []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 animate-fade-in sm:px-6">
      <h1 className="mb-4 text-center text-3xl font-semibold sm:text-4xl">Our Listeners</h1>
      <p className="mx-auto mb-12 max-w-lg text-center text-[var(--color-muted)]">
        The people behind <BrandLink>Dukh Dealer</BrandLink> sessions. They listen; they don&apos;t
        diagnose or give clinical advice.
      </p>

      {listeners.length === 0 ? (
        <p className="text-center text-[var(--color-muted)]">
          Our listeners will be listed here soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listeners.map((l) => (
            <ListenerCard key={l.id} listener={l} />
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <Link href="/booking">
          <Button size="lg">Book a Private Session</Button>
        </Link>
      </div>
    </div>
  );
}
