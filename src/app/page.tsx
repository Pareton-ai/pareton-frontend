export default function Home() {
  return (
    <div className="min-h-screen bg-black px-8 py-10 font-sans">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-medium tracking-tight text-white">
          Pareton
        </h1>
        <p className="text-lg text-zinc-400 sm:whitespace-nowrap leading-relaxed">
          Pushing the Pareto frontier of inference optimization.
        </p>
        <p className="text-sm text-zinc-600 mt-1">More soon.</p>
        <div className="flex gap-5 mt-2">
          <a
            href="https://x.com/pareton_ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            X
          </a>
          <a
            href="https://github.com/pareton-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            GitHub
          </a>
          <span className="text-sm text-zinc-700 cursor-default">Discord</span>
        </div>
      </div>
    </div>
  );
}
