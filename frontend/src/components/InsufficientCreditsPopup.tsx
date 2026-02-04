interface InsufficientCreditsPopupProps {
  isOpen: boolean
  creditsRequired: number
  onGetCredits: () => void
  onClose: () => void
}

const InsufficientCreditsPopup = ({ isOpen, creditsRequired, onGetCredits, onClose }: InsufficientCreditsPopupProps) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 max-w-sm sm:max-w-none w-full sm:w-auto mx-4 animate-popup-pop"
        style={{ backgroundColor: 'rgb(11, 44, 72)', minHeight: '200px' }}
      >
        <button 
          className="absolute top-4 right-4 hover:opacity-80 transition-opacity"
          onClick={onClose}
        >
          <img src="/static/app/proposal-summary/ClosePopupButton.svg" alt="Close" className="w-6 h-6" />
        </button>
        
        <div className="flex-shrink-0">
          <img src="/static/app/proposal-summary/CreditsIcon.svg" alt="Credits" className="w-16 h-16 sm:w-20 sm:h-20" />
        </div>
        
        <div className="flex flex-col gap-4 text-center sm:text-left">
          <div>
            <h3 className="text-white font-poppins font-bold text-lg sm:text-xl mb-1">Insufficient credits</h3>
            <p className="text-gray-300 font-poppins text-xs sm:text-sm">
              This action costs {creditsRequired} credits, but you don't have enough right now.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(92, 191, 192)' }}
              onClick={onGetCredits}
            >
              Get credits
            </button>
            <button 
              className="px-6 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'rgb(39, 69, 110)' }}
              onClick={onClose}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InsufficientCreditsPopup
