ogólne uwagi:
- Program ma mieć ciemny szablon kolorów
- Ikony użyte w projekcie mają być preferencyjnie obrysowe (złożone z linii, a nie pełnych kształtów z tłem), minimalistyczne i nowoczesne. Wyjątki są dozwolone tam, gdzie obrys byłby niedorzeczny lub nieczytelny — np. litery B / I / U / H na pasku formatowania (obrysowe B od pogrubienia przeczyłoby swojemu znaczeniu), znaczniki list, cudzysłów cytatu, tabela.

## Układ MDE (stan wdrożenia)

Tokeny z sekcji 3 (tylko wartości `.dark`) są w `src/styles.css`, z wyjątkiem `background`, którego wartość w MDE to `#1b1b1b`.

- **Kolory własne MDE** (wartości ustalone przez właściciela projektu, dodane według zasady z sekcji 2 pkt 4): `topbar` `#151515` — górny pasek i tło przycisków okna; `tab` `#1b1b1b` — nieaktywne karty; `toolbar` `#222222` — aktywna karta, pasek formatowania, pasek wyszukiwania; `statusbar` `#151515` — pasek stanu; `statusbar-foreground` `#808080` — ikony i napisy paska stanu; `scrollbar` `#313131` — uchwyt paska przewijania; `content-foreground` `#f3f3f3` — tekst w panelach; `content-strong` `#ffffff` — tekst sformatowany (pogrubienie, kursywa, podkreślenie, nagłówki H1–H5) i ptaszek w zaznaczonym polu zadania; `table-header` `#b36b00` — tło komórek nagłówka tabeli; `table-header-foreground` `#ffffff` — tekst nagłówka tabeli; `h1-rule` `#4f4f4f` i `h2-rule` `#3b3b3b` — linie pod nagłówkami H1 i H2; `minimap-h1` `#ababab` i `minimap-h2` `#949494` — paski linii nagłówków H1 i H2 w minimapie; `minimap-slider` `#323232` — suwak minimapy (widoczny fragment); `backdrop` `#151515` — pola po bokach kartki w panelu szerszym od niej; `topbar-separator` `#2c2d2d` — kreska między przyciskiem grup kart a przyciskami okna. `background` (`#1b1b1b`) to tło paneli i minimapy.

- **Okno:** bez systemowego paska tytułu — jego rolę przejmuje górny pasek. Systemowy cień, zaokrąglone rogi Windows 11 i niewidoczne krawędzie do zmiany rozmiaru zostają. Tło okna i webview `background` (`#1b1b1b`) od pierwszej klatki, bez białego błysku.
- **Górny pasek:** 40px, tło `topbar`, dolna krawędź 1px `border`. Po lewej przycisk menu (ikona hamburgera, `ghost`, 28×28, ikona 16px, kolor `muted-foreground`, hover `accent`). Trzy kreski ikony mają grubość 1px i przerwy 3px, razem 12×9px, i leżą na pełnych pikselach (ikona narysowana na siatce 16 jednostek, 1 jednostka = 1px, więc kreski są ostre). Leżą na wspólnej osi: lewa krawędź na tej samej pionowej linii co tekst w panelach (w trybie dwóch okien, gdy kartka wypełnia panel; w trybie jednego okna tekst ma margines 33px i leży 8px dalej — paski celowo zostają na 25px) i litera B na pasku formatowania (`--content-padding-x`), a góra na wysokości górnej krawędzi wielkich liter w nazwach kart (dół tuż nad ich linią bazową). Puste miejsca paska (także wolna część paska kart) przesuwają okno, a dwuklik w nich maksymalizuje je lub przywraca.
  - **Przyciski okna** przy prawej krawędzi, bez odstępu od niej: minimalizuj, maksymalizuj / przywróć, zamknij. Rysowane natywnie (GDI, `src-tauri/src/caption.rs`) w osobnym okienku nad stroną, żeby przy zmianie rozmiaru okna trzymały się krawędzi (strona w WebView2 dorysowuje się z opóźnieniem); w pasku jest pod nie zarezerwowane miejsce 138px. Każdy 46px szerokości i 39px wysokości (dolna krawędź paska zostaje widoczna), bez zaokrągleń, tło `topbar`. Ikony jak systemowe przyciski Windows 11 (czcionka Segoe Fluent Icons, 10px): pozioma linia, kwadrat, dwa nachodzące kwadraty (przywróć), X; kolor `muted-foreground`. Hover: tło `accent`, ikona `accent-foreground`; zamknij: tło `window-close` (`#c42b1c`, czerwień przycisku zamykania z Windows) i biała ikona. Własne tokeny `window-close` / `window-close-foreground` dodane według zasady z sekcji 2 pkt 4, używane tylko tutaj — to konwencja systemu, nie `destructive`; wartości kolorów są powielone w `caption.rs`. Podpowiedzi systemowe w ciemnym stylu („Minimalizuj”, „Maksymalizuj” / „Przywróć w dół”, „Zamknij”).
