# Design Guide — Grimório AI

> Referência visual para desenvolvimento. Sempre consulte este arquivo antes de alterar UI.

---

## Paleta de Cores

Inspiração: **preto fosco + laranja-marrom** (terracota quente, como Claude).

### Dark mode (tema padrão)

| Token             | Uso                          | HSL                     |
|-------------------|------------------------------|-------------------------|
| `background`      | Fundo principal              | `20 14% 6%`             |
| `card`            | Cards, sidebar, dropdowns    | `20 14% 9%`             |
| `primary`         | CTAs, ícones, destaques      | `24 85% 55%`            |
| `primary-foreground` | Texto sobre primary       | `20 14% 6%`             |
| `secondary`       | Superfícies secundárias      | `20 12% 13%`            |
| `muted`           | Fundos de input, badges      | `20 10% 13%`            |
| `muted-foreground`| Texto secundário             | `20 8% 50%`             |
| `accent`          | Hover, seleção               | `24 40% 14%`            |
| `border`          | Bordas                       | `20 12% 16%`            |

### Light mode

| Token             | HSL                     |
|-------------------|-------------------------|
| `background`      | `30 20% 96%`            |
| `card`            | `30 18% 94%`            |
| `primary`         | `24 75% 45%`            |
| `primary-foreground` | `30 20% 98%`         |
| `secondary`       | `30 12% 88%`            |
| `muted`           | `30 10% 88%`            |
| `muted-foreground`| `30 6% 45%`             |
| `accent`          | `24 60% 88%`            |
| `border`          | `30 12% 86%`            |

---

## Tipografia

- **Fonte:** Inter (via next/font/google)
- **Títulos:** font-bold, tracking-tight
- **Corpo:** text-sm (14px), leading-relaxed
- **Labels/micro:** text-[10px] ou text-xs, uppercase, tracking-widest

---

## Layout

### Sidebar
- **Largura:** 280px (w-72)
- **Header:** 64px (h-16) com logo + subtítulo
- **Navegação:** dropdowns colapsáveis para Chat e Journal
- **Rodapé:** link de Configurações
- **Fundo:** `bg-card/50` com `border-r`

### Header/Navbar
- **Altura:** 56px (h-14)
- Conteúdo: logo compacto + tema toggle + user menu
- Fundo semi-transparente com backdrop-blur

### Chat
- **Input:** centralizado, max-w-3xl, com backdrop-blur
- **Bubbles:** arredondadas, IA com fundo card + borda, usuário com bg-primary
- **Typing indicator:** 3 dots animados

### Right sidebar (futuro)
- **Journal:** preview da sessão
- **Personagem:** ficha do personagem
- **Largura:** 320px

---

## Componentes

### Ícones
- **Logo/IA:** `Sparkles` (lucide-react)
- **Chat:** `MessageSquare`
- **Journal:** `ScrollText`
- **Personagem:** `Shield` ou `Swords` (futuro)
- **Usuário:** `User`
- **Config:** `Settings`
- **Enviar:** `SendHorizontal`

### Avatar
- IA: gradiente primary com ícone Sparkles
- Usuário: inicial do nome em bg-primary, ou foto (Google OAuth)

### Bordas e Raios
- Border radius padrão: `rounded-xl` (12px)
- Bordas: `border-border/60` (60% opacidade)
- Hover borders: `border-primary/20`

### Transições
- Todas interações: `transition-all` ou `transition-colors`
- Duração: default (150ms)
- Hover suaves, sem jumps

---

## Navegação (Sidebar)

### Chat (dropdown)
- Ao clicar: abre/fecha o dropdown
- Primeiro item: "Nova conversa" (link para /chat)
- Demais itens: histórico de conversas (link para /chat/[id])

### Journal (dropdown)
- Primeiro item: "Nova sessão" (link para /journal)
- Item "Personagens" (link para /journal/characters)
- Futuro: lista de journals e personagens salvos

### Configurações
- Link no rodapé da sidebar
- Página vazia por enquanto

---

## Páginas

### /chat — Chat principal
- Layout: sidebar esquerda + área de chat
- Sem right sidebar

### /chat/[id] — Conversa existente
- Mesmo layout, carrega histórico

### /profile — Perfil do usuário
- Editar: nome, imagem
- Somente leitura: email, provider
- Acessível pelo dropdown do usuário

### /settings — Configurações
- Placeholder vazio

### /journal — Journal de Campanha (Fase 4)
- Layout: sidebar esquerda + área principal + right sidebar (preview)

### /journal/characters — Personagens (futuro)
- Layout: sidebar esquerda + lista/grid + right sidebar (ficha)
