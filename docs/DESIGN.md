ogólne uwagi:
- Program ma mieć ciemny szablon kolorów
- Ikony użyte w projekcie mają być obrysowe (złożone z linii, a nie pełnych kształtów z tłem), minimalistyczne i nowoczesne.

## Układ MDE (stan wdrożenia)

Tokeny z sekcji 3 (tylko wartości `.dark`) są w `src/styles.css`.

- **Okno:** systemowy pasek tytułu w trybie ciemnym. Tło okna i webview `background` (`#0a0a0a`) od pierwszej klatki, bez białego błysku.
- **Górny pasek:** 40px, tło `card`, dolna krawędź 1px `border`. Po lewej przycisk menu (ikona hamburgera, `ghost`, 32×32, ikona 16px, kolor `muted-foreground`, hover `accent`).
- **Zakładki:** pasek zakładek wypełnia górny pasek na prawo od menu, odstęp 2px między zakładkami. Zakładka: tekst 14px/500, szerokość według nazwy, maks. 240px, min. 100px (nazwa z wielokropkiem), zaokrąglone górne rogi `radius-md`.
  - Aktywna: tło `background`, obramowanie 1px `border` bez dolnej krawędzi, tekst `foreground`; łączy się z panelem pod spodem.
  - Nieaktywna: bez tła i obramowania, tekst `muted-foreground`; hover tło `accent`, tekst `accent-foreground` (150ms).
  - Na prawo od nazwy pole 20×20: kropka niezapisanych zmian (koło 8px, `foreground`). Po najechaniu na zakładkę w tym miejscu pojawia się przycisk zamknięcia (ikona X 14px, `muted-foreground`, `radius-sm`, hover: tło `foreground` 10%, ikona `foreground`).
  - Przeciągana zakładka leży nad pozostałymi, z cieniem średnim.
  - Gdy zakładki się nie mieszczą, zwężają się do min. szerokości, a potem pasek przesuwa się tak, by aktywna zakładka była widoczna (bez paska przewijania).
- **Menu:** powierzchnia `popover`, 1px `border`, `radius-lg`, padding 4px, min. 232px, cień średni, wejście fade + slide 150ms. Pozycje mają 32px wysokości, `radius-sm`, a hover/focus `accent`. Skrót po prawej: 12px `muted-foreground`. Separatory 1px `border`.
- **Pasek ostrzeżenia** (np. plik otwarty jako Windows-1250): pod górnym paskiem, pełna szerokość, min. 40px, tło `card`, dolna krawędź 1px `border`, tekst 14px `card-foreground`. Po lewej obrysowa ikona trójkąta ostrzegawczego 16px w `muted-foreground`, po prawej przycisk zamknięcia (ikona X, `ghost` 32×32 jak przycisk menu). Wejście fade + slide 150ms. Bez koloru — czerwień tylko dla `destructive`.
  - Pasek z wyborem (plik zmieniony przez inny program): przed przyciskiem X przycisk tekstowy `outline` „Odśwież”: wysokość 32px, padding 0 12px, 14px/500, tło `background`, 1px `border`, `radius-md`, hover `accent`, odstęp 8px. X zamyka pasek i zachowuje zmiany użytkownika (podpowiedź „Zamknij i zachowaj moje zmiany”).
