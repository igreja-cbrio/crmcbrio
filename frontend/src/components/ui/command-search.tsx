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

  // Build flat list with category headers for rendering
  const renderItems: { type: 'header'; category: string }[] | { type: 'item'; item: SearchItem; flatIdx: number }[] = []
  let lastCategory = ''
  let flatIdx = 0
  const items: Array<{ type: 'header'; category: string } | { type: 'item'; item: SearchItem; flatIdx: number }> = []
  for (const item of filtered) {
    if (!query.trim() && item.category !== lastCategory) {
      items.push({ type: 'header', category: item.category })
      lastCategory = item.category
    }
    items.push({ type: 'item', item, flatIdx: flatIdx++ })
  }

  return (
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative flex justify-center pt-[15vh] px-4" onClick={e => e.stopPropagation()}>
        <div
          className="w-full max-w-[520px] rounded-2xl border shadow-2xl overflow-hidden"
          style={{ background: 'var(--cbrio-card)', borderColor: 'var(--cbrio-border)' }}
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b" style={{ borderColor: 'var(--cbrio-border)' }}>
            <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--cbrio-text3)' }} />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm outline-none py-3.5"
              style={{ color: 'var(--cbrio-text)' }}
              placeholder="Buscar páginas, módulos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <kbd
              className="hidden sm:inline-flex h-5 items-center rounded border px-1.5 text-[10px] font-medium"
              style={{ borderColor: 'var(--cbrio-border)', color: 'var(--cbrio-text3)', background: 'var(--cbrio-bg)' }}
            >
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="overflow-y-auto py-1"
            style={{ maxHeight: 'min(360px, 50vh)', scrollbarWidth: 'none' }}
          >
            {filtered.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--cbrio-text3)' }}>Nenhum resultado encontrado</p>
              </div>
            ) : (
              items.map((entry, i) => {
                if (entry.type === 'header') {
                  return (
                    <div key={`h-${entry.category}`} className="px-4 pt-3 pb-1">
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--cbrio-text3)', opacity: 0.6 }}>
                        {entry.category}
                      </span>
                    </div>
                  )
                }
                const { item, flatIdx: idx } = entry
                const Icon = item.icon
                const isSelected = idx === selectedIndex
                return (
                  <button
                    key={item.path}
                    data-selected={isSelected}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-75 cursor-pointer"
                    style={{
                      background: isSelected ? 'var(--cbrio-border)' : 'transparent',
                      color: 'var(--cbrio-text)',
                    }}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors"
                      style={{
                        background: isSelected ? '#00B39D20' : 'var(--cbrio-bg)',
                        color: isSelected ? '#00B39D' : 'var(--cbrio-text3)',
                      }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium leading-tight">{item.label}</div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--cbrio-text3)' }}>{item.description}</div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
