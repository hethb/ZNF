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
          PathIQ is built for{' '}
          <span className="font-semibold" style={{ color: '#d9834a' }}>any IHC biomarker</span>
          : the same pipeline quantifies staining intensity and spatial context on patches or exports, so
          labs are not locked to one antibody or study cohort.
        </p>
        <p className="text-base leading-8" style={{ color: '#a08060' }}>
          The product goal is{' '}
          <span className="font-semibold" style={{ color: '#c4ad92' }}>Pathologists spend hours every week manually scoring 
            IHC-stained tissue slides on a zero to three-plus scale — it's 
            tedious, subjective, and doesn't scale as cancer biomarker panels keep growing. 
            PathIQ is AI-powered decision-support software that automates that scoring. You upload a slide, 
            and within seconds our system identifies the tissue type, scores the staining intensity, 
            flags anything it's uncertain about for manual review, and shows you a heatmap of exactly where it's looking — 
            so the pathologist stays in control but spends their time on judgment, not pixel counting.
          </span>
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
