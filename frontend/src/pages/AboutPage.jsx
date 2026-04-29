export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="rounded-none border border-white/60 bg-white/80 p-8 shadow-soft backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">About PathIQ</p>
        <h1 className="mt-2 text-3xl font-bold text-navy">Origin and mission</h1>

        <p className="mt-6 leading-7 text-slate-700">
          PathIQ originates from translational research into ZNF835 as a potential colorectal cancer biomarker and early convolutional
          neural network work in histological tissue classification. The mission is to give pathologists a fast, interpretable AI
          assistant for immunohistochemical scoring so expert time can shift from repetitive grading to high-value diagnostic review.
        </p>
      </div>
    </div>
  )
}
