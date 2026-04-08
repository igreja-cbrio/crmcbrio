import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  Search, Users, DollarSign, Truck, Tag, CalendarDays,
  FolderKanban, BookOpen, ShoppingCart, Bot, User,
  LayoutDashboard, Map, UserCheck, UsersRound, Heart,
  HandHelping, Megaphone,
} from 'lucide-react'

interface SearchItem {
  label: string
  description: string
  path: string
  icon: React.ElementType
  category: string
}

const PAGES: SearchItem[] = [
  { label: 'Dashboard', description: 'Página inicial', path: '/', icon: LayoutDashboard, category: 'Geral' },
  { label: 'Meu Perfil', description: 'Seus dados e configurações', path: '/perfil', icon: User, category: 'Geral' },
  { label: 'Solicitar Compra', description: 'Pedir materiais ou serviços', path: '/solicitar-compra', icon: ShoppingCart, category: 'Geral' },
  { label: 'Recursos Humanos', description: 'Colaboradores, treinamentos e férias', path: '/admin/rh', icon: Users, category: 'Administrativo' },
  { label: 'Financeiro', description: 'Contas, transações e reembolsos', path: '/admin/financeiro', icon: DollarSign, category: 'Administrativo' },
  { label: 'Logística', description: 'Fornecedores, compras e pedidos', path: '/admin/logistica', icon: Truck, category: 'Administrativo' },
  { label: 'Patrimônio', description: 'Bens, localizações e inventário', path: '/admin/patrimonio', icon: Tag, category: 'Administrativo' },
  { label: 'Assistente IA', description: 'Agentes de auditoria e análise', path: '/assistente-ia', icon: Bot, category: 'Administrativo' },
  { label: 'Eventos', description: 'Gestão de eventos da igreja', path: '/eventos', icon: CalendarDays, category: 'Projetos e Eventos' },
  { label: 'Projetos', description: 'Acompanhamento de projetos', path: '/projetos', icon: FolderKanban, category: 'Projetos e Eventos' },
  { label: 'Planejamento', description: 'Visão consolidada PMO', path: '/planejamento', icon: FolderKanban, category: 'Projetos e Eventos' },
  { label: 'Expansão', description: 'Metas de expansão', path: '/expansao', icon: Map, category: 'Projetos e Eventos' },
  { label: 'Integração', description: 'Batismo, apresentação e cultos', path: '/ministerial/integracao', icon: UserCheck, category: 'Ministerial' },
  { label: 'Grupos', description: 'Dashboard, inscrição e material', path: '/ministerial/grupos', icon: UsersRound, category: 'Ministerial' },
  { label: 'Cuidados', description: 'Capelania e aconselhamento', path: '/ministerial/cuidados', icon: Heart, category: 'Ministerial' },
  { label: 'Voluntariado', description: 'Check-in e lista de voluntários', path: '/ministerial/voluntariado', icon: HandHelping, category: 'Ministerial' },
  { label: 'Membresia', description: 'Cadastro e trilha dos valores', path: '/ministerial/membresia', icon: BookOpen, category: 'Ministerial' },
  { label: 'Marketing', description: 'Projetos e solicitações', path: '/criativo/marketing', icon: Megaphone, category: 'Criativo' },
]

export function CommandSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
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

  // Global ⌘K / Ctrl+K and Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) handleClose()
        else handleOpen()
      }
      if (e.key === 'Escape' && open) handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleOpen, handleClose])

  // Arrow keys + Enter navigation
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

  // Reset selection on query change
  useEffect(() => { setSelectedIndex(0) }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, open])

  if (!open) return null

  // Group filtered items by category
  const grouped: { category: string; items: SearchItem[] }[] = []
  const categoryMap = new Map<string, SearchItem[]>()
  for (const item of filtered) {
    if (!categoryMap.has(item.category)) categoryMap.set(item.category, [])
    categoryMap.get(item.category)!.push(item)
  }
  for (const [category, items] of categoryMap) {
    grouped.push({ category, items })
  }

  // Flat index tracking for keyboard nav
  let flatIndex = 0

  return (
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative flex justify-center pt-[15vh] px-4" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-[520px] rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 h-13 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground/60 shrink-0" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none py-4"
              placeholder="Buscar páginas, módulos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[min(360px,50vh)] overflow-y-auto py-2"
            style={{ scrollbarWidth: 'none' }}
          >
            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.category}>
                  {/* Category header — only show when not searching */}
                  {!query.trim() && (
                    <div className="px-4 pt-3 pb-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                        {group.category}
                      </span>
                    </div>
                  )}
                  {group.items.map((item) => {
                    const currentIndex = flatIndex++
                    const Icon = item.icon
                    const isSelected = currentIndex === selectedIndex
                    return (
                      <button
                        key={item.path}
                        data-selected={isSelected}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-75 cursor-pointer",
                          isSelected
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-accent/50"
                        )}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors",
                          isSelected ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-medium leading-tight">{item.label}</div>
                          <div className="text-[11px] text-muted-foreground/60 truncate">{item.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
