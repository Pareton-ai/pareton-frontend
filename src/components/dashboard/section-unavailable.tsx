import { Eyebrow } from "@/components/ui/eyebrow";

type SectionUnavailableProps = {
  title?: string;
  message?: string;
};

export function SectionUnavailable({
  title = "Temporarily unavailable",
  message = "The Pareton API could not serve this section right now. Try again shortly.",
}: SectionUnavailableProps) {
  return (
    <div className="border border-border px-5 py-8">
      <Eyebrow tone="rust">{title}</Eyebrow>
      <p className="mt-3 max-w-xl text-body-lg leading-relaxed text-secondary">
        {message}
      </p>
    </div>
  );
}
