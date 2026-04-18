import { SparklesIcon } from '../common/Icons'
import { useAiStore } from '../../stores/ai-store'

function AiFloatingButton() {
  const { isOpen, toggle, isGenerating } = useAiStore()

  return (
    <button
      onClick={toggle}
      className={`fixed bottom-6 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full shadow-lg
        transition-all duration-200 hover:scale-105 active:scale-95
        ${isOpen
          ? 'bg-[var(--color-accent)] text-white shadow-[var(--color-accent)]/30'
          : 'bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]'
        }
        ${isGenerating ? 'animate-pulse' : ''}`}
      title="AI"
    >
      <SparklesIcon size={18} />
    </button>
  )
}

export default AiFloatingButton
