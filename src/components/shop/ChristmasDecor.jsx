const PineBranch = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 170 250" fill="none" aria-hidden="true">
    <path className="christmas-pine-stem" d="M12 8c30 42 52 84 68 126 13 35 25 72 37 110" />
    <g className="christmas-pine-needles">
      <path d="M29 38 4 30M35 49 9 53M43 63 18 76M50 78 29 96M59 95 39 117M67 113 49 138M77 135 58 159M87 158 69 184M98 184 79 211" />
      <path d="m29 38 7-25m0 38 19-26M44 64l28-19M51 79l32-13M60 96l36-5M68 114l39 3M78 136l40 11M88 159l39 18M99 184l37 26" />
    </g>
    <circle className="christmas-pine-berry" cx="38" cy="53" r="5" />
    <circle className="christmas-pine-berry" cx="61" cy="96" r="4" />
    <circle className="christmas-pine-berry" cx="87" cy="158" r="5" />
  </svg>
);

export default function ChristmasDecor() {
  return (
    <div className="christmas-scene" aria-hidden="true">
      <div className="christmas-scene-glow" />
      <PineBranch className="christmas-pine christmas-pine-left" />
      <PineBranch className="christmas-pine christmas-pine-right" />
      <div className="christmas-snowfall christmas-snowfall-near">
        {Array.from({ length: 12 }, (_, index) => <span key={index}>✦</span>)}
      </div>
      <div className="christmas-snowfall christmas-snowfall-far">
        {Array.from({ length: 10 }, (_, index) => <span key={index}>•</span>)}
      </div>
      <div className="christmas-ornament ornament-left"><span /></div>
      <div className="christmas-ornament ornament-right"><span /></div>
    </div>
  );
}