- **Pasek stanu:** dół okna, 28px, tło `card`, górna krawędź 1px `border`, treść wyrównana do prawej. Przycisk sprawdzania pisowni: `ghost`, rozmiar xs (24px, padding 0 8px, 12px/500, `radius-sm`, kolor `muted-foreground`, hover `accent`), obrysowa ikona kartki z ołówkiem 16px i tekst („Pisownia: polski”); klik zmienia tryb.
- **Pasek formatowania:** nad edytorem w lewym panelu, 40px, tło `background`, dolna krawędź 1px `border`, przyciski wyrównane do lewej, odstęp 2px; lewy padding paska (`--content-padding-x` − 12px) ustawia pierwszą ikonę na tej samej pionowej linii co tekst w panelu (wspólny token `--content-padding-x` = 32px to poziomy padding tekstu w obu panelach). Przyciski `ghost` 32×32 z obrysowymi ikonami Lucide 16px (`muted-foreground`, hover `accent`), podpowiedź z nazwą i skrótem. Grupy: B / I / U | styl akapitu | lista punktowana, numerowana, cytat | link, tabela — rozdzielone pionową linią 1px `border` (20px wysokości, 4px odstępu z każdej strony).
  - Przyciski przełączające (B, I, U, listy, cytat) w stanie włączonym (`aria-pressed`): tło `accent`, ikona `accent-foreground`.
  - Styl akapitu: przycisk z ikoną H i szewronem 12px otwiera menu (jak menu główne) z pozycjami „Nagłówek 1–5” (ze skrótami) i na dole „Tekst akapitowy”; bieżący styl oznacza obrysowy znak ✓ 16px przed nazwą.
  - Tabela: popover `popover`, 1px `border`, `radius-lg`, padding 8px, cień średni, wejście fade + slide 150ms; siatka 8×8 kratek 16px (odstęp 4px, 1px `input`, promień 3px); kratki w wybranym zakresie: tło `accent`, krawędź `ring`; pod siatką rozmiar 12px `muted-foreground`.
  - Gdy przyciski się nie mieszczą, końcowe chowają się za przyciskiem „Więcej” (ikona trzech kropek), który otwiera menu wyrównane do prawej krawędzi przycisku.
- **Menu** (wszystkie) otwierają się 4px pod paskiem, w którym leży ich przycisk, i nie wychodzą poza okno.
- **Panele:** dwa panele 50/50 na tle `background`, oddzielone linią 1px `border`. Treść 16px Segoe UI, interlinia 1.6, padding poziomy 32px.
- **Podgląd:**
  - H1/H2 z dolną linią `border`, nagłówki 600 z ujemnym trackingiem.
  - Kod w linii: tło `muted`, `radius-sm`, Cascadia Mono.
  - Bloki kodu: tło `card`, 1px `border`, `radius-lg`, zawijane.
  - Cytat: lewa krawędź 3px `input`, tekst `muted-foreground`.
  - Linki: kolor `foreground` z podkreśleniem `muted-foreground` (hover: podkreślenie `foreground`, 150ms), kursor wskazujący, focus z pierścieniem `ring`. Pełny adres docelowy w podpowiedzi po najechaniu.
  - HTML z białej listy: `kbd` jak kod w linii, ale z obramowaniem 1px `border` i tłem `card`; `details`/`summary` z obrysową strzałką (szewron 1.5px, `muted-foreground`) zamiast systemowego znacznika, obracaną o 90° przy otwarciu (150ms), podpis `summary` 500; kolory z `<span style>` pochodzą od użytkownika i są jedynym miejscem poza tokenami.
  - Tabele: 1px `border`, nagłówek na tle `card`.
  - Obrazek: ramka 1px `border` z ikoną obrazka i tekstem alt w `muted-foreground`.
  - Wiele pustych linii: każda dodatkowa pusta linia to pusty odstęp o wysokości jednej linii tekstu (1.6em), dodany do zwykłego odstępu akapitowego.
- **Błędy pisowni (edytor):** cienkie (1px) podkreślenie w kolorze `warning` (bursztyn, wartość `chart-3` z trybu dark: `oklch(0.769 0.188 70.08)`), odsunięte o 3px od tekstu. Własny token `warning` dodany według zasady z sekcji 2 pkt 4; używany tylko do tego podkreślenia.
- **Paski przewijania:** 12px, uchwyt `input` (hover `ring`), przezroczysty tor.
- **Okna dialogowe:** na razie systemowe (jasne). Docelowo własne, ciemne (`popover`) według sekcji 7.


# DESIGN.md — system wzorowany na shadcn/ui

