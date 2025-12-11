import { useState, useEffect } from 'react'

interface FilterPopupProps {
  isOpen: boolean
  onClose: () => void
  onApply: (contractType: string, states: string[]) => void
}

const FilterPopup = ({ isOpen, onClose, onApply }: FilterPopupProps) => {
  // Track which contract types are selected (can be multiple: federal, state, or both)
  const [federalSelected, setFederalSelected] = useState(false)
  const [stateSelected, setStateSelected] = useState(false)
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [error, setError] = useState('')
  
  const ALL_STATES = ['IL', 'IN']

  useEffect(() => {
    // Reset to nothing selected when popup opens (fresh state each time)
    setFederalSelected(false)
    setStateSelected(false)
    setSelectedStates([])
    setError('')
  }, [isOpen])

  // Derive contractType for the parent component
  const getContractType = () => {
    if (federalSelected && stateSelected) return 'all'
    if (federalSelected) return 'federal'
    if (stateSelected) return 'state'
    return ''
  }

  const handleContractTypeChange = (type: string) => {
    if (type === 'all') {
      // "All Contracts" is a master toggle - selects/deselects everything
      const allCurrentlySelected = federalSelected && stateSelected && selectedStates.includes('all')
      if (allCurrentlySelected) {
        // Deselect everything
        setFederalSelected(false)
        setStateSelected(false)
        setSelectedStates([])
      } else {
        // Select everything
        setFederalSelected(true)
        setStateSelected(true)
        setSelectedStates(['all', ...ALL_STATES])
      }
    } else if (type === 'federal') {
      setFederalSelected(!federalSelected)
    } else if (type === 'state') {
      const newStateSelected = !stateSelected
      setStateSelected(newStateSelected)
      if (!newStateSelected) {
        // Clear state selections when State is deselected
        setSelectedStates([])
      }
    }
    setError('')
  }

  const handleStateToggle = (state: string) => {
    if (state === 'all') {
      // When "All States" is selected, select all individual states too
      if (selectedStates.includes('all')) {
        // Deselect all states
        setSelectedStates([])
      } else {
        // Select all states
        setSelectedStates(['all', ...ALL_STATES])
      }
    } else {
      // Toggle individual state
      const newStates = [...selectedStates]
      if (newStates.includes(state)) {
        // Remove this state and also remove 'all' if it was selected
        const filtered = newStates.filter(s => s !== state && s !== 'all')
        setSelectedStates(filtered)
      } else {
        // Add this state
        newStates.push(state)
        // Check if all individual states are now selected, if so add 'all'
        const hasAllIndividual = ALL_STATES.every(s => newStates.includes(s))
        if (hasAllIndividual && !newStates.includes('all')) {
          newStates.push('all')
        }
        setSelectedStates(newStates)
      }
    }
    setError('')
  }

  const handleApply = () => {
    // If State is selected but no states are chosen, show error
    if (stateSelected && selectedStates.length === 0) {
      setError('Please select at least one state')
      return
    }
    onApply(getContractType(), selectedStates)
    onClose()
  }

  if (!isOpen) return null

  const isStateSelected = (state: string) => selectedStates.includes(state)
  // Show states section when "State" is selected (either alone or with Federal)
  const showStatesSection = stateSelected

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        className="relative rounded-2xl p-6 w-[320px]"
        style={{ backgroundColor: '#1e2a3a', border: '1px solid #3a4a5a' }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 hover:opacity-80"
        >
          <img src="/static/app/dashboard/ClosePop.svg" alt="Close" className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-white font-poppins text-xl font-semibold text-center mb-6">
          Select Your Filters
        </h2>

        {/* Contract Type Section */}
        <div className="mb-4">
          <h3 className="text-white font-poppins text-sm font-semibold mb-3">Contract Type</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleContractTypeChange('all')}
              className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                federalSelected && stateSelected
                  ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                  : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
              }`}
            >
              All Contracts
            </button>
            <button
              onClick={() => handleContractTypeChange('federal')}
              className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                federalSelected
                  ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                  : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
              }`}
            >
              Federal
            </button>
            <button
              onClick={() => handleContractTypeChange('state')}
              className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                stateSelected
                  ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                  : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
              }`}
            >
              State
            </button>
          </div>
        </div>

        {/* States Section - Only show when State or All Contracts is selected */}
        {showStatesSection && (
          <div className="mb-4">
            <h3 className="text-white font-poppins text-sm font-semibold mb-3">Please Select One Or More States</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleStateToggle('all')}
                className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                  isStateSelected('all')
                    ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                    : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
                }`}
              >
                All States
              </button>
              <button
                onClick={() => handleStateToggle('IL')}
                className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                  isStateSelected('IL')
                    ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                    : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
                }`}
              >
                Illinois (IL)
              </button>
              <button
                onClick={() => handleStateToggle('IN')}
                className={`px-4 py-2 rounded-full font-poppins text-sm transition-colors ${
                  isStateSelected('IN')
                    ? 'bg-[#6bb4b5] text-white border border-[#6bb4b5]'
                    : 'bg-[#2a3a4a] text-gray-300 border border-[#3a4a5a] hover:border-[#5a6a7a]'
                }`}
              >
                Indiana (IN)
              </button>
            </div>
            {error && (
              <p className="text-red-400 font-poppins text-xs mt-2">{error}</p>
            )}
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={handleApply}
          className="w-full py-3 rounded-full font-poppins text-sm font-semibold text-white mt-4"
          style={{ backgroundColor: '#6bb4b5' }}
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export default FilterPopup
