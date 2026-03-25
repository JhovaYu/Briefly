import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Briefly — Productividad para Estudiantes',
  description: 'Plataforma de productividad para estudiantes universitarios con notas colaborativas, tareas, calendario y tableros Kanban.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
