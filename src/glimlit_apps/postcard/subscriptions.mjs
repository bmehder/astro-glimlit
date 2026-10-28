// @ts-nocheck

export function nextThemeKey(handleNext, root) {
  return {
    start: (emit) => {
      const handleKeydown = (event) => {
        const editing =
          event.target instanceof HTMLElement &&
          (event.target.matches('input, textarea, select') ||
            event.target.isContentEditable ||
            event.target.closest('dialog'))
        if (
          editing ||
          event.defaultPrevented ||
          event.isComposing ||
          event.repeat ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.shiftKey
        )
          return
        if (event.key.toLowerCase() !== 'n') return
        event.preventDefault()
        emit(handleNext())
      }
      if (root) {
        root.addEventListener('keydown', handleKeydown)
        return () => root.removeEventListener('keydown', handleKeydown)
      }
      window.addEventListener('keydown', handleKeydown)
      return () => window.removeEventListener('keydown', handleKeydown)
    },
  }
}
