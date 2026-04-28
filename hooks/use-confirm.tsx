import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

export interface ConfirmConfig {
  title: string
  description?: React.ReactNode
  actionType?: 'danger' | 'success' | 'info'
  confirmText?: string
  onConfirm: () => void
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ConfirmConfig>({
    title: '',
    description: undefined,
    actionType: 'danger',
    onConfirm: () => {}
  })

  const confirm = (newConfig: ConfirmConfig) => {
    setConfig({ actionType: 'danger', ...newConfig }) // default to danger if not provided
    setIsOpen(true)
  }

  const ConfirmDialog = () => (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] border-none shadow-2xl p-0 overflow-hidden bg-white rounded-2xl" showCloseButton={false}>
        <div className="p-6 text-center flex flex-col items-center">
          {config.actionType === 'success' ? (
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mb-4 animate-in zoom-in duration-300" />
          ) : config.actionType === 'info' ? (
            <Info className="h-16 w-16 text-blue-500 mb-4 animate-in zoom-in duration-300" />
          ) : (
            <AlertTriangle className="h-16 w-16 text-red-500 mb-4 animate-in zoom-in duration-300" />
          )}
          <DialogTitle className="text-xl font-bold text-gray-900 mb-2">{config.title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mb-6">
            {config.description}
          </DialogDescription>
          
          <DialogFooter className="flex w-full gap-3 sm:gap-3 flex-col sm:flex-row">
            {config.actionType !== 'info' && (
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-gray-200 text-gray-600 bg-transparent hover:bg-gray-50 hover:text-gray-900 rounded-xl"
              >
                Cancelar
              </Button>
            )}
            <Button
              onClick={() => {
                config.onConfirm()
                setIsOpen(false)
              }}
              className={`flex-1 text-white rounded-xl ${
                config.actionType === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' :
                config.actionType === 'info' ? 'bg-blue-500 hover:bg-blue-600' :
                'bg-red-500 hover:bg-red-600'
              }`}
            >
              {config.confirmText || (config.actionType === 'info' ? 'Aceptar' : 'Confirmar')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )

  return { confirm, ConfirmDialog }
}
