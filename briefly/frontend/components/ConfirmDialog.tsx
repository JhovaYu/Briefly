'use client'

import React, { useState, ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean
    title: string
    message: string
    resolve: ((value: boolean) => void) | null
  }>({
    open: false,
    title: '',
    message: '',
    resolve: null,
  })

  const confirm = (title: string, message: string): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ open: true, title, message, resolve })
    })
  }

  const handleConfirm = () => {
    state.resolve?.(true)
    setState(s => ({ ...s, open: false }))
  }

  const handleCancel = () => {
    state.resolve?.(false)
    setState(s => ({ ...s, open: false }))
  }

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  )

  return { confirm, dialog }
}
