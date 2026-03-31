# FUNCIONALIDADES FALTANTES — Especificação para implementação

Este documento lista TUDO que existia no sistema antigo (v10-v13 do artifact) e que NÃO está no App.jsx atual do frontend v2.0. Use como checklist e especificação para implementar.

---

## 1. FILTROS DE STATUS NA LISTA DE EVENTOS (CRÍTICO)

### O que tinha:
Botões de filtro acima da lista de eventos: "Todos", "No prazo", "Em risco", "Atrasado", "Finalizados". Cada botão tinha a cor do status correspondente. Ao clicar, filtra a lista mostrando só eventos daquele status.

### O que falta no novo:
A lista de eventos no novo sistema NÃO tem filtros. Mostra todos os eventos sem possibilidade de filtrar por status.

### Como implementar:
```jsx
// No App, dentro da seção de eventos, ANTES da lista:
const [filter, setFilter] = useState("all");
const filteredEvs = filter === "all" 
  ? eventsList 
  : eventsList.filter(e => e.status === filter);

// Botões de filtro:
<div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
  {["all","no-prazo","em-risco","atrasado","concluido"].map(f => (
    <button key={f} onClick={()=>setFilter(f)} style={{
      padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:600, cursor:"pointer",
      border: filter===f ? `1.5px solid ${f==="all"?C.accent:(ST[f]?.c||C.accent)}` : `1px solid ${C.border}`,
      background: filter===f ? (ST[f]?.bg || C.accentBg) : "transparent",
      color: filter===f ? (ST[f]?.c || C.accent) : C.t3,
    }}>
      {f === "all" ? "Todos" : ST[f]?.l || f}
    </button>
  ))}
</div>
```

---

## 2. CALENDÁRIO — PROBLEMAS DE PERFORMANCE E DADOS

### Problemas atuais:
- Calendário trava porque recalcula `getEv` para cada dia a cada render
- Eventos importados do banco não aparecem porque o calendário compara `norm(e.date)` com datas construídas, mas os eventos da API vêm com datas ISO completas
- Não mostra ocorrências de eventos recorrentes (só a data principal)

### O que tinha no antigo:
- Calendário fluido sem travamento
- Bolinhas coloridas por CATEGORIA do evento (não por status)
- Eventos recorrentes apareciam em TODAS as datas de ocorrência
- Popup ao clicar no dia mostrava eventos daquele dia com nome, badge de status e cor da categoria
- Borda esquerda colorida nos cards do popup

### Como corrigir:
```jsx
// 1. Memoizar eventos por data (fora do render loop):
const eventsByDate = useMemo(() => {
  const map = {};
  eventsList.forEach(ev => {
    // Data principal
    const d = norm(ev.date);
    if (d) { if (!map[d]) map[d] = []; map[d].push(ev); }
    // Ocorrências (para recorrentes que vêm com occurrences array do backend)
    // Se o backend retorna event_occurrences separadamente, usar essas datas
  });
  return map;
}, [eventsList]);

// 2. No Calendar, usar lookup direto:
const getEv = day => {
  const ds = `${vY}-${String(vM+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  return eventsByDate[ds] || [];
};
```

---

## 3. FORMULÁRIO DE EVENTO — CAMPOS FALTANDO

### O que o antigo tinha (e o novo NÃO tem):
- **Orçamento (R$)** — campo `budget` / `budget_planned`
- **Público esperado** — campo `expected_attendance`
- **Status** — dropdown para mudar status manualmente (no-prazo, em-risco, atrasado, concluido)
- **Recorrência com preview de ocorrências** — ao selecionar "Mensal", mostrava pills com todas as datas calculadas
- **Borda colorida por categoria** no card do evento na lista

### Campos que existem no formulário novo mas incompletos:
- Recorrência: dropdown existe mas NÃO gera array de occurrence_dates para enviar ao backend
- Orçamento: NÃO existe no formulário
- Público esperado: NÃO existe no formulário
- Status: NÃO tem dropdown no formulário (só muda automaticamente)

### Como implementar (adicionar ao EventFormModal):
```jsx
// Adicionar ao estado do form:
const[f,setF]=useState({
  name:'', date:'', category_id:'', description:'', location:'', responsible:'',
  recurrence:'unico', budget_planned:'', expected_attendance:'', status:'no-prazo',
  occurrence_dates: []  // <-- NOVO: array de datas para recorrentes
});

// Campos adicionais no formulário:
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
  <div style={{flex:1}}><Input label="Orçamento R$" type="number" value={f.budget_planned} onChange={e=>upd('budget_planned',e.target.value)}/></div>
  <div style={{flex:1}}><Input label="Público esperado" type="number" value={f.expected_attendance} onChange={e=>upd('expected_attendance',e.target.value)}/></div>
</div>
<Select label="Status" value={f.status} onChange={e=>upd('status',e.target.value)}>
  {Object.entries(ST).map(([v,s])=><option key={v} value={v}>{s.l}</option>)}
</Select>

// Geração de ocorrências baseada na recorrência:
// Quando o usuário muda recurrence + date, calcular datas para o ano
useEffect(() => {
  if (f.recurrence === 'unico' || !f.date) { setF(p=>({...p, occurrence_dates: []})); return; }
  const start = new Date(f.date + 'T12:00:00');
  const dates = [];
  const intervals = { semanal:7, quinzenal:14, mensal:30, bimestral:60, trimestral:90, semestral:180 };
  const days = intervals[f.recurrence] || 30;
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getTime() + i * days * 86400000);
    if (d.getFullYear() <= start.getFullYear() + 1) dates.push(d.toISOString().slice(0,10));
  }
  setF(p=>({...p, occurrence_dates: dates}));
}, [f.recurrence, f.date]);

