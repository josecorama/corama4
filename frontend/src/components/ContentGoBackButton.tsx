import { useTranslation } from '../i18n'

interface ContentGoBackButtonProps {
  onClick: () => void
}

// Compact "Go Back" pill anchored to the top-left of the content column, flush
// against the sidebar (desktop only; the sidebar keeps its own button on mobile).
const ContentGoBackButton = ({ onClick }: ContentGoBackButtonProps) => {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden lg:flex absolute top-3 -left-4 z-10 items-center gap-2 h-11 pl-4 pr-6 text-white font-poppins text-sm hover:opacity-90 transition-opacity"
      style={{
        background: 'linear-gradient(180deg, #1C4262 6.25%, #284165 96%)',
        borderRadius: '0 9999px 9999px 0'
      }}
    >
      <img src="/static/app/dashboard/GoBack.svg" alt="" className="w-[25px] h-[25px]" aria-hidden="true" />
      <span className="whitespace-nowrap">{t('goBack')}</span>
    </button>
  )
}

export default ContentGoBackButton
