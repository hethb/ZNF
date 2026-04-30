export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 md:max-w-4xl">
      <div className="mb-12 border-l-2 pl-6 md:pl-8" style={{ borderColor: 'rgba(194,98,26,0.4)' }}>
        <p className="section-label mb-3 block">About PathIQ</p>
        <h1 className="display-heading text-4xl leading-[1.08] md:text-6xl">
          Origin &amp;
          <br />
          <span className="gradient-text">Mission.</span>
        </h1>
      </div>

      <div className="glass-card space-y-8 p-8 md:p-10">
        <p className="text-lg leading-[1.65]" style={{ color: '#c4ad92' }}>
          PathIQ is built for{' '}
          <span className="font-semibold" style={{ color: '#d9834a' }}>
            any IHC biomarker
          </span>
          : one pipeline for intensity, tissue context, and review flags on patches or exports—so you are
          not buying a one-antibody toy.
        </p>
        <p className="type-pull border-l pl-5" style={{ borderColor: 'rgba(212,178,140,0.2)' }}>
          Manual 0–3+ reads do not scale with growing panels. PathIQ is decision-support: upload a frame,
          get tissue + score + uncertainty + a heatmap, then correct the model in your own sign-out loop.
        </p>

        <div style={{ borderTop: '1px solid rgba(212,178,140,0.08)' }} />

        <div className="space-y-4">
          <p className="section-label block">Research paper</p>
          <p className="text-base leading-8" style={{ color: '#c4ad92' }}>
            PathIQ is informed by independent research documented in{' '}
            <span className="font-semibold" style={{ color: '#f4ece0' }}>
              Exploring the Oncogenic Potential of Zinc Finger Protein 835 (ZNF835) in Cancer: Gene
              Regulation, Pathogenicity, and Diagnostic Applications through AI-Enhanced
              Immunohistochemistry
            </span>{' '}
            (Heth J. Bhatt). That work connects{' '}
            <span className="font-medium" style={{ color: '#e8d4c4' }}>ZNF835</span> biology—DNA-binding
            transcription-factor activity, RNA polymerase&nbsp;II–linked regulation, and locus context on
            chromosome&nbsp;19q13.43—with practical IHC readouts and a convolutional pipeline (including
            MobileNetV2 transfer learning, categorical supervision akin to one-hot tissue/stain labels, and
            confusion-matrix evaluation) developed to quantify staining and reduce observer variance.
          </p>
          <p className="text-base leading-8" style={{ color: '#a08060' }}>
            PathIQ generalizes those bioinformatics and deep-learning patterns to{' '}
            <span className="font-medium" style={{ color: '#c4ad92' }}>any IHC biomarker</span>: the same
            ideas for reproducible tensors, held-out metrics, and interpretable overlays now support lab
            workflows beyond the original ZNF835 study—while the paper remains the primary scientific
            reference for how the stack was first motivated and validated.
          </p>
          <p className="text-sm leading-6" style={{ color: '#7a6b59' }}>
            Gene-level background in the manuscript draws on public genome and expression resources; the
            on-slide experience here is designed to mirror the paper’s emphasis on standardized IHC
            quantification and AI-assisted histology as decision support, not autonomous diagnosis.
          </p>
          <p className="text-sm leading-6" style={{ color: '#7a6b59' }}>
            Market, pricing sketch, go-to-market, regulatory framing, and a template for your first
            pathologist note live in <span className="font-semibold" style={{ color: '#c4ad92' }}>BUSINESS.md</span>{' '}
            at the repository root (open in your editor or on GitHub next to this README).
          </p>
        </div>

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
                className="font-['Syne',sans-serif] px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
                style={{
                  background: 'rgba(194,98,26,0.08)',
                  border: '1px solid rgba(194,98,26,0.22)',
                  borderRadius: '0.1rem 0.45rem 0.1rem 0.45rem',
                  color: '#e8a060'
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
