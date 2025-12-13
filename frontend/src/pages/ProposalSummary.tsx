import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import { api } from '../services/api'

// SVG asset paths
const CheckIcon = '/static/app/contract-analysis/Check.svg'
const EmptyCheckIcon = '/static/app/contract-analysis/EmptyCheck.svg'
const LeftArrowIcon = '/static/app/team-builder/LeftArrow.svg'
const RightArrowIcon = '/static/app/team-builder/RightArrow.svg'
const RemoveIcon = '/static/app/team-builder/Remove.svg'
const AddIcon = '/static/app/team-builder/Add.svg'
const ContinueIcon = '/static/app/contract-analysis/Continue.svg'

interface ProposalSummaryState {
  contractName?: string
  contractId?: string
  contractAgency?: string
  contractCategory?: string
  aiFindings?: string
  aiSuggestions?: string
  teamMembers?: Array<{name: string; role: string; email?: string; phone?: string}>
}

interface LaborCostItem {
  id: string
  role: string
  hours: number
  rate: number
  cost: number
}

interface MaterialItem {
  id: string
  item: string
  quantity: number
  unit_cost: number
  cost: number
}

const ProposalSummary = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ProposalSummaryState | null
  
  // Progress - steps 1 and 2 are complete
  const step1Complete = true
  const step2Complete = true
  
  // AI Strategy state
  const [aiStrategy, setAiStrategy] = useState<string>('')
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(false)
  
  // Labor Costs state
  const [laborCosts, setLaborCosts] = useState<LaborCostItem[]>([])
  const [currentLaborIndex, setCurrentLaborIndex] = useState(0)
  const [laborRole, setLaborRole] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const [laborRate, setLaborRate] = useState('')
  
  // Materials & Equipment state
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState(0)
  const [materialItem, setMaterialItem] = useState('')
  const [materialQuantity, setMaterialQuantity] = useState('')
  const [materialUnitCost, setMaterialUnitCost] = useState('')
  
  // Margin & Risk state
  const [profitMarginPct, setProfitMarginPct] = useState('')
  const [riskReservePct, setRiskReservePct] = useState('')
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  
  // Generate unique ID
  const generateId = () => Math.random().toString(36).substr(2, 9)
  
  // Calculate totals
  const laborTotal = laborCosts.reduce((sum, item) => sum + (item.hours * item.rate), 0)
  const materialsTotal = materials.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
  const subtotal = laborTotal + materialsTotal
  const profitMargin = subtotal * (parseFloat(profitMarginPct) || 0) / 100
  const riskReserve = subtotal * (parseFloat(riskReservePct) || 0) / 100
  const totalBidAmount = subtotal + profitMargin + riskReserve
  
  // Load existing summary and generate strategy on mount
  useEffect(() => {
    const loadSummaryAndStrategy = async () => {
      if (!state?.contractId) return
      
      // Try to load existing summary
      try {
        const summaryResponse = await api.getProposalSummary(state.contractId)
        if (summaryResponse.success && summaryResponse.summary) {
          const summary = summaryResponse.summary
          if (summary.ai_strategy) {
            setAiStrategy(summary.ai_strategy)
          }
          if (summary.labor_costs && summary.labor_costs.length > 0) {
            setLaborCosts(summary.labor_costs)
          }
          if (summary.materials && summary.materials.length > 0) {
            setMaterials(summary.materials)
          }
          if (summary.margin_risk) {
            setProfitMarginPct(String(summary.margin_risk.profit_margin_pct || ''))
            setRiskReservePct(String(summary.margin_risk.risk_reserve_pct || ''))
          }
          // If we have a saved strategy, don't regenerate
          if (summary.ai_strategy) return
        }
      } catch (error) {
        console.error('Error loading summary:', error)
      }
      
      // Generate strategy if not found
      if (state?.aiFindings && !aiStrategy) {
        setIsLoadingStrategy(true)
        try {
          const response = await api.generateProposalStrategy({
            contract_id: state.contractId || '',
            contract_name: state.contractName || 'Contract',
            ai_findings: state.aiFindings,
            ai_suggestions: state.aiSuggestions || '',
            team_members: state.teamMembers || []
          })
          if (response.success && response.strategy) {
            setAiStrategy(response.strategy)
          }
        } catch (error) {
          console.error('Error generating strategy:', error)
        } finally {
          setIsLoadingStrategy(false)
        }
      }
    }
    
    loadSummaryAndStrategy()
  }, [state?.contractId, state?.aiFindings])
  
  // Labor cost handlers
  const handleAddLaborRole = () => {
    if (!laborRole) return
    
    const hours = parseFloat(laborHours) || 0
    const rate = parseFloat(laborRate) || 0
    
    const newItem: LaborCostItem = {
      id: generateId(),
      role: laborRole,
      hours,
      rate,
      cost: hours * rate
    }
    
    setLaborCosts(prev => [...prev, newItem])
    setCurrentLaborIndex(laborCosts.length)
    setLaborRole('')
    setLaborHours('')
    setLaborRate('')
  }
  
  const handleDeleteLaborRole = () => {
    if (laborCosts.length === 0) return
    
    setLaborCosts(prev => prev.filter((_, i) => i !== currentLaborIndex))
    if (currentLaborIndex >= laborCosts.length - 1 && currentLaborIndex > 0) {
      setCurrentLaborIndex(prev => prev - 1)
    }
  }
  
  const handlePrevLabor = () => {
    if (currentLaborIndex > 0) {
      setCurrentLaborIndex(prev => prev - 1)
    }
  }
  
  const handleNextLabor = () => {
    if (currentLaborIndex < laborCosts.length - 1) {
      setCurrentLaborIndex(prev => prev + 1)
    }
  }
  
  // Materials handlers
  const handleAddMaterial = () => {
    if (!materialItem) return
    
    const quantity = parseFloat(materialQuantity) || 0
    const unitCost = parseFloat(materialUnitCost) || 0
    
    const newItem: MaterialItem = {
      id: generateId(),
      item: materialItem,
      quantity,
      unit_cost: unitCost,
      cost: quantity * unitCost
    }
    
    setMaterials(prev => [...prev, newItem])
    setCurrentMaterialIndex(materials.length)
    setMaterialItem('')
    setMaterialQuantity('')
    setMaterialUnitCost('')
  }
  
  const handleDeleteMaterial = () => {
    if (materials.length === 0) return
    
    setMaterials(prev => prev.filter((_, i) => i !== currentMaterialIndex))
    if (currentMaterialIndex >= materials.length - 1 && currentMaterialIndex > 0) {
      setCurrentMaterialIndex(prev => prev - 1)
    }
  }
  
  const handlePrevMaterial = () => {
    if (currentMaterialIndex > 0) {
      setCurrentMaterialIndex(prev => prev - 1)
    }
  }
  
  const handleNextMaterial = () => {
    if (currentMaterialIndex < materials.length - 1) {
      setCurrentMaterialIndex(prev => prev + 1)
    }
  }
  
  // Save summary handler
  const handleSaveSummary = async () => {
    if (!state?.contractId) {
      setSaveMessage('No contract ID available')
      return
    }
    
    setIsSaving(true)
    setSaveMessage(null)
    
    try {
      const response = await api.saveProposalSummary({
        contract_id: state.contractId,
        contract_name: state.contractName || '',
        ai_findings: state.aiFindings || '',
        ai_suggestions: state.aiSuggestions || '',
        ai_strategy: aiStrategy,
        team_members: state.teamMembers || [],
        labor_costs: laborCosts,
        materials: materials,
        margin_risk: {
          profit_margin_pct: parseFloat(profitMarginPct) || 0,
          risk_reserve_pct: parseFloat(riskReservePct) || 0
        }
      })
      
      if (response.success) {
        setSaveMessage('Summary saved successfully!')
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage(response.error || 'Failed to save summary')
      }
    } catch (error) {
      console.error('Error saving summary:', error)
      setSaveMessage('Failed to save summary')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleGoBack = () => {
    navigate('/proposal-team', { state })
  }
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return amount.toFixed(2) + '$'
  }
  
  // Get current labor item for display
  const currentLabor = laborCosts[currentLaborIndex]
  const currentMaterial = materials[currentMaterialIndex]

  return (
    <div className="h-screen bg-corama-dark flex flex-col overflow-hidden">
      <Header credits={5} />
      
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block fixed left-0 right-0 top-16 h-px bg-white z-50" aria-hidden="true" />
        
        <Sidebar onGoBack={handleGoBack} />
      
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 p-3 sm:p-4 lg:p-5 overflow-y-auto flex flex-col">
            {/* Page Title */}
            <div className="text-center mb-4 flex-shrink-0">
              <h1 className="text-white font-poppins font-bold text-xl lg:text-2xl mb-3">Proposal Summary</h1>
              
              {/* Progress Circles - First two checked, third empty */}
              <div className="flex justify-center gap-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative">
                    {(step === 1 && step1Complete) || (step === 2 && step2Complete) ? (
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-corama-teal/50 blur-md" />
                        <img src={CheckIcon} alt={`Step ${step} Complete`} className="w-14 h-14 relative z-10" />
                      </div>
                    ) : (
                      <img src={EmptyCheckIcon} alt={`Step ${step}`} className="w-14 h-14" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* AI Recommended Strategy - White Card */}
            <div className="bg-white rounded-2xl p-4 mb-4 flex-shrink-0">
              <h2 className="text-gray-800 font-poppins font-semibold text-lg mb-2">AI Recommended Strategy</h2>
              <div className="text-gray-600 font-poppins text-sm">
                {isLoadingStrategy ? (
                  <p className="text-gray-500 italic">Generating AI strategy...</p>
                ) : aiStrategy ? (
                  <p>{aiStrategy}</p>
                ) : (
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam turpis dolor, mollis vel lacinia in, suscipit suscipit odio. In tristique metus velit, vitae fermentum enim maximus et. Donec in sollicitudin justo, vitae euismod dolor. Curabitur at nisl sit amet nibh dignissim viverra quis non tellus.</p>
                )}
              </div>
            </div>

            {/* Labor Costs Section */}
            <div className="rounded-2xl border border-white p-4 mb-4 flex-shrink-0" style={{ backgroundColor: '#333c4d' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-poppins font-semibold text-lg">Labor Costs</h3>
                {laborCosts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-white font-poppins text-sm">{currentLaborIndex + 1} of {laborCosts.length}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={handlePrevLabor}
                        disabled={currentLaborIndex === 0}
                        className="p-1 hover:opacity-80 disabled:opacity-30"
                      >
                        <img src={LeftArrowIcon} alt="Previous" className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleNextLabor}
                        disabled={currentLaborIndex >= laborCosts.length - 1}
                        className="p-1 hover:opacity-80 disabled:opacity-30"
                      >
                        <img src={RightArrowIcon} alt="Next" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Column Headers */}
              <div className="grid grid-cols-4 gap-3 mb-2">
                <span className="text-corama-teal font-poppins text-sm">Role</span>
                <span className="text-corama-teal font-poppins text-sm">Hours</span>
                <span className="text-corama-teal font-poppins text-sm">Rate ($/hr)</span>
                <span className="text-corama-teal font-poppins text-sm">Cost</span>
              </div>
              
              {/* Input Row or Display Row */}
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-4 gap-3 flex-1">
                  {currentLabor ? (
                    <>
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={currentLabor.role}
                        readOnly
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={currentLabor.hours}
                        readOnly
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={currentLabor.rate}
                        readOnly
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={formatCurrency(currentLabor.cost)}
                        readOnly
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        placeholder="Project Manager"
                        value={laborRole}
                        onChange={e => setLaborRole(e.target.value)}
                      />
                      <input
                        type="number"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        placeholder="40"
                        value={laborHours}
                        onChange={e => setLaborHours(e.target.value)}
                      />
                      <input
                        type="number"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        placeholder="75"
                        value={laborRate}
                        onChange={e => setLaborRate(e.target.value)}
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-gray-200 text-gray-600 outline-none font-poppins text-sm"
                        value={formatCurrency((parseFloat(laborHours) || 0) * (parseFloat(laborRate) || 0))}
                        readOnly
                      />
                    </>
                  )}
                </div>
                
                <button
                  onClick={handleAddLaborRole}
                  className="flex items-center gap-2 px-4 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#99C8CA' }}
                >
                  Add Role
                  <img src={AddIcon} alt="" className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleDeleteLaborRole}
                  disabled={laborCosts.length === 0}
                  className="p-2 hover:opacity-80 disabled:opacity-30"
                >
                  <img src={RemoveIcon} alt="Delete" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Materials & Equipment Section */}
            <div className="rounded-2xl border border-white p-4 mb-4 flex-shrink-0" style={{ backgroundColor: '#333c4d' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-poppins font-semibold text-lg">Materials & Equipment</h3>
                {materials.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-white font-poppins text-sm">{currentMaterialIndex + 1} of {materials.length}</span>
                    <div className="flex gap-1">
                      <button 
                        onClick={handlePrevMaterial}
                        disabled={currentMaterialIndex === 0}
                        className="p-1 hover:opacity-80 disabled:opacity-30"
                      >
                        <img src={LeftArrowIcon} alt="Previous" className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={handleNextMaterial}
                        disabled={currentMaterialIndex >= materials.length - 1}
                        className="p-1 hover:opacity-80 disabled:opacity-30"
                      >
                        <img src={RightArrowIcon} alt="Next" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Column Headers */}
              <div className="grid grid-cols-4 gap-3 mb-2">
                <span className="text-corama-teal font-poppins text-sm">Item</span>
                <span className="text-corama-teal font-poppins text-sm">Quantity</span>
                <span className="text-corama-teal font-poppins text-sm">Unit Cost</span>
                <span className="text-corama-teal font-poppins text-sm">Cost</span>
              </div>
              
              {/* Input Row or Display Row */}
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-4 gap-3 flex-1">
                  {currentMaterial ? (
                    <>
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={currentMaterial.item}
                        readOnly
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={currentMaterial.quantity}
                        readOnly
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={currentMaterial.unit_cost}
                        readOnly
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        value={formatCurrency(currentMaterial.cost)}
                        readOnly
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        placeholder="Laptop"
                        value={materialItem}
                        onChange={e => setMaterialItem(e.target.value)}
                      />
                      <input
                        type="number"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        placeholder="5"
                        value={materialQuantity}
                        onChange={e => setMaterialQuantity(e.target.value)}
                      />
                      <input
                        type="number"
                        className="rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                        placeholder="1200"
                        value={materialUnitCost}
                        onChange={e => setMaterialUnitCost(e.target.value)}
                      />
                      <input
                        type="text"
                        className="rounded-lg px-3 py-2 bg-gray-200 text-gray-600 outline-none font-poppins text-sm"
                        value={formatCurrency((parseFloat(materialQuantity) || 0) * (parseFloat(materialUnitCost) || 0))}
                        readOnly
                      />
                    </>
                  )}
                </div>
                
                <button
                  onClick={handleAddMaterial}
                  className="flex items-center gap-2 px-4 py-2 rounded-full font-poppins font-semibold text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#99C8CA' }}
                >
                  Add Item
                  <img src={AddIcon} alt="" className="w-5 h-5" />
                </button>
                
                <button
                  onClick={handleDeleteMaterial}
                  disabled={materials.length === 0}
                  className="p-2 hover:opacity-80 disabled:opacity-30"
                >
                  <img src={RemoveIcon} alt="Delete" className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Margin & Risk + Proposal Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 flex-shrink-0">
              {/* Margin & Risk Adjustments */}
              <div className="rounded-2xl border border-white p-4" style={{ backgroundColor: '#333c4d' }}>
                <h3 className="text-corama-teal font-poppins font-semibold text-lg mb-3">Margin & Risk Adjustments</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-corama-teal font-poppins text-sm mb-1 block">Profit Margin (%)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                      placeholder="15"
                      value={profitMarginPct}
                      onChange={e => setProfitMarginPct(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-corama-teal font-poppins text-sm mb-1 block">Risk Reserve (%)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 outline-none font-poppins text-sm"
                      placeholder="5"
                      value={riskReservePct}
                      onChange={e => setRiskReservePct(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Proposal Summary */}
              <div className="rounded-2xl border border-white p-4" style={{ backgroundColor: '#333c4d' }}>
                <h3 className="text-white font-poppins font-semibold text-lg mb-3 text-center">Proposal Summary</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-white font-poppins">Labor Costs:</span>
                  <span className="text-white font-poppins text-right">{formatCurrency(laborTotal)}</span>
                  
                  <span className="text-white font-poppins">Materials & Equipment:</span>
                  <span className="text-white font-poppins text-right">{formatCurrency(materialsTotal)}</span>
                  
                  <span className="text-white font-poppins">Subtotal:</span>
                  <span className="text-white font-poppins text-right">{formatCurrency(subtotal)}</span>
                  
                  <span className="text-white font-poppins">Profit Margin:</span>
                  <span className="text-white font-poppins text-right">{formatCurrency(profitMargin)}</span>
                  
                  <span className="text-white font-poppins">Risk Reserve:</span>
                  <span className="text-white font-poppins text-right">{formatCurrency(riskReserve)}</span>
                  
                  <span className="text-white font-poppins font-semibold">Total Bid Amount:</span>
                  <span className="text-white font-poppins font-semibold text-right">{formatCurrency(totalBidAmount)}</span>
                </div>
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div className={`text-center mb-4 font-poppins text-sm ${saveMessage.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                {saveMessage}
              </div>
            )}

            {/* Bottom Buttons */}
            <div className="flex justify-between gap-4 flex-shrink-0">
              <button
                onClick={handleSaveSummary}
                disabled={isSaving}
                className="flex items-center justify-center gap-3 px-8 py-3 rounded-full font-poppins font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#99C8CA' }}
              >
                <span>{isSaving ? 'Saving...' : 'Save Summary'}</span>
                <img src={ContinueIcon} alt="" className="w-6 h-6" />
              </button>

              <button
                disabled
                className="flex items-center justify-center gap-3 px-8 py-3 rounded-full font-poppins font-semibold text-white opacity-50 cursor-not-allowed"
                style={{ backgroundColor: '#99C8CA' }}
              >
                <span>Generate Final Proposal</span>
                <span className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-sm font-bold">$</span>
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ProposalSummary