- **Karty:** pasek kart wypełnia górny pasek na prawo od menu; pierwsza karta zaczyna się 25px (`--content-padding-x`) za prawą krawędzią litery B na pasku formatowania, czyli na linii litery I, odstęp 2px między kartami. Karta: tekst 14px/500, szerokość według nazwy, maks. 240px, min. 100px (nazwa z wielokropkiem), zaokrąglone górne rogi `radius-md`.
  - Aktywna: tło `toolbar`, obramowanie 1px `border` bez dolnej krawędzi, tekst `foreground`; łączy się z paskiem formatowania pod spodem.
  - Nieaktywna: tło `tab`, bez obramowania, tekst `muted-foreground`; hover tło `accent`, tekst `accent-foreground` (150ms).
  - Na prawo od nazwy pole 20×20: kropka niezapisanych zmian (koło o średnicy wysokości małej litery nazwy, `1ex` = 7px przy 14px Segoe UI, kolor `warning` jak podkreślenie błędów pisowni; środek na połowie wysokości wielkich liter). Po najechaniu na kartę w tym miejscu pojawia się przycisk zamknięcia (ikona X 14px, `muted-foreground`, `radius-sm`, hover: tło `foreground` 10%, ikona `foreground`).
  - Przeciągana karta leży nad pozostałymi, z cieniem średnim.
  - Gdy karty się nie mieszczą, zwężają się do min. szerokości, a potem pasek przesuwa się tak, by aktywna karta była widoczna (bez paska przewijania).
- **Grupy kart:** przycisk przy prawym końcu górnego paska, przed przyciskami okna, oddzielony od nich pionową kreską 1×10px `topbar-separator`. Odstępy jak między ikonami przycisków okna (36px między ikonami): kreska stoi 36px na lewo od ikony minimalizacji, a ikona grup 36px na lewo od kreski; ikona i kreska mają wysokość ikon okna (10px) i leżą na ich wysokości (14px od góry paska). Ikona zaprojektowana dla MDE (folder z kartą, wypełnione kształty, 15×10px, siatka 3,125 jednostki na piksel, `currentColor`) w `muted-foreground`, na pełnych pikselach: przycisk `ghost` 29×28 (7px z boków, 9px nad i pod ikoną), hover `accent`, podpowiedź „Grupy kart”.
  - **Okienko listy:** jak menu (powierzchnia `popover`, 1px `border`, `radius-lg`, padding 4px, cień średni, fade + slide 150ms), szerokość 360px, prawą krawędzią przy prawej krawędzi przycisku, 4px pod paskiem. Na górze pozycja menu „Zapisz nową grupę kart” (32px), pod nią separator 1px `border`, napis „Otwórz w nowym oknie:” (28px, padding 0 8px, 12px/500 `muted-foreground`) i lista (odstęp 2px), przewijana od wysokości 420px (mniej w niskim oknie).
  - **Pozycja grupy:** 32px, `radius-sm`, padding 0 2px 0 8px; nazwa (z wielokropkiem), 4px dalej liczba kart w nawiasie w `muted-foreground`, a przy prawej krawędzi przyciski `ghost` 28×28 z obrysowymi ikonami Lucide `pencil` i `trash-2` 16px (`muted-foreground`, hover: tło `foreground` 10%, ikona `foreground`; podpowiedzi „Zmień nazwę”, „Usuń”). Grupa bieżącego okna: tło `accent`, tekst `accent-foreground`, a za liczbą kart (w tym samym kolorze) dopisek „– otwarta”. Hover pozostałych: `accent` 50% (słabszy, żeby nie mylił się z bieżącą grupą).
  - **Nazwa w miejscu pozycji:** pole jak Input z sekcji 7 (32px, 1px `input`, tło `input` 30%, `radius-md`, 14px, placeholder „Nazwa grupy”, bez pierścienia focusa), za nim (odstęp 8px) przyciski „Anuluj” (`outline`) i „Zapisz” (`default`), oba 32px jak w oknach dialogowych. Nieaktywny „Zapisz”: przezroczystość 50%.
- **Menu:** powierzchnia `popover`, 1px `border`, `radius-lg`, padding 4px, min. 232px, cień średni, wejście fade + slide 150ms. Pozycje mają 32px wysokości, `radius-sm`, a hover/focus `accent`. Skrót po prawej: 12px `muted-foreground`. Separatory 1px `border`.
- **Pasek ostrzeżenia** (np. plik otwarty jako Windows-1250): pod górnym paskiem, pełna szerokość, min. 40px, tło `card`, dolna krawędź 1px `border`, tekst 14px `card-foreground`. Po lewej obrysowa ikona trójkąta ostrzegawczego 16px w `muted-foreground`, po prawej przycisk zamknięcia (ikona X, `ghost` 32×32 jak przycisk menu). Wejście fade + slide 150ms. Bez koloru — czerwień tylko dla `destructive`.
  - Pasek z wyborem (plik zmieniony przez inny program): przed przyciskiem X przycisk tekstowy `outline` „Odśwież”: wysokość 32px, padding 0 12px, 14px/500, tło `background`, 1px `border`, `radius-md`, hover `accent`, odstęp 8px. X zamyka pasek i zachowuje zmiany użytkownika (podpowiedź „Zamknij i zachowaj moje zmiany”).
- **Pasek stanu:** dół okna, 28px, tło `statusbar`, górna krawędź 1px `border`, przyciski wyrównane do prawej. Ikony przycisków paska stanu są narysowane na siatce 16 jednostek (1 jednostka = 1px) linią 1px i leżą na pełnych pikselach (przyciski są wyśrodkowane na pełnych pikselach i mają całkowite szerokości), więc ich proste linie są ostre; rozmyte zostają tylko zaokrąglone rogi i skosy. Przy lewej krawędzi licznik znaków: zwykły tekst (nie przycisk) 12px/500 `statusbar-foreground`, tekst zaczyna się na tej samej pionowej linii co litera B na pasku formatowania i tekst w panelach w trybie dwóch okien (`--content-padding-x`), w pionie w linii z napisami przycisków, cyfry o stałej szerokości (`tabular-nums`), bez ikony; „12 345 znaków”, a przy zaznaczeniu „56 z 12 345 znaków”; gdy brak miejsca, ucinany wielokropkiem. Przycisk sprawdzania pisowni: `ghost`, rozmiar xs (24px, padding 0 8px, 12px/500, `radius-sm`, kolor `statusbar-foreground`, hover `accent` z tekstem `accent-foreground`), obrysowa ikona kartki z ołówkiem 16px i tekst („Pisownia: polski”); klik zmienia tryb. Na prawo od niego (odstęp 4px) przycisk minimapy w tym samym stylu: obrysowa ikona 16px — kwadrat 13×13px (jak w ikonie przewijania) z trzema poziomymi liniami różnej długości (7, 4 i 6px); wnętrze kwadratu to na przemian równe przerwy 2px i linie 1px, także od górnej i dolnej krawędzi; odwzorowuje wygląd minimapy i odróżnia się od ikony przewijania — i tekst („Mapa: wł” / „wył”); klik przełącza tryb. Dalej (odstęp 4px) przycisk trybu okien w tym samym stylu: obrysowa ikona okna aplikacji (na wzór Lucide `app-window`: prostokąt 14×11px z paskiem tytułu) 16px i tekst („Okna: 1” / „Okna: 2”); klik przełącza tryb. Dalej (odstęp 4px) przycisk synchronizacji przewijania w tym samym stylu: obrysowa ikona dwóch paneli — kwadrat 13×13px przedzielony na środku pionową linią (na wzór Lucide `columns-2`) 16px i tekst („Przewijaj razem: wł” / „wył”); klik przełącza tryb. W trybie jednego okna jest nieaktywny (`aria-disabled`): przezroczystość 50%, bez tła przy najechaniu, podpowiedź „Przewijanie razem działa w trybie dwóch okien”. Gdy pasek jest za wąski, napisy przycisków są ucinane wielokropkiem (ikony zostają).
- **Pasek formatowania:** nad edytorem w lewym panelu, 40px, tło `toolbar`, dolna krawędź 1px `border`, przyciski wyrównane do lewej, odstęp 2px; lewy padding paska (`--content-padding-x` − 12px) ustawia pierwszą ikonę na tej samej pionowej linii co tekst w panelu w trybie dwóch okien (wspólny token `--content-padding-x` = 25px — tyle, ile odstęp między literami B i I na pasku — to tam poziomy padding tekstu w obu panelach; w trybie jednego okna tekst ma 33px, `--page-padding-x`, a pasek się nie przesuwa). Przyciski `ghost` 32×32 z ikonami 16px (`muted-foreground`, hover `accent`), podpowiedź z nazwą i skrótem. Ikony B, I, U, H, list, cytatu i tabeli zaprojektowane dla MDE (siatka 24, kolor `currentColor`, pliki źródłowe poza repozytorium): litery B / I / U / H to wypełnione glify (pod U linia 1,68), cytat to wypełniony cudzysłów ”, tabela to wypełniona plansza z wyciętymi komórkami (wąska kolumna po lewej i szeroka po prawej, cztery wiersze). Ikony list: trzy linie tekstu (y 5,25 / 12,75 / 20,25), a przy pierwszej i ostatniej znacznik — wypełnione kółko (r 2,25), wypełniona cyfra 1 / 2 albo obrysowy ptaszek; grubości linii z projektu (1,56 / 1,68 / 1,8). Link, mikrofon, szewron i „Więcej” to obrysowe ikony Lucide (linia 1,75). Kolejność: B, I, U, styl akapitu, lista punktowana, numerowana, lista zadań, cytat, tabela, link, dyktowanie — bez separatorów między przyciskami.
  - Przyciski przełączające (B, I, U, listy, lista zadań, cytat) w stanie włączonym (`aria-pressed`): tło `accent`, ikona `accent-foreground`.
  - Styl akapitu: przycisk z ikoną H i szewronem 12px (ok. 2px od litery H — ujemny margines zjada puste pola po bokach obu ikon; padding 0 6px 0 8px) otwiera menu (jak menu główne) z pozycjami „Nagłówek 1–5” (ze skrótami) i na dole „Tekst akapitowy”; bieżący styl oznacza obrysowy znak ✓ 16px przed nazwą.
  - Tabela: popover `popover`, 1px `border`, `radius-lg`, padding 8px, cień średni, wejście fade + slide 150ms; siatka 8×8 kratek 16px (odstęp 4px, 1px `input`, promień 3px); kratki w wybranym zakresie: tło `accent`, krawędź `ring`; pod siatką rozmiar 12px `muted-foreground`.
  - Gdy przyciski się nie mieszczą, końcowe chowają się za przyciskiem „Więcej” (ikona trzech kropek), który otwiera menu wyrównane do prawej krawędzi przycisku.
  - Przycisk „Dyktowanie” (obrysowa ikona mikrofonu, Lucide `mic`, `ghost` 32×32, podpowiedź „Dyktowanie (Win+H)”) jest ostatni, za ikoną linku.
