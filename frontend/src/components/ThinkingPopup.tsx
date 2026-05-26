import Lottie from 'lottie-react'
import loadingAnimation from '../assets/LoadingAnimationLogo.json'

interface ThinkingPopupProps {
  isVisible: boolean
  text?: string
}

const ThinkingPopup: React.FC<ThinkingPopupProps> = ({ isVisible, text = 'Thinking' }) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="flex flex-col items-center justify-center rounded-3xl px-16 py-12"
        style={{ backgroundColor: '#0F2A3D' }}
      >
        {/* Text with animated ellipsis */}
        <div className="text-white font-poppins font-bold text-2xl mb-8">
          {text}
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

// Inline loading component for use in sections (not a popup)
interface InlineLoadingProps {
  text?: string
  size?: 'small' | 'medium' | 'large'
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ text = 'Thinking', size = 'medium' }) => {
  const sizeClasses = {
    small: { container: 'w-16 h-16', text: 'text-sm' },
    medium: { container: 'w-24 h-24', text: 'text-base' },
    large: { container: 'w-40 h-40', text: 'text-xl' }
  }

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Text with animated ellipsis - now above the animation */}
      <div className={`text-white font-poppins font-semibold ${sizeClasses[size].text} mb-2`}>
        {text}
        <span className="inline-block">
          <span className="animate-ellipsis">...</span>
        </span>
      </div>
      
      {/* Animated Lottie logo */}
      <div className={sizeClasses[size].container}>
        <Lottie 
          animationData={loadingAnimation} 
          loop={true}
          autoplay={true}
        />
      </div>
    </div>
  )
}

// Chat bubble loading component for AI Assistant
interface ChatBubbleLoadingProps {
  timestamp: string
}

export const ChatBubbleLoading: React.FC<ChatBubbleLoadingProps> = ({ timestamp }) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-full sm:max-w-xl lg:max-w-2xl">
        <p className="text-gray-400 font-poppins text-xs mb-1">{timestamp}</p>
        <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-white text-gray-800">
          <div className="flex flex-col items-center justify-center py-2">
            {/* Animated Lottie logo */}
            <div className="w-20 h-20">
              <Lottie 
                animationData={loadingAnimation} 
                loop={true}
                autoplay={true}
              />
            </div>
            
            {/* Thinking text with animated ellipsis */}
            <div className="text-gray-600 font-poppins font-semibold text-sm mt-1">
              Thinking
              <span className="inline-block">
                <span className="animate-ellipsis">...</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThinkingPopup
