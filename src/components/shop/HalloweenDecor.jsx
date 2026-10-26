const JackOLantern = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 86 76" aria-hidden="true">
    <path className="jack-stem" d="M40 17C38 9 42 3 49 0c2 7 0 13-4 19" />
    <path className="jack-leaf" d="M45 11c8-6 16-4 22 1-8 0-13 3-18 8" />
    <path className="jack-body" d="M43 14C19 10 5 26 8 47c3 20 20 27 35 27s32-7 35-27C81 26 67 10 43 14Z" />
    <path className="jack-rib" d="M41 15C27 16 23 31 24 47c1 15 8 24 19 26M45 15c14 1 18 16 17 32-1 15-8 24-19 26M43 16v56" />
    <path className="jack-face" d="m21 35 16 4-14 10-6-6 4-8Zm44 0-16 4 14 10 6-6-4-8ZM23 56c11 5 29 5 40 0l-5 12-7-5-8 7-8-7-7 5-5-12Z" />
    <path className="jack-highlight" d="M18 27c6-7 14-10 22-10" />
  </svg>
);

const SideSpiderWeb = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 190 230" fill="none" aria-hidden="true">
    <path className="web-radials" d="M-3 102C49 75 105 40 183 7M-3 102C54 91 114 72 190 62M-3 102c69 2 124 0 193 9M-3 102c57 23 118 40 186 50M-3 102c51 38 103 76 164 119M-3 102c22 45 38 82 52 126" />
    <path className="web-rings" d="M27 87c8 9 11 20 8 34-2 9-6 16-12 22M57 69c17 19 23 39 19 61-3 18-12 32-25 44M91 49c27 27 37 57 31 88-5 27-18 48-39 66M130 29c36 35 50 75 42 116-6 31-21 57-45 78" />
    <path className="web-loose-thread" d="M123 137c5 20 2 34-7 44-6 7-6 15 0 22" />
    <g className="web-spider" transform="translate(116 207)">
      <ellipse cy="5" rx="4.5" ry="6" />
      <circle cy="-1" r="3" />
      <path d="m-3 1-7-5m7 8-8 1m14-4 7-5M3 4l8 1" />
    </g>
    <circle className="web-knot" cx="1" cy="102" r="3" />
  </svg>
);

export default function HalloweenDecor() {
  return (
    <div className="halloween-scene" aria-hidden="true">
      <div className="halloween-scene-frame" />
      <div className="halloween-scene-sparks">
        <span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span>
      </div>

      <SideSpiderWeb className="halloween-scene-web halloween-scene-web-left" />
      <SideSpiderWeb className="halloween-scene-web halloween-scene-web-right" />

      <JackOLantern className="halloween-scene-jack jack-left" />
      <JackOLantern className="halloween-scene-jack jack-right" />
      <div className="halloween-scene-mist mist-one" />
      <div className="halloween-scene-mist mist-two" />
    </div>
  );
}
