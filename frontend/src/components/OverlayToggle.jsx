export default function OverlayToggle({ overlays, activeOverlay, onOverlayChange }) {
  return (
    <div className="overlay-pills" role="tablist" aria-label="Slide overlays">
      {overlays.map((item) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={activeOverlay === item}
          className={`overlay-pill ${activeOverlay === item ? 'overlay-pill-active' : ''}`}
          onClick={() => onOverlayChange(item)}
        >
          {item}
        </button>
      ))}
    </div>
  )
}
