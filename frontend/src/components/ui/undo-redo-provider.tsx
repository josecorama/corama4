import React, { createContext, useContext, useState, useCallback } from 'react'

interface UndoRedoState {
  past: any[]
  present: any
  future: any[]
}

interface UndoRedoContextType {
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  setState: (newState: any) => void
  clearHistory: () => void
}

const UndoRedoContext = createContext<UndoRedoContextType | undefined>(undefined)

export function UndoRedoProvider({ 
  children, 
  initialState 
}: { 
  children: React.ReactNode
  initialState: any 
}) {
  const [state, setState] = useState<UndoRedoState>({
    past: [],
    present: initialState,
    future: []
  })

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  const undo = useCallback(() => {
    if (!canUndo) return

    const previous = state.past[state.past.length - 1]
    const newPast = state.past.slice(0, state.past.length - 1)

    setState({
      past: newPast,
      present: previous,
      future: [state.present, ...state.future]
    })
  }, [state, canUndo])

  const redo = useCallback(() => {
    if (!canRedo) return

    const next = state.future[0]
    const newFuture = state.future.slice(1)

    setState({
      past: [...state.past, state.present],
      present: next,
      future: newFuture
    })
  }, [state, canRedo])

  const setNewState = useCallback((newState: any) => {
    setState({
      past: [...state.past, state.present],
      present: newState,
      future: []
    })
  }, [state])

  const clearHistory = useCallback(() => {
    setState({
      past: [],
      present: state.present,
      future: []
    })
  }, [state.present])

  return (
    <UndoRedoContext.Provider value={{
      canUndo,
      canRedo,
      undo,
      redo,
      setState: setNewState,
      clearHistory
    }}>
      {children}
    </UndoRedoContext.Provider>
  )
}

export function useUndoRedo() {
  const context = useContext(UndoRedoContext)
  if (context === undefined) {
    throw new Error('useUndoRedo must be used within an UndoRedoProvider')
  }
  return context
}