- **Pasek wyszukiwania** (Ctrl+F): pod paskiem formatowania, 40px, tło `toolbar`, dolna krawędź 1px `border`, wejście fade + slide 150ms. Lewy padding (`--content-padding-x` − 10px) ustawia ikonę lupy na linii tekstu w trybie dwóch okien (na linii litery B). Pole tekstowe jak Input z sekcji 7: wysokość 32px, szerokość do 280px (min. 80px; zwęża się przed licznikiem), 1px `input`, tło `input` 30%, `radius-md`, 14px, placeholder `muted-foreground`, obrysowa ikona lupy 16px w `muted-foreground` wewnątrz po lewej; bez pierścienia i zmiany krawędzi przy focusie (wystarczy pojawienie się paska i migający kursor). Zaraz za polem przełącznik „Uwzględnij wielkość liter”: `ghost` 32×32 z obrysową ikoną „Aa” (Lucide `case-sensitive`) 21px (o 30% większą od pozostałych), podpowiedź z nazwą, stan włączony jak B / I / U (`aria-pressed`: tło `accent`, ikona `accent-foreground`). Za nim pionowa linia jak między grupami paska formatowania (1px `border`, 20px wysokości, 4px odstępu z każdej strony), dalej licznik 12px `muted-foreground` („Znaleziono: 3 z 12”, „Znaleziono: 12 wyników”, „Brak wyników”), a przy prawej krawędzi paska przyciski `ghost` 32×32: szewron w górę, szewron w dół, X.
  - Wyniki w edytorze (jak „Znajdź wszystkie” w przeglądarce): tło `search-match` (`#656565`), promień 2px; bieżący (zaznaczony) wynik: tło `search-current` (`#e58b00`, pomarańcz). Własne tokeny dodane według zasady z sekcji 2 pkt 4, wartości ustalone przez właściciela projektu; używane tylko do wyników wyszukiwania.
