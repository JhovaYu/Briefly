import Image from 'next/image'

export default function AuthLeftPanel() {
  return (
    <div className="auth-left-panel">
      <div className="auth-left-content">
        <div className="auth-logo">
          <Image src="/logo.png" alt="Briefly logo" width={32} height={32} />
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
          <Image src="/logo.png" alt="Briefly" width={200} height={200} style={{ opacity: 0.85 }} />
        </div>
      </div>
    </div>
  )
}
