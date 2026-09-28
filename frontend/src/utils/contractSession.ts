// Per-contract data that the proposal workflow pages keep in sessionStorage so it
// survives reloads. All of it belongs to a single contract (`currentContractId`),
// so whenever the workflow starts for a different contract it must be dropped.

const CONTRACT_SCOPED_KEYS = [
  'currentContractName',
  'currentAiFindings',
  'currentAiSuggestions',
  'currentTeamMembers',
]

export const generateContractId = () =>
  `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const clearContractSession = () => {
  sessionStorage.removeItem('currentContractId')
  CONTRACT_SCOPED_KEYS.forEach(key => sessionStorage.removeItem(key))
}

/**
 * Resolve the contract id for the analysis pages.
 * - An id in navigation state always wins.
 * - Without one, the stored id is reused only when it belongs to the same
 *   contract (same name) – e.g. after a reload; otherwise a new id is created
 *   and the previous contract's cached findings/suggestions/team are dropped.
 */
export const resolveContractId = (stateContractId?: string, stateContractName?: string): string => {
  const storedId = sessionStorage.getItem('currentContractId')
  const storedName = sessionStorage.getItem('currentContractName')

  if (stateContractId && stateContractId.trim()) {
    if (storedId !== stateContractId) clearContractSession()
    sessionStorage.setItem('currentContractId', stateContractId)
    if (stateContractName) sessionStorage.setItem('currentContractName', stateContractName)
    return stateContractId
  }

  const sameContract = !stateContractName || storedName === stateContractName
  if (storedId && storedId.trim() && sameContract) {
    return storedId
  }

  clearContractSession()
  const newId = generateContractId()
  sessionStorage.setItem('currentContractId', newId)
  if (stateContractName) sessionStorage.setItem('currentContractName', stateContractName)
  return newId
}

/** Read a contract-scoped sessionStorage value only if it was stored for `contractId`. */
export const getContractScoped = (contractId: string | null, key: string): string | null => {
  if (!contractId || sessionStorage.getItem('currentContractId') !== contractId) return null
  return sessionStorage.getItem(key)
}
