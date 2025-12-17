import Lottie from 'lottie-react'
import loadingAnimation from '../assets/LoadingAnimationLogo.json'

interface ThinkingPopupProps {
  isVisible: boolean
}

const ThinkingPopup: React.FC<ThinkingPopupProps> = ({ isVisible }) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="flex flex-col items-center justify-center rounded-3xl px-16 py-12"
        style={{ backgroundColor: '#0F2A3D' }}
      >
        {/* Thinking text with animated ellipsis */}
        <div className="text-white font-poppins font-bold text-2xl mb-8">
          Thinking
          <span className="inline-block w-8">
            <span className="animate-ellipsis">...</span>
          </span>
        </div>
        
        {/* Animated Lottie logo */}
        <div className="w-40 h-40">
          <Lottie 
            animationData={loadingAnimation} 
            loop={true}
            autoplay={true}
          />
        </div>
      </div>
    </div>
  )
}

export default ThinkingPopup
