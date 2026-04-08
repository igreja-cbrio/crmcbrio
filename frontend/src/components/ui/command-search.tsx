import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Search, Users, DollarSign, Truck, Tag, CalendarDays,
  FolderKanban, BookOpen, ShoppingCart, Bot, X,
} from 'lucide-react'

interface SearchItem {
  label: string
  description: string
  path: string
  icon: React.ElementType
  category: string
}

const PAGES: SearchItem[] = [
  { label: 'Recursos Humanos', description: 'Colaboradores, treinamentos e férias', path: '/admin/rh', icon: Users, category: 'Administrativo' },
  { label: 'Financeiro', description: 'Contas, transações e reembolsos', path: '/admin/financeiro', icon: DollarSign, category: 'Administrativo' },
  { label: 'Logística', description: 'Fornecedores, compras e pedidos', path: '/admin/logistica', icon: Truck, category: 'Administrativo' },
  { label: 'Patrimônio', description: 'Bens, localizações e inventário', path: '/admin/patrimonio', icon: Tag, category: 'Administrativo' },
  { label: 'Assistente IA', description: 'Agentes de auditoria e análise', path: '/assistente-ia', icon: Bot, category: 'Administrativo' },
  { label: 'Eventos', description: 'Gestão de eventos da igreja', path: '/eventos', icon: CalendarDays, category: 'Projetos e Eventos' },
  { label: 'Projetos', description: 'Acompanhamento de projetos', path: '/projetos', icon: FolderKanban, category: 'Projetos e Eventos' },
  { label: 'Planejamento', description: 'Visão consolidada PMO', path: '/planejamento', icon: FolderKanban, category: 'Projetos e Eventos' },
  { label: 'Membresia', description: 'Cadastro e trilha de membros', path: '/ministerial/membresia', icon: BookOpen, category: 'Ministerial' },
  { label: 'Solicitar Compra', description: 'Pedir materiais ou serviços', path: '/solicitar-compra', icon: ShoppingCart, category: 'Serviços' },
  { label: 'Meu Perfil', description: 'Seus dados e configurações', path: '/perfil', icon: Users, category: 'Serviços' },
]

export function CommandSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = query.trim()
    ? PAGES.filter(p =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      )
    : PAGES

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const handleSelect = useCallback((item: SearchItem) => {
    navigate(item.path)
    handleClose()
  }, [navigate, handleClose])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) handleClose()
        else handleOpen()
      }
      if (e.key === 'Escape' && open) {
        handleClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleOpen, handleClose])

  // Arrow keys + Enter
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, filtered, selectedIndex, handleSelect])

  useEffect(() => { setSelectedIndex(0) }, [query])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative flex items-start justify-center pt-[20vh]" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 h-12 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              placeholder="Buscar páginas, módulos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[320px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{query}"
              </div>
            ) : (
              filtered.map((item, i) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.path}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer",
                      i === selectedIndex ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50"
                    )}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.category}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>esc fechar</span>
          </div>
        </div>
      </div>
    </div>
  )
}