> Źródło: https://ui.shadcn.com/ oraz /docs/theming (odczyt: 2026-10-20). Wartości kolorów pochodzą z CSS strony (tokeny `:root` / `.dark`, motyw *neutral*); wymiary komponentów z computed styles strony głównej. Wartości oznaczone „≈" są zaokrągleniami z pomiaru.

## 1. Filozofia

shadcn/ui to nie biblioteka komponentów, tylko sposób budowania własnej. Zasady:

- **Open Code** — kod komponentów trafia do repozytorium projektu; można go czytać i zmieniać.
- **Composition** — wspólny, przewidywalny interfejs (kompozycja: `Card` → `CardHeader` → `CardTitle`…).
- **Distribution** — płaski schemat + CLI instalują komponenty między projektami.
- **Beautiful Defaults** — stonowane, spójne style, które dobrze wyglądają od razu.
- **AI-Ready** — spójne API i otwarty kod ułatwiają modelom rozumienie i rozbudowę UI.

Charakter wizualny: **minimalistyczny, monochromatyczny, „cichy"**. Kolor jest rzadkością i pełni rolę akcentu; hierarchię budują kontrast jasności, rozmiar i grubość czcionki, a nie dekoracje.

## 2. Zasady architektury tokenów

1. Tokeny występują w **parach** `surface` + `surface-foreground` (np. `primary` / `primary-foreground`). Przyrostek `-background` jest pomijany.
2. Każdy token ma wartość w `:root` (jasny) i `.dark` (ciemny). **Komponenty nie mają klas specyficznych dla dark mode** — przełącza się wyłącznie zestaw zmiennych.
3. Zmienne mapowane do Tailwinda w `@theme inline` z prefiksem `--color-*` → `bg-background`, `text-muted-foreground`, `border-border`, `ring-ring`.
4. Własne kolory (np. `warning`) dodaje się: zmienna w `:root` i `.dark` → `--color-warning` w `@theme inline` → `bg-warning`, `text-warning-foreground`.
5. Wartości domyślne zapisane w **OKLCH**; motyw neutral ma chromę 0 (czysta skala szarości).
6. Kolor bazowy (`baseColor`): Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe.

## 3. Kolory

### 3.1 Tokeny semantyczne

| Token | Rola | Light | Dark |
|---|---|---|---|
| `background` | tło strony | `#ffffff` `oklch(1 0 0)` | `#0a0a0a` `oklch(0.145 0 0)` |
| `foreground` | tekst domyślny | `oklch(0.145 0 0)` (≈`#0a0a0a`) | `#fafafa` `oklch(0.985 0 0)` |
| `card` / `card-foreground` | powierzchnie wyniesione | `#fff` / `oklch(0.145 0 0)` | `#171717` `oklch(0.205 0 0)` / `#fafafa` |
| `popover` / `popover-foreground` | menu, dialogi, tooltipy | `#fff` / `oklch(0.145 0 0)` | `#171717` / `#fafafa` |
| `primary` | akcja główna | `oklch(0.205 0 0)` (≈`#171717`) | `#e5e5e5` `oklch(0.922 0 0)` |
| `primary-foreground` | tekst na primary | `#fafafa` `oklch(0.985 0 0)` | `#171717` |
| `secondary` / `-foreground` | akcja drugorzędna | `#f5f5f5` `oklch(0.97 0 0)` / `#171717` | `#262626` `oklch(0.269 0 0)` / `#fafafa` |
| `muted` | subtelne tła | `#f5f5f5` | `#262626` |
| `muted-foreground` | tekst pomocniczy | `#737373` `oklch(0.556 0 0)` | `#a1a1a1` `oklch(0.708 0 0)` |
| `accent` / `-foreground` | hover / focus / active | `#f5f5f5` / `#171717` | `#262626`–`#404040` / `#fafafa` |
| `destructive` | błędy, akcje destrukcyjne | `oklch(0.577 0.245 27.325)` (≈`#e40014`) | `oklch(0.704 0.191 22.216)` (≈`#ff6568`) |
| `border` | obramowania | `#e5e5e5` `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `input` | obramowanie pól | `#e5e5e5` | `oklch(1 0 0 / 15%)` |
| `ring` | pierścień focusa | `#a1a1a1` `oklch(0.708 0 0)` | `#737373` `oklch(0.556 0 0)` |

