import { useState } from 'react'
import { Calculator, Download, Send } from 'lucide-react'
import { apiClient } from '../lib/api'
import type { QuoteRequest, Quote } from '../types'
import toast from 'react-hot-toast'

const Quoter = () => {
  const [quoteRequest, setQuoteRequest] = useState<QuoteRequest>({
    width: 1,
    height: 1,
    quantity: 1,
    substrate: 'lona',
    dpi: 720,
    finishes: [],
    urgency: 'normal'
  })
  
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(false)
  const [leadInfo, setLeadInfo] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const substrates = [
    { value: 'lona', label: 'Lona 13 oz (exteriores)' },
    { value: 'vinil', label: 'Vinil cast (vehículos oficiales)' },
    { value: 'papel', label: 'Papel Couché' },
    { value: 'cartulina', label: 'Cartulina' },
    { value: 'canvas', label: 'Canvas' }
  ]

  const finishOptions = [
    { value: 'ojillos', label: 'Ojillos' },
    { value: 'bastidor', label: 'Bastidor' },
    { value: 'laminado', label: 'Laminado' },
    { value: 'corte_contorno', label: 'Corte de Contorno' },
    { value: 'barniz_uv', label: 'Barniz UV' }
  ]

  const urgencyOptions = [
    { value: 'normal', label: 'Normal (5-7 días)', multiplier: 1.0 },
    { value: 'urgent', label: 'Urgente (2-3 días)', multiplier: 1.5 },
    { value: 'express', label: 'Express (24 horas)', multiplier: 2.0 }
  ]

  const handleFinishChange = (finish: string, checked: boolean) => {
    if (checked) {
      setQuoteRequest(prev => ({
        ...prev,
        finishes: [...prev.finishes, finish]
      }))
    } else {
      setQuoteRequest(prev => ({
        ...prev,
        finishes: prev.finishes.filter(f => f !== finish)
      }))
    }
  }

  const generateQuote = async () => {
    setLoading(true)
    try {
      let leadId = undefined
      if (leadInfo.name || leadInfo.email) {
        const lead = await apiClient.createLead({
          name: leadInfo.name || 'Cliente',
          email: leadInfo.email,
          phone: leadInfo.phone,
          source: 'website',
          interest: 'cotizacion'
        })
        leadId = lead.id
      }

      const generatedQuote = await apiClient.generateQuote(quoteRequest, leadId)
      setQuote(generatedQuote)
      toast.success('Cotización generada exitosamente')
    } catch (error) {
      console.error('Error generating quote:', error)
      toast.error('Error al generar la cotización')
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!quote) return
    
    try {
      const blob = await apiClient.downloadQuotePdf(quote.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cotizacion_${quote.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('PDF descargado')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Error al descargar PDF')
    }
  }

  const area = quoteRequest.width * quoteRequest.height
  const totalArea = area * quoteRequest.quantity

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cotizador Inteligente</h1>
        <div className="text-sm text-gray-500">
          Cotizaciones para licitaciones gubernamentales y clientes privados en Michoacán
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Especificaciones del Producto</h2>
          
          <div className="space-y-4">
            {/* Dimensions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ancho (metros)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={quoteRequest.width}
                  onChange={(e) => setQuoteRequest(prev => ({ ...prev, width: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alto (metros)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={quoteRequest.height}
                  onChange={(e) => setQuoteRequest(prev => ({ ...prev, height: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                value={quoteRequest.quantity}
                onChange={(e) => setQuoteRequest(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Substrate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material/Sustrato
              </label>
              <select
                value={quoteRequest.substrate}
                onChange={(e) => setQuoteRequest(prev => ({ ...prev, substrate: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {substrates.map(substrate => (
                  <option key={substrate.value} value={substrate.value}>
                    {substrate.label}
                  </option>
                ))}
              </select>
            </div>

            {/* DPI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolución (DPI)
              </label>
              <select
                value={quoteRequest.dpi}
                onChange={(e) => setQuoteRequest(prev => ({ ...prev, dpi: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={360}>360 DPI - Económico</option>
                <option value={720}>720 DPI - Estándar</option>
                <option value={1440}>1440 DPI - Alta Calidad</option>
              </select>
            </div>

            {/* Finishes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Acabados
              </label>
              <div className="space-y-2">
                {finishOptions.map(finish => (
                  <label key={finish.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={quoteRequest.finishes.includes(finish.value)}
                      onChange={(e) => handleFinishChange(finish.value, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{finish.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urgencia
              </label>
              <select
                value={quoteRequest.urgency}
                onChange={(e) => setQuoteRequest(prev => ({ ...prev, urgency: e.target.value as any }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {urgencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Area Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600">
                <div>Área por unidad: <span className="font-medium">{area.toFixed(2)} m²</span></div>
                <div>Área total: <span className="font-medium">{totalArea.toFixed(2)} m²</span></div>
              </div>
            </div>
          </div>

          {/* Lead Information */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-4">Información del Cliente (Opcional)</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre"
                value={leadInfo.name}
                onChange={(e) => setLeadInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="email"
                placeholder="Email"
                value={leadInfo.email}
                onChange={(e) => setLeadInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={leadInfo.phone}
                onChange={(e) => setLeadInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={generateQuote}
            disabled={loading}
            className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Calculator className="h-5 w-5 mr-2" />
                Generar Cotización
              </>
            )}
          </button>
        </div>

        {/* Quote Result */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Resultado de la Cotización</h2>
          
          {quote ? (
            <div className="space-y-4">
              {/* Quote Summary */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">${quote.total.toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Precio Total</div>
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Desglose de Costos</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Materiales:</span>
                    <span>${quote.breakdown.material_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Impresión:</span>
                    <span>${quote.breakdown.printing_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mano de Obra:</span>
                    <span>${quote.breakdown.labor_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiempo de Máquina:</span>
                    <span>${quote.breakdown.machine_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Acabados:</span>
                    <span>${quote.breakdown.finishing_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>Subtotal:</span>
                    <span>${quote.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gastos Generales ({(quote.breakdown.overhead_pct * 100).toFixed(0)}%):</span>
                    <span>${quote.overhead.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margen ({(quote.breakdown.margin_pct * 100).toFixed(0)}%):</span>
                    <span>${quote.margin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-medium">
                    <span>Total:</span>
                    <span>${quote.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={downloadPDF}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </button>
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center">
                  <Send className="h-4 w-4 mr-2" />
                  Enviar por Email
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calculator className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>Complete el formulario y genere una cotización para ver los resultados aquí.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Quoter