- **Menu** (wszystkie) otwierają się 4px pod paskiem, w którym leży ich przycisk, i nie wychodzą poza okno.
- **Minimapa** (lewy panel, gdy włączona): okienko w prawym górnym rogu obszaru edytora, bez odstępów — styka się z paskiem formatowania (lub wyszukiwania) u góry i z panelem podglądu z prawej. Szerokość `--minimap-width` = 77px, tło `background`, bez cienia; krawędź 1px `border` tylko z lewej i u dołu, zaokrąglony (`radius-md`) tylko lewy dolny róg. Wysokość: min. 100px, dla dłuższych plików rośnie z plikiem aż do dolnej krawędzi panelu (wtedy bez dolnej krawędzi i zaokrąglenia — pasek stanu ma własną linię). Gdy obraz jest wyższy od okienka, przewija się razem z edytorem. Pasek przewijania edytora jest wtedy ukryty (`--editor-scrollbar-width: 0`), bo minimapa zajmuje jego miejsce i przejmuje jego rolę.
  - Obraz: każde słowo to pasek 1px wysokości o długości słowa, w kolorze `muted-foreground` 55%, a linie nagłówków H1 w `minimap-h1` i H2 w `minimap-h2` (`#` / `##` i podkreślone `===` / `---`, nie w blokach kodu); wiersz tekstu (także zawinięty) ma 2px; padding wewnętrzny 5px po bokach i 3px u góry i dołu. Szerokość tekstu edytora jest przeskalowana do szerokości okienka, więc zawijanie wygląda jak w edytorze.
  - Widoczny fragment: suwak na całą szerokość pod paskami słów (nie przesłania ich), tło `minimap-slider` (hover z domieszką 3% `foreground`, przeciąganie 7%, przejście 150ms), bez obramowania.
  - Tekst w edytorze ma wtedy po prawej stały margines `--content-padding-x` + `--minimap-width` (102px; w trybie jednego okna `--page-padding-x` + `--minimap-width` = 110px) na całej wysokości panelu, więc okienko nigdy go nie zasłania (odstęp jak zwykły margines tekstu na kartce). Gdy kartka jest wyśrodkowana (panel szerszy od niej), okienko leży na prawym polu `backdrop`, a tekst rezerwuje tylko tę część miejsca, której pole nie pokrywa, z tym samym odstępem od okienka. Kursor nad okienkiem: strzałka.