### 3.2 Sidebar

`sidebar` (`#fafafa` / dark `#171717`), `sidebar-foreground`, `sidebar-primary` (`#171717` / dark niebieski `oklch(0.488 0.243 264.376)`), `sidebar-primary-foreground` (`#fafafa`), `sidebar-accent` (`#f5f5f5` / `#262626`), `sidebar-accent-foreground`, `sidebar-border` (`#e5e5e5` / `oklch(1 0 0 / 10%)`), `sidebar-ring` (`#a1a1a1` / `#737373`).

### 3.3 Wykresy

- Light (klasyczny zestaw): `chart-1 oklch(0.646 0.222 41.116)`, `chart-2 oklch(0.6 0.118 184.704)`, `chart-3 oklch(0.398 0.07 227.392)`, `chart-4 oklch(0.828 0.189 84.429)`, `chart-5 oklch(0.769 0.188 70.08)`.
- Dark: `chart-1 oklch(0.488 0.243 264.376)`, `chart-2 oklch(0.696 0.17 162.48)`, `chart-3 oklch(0.769 0.188 70.08)`, `chart-4 oklch(0.627 0.265 303.9)`, `chart-5 oklch(0.645 0.246 16.439)`.
- Aktualna strona używa też jednobarwnych skal (np. neutral: `#d4d4d4 → #737373 → #525252 → #404040 → #262626`; blue: `#90c5ff → #3080ff → #155dfc → #1447e6 → #193cb8`). Na stronie głównej wykres słupkowy jest w skali szarości z jednym ciemnym słupkiem jako akcentem.

### 3.4 Motywy akcentowe

Motyw podmienia tylko `primary`, `primary-foreground`, `ring`, `sidebar-primary*`, `sidebar-ring`. Dostępne: amber (500), blue (700), green (lime-600), mono (stone-500), orange, purple, red, rose, teal, violet (500), yellow (500, tekst na nim `yellow-900`). Wariant „sketch" (ciemnoniebieski `#0b0d6a`, tekst `#f6f7eb`, font Geist Mono) pokazuje, że cały wygląd da się zmienić samymi tokenami.

### 3.5 Zasady użycia koloru

- Jedna dominująca akcja (`primary`) na widok; reszta to `secondary`, `outline`, `ghost`.
- Tekst drugorzędny zawsze `muted-foreground`, nigdy własny szary.
- Stany interaktywne (hover/selected) = `accent`, nie przyciemnianie `primary`.
- Czerwień wyłącznie dla `destructive`.
- Nie koduj kolorów na sztywno (`#xxx`, `zinc-500`) — tylko tokeny.

## 4. Typografia

> **MDE:** używamy czcionek systemowych Windows 11 zamiast Geist (bez dołączania plików czcionek do exe).

- **Sans:** Segoe UI (`--font-sans`), fallback → system-ui, sans-serif. Używana w całym interfejsie oraz w obu panelach (edytor i podgląd).
- **Mono:** Cascadia Mono (`--font-mono`), fallback → Consolas, ui-monospace, monospace. Tylko dla kodu (bloki kodu i kod w linii).
- Podstawa: 16px (body), komponenty UI: 14px (`text-sm`), drobne etykiety/badge: 12px (`text-xs`).

| Rola | Rozmiar / interlinia | Waga | Dodatki |
|---|---|---|---|
| H1 (hero) | 30px / 36px (rośnie responsywnie na szerokich ekranach) | 600 | `letter-spacing ≈ -0.75px` (tracking-tight) |
| Lead / opis hero | 18px / 28px | 400 | kolor `foreground`, `text-balance` |
| Tytuł karty | 16px / 24px | 500 | `foreground` |
| Opis karty / tekst pomocniczy | 14px | 400 | `muted-foreground` |
| Tekst przycisku | 14px (małe: 12.8px) | 500 | — |
| Badge | 12px | 500 | — |
| Nawigacja | 14px | 500 | — |

