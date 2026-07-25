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
      <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-rust">
        {title}
      </p>
      <p className="mt-3 max-w-xl text-[13.5px] leading-[1.7] text-secondary">
        {message}
      </p>
    </div>
  );
}