- **Tryb jednego okna** (edytor pokazuje sformatowany tekst): panel edytora zajmuje całą szerokość, bez linii podziału i panelu podglądu. Znaczniki Markdown są ukryte, a tekst wygląda jak w podglądzie (te same rozmiary, wagi i kolory):
  - Nagłówki H1–H6 jak w podglądzie (1.875 / 1.5 / 1.25 / 1.1 / 1 / 1em, 600, ujemny tracking, interlinia 1.25, odstęp 0.35em nad tekstem); H1 z dolną linią 1px `h1-rule`, H2 z dolną linią 1px `h2-rule`, na szerokość tekstu; H6 w `muted-foreground`.
  - Pogrubienie 700, kursywa, przekreślenie, podkreślenie (odsunięte o 3px); kod w linii: tło `muted`, `radius-sm`, Cascadia Mono 0.875em; `kbd` z obramowaniem 1px `border` i tłem `card`; kolory z `<span style>` jak w podglądzie.
  - Linki: podkreślenie `muted-foreground` (hover `foreground`, 150ms), kolor tekstu bez zmian; kursor tekstowy, a przy wciśniętym Ctrl wskazujący.
  - Listy: cała lista wcięta o `--list-indent` = 1.92em (ok. 7 spacji Segoe UI po 0.274em), liczone do lewej krawędzi numeru i pola zadania. Znacznik stoi w kolumnie `--list-marker` = 1.5625em (min. szerokość), tekst punktu zaczyna się zaraz za nią, a każdy poziom zagnieżdżenia przesuwa się o jedną kolumnę; zawinięte linie punktu wyrównują się do jego tekstu. Miary w em, więc skalują się z powiększeniem. Znaczniki w kolorze `warning`: punktor •, ◦, ▪ (według poziomu) powiększony o 30% i wyśrodkowany na osi pola zadania (w polu 1em), numer z kropką od lewej krawędzi kolumny (cyfry `tabular-nums`). Zadanie: pole 0.875em (14px przy tekście 16px; w kolumnie 1em, dolną krawędzią 0.0625em — 1px — pod linią bazową, żeby wyglądało na wyśrodkowane względem tekstu) według projektu właściciela (`src/taskbox.ts`): ramka `warning` o grubości 0.125em (2px) z zewnętrznymi rogami o promieniu 0.0875em (1.4px) i ostrymi wewnętrznymi, rysowana jako obramowanie CSS (nie SVG), żeby jej linie leżały na pełnych pikselach ekranu przy każdym powiększeniu; gdy zrobione — biały (`content-strong`) ptaszek z SVG właściciela, nałożony na całe pole, o grubości linii 2px, z zaokrąglonymi końcami, którego prawe ramię sięga na ramkę w prawym górnym rogu; nigdy wypełnione pole; kursor nad polem wskazujący, klik zaznacza / odznacza.
  - Cytat: tekst `muted-foreground`, pionowa linia 3px `input` przy lewej krawędzi tekstu i wcięcie 1em (każdy poziom zagnieżdżenia dodaje linię).
  - Tabele, bloki kodu, bloki HTML, linia pozioma i obrazki wyglądają jak w podglądzie. Gdy kursor jest w takim elemencie, widać jego źródło: Cascadia Mono 0.875em na tle `card` na całej szerokości linii.
  - **Okienko adresu linku** (przycisk linku lub Ctrl+K): popover jak siatka tabeli (`popover`, 1px `border`, `radius-lg`, padding 8px, cień średni, fade + slide 150ms), szerokość 320px, pod przyciskiem linku. W środku pole jak Input z sekcji 7 (32px, 1px `input`, tło `input` 30%, `radius-md`, 14px), placeholder „Wpisz adres, np. https://…”, bez pierścienia focusa.
