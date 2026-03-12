# Design Guidelines: Cosmic Destiny (宇宙命理)

## Design Approach
**Reference-Based Approach**: Modern cosmic/mystical aesthetic with clean professional interfaces. Dark-mode-first design with purple universe theme.

## Color System - Purple Universe Theme

### Primary Colors
| Color | HSL Value | Usage |
|-------|-----------|-------|
| Deep Purple Background | 260 30% 6% | Dark mode main background |
| Primary Purple | 270 70% 55% | Primary actions, buttons, links, accent |
| Light Purple | 270 60% 85% | Accent text, highlights |
| Star White | 260 10% 95% | Text on dark backgrounds |

### Feature Icon Background Colors
| Color | Class | Usage |
|-------|-------|-------|
| Purple | `bg-purple-600` | Global/General features |
| Pink | `bg-pink-500` | Multi-cultural features |
| Emerald | `bg-emerald-500` | Real-time/Active features |
| Orange | `bg-orange-500` | AI/Intelligence features |

### Accent Colors
| Color | HSL Value | Usage |
|-------|-----------|-------|
| Cosmic Gold | 45 95% 55% | Highlights, premium features, high scores |
| Cosmic Cyan | 180 70% 45% | Success states, positive indicators |
| Nebula Pink | 320 70% 55% | Love/romance related features |

### Score Color Mapping
- 80+: `text-green-400` - 大吉 (Great Fortune)
- 60-79: `text-cyan-400` - 吉 (Good Fortune)
- 40-59: `text-amber-400` - 平 (Neutral)
- Below 40: `text-red-400` - 凶 (Caution)

## Typography

**Font Families**:
- **Headers**: "Space Grotesk" - Modern geometric sans-serif
- **Body**: "Inter", system-ui - Clean, highly readable
- **Chinese/CJK**: "Noto Serif SC" for headings, "Noto Sans SC" for body
- **Monospace**: "JetBrains Mono" for technical elements

**Type Scale**:
- Hero titles: text-5xl to text-7xl, font-bold
- Section headers: text-3xl to text-4xl, font-bold
- Card titles: text-lg to text-xl, font-semibold
- Body text: text-base, font-normal
- Subtitles/Labels: text-sm, font-medium, text-purple-300/60
- Captions: text-xs, text-muted-foreground

## Spacing System

| Size | Value | Usage |
|------|-------|-------|
| Section padding | py-24 px-4 | Between major sections |
| Card padding | p-6 or p-8 | Inside cards |
| Grid gaps | gap-4 to gap-6 | Between cards |
| Container max | max-w-6xl | Main container |
| Narrow container | max-w-4xl | Focused sections |

## Component Patterns

### Header (Landing)
- Fixed with backdrop blur: `bg-black/30 backdrop-blur-md`
- Logo: Rounded square with star icon + two-line text (Chinese + English)
- Right side: Language selector + User avatar/login button

### Buttons
**Primary CTA**:
```
size="lg" className="gap-2 rounded-full bg-white text-purple-900"
```

**Secondary/Outline**:
```
size="lg" variant="outline" className="rounded-full border-purple-400/40 text-purple-200"
```

**Icon buttons**:
```
size="icon" variant="outline" className="rounded-full border-purple-400/30"
```

Note: Do NOT use custom hover classes or explicit height/padding on buttons. Rely on size variants (default, sm, lg, icon) for sizing.

### Cards
**Standard Card**:
```
border-purple-500/20 bg-white/5 backdrop-blur-sm
```

**Interactive Card** (add hover-elevate):
```
border-purple-500/20 bg-white/5 backdrop-blur-sm hover-elevate cursor-pointer
```

**Feature Card with Icon**:
- Colored icon container: `h-12 w-12 rounded-xl {color}` containing `h-6 w-6` icon
- Title: text-lg font-semibold text-white
- Subtitle: text-sm text-purple-300/60
- Description: text-sm text-purple-200/70

### Badges
**Protocol Badge**:
```
bg-purple-600/20 text-purple-300
```

**Feature/Tag Badge**:
```
variant="outline" border-purple-400/30 text-purple-200
```

### Stats Display
- Large numbers: text-3xl to text-4xl font-bold text-white
- Labels: text-sm text-purple-200/70
- Horizontal layout: flex gap-8 to gap-16

## Dashboard Layout

### Sidebar
- Use Shadcn sidebar components from `@/components/ui/sidebar`
- Dark theme matching cosmic aesthetic
- Collapsible with icon-only mode
- Active state: bg-sidebar-accent

### Form Cards
- Card with p-6 padding
- Icon + title in CardHeader
- Form fields with proper labels
- Full-width or right-aligned submit button

### Data Display
- Gradient backgrounds for hero cards: `bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-cyan-900/20`
- Circular score displays with glow effects
- Progress bars for percentage values
- Badges for status/level indicators

## Animation Guidelines

### Page Transitions (Framer Motion)
```tsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.8 }}
```

### Staggered Card Animations
```tsx
transition={{ delay: index * 0.1 }}
viewport={{ once: true }}
```

### Hover Effects
- Use `hover-elevate` class for interactive elements
- Avoid layout-shifting animations
- Smooth color transitions

## Responsive Breakpoints
- Mobile: default (< 768px)
- Tablet: md: (768px+)
- Desktop: lg: (1024px+)

### Common Grid Patterns
- 4 features: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- 8 items: `grid-cols-2 lg:grid-cols-4`
- 2-column with text: `grid-cols-1 lg:grid-cols-2`

## Dark Mode (Primary)
This app is dark-mode-first. All components should look great on dark backgrounds:
- Background: Deep purple-black (HSL 260 30% 6%)
- Text: White and purple-200 variants  
- Borders: Low opacity white or purple (10-20%)
- Glows/Shadows: Purple-tinted

## 8 Cultural Systems
Each culture has distinct visual identity:
1. **CN 中国洪荒修仙** - Chinese Xianxia
2. **JP 日本RPG** - Japanese RPG  
3. **西方奇幻** - Western Fantasy
4. **佛教** - Buddhism
5. **阿拉伯** - Arabic
6. **宝可梦** - Pokémon
7. **漫威** - Marvel
8. **原神** - Genshin Impact

## Accessibility
- WCAG AA contrast ratios (4.5:1 minimum)
- Visible focus states with purple ring
- Screen reader labels for icons/charts
- Support for reduced motion preferences

## Internationalization
- 4 languages: Chinese (zh), English (en), Japanese (ja), Korean (ko)
- Language selector in header
- Appropriate font stacking for each language
