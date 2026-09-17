import Link from "next/link";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "Sessions | Dukh Dealer",
  description: "Private Chat, Private Voice, and Mystery Video.",
};

const services = [
  {
    title: "Private Chat",
    desc: "Text-based private conversation. Take your time. Quiet and focused.",
  },
  {
    title: "Private Voice",
    desc: "Live voice call with a listener. Presence without the screen pressure.",
  },
  {
    title: "Mystery Video",
    desc: "Video session where the listener may wear the official mystery mask. Your camera is optional.",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 animate-fade-in">
      <h1 className="text-3xl sm:text-4xl font-semibold text-center mb-4">Sessions</h1>
      <p className="text-center text-[var(--color-muted)] mb-12">
        Three ways to have a private conversation.
      </p>
      <div className="space-y-6">
        {services.map((s) => (
          <div
            key={s.title}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 sm:p-8"
          >
            <h2 className="text-xl font-medium text-[var(--color-accent)]">{s.title}</h2>
            <p className="mt-3 text-[var(--color-muted)] leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <Link href="/packages">
          <Button size="lg">View Packages</Button>
        </Link>
      </div>
    </div>
  );
}
