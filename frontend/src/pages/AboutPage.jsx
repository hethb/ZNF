export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-28">
      {/* Editorial header */}
      <div className="mb-10">
        <p className="section-label mb-3 block">About PathIQ</p>
        <h1 className="display-heading text-5xl leading-tight md:text-6xl">
          Origin &amp;
          <br />
          <span className="gradient-text">Mission.</span>
        </h1>
      </div>

      {/* Content card */}
      <div className="glass-card space-y-6 p-8 md:p-10">
        <p className="text-lg leading-8" style={{ color: '#c4ad92' }}>
          PathIQ originates from translational research into{' '}
          <span className="font-semibold" style={{ color: '#d9834a' }}>ZNF835</span> as a potential
          colorectal cancer biomarker and early convolutional neural network work in histological tissue
          classification.
        </p>
        <p className="text-base leading-8" style={{ color: '#a08060' }}>
          The mission is to give pathologists a fast, interpretable AI assistant for immunohistochemical
          scoring — so expert time can shift from repetitive grading to high-value diagnostic review.
        </p>

        <div style={{ borderTop: '1px solid rgba(212,178,140,0.08)' }} />

        {/* Capability chips */}
        <div>
          <p className="section-label mb-4 block">What it does</p>
          <div className="flex flex-wrap gap-2.5">
            {[
              'Tissue classification',
              'IHC intensity scoring',
              'Uncertainty quantification',
              'Grad-CAM visualisation',
              'Batch analysis',
              'CSV export'
            ].map((tag) => (
              <span
                key={tag}
                className="rounded-lg px-3.5 py-1.5 text-sm font-medium"
                style={{
                  background: 'rgba(194,98,26,0.1)',
                  border: '1px solid rgba(194,98,26,0.22)',
                  color: '#d9834a'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
