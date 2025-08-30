import { useState } from 'react'
import { CheckCircle, AlertCircle, FileText, Calendar, Building } from 'lucide-react'

interface ComplianceItem {
  id: string
  title: string
  description: string
  required: boolean
  completed: boolean
  dueDate?: string
  category: 'fiscal' | 'legal' | 'technical' | 'administrative'
}

interface MexicanComplianceChecklistProps {
  items?: ComplianceItem[]
  onItemToggle?: (itemId: string) => void
  className?: string
}

const defaultItems: ComplianceItem[] = [
  {
    id: 'rfc',
    title: 'RFC Vigente',
    description: 'Registro Federal de Contribuyentes actualizado',
    required: true,
    completed: false,
    category: 'fiscal'
  },
  {
    id: 'sat_opinion',
    title: 'Opinión de Cumplimiento SAT',
    description: 'Opinión positiva del SAT (32-D)',
    required: true,
    completed: false,
    category: 'fiscal'
  },
  {
    id: 'imss_opinion',
    title: 'Opinión de Cumplimiento IMSS',
    description: 'Constancia de cumplimiento IMSS',
    required: true,
    completed: false,
    category: 'fiscal'
  },
  {
    id: 'infonavit_opinion',
    title: 'Opinión de Cumplimiento INFONAVIT',
    description: 'Constancia de cumplimiento INFONAVIT',
    required: true,
    completed: false,
    category: 'fiscal'
  },
  {
    id: 'padron_proveedores',
    title: 'Padrón de Proveedores',
    description: 'Registro en Padrón de Proveedores del Gobierno de Michoacán',
    required: true,
    completed: false,
    category: 'administrative'
  },
  {
    id: 'acta_constitutiva',
    title: 'Acta Constitutiva',
    description: 'Escritura pública de constitución de la empresa',
    required: true,
    completed: false,
    category: 'legal'
  },
  {
    id: 'poder_notarial',
    title: 'Poder Notarial',
    description: 'Poder del representante legal',
    required: true,
    completed: false,
    category: 'legal'
  },
  {
    id: 'estados_financieros',
    title: 'Estados Financieros',
    description: 'Estados financieros auditados (últimos 2 años)',
    required: false,
    completed: false,
    category: 'administrative'
  }
]

export function MexicanComplianceChecklist({ 
  items = defaultItems, 
  onItemToggle,
  className = '' 
}: MexicanComplianceChecklistProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>('fiscal')

  const categories = {
    fiscal: { label: 'Obligaciones Fiscales', icon: FileText, color: 'text-red-600' },
    legal: { label: 'Documentos Legales', icon: Building, color: 'text-blue-600' },
    technical: { label: 'Requisitos Técnicos', icon: CheckCircle, color: 'text-green-600' },
    administrative: { label: 'Administrativos', icon: Calendar, color: 'text-yellow-600' }
  }

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ComplianceItem[]>)

  const getCompletionStats = (categoryItems: ComplianceItem[]) => {
    const completed = categoryItems.filter(item => item.completed).length
    const total = categoryItems.length
    const required = categoryItems.filter(item => item.required).length
    const requiredCompleted = categoryItems.filter(item => item.required && item.completed).length
    
    return { completed, total, required, requiredCompleted }
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Lista de Verificación - Licitaciones Michoacán
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Documentos requeridos para participar en licitaciones gubernamentales
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {Object.entries(categories).map(([categoryKey, category]) => {
          const categoryItems = groupedItems[categoryKey] || []
          if (categoryItems.length === 0) return null

          const stats = getCompletionStats(categoryItems)
          const Icon = category.icon
          const isExpanded = expandedCategory === categoryKey

          return (
            <div key={categoryKey}>
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : categoryKey)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-5 w-5 ${category.color}`} />
                  <div>
                    <h4 className="font-medium text-gray-900">{category.label}</h4>
                    <p className="text-sm text-gray-500">
                      {stats.requiredCompleted}/{stats.required} obligatorios • {stats.completed}/{stats.total} total
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {stats.requiredCompleted === stats.required ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <button
                        onClick={() => onItemToggle?.(item.id)}
                        className="mt-0.5"
                      >
                        {item.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h5 className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.title}
                          </h5>
                          {item.required && (
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                              Obligatorio
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        {item.dueDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Vence: {new Date(item.dueDate).toLocaleDateString('es-MX')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
