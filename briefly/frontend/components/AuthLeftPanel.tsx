export default function AuthLeftPanel() {
  return (
    <div className="auth-left-panel">
      <div className="auth-left-content">
        <div className="auth-logo">
          <ButterflyIcon />
        </div>
        <div className="auth-tagline">
          <h2>Plasma tus ideas.</h2>
          <h2 className="auth-tagline-accent">Todo en un solo lugar.</h2>
        </div>
        <p className="auth-description">
          Una plataforma de notas y organización<br />
          hecha por estudiantes, para estudiantes.
        </p>
        <div className="auth-illustration">
          <ButterflyLarge />
        </div>
      </div>
    </div>
  )
}

function ButterflyIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M18 8C14 4 6 4 4 10c-2 6 4 10 8 12 2 1 4 2 6 4 2-2 4-3 6-4 4-2 10-6 8-12C30 4 22 4 18 8z" stroke="white" strokeWidth="1.5" fill="none"/>
      <path d="M18 8v20" stroke="white" strokeWidth="1.5"/>
      <path d="M10 20c-3 3-4 7-2 9s6 1 9-2" stroke="white" strokeWidth="1.2" fill="none"/>
      <path d="M26 20c3 3 4 7 2 9s-6 1-9-2" stroke="white" strokeWidth="1.2" fill="none"/>
    </svg>
  )
}

function ButterflyLarge() {
  return (
    <svg width="220" height="220" viewBox="0 0 220 220" fill="none" opacity="0.85">
      {/* Body */}
      <line x1="110" y1="30" x2="110" y2="190" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="110" cy="26" r="5" stroke="white" strokeWidth="2" fill="none"/>
      {/* Antennae */}
      <path d="M110 21 Q100 10 90 8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d="M110 21 Q120 10 130 8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <circle cx="90" cy="8" r="2.5" fill="white"/>
      <circle cx="130" cy="8" r="2.5" fill="white"/>

      {/* Left upper wing */}
      <path d="M110 60 Q80 35 50 45 Q25 55 30 80 Q35 100 60 105 Q85 108 110 100"
        stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Left lower wing */}
      <path d="M110 100 Q85 110 65 130 Q48 148 55 165 Q62 178 80 172 Q100 165 110 145"
        stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Right upper wing */}
      <path d="M110 60 Q140 35 170 45 Q195 55 190 80 Q185 100 160 105 Q135 108 110 100"
        stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Right lower wing */}
      <path d="M110 100 Q135 110 155 130 Q172 148 165 165 Q158 178 140 172 Q120 165 110 145"
        stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>

      {/* Inner wing details - left */}
      <path d="M110 70 Q90 60 72 68 Q58 76 62 90 Q66 103 84 106 Q100 108 110 100"
        stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M110 108 Q92 115 78 132 Q68 147 74 158 Q80 166 95 162 Q107 157 110 145"
        stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>

      {/* Inner wing details - right */}
      <path d="M110 70 Q130 60 148 68 Q162 76 158 90 Q154 103 136 106 Q120 108 110 100"
        stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>
      <path d="M110 108 Q128 115 142 132 Q152 147 146 158 Q140 166 125 162 Q113 157 110 145"
        stroke="white" strokeWidth="1" fill="none" opacity="0.5"/>
    </svg>
  )
}