- **Panele:** dwa panele (domyślnie 50/50) na tle `background`, oddzielone linią 1px `border`. Linię można chwycić w pasie 9px (4px z każdej strony) — kursor `col-resize`; linia nie zmienia koloru przy najechaniu ani przeciąganiu (to funkcja drugorzędna, nie ma rozpraszać). Podczas przeciągania kursor zostaje `col-resize` w całym oknie, a tekst się nie zaznacza. Panel ma min. 200px szerokości. Dwuklik na linii przywraca 50/50. Podpowiedź: „Przeciągnij, aby zmienić szerokość paneli; kliknij dwukrotnie, aby wyrównać”. Treść 16px Segoe UI, interlinia 1.6, tekst `content-foreground`. Tekst leży na kartce (tło `background`) z paddingiem poziomym 25px (`--content-padding-x`, w linii z literą B paska formatowania), a w trybie jednego okna 33px (`--page-padding-x`; paski interfejsu zostają przy 25px); szerokość tekstu najwyżej `--content-max-width` = 82.125em (1314px przy 100%, skaluje się z powiększeniem), więc kartka ma najwyżej 1380px w trybie jednego okna i 1364px w panelach trybu dwóch okien. W szerszym panelu kartka jest wyśrodkowana (w edytorze względem całej szerokości panelu, razem z paskiem przewijania, więc włączenie i wyłączenie minimapy jej nie przesuwa), a po bokach są pola `backdrop` (`#151515`, udają tło okna za kartką; przy oknie 1920px w trybie jednego okna po 270px, mogą mieć 0px). Gdy minimapa się na prawym polu nie mieści, tekst odsuwa się od niej tylko o brakującą część; tekst sformatowany `content-strong`, znaczniki list `warning` (w obu panelach i w trybie jednego okna).
- **Podgląd:**
  - H1 z dolną linią `h1-rule`, H2 z dolną linią `h2-rule`, nagłówki 600 z ujemnym trackingiem; rozmiary i odstępy jak w trybie jednego okna.
  - Kod w linii: tło `muted`, `radius-sm`, Cascadia Mono.
  - Bloki kodu: tło `card`, 1px `border`, `radius-lg`, zawijane.
  - Cytat: lewa krawędź 3px `input`, tekst `muted-foreground`.
  - Linki: kolor `foreground` z podkreśleniem `muted-foreground` (hover: podkreślenie `foreground`, 150ms), kursor wskazujący, focus z pierścieniem `ring`. Pełny adres docelowy w podpowiedzi po najechaniu.
  - HTML z białej listy: `kbd` jak kod w linii, ale z obramowaniem 1px `border` i tłem `card`; `details`/`summary` z obrysową strzałką (szewron 1.5px, `muted-foreground`) zamiast systemowego znacznika, obracaną o 90° przy otwarciu (150ms), podpis `summary` 500; kolory z `<span style>` pochodzą od użytkownika i są jedynym miejscem poza tokenami.
  - Tabele: szerokość według treści (maks. 100%), obramowanie całej tabeli 1px `warning` (żółty jak podkreślenie błędów pisowni) z czterema zaokrąglonymi rogami `radius-lg` (rogi nagłówka przycięte do obrysu); komórki nagłówka oddzielone od reszty tabeli linią 1px `warning`, a od siebie pionowymi liniami 1px w kolorze `background`; linie między pozostałymi komórkami 1px `border`; nagłówek na tle `table-header` (`#b36b00`), tekst nagłówka pogrubiony (700) w kolorze `table-header-foreground` (`#ffffff`) (także pogrubiony, kursywa i linki); co drugi wiersz tła `card` 50%. Tak samo w trybie jednego okna.
  - Listy i lista zadań: wcięcia, kolumna znacznika, kolory, punktory, numery i pola zadań dokładnie jak w trybie jednego okna (znaczniki jako `::before` punktów listy; dla `[x]` biały ptaszek w polu).
  - Obrazek: ramka 1px `border` z ikoną obrazka i tekstem alt w `muted-foreground`.
  - Odstępy między blokami wynikają wyłącznie z pustych linii w pliku, tak jak w trybie jednego okna: każda pusta linia to pusty odstęp o wysokości jednej linii tekstu (1.6em), a bloki bez pustej linii między nimi się stykają. Akapity, listy, punkty list i cytaty nie mają własnych marginesów; nagłówki mają te same odstępy co w trybie jednego okna (0.35em nad tekstem, 0.15em pod nim, H1/H2 0.3em razem z dolną linią); bloki kodu, tabele i `details` po 0.25em nad i pod sobą, linia pozioma 1.05em. Marginesy sąsiednich bloków się nie nakładają (kolumna flex), więc oba widoki mają identyczne pozycje.