// Preview de ocorrências no formulário:
{f.occurrence_dates.length > 0 && <div style={{marginTop:4}}>
  <div style={{fontSize:10,fontWeight:700,color:C.t2}}>OCORRÊNCIAS ({f.occurrence_dates.length})</div>
  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
    {f.occurrence_dates.map(d=><span key={d} style={{fontSize:10,padding:"2px 8px",borderRadius:6,background:C.cream,border:`1px solid ${C.border}`}}>{fD(d)}</span>)}
  </div>
</div>}
```

---

## 4. FORMULÁRIO DE TAREFA — CAMPOS FALTANDO

### O que tinha no antigo:
O modal de criação/edição de tarefa tinha:
- Nome
- Responsável
- Área (dropdown com áreas ministeriais)
- Data início / Data prazo
- Prioridade (urgente/alta/média/baixa)
- É marco? (checkbox)
- Descrição
- Dependências (multiselect das outras tarefas do mesmo evento)

### O que o novo tem:
Só `prompt("Nome da tarefa:")` — um prompt nativo do browser que captura apenas o nome.

### Como implementar:
Criar um `TaskFormModal` similar ao `EventFormModal` com todos os campos.

---

## 5. FORMULÁRIO DE REUNIÃO — CAMPOS FALTANDO

### O que tinha no antigo:
Modal completo com:
- Título
- Data
- Participantes (lista editável — adicionar/remover nomes)
- Decisões tomadas (textarea)
- Observações livres (textarea)
- Pendências (lista dinâmica: descrição + responsável + área + prazo)

### O que o novo tem:
Só `prompt("Título da reunião:")` — captura apenas o título.

### Como implementar:
Criar um `MeetingFormModal` com todos os campos, incluindo lista dinâmica de pendências.

---

## 6. COMPONENTE DaysCounter (falta no novo)

### O que tinha:
Um badge que mostrava "12 dias" (verde), "3 dias" (amarelo), "Atrasado 2d" (vermelho) ao lado de cada evento na lista. Usava cores diferentes baseado na proximidade do prazo.

### Como implementar:
```jsx
function DaysCounter({date}) {
  const d = dU(date);
  if (d === 999) return null;
  const color = d < 0 ? '#F87171' : d <= 7 ? '#FBBF24' : '#4ADE80';
  const text = d < 0 ? `${Math.abs(d)}d atrás` : d === 0 ? 'Hoje' : `${d}d`;
  return <span style={{fontSize:10,fontWeight:600,color,padding:"1px 6px",borderRadius:4,background:`${color}15`}}>{text}</span>;
}
```

---

## 7. BORDA ESQUERDA COLORIDA POR CATEGORIA nos cards de evento

### O que tinha:
Cada card de evento na lista tinha uma borda esquerda de 3-4px com a cor da categoria (verde escuro para Evento Especial, azul para Liturgia, etc.), NÃO do status.

### O que o novo faz:
NÃO tem borda lateral nos cards — usa cards genéricos.

### Como implementar:
Nos cards de evento na lista, adicionar:
```jsx
style={{...existingStyles, borderLeft: `4px solid ${ev.category_color || C.accent}`}}
```

---

## 8. KANBAN DRAG-AND-DROP (falta no novo)

### O que tinha:
Dentro do detalhe do evento, aba "Kanban" com 3 colunas: Pendente, Em andamento, Concluída. As tarefas podiam ser arrastadas (drag-and-drop nativo HTML5) entre colunas para mudar status.

### O que o novo tem:
Dropdown de select para mudar status da tarefa — funcional mas sem a experiência visual do Kanban.

### Como implementar:
Adicionar `draggable`, `onDragStart`, `onDragOver`, `onDrop` nas colunas e cards de tarefa.

---

## 9. ABA "CATEGORIAS" (falta no novo)

### O que tinha:
Na navegação de eventos, havia uma aba "Categorias" que mostrava botões coloridos para cada categoria. Ao clicar, listava todos os eventos dessa categoria com suas tarefas expandidas.

### O que o novo tem:
NÃO existe essa aba. Só Dashboard com calendário + lista.

---

## 10. FUNCIONALIDADES MENORES FALTANDO

- **Botão "Finalizar"** no detalhe do evento (marcava status como concluido)
- **Barra de progresso** no card do evento (tarefas concluídas / total)
- **Busca global** — campo de busca que filtrava eventos por nome
- **Aba de navegação** entre "Dashboard" e "Lista" e "Categorias" no topo
- **Duplicar evento** — botão que criava uma cópia com datas recalculadas
- **Template de importação CSV** — componente que parseava CSV e importava eventos
- **Backup/Export** — botão para exportar todos os dados como JSON e reimportar

---

## PRIORIDADE DE IMPLEMENTAÇÃO

1. **Filtros de status** — Mais impactante, 10 linhas de código
2. **DaysCounter** — 8 linhas, melhora muito a legibilidade
3. **Borda colorida por categoria** — 1 linha por card
4. **Formulário de evento completo** — Campos de orçamento, público, ocorrências
5. **Formulário de tarefa completo** — Modal ao invés de prompt()
6. **Formulário de reunião completo** — Modal ao invés de prompt()
7. **Barra de progresso** nos cards de evento
8. **Abas de navegação** (Dashboard/Lista/Categorias)
9. **Kanban drag-and-drop**
10. **Busca global**