Zasada: dwie wagi robocze — **500** (interfejs) i **600** (nagłówki); treść 400. Nagłówki mają ujemny tracking, mono nie.

## 5. Promienie, obramowania, cienie

- Bazą jest `--radius: 0.625rem` (10px). Skala wyliczana w `@theme inline`:
  `sm = 0.6×`, `md = 0.8×`, `lg = 1×`, `xl = 1.4×`, `2xl = 1.8×`, `3xl = 2.2×`, `4xl = 2.6×`.
  Zmiana jednej zmiennej przeskalowuje cały system.
- Zmierzone na stronie: przyciski ≈10px lub pigułki (≈18–26px zależnie od stylu), karty ≈24px, textarea ≈18px, badge w pełni zaokrąglony (pill).
- **Obramowanie:** 1px, `border` / `input`. Karty na stronie głównej nie mają obramowania, tylko ring `0 0 0 1px` w `foreground/5%`.
- **Cienie:** minimalne — `shadow-sm`-podobny: `0 1px 3px rgba(0,0,0,.1), 0 1px 2px -1px rgba(0,0,0,.1)`. Wysokość powierzchni sygnalizuje głównie kolor tła + cienka krawędź, a w dark mode — jaśniejsze `card` (`#171717`) na `#0a0a0a`.
- **Focus:** pierścień `ring` (zwykle 3px z przezroczystością ~50%) + zmiana koloru obramowania na `ring`.

## 6. Odstępy i layout

- Siatka 4px (Tailwind): typowe odstępy 4 / 6 / 8 / 10 / 12 / 16 / 20 / 24.
- Karta: padding pionowy 20px (`py-5`), przerwa między sekcjami 20px, padding poziomy sekcji 20px.
- Wysokości kontrolek: 28 / 32 (domyślna ≈32–36) / 36 / 40px; pole tekstowe 32–36px; textarea min ≈64px.
- Przyciski: padding poziomy 10–12px, gap ikony 4–6px.
- Nagłówek strony: wysokość 64px, białe tło, nawigacja tekstowa (Home, Docs, Components, Blocks, Charts, Directory, Typeset, Create), wyszukiwarka, licznik gwiazdek GitHub, przełącznik motywu, przycisk „New".
- Hero wyśrodkowany, `max-w` ~ 2xl dla tekstu; pod nim siatka kart (3 kolumny ≥ desktop, 1 kolumna mobile).

## 7. Komponenty

Każdy komponent ma stabilny atrybut `data-slot` (np. `card`, `card-title`, `button`, `field-label`) — używaj go do stylowania i testów zamiast klas.

### Button
- Warianty: `default` (bg `primary`, tekst `primary-foreground`), `secondary` (bg `secondary`), `outline` (bg `background`, 1px `border`), `ghost` (bez tła, hover `accent`), `destructive`, `link`.
- Rozmiary: `xs/sm/default/lg` + `icon`. Typowo: h 32px, px 12px, 14px/500, gap 6px, `radius-lg` lub pigułka.
- Ikony 16px, `pointer-events-none`, `shrink-0`.
- Stany: hover (`/90` lub `accent`), focus-visible (ring), disabled (`opacity-50`, brak zdarzeń), `aria-invalid` (ring/border `destructive`).

### Badge
- 12px/500, padding `2px 8px`, border 1px transparent, wariant `default` (czarny), `secondary` (`#f5f5f5`), `outline`, `destructive`; zwykle pill.

### Card
- Struktura: `Card > CardHeader (CardTitle, CardDescription, CardAction) > CardContent > CardFooter`.
- bg `card`, tekst `card-foreground`, `radius-xl`+, pionowy rytm przez `gap`.

