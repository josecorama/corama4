import { useState } from 'react'
import { Filter, Calendar, DollarSign, MapPin, X } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'

interface FiltersPopoverProps {
  onFiltersChange: (filters: any) => void
  currentFilters: any
}

export function FiltersPopover({ onFiltersChange, currentFilters }: FiltersPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [localFilters, setLocalFilters] = useState(currentFilters)

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearFilters = () => {
    const clearedFilters = {}
    setLocalFilters(clearedFilters)
    onFiltersChange(clearedFilters)
    setIsOpen(false)
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center justify-center border border-border rounded-lg px-3 py-2 hover:bg-muted min-w-[120px]">
          <Filter className="h-4 w-4 mr-2" />
          Más Filtros
        </button>
      </Popover.Trigger>
      
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-lg border border-border bg-popover p-6 shadow-lg"
          sideOffset={5}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-popover-foreground">Filtros Avanzados</h3>
              <Popover.Close asChild>
                <button className="p-1 text-muted-foreground hover:text-foreground rounded">
                  <X className="h-4 w-4" />
                </button>
              </Popover.Close>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-popover-foreground mb-2">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Fecha de vencimiento
                </label>
                <select 
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                  value={localFilters.dueDate || ''}
                  onChange={(e) => setLocalFilters({...localFilters, dueDate: e.target.value})}
                >
                  <option value="">Todas las fechas</option>
                  <option value="today">Vence hoy</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-popover-foreground mb-2">
                  <DollarSign className="h-4 w-4 inline mr-1" />
                  Presupuesto mínimo
                </label>
                <input
                  type="number"
                  placeholder="$0"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                  value={localFilters.minBudget || ''}
                  onChange={(e) => setLocalFilters({...localFilters, minBudget: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-popover-foreground mb-2">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Ubicación
                </label>
                <select 
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                  value={localFilters.location || ''}
                  onChange={(e) => setLocalFilters({...localFilters, location: e.target.value})}
                >
                  <option value="">Todas las ubicaciones</option>
                  <option value="morelia">Morelia</option>
                  <option value="michoacan">Michoacán</option>
                  <option value="nacional">Nacional</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-between space-x-3 pt-4 border-t border-border">
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              >
                Limpiar
              </button>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