- **Błędy pisowni (edytor):** cienkie (1px) podkreślenie w kolorze `warning` (bursztyn, wartość `chart-3` z trybu dark: `oklch(0.769 0.188 70.08)`), odsunięte o 3px od tekstu. Własny token `warning` dodany według zasady z sekcji 2 pkt 4; używany do tego podkreślenia, do kropki niezapisanych zmian na karcie, do punktorów, numerów i ramek pól zadań na listach oraz do ramek tabel i linii pod ich nagłówkami.
- **Paski przewijania:** 12px, uchwyt `scrollbar` (hover `ring`), przezroczysty tor.
- **Okna dialogowe:** własne, ciemne (`popover`) według sekcji 7: pytania i komunikaty (niezapisane zmiany, otwieranie pliku z linku, zapis w UTF-8, brak słownika, błędy) i „O programie”. Systemowe (jasne) zostają tylko okna wyboru pliku „Otwórz” / „Zapisz jako” i komunikat o braku WebView2 (przyciski „Zainstaluj” / „Anuluj”), wyświetlany, zanim strona może się pokazać.
  - **Własne okno dialogowe** (`<dialog>` modalny): wyśrodkowane w oknie, szerokość 480px („O programie” 400px; maks. szerokość okna − 32px), powierzchnia `popover`, 1px `border`, `radius-lg`, cień średni, padding 24px (u dołu 20px), tekst 14px, interlinia 1.5; tło okna przyciemnione czarnym 50%; wejście fade + zoom (skala 0.96 → 1) 150ms, tło fade 150ms. Stopka z przyciskami 20px pod treścią. Przycisk `default`: tło `primary`, tekst `primary-foreground`, wysokość 32px, padding 0 12px, 14px/500, `radius-md`, hover `primary` 90%, focus z pierścieniem `ring`. Przyciski w stopce min. 80px. Tekst w oknie można zaznaczać.
  - **Pytanie lub komunikat** (jak AlertDialog shadcn/ui): tytuł 18px/600 z lekko ujemnym trackingiem, 8px niżej treść w `muted-foreground` (bez tytułu w `popover-foreground`), z zachowanymi złamaniami linii i zawijaniem długich ścieżek. Przyciski wyrównane do prawej, odstęp 8px (gdy się nie mieszczą, przechodzą do kolejnego wiersza): „Anuluj” po lewej, główna akcja (`default`, z fokusem) po prawej, pozostałe między nimi (np. „Anuluj” | „Nie zapisuj” | „Zapisz”); wszystkie poza główną `outline`. Ta sama kolejność obowiązuje w polach nazwy grupy kart. Esc wybiera „Anuluj”; kliknięcie w tło nic nie robi, żeby pytania nie zamknąć przypadkiem.
  - **O programie** (menu hamburgerowe, między „Znajdź…” a „Zamknij kartę”, oddzielone separatorami, bez skrótu): treść wyśrodkowana. Od góry: ikona programu 64px, 12px odstępu; pełna nazwa „MDE: Mark's "Dawn" Editor” 18px/600 z lekko ujemnym trackingiem; „Wersja 1.1.0” w `muted-foreground` (cyfry `tabular-nums`); 12px niżej jednozdaniowy opis; 16px niżej „Copyright © 2026 Marek Mazij”, pod nim (4px) informacja o licencji GPL v3 i braku gwarancji 12px `muted-foreground`; 12px niżej dwa linki obok siebie (odstęp 16px) „Strona projektu” i „Tekst licencji”, wyglądające jak linki podglądu (kolor `foreground`, podkreślenie `muted-foreground`, hover `foreground`, podpowiedź z adresem); na dole wyśrodkowany przycisk „OK” (min. 96px). Zamyka się przyciskiem, Esc albo kliknięciem w przyciemnione tło.


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

> **MDE:** domyślnie obrysowe ikony Lucide (linia 1,75); część ikon paska formatowania to własne, wypełnione projekty — wyjątki opisane w „ogólnych uwagach” i w sekcji „Pasek formatowania”.

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