### Input / Textarea / Select / Field
- Wysokość ≈32–36px, border 1px `input`, tło przezroczyste (dark: `input/30`), padding `4px 10px`, 14px, placeholder `muted-foreground`.
- Formularze składa się z `Field` (`field-label`, `field-description`, `field-content`, `field-group`) i `InputGroup` (addony po bokach/ikony).
- Walidacja: `aria-invalid` → ring i obramowanie w `destructive`.

### Checkbox / Radio / Switch
- Mała kontrolka 16px (switch ≈ 32×18px); stan zaznaczony = tło `primary`, tekst/ikona `primary-foreground`; focus ring jak wszędzie.

### Dialog / AlertDialog / Popover / Dropdown / Tooltip
- Powierzchnie `popover`, border `border`, `radius-lg`+, cień średni; overlay półprzezroczysty czarny. Animacje wejścia: fade + lekki zoom/slide (150–200ms).

### Sidebar
- Tokeny `sidebar-*`; elementy menu (`sidebar-menu-button`) z tłem `sidebar-accent` dla aktywnego; grupy z etykietą 12px `muted-foreground`.

### Pozostałe obserwowane
`Item` (lista z media/title/description/footer), `Empty` (ikona, tytuł, opis, akcje), `Breadcrumb`, `Progress` (track + indicator), `Skeleton` (`muted`, pulse), `Separator` (1px `border`), `ButtonGroup`, `Toast` (Sonner).

## 8. Ikony

Lucide (1.5–2px stroke, 16px w kontrolkach, 20–24px samodzielnie), kolor dziedziczony (`currentColor`), `muted-foreground` w kontekście pomocniczym.

## 9. Ruch

Krótko i subtelnie: `transition-colors` / `transition-[color,box-shadow]` 150ms, ease standardowy. Overlaye: 150–200ms fade/zoom. Szanuj `prefers-reduced-motion`.

## 10. Dostępność

- Komponenty oparte na prymitywach dostępnych (Radix / Base UI): role ARIA, zarządzanie focusem, obsługa klawiatury wbudowane.
- Widoczny focus (`ring`) na każdym elemencie interaktywnym; stany błędu przez `aria-invalid`, nie samym kolorem.
- Pary `*-foreground` zapewniają kontrast tekstu — po zmianie tokenów zweryfikuj WCAG AA (4.5:1 dla tekstu, 3:1 dla elementów UI), zwłaszcza `muted-foreground` na `muted`.
- Cele dotykowe ≥ 32px (zalecane 40–44px na mobile).

## 11. Implementacja (stos)

- Tailwind CSS v4 (`@theme inline`, zmienne `--color-*`), `class-variance-authority` do wariantów, helper `cn()` (`clsx` + `tailwind-merge`), ikony `lucide-react`, tryb ciemny przez klasę `.dark` na `<html>`.
- CLI: `npx shadcn@latest init` / `add <komponent>`; konfiguracja w `components.json` (`tailwind.baseColor`, `tailwind.cssVariables`, aliasy ścieżek).

### Minimalny arkusz startowy

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@theme inline {
  --font-sans: "Segoe UI", system-ui, sans-serif;
  --font-mono: "Cascadia Mono", Consolas, ui-monospace, monospace;
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* …pozostałe tokeny analogicznie: --color-<nazwa>: var(--<nazwa>) */
}
```

## 12. Do / Don't

**Do**
- Buduj UI z tokenów i par `bg-*` + `text-*-foreground`.
- Kompozycja zamiast rozbudowanych propsów; wariantuj przez `cva`.
- Zachowuj dużo białej przestrzeni i ciche powierzchnie.
- Testuj oba tryby (light/dark) przy każdym komponencie.

**Don't**
- Nie dodawaj klas `dark:` tam, gdzie wystarczy token.
- Nie używaj więcej niż jednego koloru akcentu na ekranie.
- Nie stawiaj ciężkich cieni, gradientów ani grubych obramowań.
- Nie zmieniaj wartości w `ui/*` bez potrzeby — rozszerzaj przez warianty i tokeny.
