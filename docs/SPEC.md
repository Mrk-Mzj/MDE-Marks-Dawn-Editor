#### Zakładki i menu

Program ma mieć możliwość otwierania kilku plików na raz, w zakładkach umieszczonych u góry programu. Zakładki mają zamykać się po kliknięciu środkowym przyciskiem myszy. Mają nie mieć widocznego przycisku do zamykania X do momentu aż najedzie się kursorem na daną zakładkę. Zakładki mają zawierać nazwę otwartego pliku (bez rozszerzenia) i symbol kropki który pojawi się, gdy zmiany w danej zakładce nie zostały zapisane.

Między zakładkami przełączamy się skrótami Ctrl+Tab / Ctrl+Shift+Tab i Ctrl+PgDn / Ctrl+PgUp, a także kółkiem myszy nad paskiem zakładek. Kolejność zakładek można zmieniać przeciąganiem. Gdy zakładki nie mieszczą się na pasku, zwężają się, a potem pasek przesuwa się tak, by aktywna zakładka była widoczna. Zamknięcie ostatniej zakładki zostawia nową, pustą zakładkę „Bez tytułu”.



W lewej górnej części ekranu ma znajdować się menu hamburgerowe, czyli przycisk dający dostęp do opcji takich, jak Nowy plik, Otwórz, Zapisz, Zapisz jako, Znajdź, O programie, Zamknij zakładkę, Wyjdź. Pozycja „O programie” otwiera okno z ikoną i pełną nazwą programu (MDE: Mark's "Dawn" Editor), wersją, krótkim opisem (szybki i lekki edytor plików tekstowych i Markdown), informacją o prawach autorskich i licencji GNU GPL v3 (wraz z brakiem gwarancji) oraz linkami do strony projektu i tekstu licencji, które otwierają się w domyślnej przeglądarce.

Okno nie ma systemowego paska tytułu. Przyciski minimalizacji, maksymalizacji i zamknięcia znajdują się w pasku zakładek, wyrównane do prawej. Puste miejsca tego paska służą do przesuwania okna, a dwuklik w nich maksymalizuje je lub przywraca.



Polecenia mają być obsługiwane powszechnie używanymi skrótami klawiszowymi, np. Nowy plik (Ctrl+N), Zapisz (Ctrl+S), Zamknij zakładkę (Ctrl+W), Wyjdź (Ctrl+Q), itd.

Znajdź (Ctrl+F) służy wyłącznie do wyszukiwania w lewym panelu, z przechodzeniem do następnego i poprzedniego wyniku (F3 / Shift+F3). Nie ma funkcji zamiany. Wszystkie dopasowania są podświetlone, a bieżące wyróżnione mocniej; pasek pokazuje liczbę wyników. Domyślnie wielkość liter nie ma znaczenia; przełącznik „Uwzględnij wielkość liter” (Aa) to zmienia. Ponowne Ctrl+F lub Esc zamyka wyszukiwanie.

Język interfejsu wybieramy według języka Windows: polski dla polskiej wersji systemu, angielski dla każdej innej. Język wszystkich napisów, także natywnych, wybiera program na podstawie języka wyświetlania Windows.



#### Okna edycji i podglądu

Otwarty plik ma być wyświetlany w obszarze podzielonym na dwie części: 

1. lewy panel służy do edycji pliku. Wyświetla niesformatowaną składnię Markdown. 

W górnej części zawiera pasek ikon pozwalających na typowe formatowanie zaznaczonego tekstu i akapitów, np.: bold, italic, podkreślenie, lista numerowana i punktowana, lista zadań, nagłówki H1 do H5 i tekst akapitowy, cytat, hiperłącze, tabela. Ikony są wyrównane do lewej. W trybie dwóch okien pierwsza z nich zaczyna się na tej samej pionowej linii co tekst pod paskiem; w trybie jednego okna tekst ma szerszy margines, a ikony zostają na swoim miejscu. Podkreślenie owija tekst w znacznik `<u>…</u>` (GFM nie ma własnej składni podkreślenia).

Lista zadań zamienia linie w zadania z polem wyboru (`- [ ] `). Zrobione zadanie (`- [x] `) wyświetla się jako obrysowe pole z białym ptaszkiem w środku, nie jako wypełnione pole. W trybie jednego okna kliknięcie pola zaznacza lub odznacza zadanie.

Ikony stoją w kolejności: B, I, U, styl akapitu (H), lista punktowana, numerowana, lista zadań, cytat, tabela, hiperłącze, bez separatorów. Na końcu jest ikona mikrofonu „Dyktowanie”: uruchamia dyktowanie głosowe Windows (tak jak pozycja „Dyktowanie” w menu pod prawym przyciskiem myszy), a dyktowany tekst trafia w miejsce kursora. Gdy panel jest zbyt wąski, ikony, które się nie mieszczą (z mikrofonem włącznie), chowają się za przyciskiem „Więcej” (…).

Prawa górna część tego panelu może zawierać miniaturowy podgląd całego dokumentu (minimapę) w formie okienka dosuniętego do prawego górnego narożnika panelu (styka się z paskiem narzędzi i z panelem podglądu). Okienko ma co najmniej 100 px wysokości, a dla dłuższych plików wydłuża się wraz z długością pliku, najwyżej do dołu panelu. Minimapa zajmuje miejsce paska przewijania lewego panelu, który jest wtedy ukryty. Na dolnym pasku, między statusem pisowni a przełącznikiem „Przewijaj razem”, jest przełącznik z ikoną kartki z liniami tekstu: „Mapa: wł” / „wył”. „Wył” ukrywa minimapę, a tekst ma wtedy pełną szerokość panelu. Przy pierwszym uruchomieniu minimapa jest wyłączona. Ustawienie jest globalne (wspólne dla wszystkich zakładek) i zapamiętywane w sesji. Gdy minimapa jest widoczna, tekst w lewym panelu ma stały prawy margines na całej wysokości panelu, tak szeroki, by okienko miniatury nigdy nie zasłaniało tekstu. Fragment podglądu, który pokazuje obszar pliku widoczny na ekranie, jest oznaczony delikatnie jaśniejszym kolorem. Kliknięcie myszą i przeciągnięcie w górę lub w dół w rejonie miniatury przewija zawartość lewego panelu.

Użycie Alt + strzałka w górę przesuwa linię z kursorem (lub zaznaczone linie) o jedną linię w górę, a Alt + strzałka w dół o jedną linię w dół. Puste linie są mijane pojedynczo: przesuwana linia zamienia się miejscami z sąsiednią pustą linią, a gdy styka się z linią tekstu, zamienia się miejscami z nią. Akapit wielolinijkowy przesuwa się, zaznaczając jego linie. Wyjątek stanowią listy: punkt listy przesuwa się razem z jego wcięciami (podpunktami), w obrębie punktów tego samego poziomu tej listy.
 
2. prawy panel służy do wyświetlania wyrenderowanej treści pliku, zgodnie ze składnią Markdown (np. dywiz wyświetla się jako punktor, hasztag jako H1, itd)


Na dolnym pasku, wyrównany do lewej, jest licznik znaków bieżącej zakładki: „XXX znaków”, a gdy zaznaczono tekst, „Y z XXX znaków”. Liczymy spacje i tabulatory, nie liczymy końców linii; rzeczownik odmienia się zgodnie z liczbą.



Oba panele mają być oddzielone od siebie pionową linią, którą użytkownik może chwycić i przeciągnąć w lewo lub w prawo, zmieniając proporcje tych części. Nad linią kursor zmienia się na strzałkę lewo–prawo; sama linia nie zmienia koloru. Dwukrotne kliknięcie linii przywraca domyślny podział 50/50. Zawartość obu paneli ma reagować na zmiany rozmiarów tych paneli.



Wyświetlany tekst przy krawędzi paneli ma zawsze zawijać się do kolejnej linii tak, by uniknąć używania poziomych pasków przewijania.

Szerokość tekstu jest ograniczona do 1314 px przy powiększeniu 100% i rośnie razem z powiększeniem. Tekst leży na „kartce” z marginesami po bokach: 33 px w trybie jednego okna, a w trybie dwóch okien 25 px (tekst zaczyna się wtedy w linii z ikonami paska formatowania). W panelu szerszym od kartki jest ona wyśrodkowana, a po obu stronach są ciemniejsze pola udające tło programu; ich szerokość zależy od rozmiaru okna i może wynosić 0 px.

Zawartość obu paneli pokazuje ten sam otwarty plik. Domyślnie przewijanie jest zsynchronizowane: przewinięcie jednego panelu (rolką, klawiaturą, paskiem przewijania lub podczas pisania) przewija drugi do tego samego miejsca dokumentu. Na dolnym pasku, na prawo od statusu pisowni, jest przełącznik z ikoną dwóch paneli: „Przewijaj razem: wł” / „wył”. Kliknięcie go wyłącza synchronizację i wtedy panele przewijają się niezależnie. Ustawienie jest globalne (wspólne dla wszystkich zakładek) i zapamiętywane w sesji. Włączenie synchronizacji spina panele w miejscach, w których są, bez wyrównywania: program zapamiętuje różnicę między nimi (np. lewy panel w linii 200, prawy w 400) i utrzymuje ją przy dalszym przewijaniu (205 i 405). Pozwala to ręcznie zgrać panele tam, gdzie część dokumentu jest w jednym z nich znacznie wyższa. Gdy jeden panel pierwszy dojdzie do początku lub końca dokumentu, przewija się dalej tylko drugi, niezależnie od tego, nad którym panelem jest kursor. Gdy oba panele dojdą do początku (lub oba do końca), różnica jest zerowana. Przewinięcie zatrzymanego panelu z powrotem przesuwa oba od miejsc, w których są, bez przeskoku. Każda zakładka ma własną różnicę.



#### Tryb pracy: jedno lub dwa okna

Na dolnym pasku, między przełącznikiem minimapy a „Przewijaj razem”, jest przełącznik z ikoną okna aplikacji: „Okna: 1” / „Okna: 2”. Kliknięcie go przełącza tryb. Przy pierwszym uruchomieniu włączony jest tryb jednego okna. Ustawienie jest globalne (wspólne dla wszystkich zakładek) i zapamiętywane w sesji. Po przełączeniu trybu miejsce w dokumencie, kursor i zaznaczenie zostają takie same.

Tryb dwóch okien to opisany wyżej widok z panelem edycji i panelem podglądu.

W trybie jednego okna jeden panel zajmuje miejsce obu paneli i nie ma linii podziału. Działa jak Notatnik Windows przy plikach Markdown: treść jest od razu wyrenderowana i nadal można ją edytować. Znaki składni (#, **, _, -, >, [ ](adres), `<u>` itd.) są zawsze ukryte, także w linii z kursorem. Źródłem prawdy pozostaje plik, więc zapis daje ten sam Markdown co w trybie dwóch okien.

* Formatowanie: przyciski na pasku narzędzi, skróty klawiszowe i autoformatowanie. Składnia wpisana ręcznie od razu staje się formatowaniem:
  * „# ” … „##### ” na początku linii daje nagłówek,
  * „- ”, „* ” i „1. ” dają listę, a „> ” cytat,
  * \*\*tekst\*\* daje pogrubienie, a \*tekst\* i \_tekst\_ kursywę.

  Ctrl+Z cofa zamianę i zostawia wpisane znaki.
* Enter: w punkcie listy tworzy nowy punkt (na liście numerowanej z kolejnym numerem), a w pustym punkcie kończy listę. Tak samo działa w cytacie.
* Backspace: na początku nagłówka, punktu listy lub cytatu usuwa formatowanie tej linii i zamienia ją w zwykły akapit. Kolejny Backspace łączy ją z poprzednią linią.
* Ukryte znaczniki: kursor je omija, a strzałki przeskakują je tak, jakby ich nie było. Pojedynczy Backspace ani Delete ich nie usuwa. Usunięcie całego sformatowanego fragmentu usuwa także jego znaczniki.
* Linki: tekst linku wygląda jak w podglądzie. Zwykłe kliknięcie stawia kursor, a Ctrl+klik otwiera link według zasad z sekcji „Linki”. Podpowiedź pokazuje pełny adres i „Ctrl+klik, aby otworzyć”. Przycisk linku na pasku narzędzi otwiera okienko z polem adresu, w którym adres się wpisuje i zmienia.
* Tabele, bloki kodu, HTML z białej listy, linia pozioma i obrazki: są wyrenderowane, a obrazki pokazane jako ramka z tekstem alt. Kliknięcie elementu lub wejście w niego kursorem pokazuje jego surowe źródło do edycji. Gdy kursor wyjdzie z elementu, znów jest wyrenderowany.
* Pojedynczy Enter i wiele pustych linii wyglądają tak samo jak w podglądzie.
* Znajdź (Ctrl+F) przeszukuje tylko widoczny tekst i pomija ukryte znaczniki oraz adresy linków.
* Bez zmian względem trybu dwóch okien: minimapa, sprawdzanie pisowni, Alt+strzałki i powiększanie. Licznik znaków nadal liczy cały plik razem ze składnią.
* „Przewijaj razem” jest w tym trybie wyszarzony i nie reaguje na kliknięcie. Po powrocie do dwóch okien działa ze swoim zapamiętanym stanem.



Powiększanie: rozmiar zawartości okna (tekstu plików md) ma się skalować z użyciem skrótów Ctrl+ i Ctrl-, a także przy przytrzymaniu wciśniętego klawisza Ctrl i użyciu rolki w myszce. Powiększanie jest ustawieniem globalnym, to znaczy, że dotyczy treści obu paneli na raz, dla każdej z otwartych zakładek, i dla plików otwieranych w przyszłości. Ma być zapamiętywane jako ustawienie aplikacji. Ctrl+0 przywraca skalę 100%.



#### Czego nie robimy

Nie numerujemy wierszy, nie wypisujemy nigdzie numeru kolumny ani standardu kodowania znaków. 

Nie wprowadzamy jasnego motywu.

Nie wprowadzamy wtyczek ani zapisu w chmurze.



#### Otwieranie, zapisywanie, pamięć sesji


Zamknięcie zakładki z niezapisanymi zmianami ma wywołać okno z pytaniem czy zapisać zmiany, odrzucić, czy anulować zamykanie.

Zamknięcie programu (Ctrl+Q lub X okna) nie wywołuje pytania o zapis: niezapisane edycje trafiają do sesji i wracają przy następnym uruchomieniu.



Po zamknięciu programu zapamiętujemy sesje, czyli listy otwartych zakładek, proporcje rozmiaru między lewym i prawym panelem, a także miejsca, do których pliki zostały przewinięte. Zapamiętujemy także edycje plików nawet jeśli nie zostały zapisane oraz rozmiar, położenie i maksymalizację okna.

Jeśli przy przywracaniu sesji pliku nie ma już na dysku (usunięty lub przeniesiony), zakładka wraca z zapamiętaną treścią i kropką niezapisanych zmian, a zapis otwiera okno „Zapisz jako”. Dlatego sesja przechowuje kopię treści każdej otwartej zakładki; kopię usuwamy przy zamknięciu zakładki.

Proporcje między lewym i prawym panelem są wspólne dla wszystkich zakładek i zapamiętywane jako ustawienie aplikacji.


Przy otwarciu programu przywracamy taką sesję, by użytkownik mógł kontynuować pracę od miejsca, w którym ją zostawił.
Zakładka po zamknięciu znika z sesji, to znaczy nie przechowujemy dłużej zapisanych danych na jej temat (miejsca do którego przewinięto plik, niezapisanych edycji, itd.)



Otwieranie pliku ma odbywać się w nowej zakładce po prawej strony listy otwartych zakładek. Dostęp do funkcji Otwórz ma miejsce przez menu, przez skrót klawiszowy (te dwa warianty otwierają okno Eksploratora do wskazania pliku), a także przez przeciągnięcie pliku z Eksploratora w okno programu (ten wariant otwiera plik bezpośrednio, bez dodatkowego okna). Upuszczenie kilku plików otwiera każdy w osobnej zakładce.

W oknie „Zapisz jako” domyślnie wybrany jest typ Markdown (.md); z listy rozwijanej można wybrać też plik tekstowy (.txt) lub wszystkie pliki.

Plik można też otworzyć przez „Otwórz za pomocą” w Eksploratorze, czyli przez argument wiersza poleceń (`MDE.exe plik.md`). Program jest portable, więc sam nie rejestruje skojarzeń plików; użytkownik wskazuje exe w oknie „Otwórz za pomocą”.

Program działa w jednej instancji. Ponowne uruchomienie (także z plikiem jako argumentem) przenosi fokus do już otwartego okna i otwiera w nim plik w nowej zakładce, zamiast uruchamiać drugie okno. Jeśli plik jest już otwarty, przełączamy się na jego zakładkę.

Zmiany pliku na dysku dokonane poza programem sprawdzamy przy przywracaniu sesji i za każdym razem, gdy okno programu odzyskuje fokus. Jeśli zakładka nie ma niezapisanych zmian, plik przeładowujemy po cichu. Jeśli ma, zostaje kropka niezapisanych zmian i pokazujemy pasek z przyciskiem „Odśwież” (wczytuje wersję z dysku, odrzucając zmiany) i ikoną X (zamyka pasek, zachowując nasze zmiany). Plik usunięty z dysku podczas pracy: zakładka zachowuje treść i dostaje kropkę niezapisanych zmian.




#### Wariant Markdown, obrazki, linki, HTML


Wariant: GitHub Flavored Markdown (GFM).



Rozszerzenia poza GFM:



* Pojedynczy Enter = nowa linia:

  * W podglądzie każde złamanie linii w pliku (pojedynczy Enter, bez pustej linii) jest wyświetlane jako nowa linia, tak jak w edytorze. W czystym GFM byłoby to „miękkie złamanie” wyświetlane jako spacja.
  * Plik pozostaje czystym Markdownem. Inne programy (np. GitHub) mogą wyświetlić takie linie połączone w jeden akapit.

* Puste linie:

  * Plik jest źródłem prawdy. Każda pusta linia jest zapisywana dokładnie tak, jak wpisał ją użytkownik, bez zamiany na <br> ani \&nbsp;.
  * W podglądzie odstęp między blokami (akapitami, nagłówkami, listami i ich punktami, cytatami, tabelami, blokami kodu) wynika wyłącznie z pustych linii w pliku: każda pusta linia to odstęp o wysokości jednej linii tekstu, a bloki bez pustej linii między nimi stykają się (np. nagłówek i lista tuż pod nim). Podgląd wygląda więc tak samo jak tryb jednego okna.
  * Otwarcie i zapisanie pliku bez edycji daje identyczne bajty.
  * Inne programy (GitHub, Notatnik) te linie zwiną. To świadomy kompromis, bo plik pozostaje czystym Markdownem.


Obrazki:



* nie obsługujemy
* W podglądzie zamiast obrazka pokazujemy subtelną ramkę z ikoną obrazka i tekstem alt. Pliku obrazka nie wczytujemy.


Linki:



* Dozwolone schematy: http, https, mailto. Linki zewnętrzne otwierają się w domyślnej przeglądarce.
* Adres zaczynający się od www. (w linku albo jako zwykły tekst) jest traktowany jak adres strony i otwierany przez https://, bez potrzeby dopisywania schematu. Inne adresy bez schematu traktujemy jak ścieżki do plików.
* Względny link do pliku Markdown (.md, .markdown, .mdown, .mkd) otwiera plik w nowej zakładce. 
* Względny link do pliku innego typu (np. .pdf, .txt): przy pierwszym kliknięciu danego typu program pyta o potwierdzenie (z opcją „nie pytaj więcej dla tego typu”), a potem otwiera plik w domyślnym programie Windows. Opcja „nie pytaj więcej dla tego typu” jest przyciskiem w oknie potwierdzenia.
* Pliki wykonywalne i inne typy, które Windows uznaje za niebezpieczne (np. .exe, .bat, .cmd, .ps1, .vbs, .msi, .lnk, .chm, .hta), a także foldery i pliki bez rozszerzenia, zawsze wymagają potwierdzenia.
* Zablokowane: javascript:, data: oraz file: i inne nieznane schematy, a także ścieżki bezwzględne (C:\…, /…, \\serwer\…).
* Linki do nagłówków (#…) są nieaktywne.
* Przy najechaniu pokazujemy pełny adres docelowy, żeby tekst linku nie ukrywał prawdziwego celu.



HTML w pliku (bezpieczeństwo):



* Surowy HTML nie jest wykonywany. Domyślnie jest sanityzowany po białej liście: br, span (tylko color i background-color), details (z atrybutem open)/summary, sub, sup, kbd, u.
* Zawsze usuwane: script, iframe, object, embed, style, form, atrybuty on\* i adresy javascript:.
* Renderer działa z restrykcyjnym CSP bez inline-skryptów i bez dostępu do systemu plików z poziomu treści. Jeśli to Electron lub WebView, wyłączamy nodeIntegration.



#### Końce linii i kodowanie

Zasada główna: wierność odczytu i zapisu. Program nie zmienia tego, czego użytkownik nie edytował, więc otwórz i zapisz bez zmian daje plik identyczny co do bajta.



Kodowanie:



* Nowe pliki: UTF-8 bez BOM.
* Istniejące pliki:

  * Wykrywamy BOM (UTF-8, UTF-16 LE/BE) i zapisujemy w tym samym kodowaniu z tym samym BOM lub jego brakiem.
  * Bez BOM najpierw próbujemy ścisłego UTF-8. Jeśli się nie uda, zakładamy Windows-1250 (ważne przy polskich znakach w starszych plikach) i pokazujemy ostrzeżenie.
  * Nigdy nie zamieniamy cicho nieczytelnych bajtów na znak .
* Kodowanie i końce linii nie są wyświetlane na pasku stanu. Ostrzeżenie pokazujemy tylko przy fallbacku na Windows-1250. Zmiana kodowania jest dostępna w oknie „Zapisz jako” (wybór: UTF-8 / UTF-8 z BOM).
* Opcja domyślna dla nowych plików w ustawieniach: UTF-8 bez BOM. Opcję „z BOM” dajemy tylko dla zgodności ze starymi programami.


Końce linii:



* Nowe pliki: LF
* Istniejące pliki: wykrywamy dominujący styl (LF, CRLF) i zachowujemy go przy zapisie. Wewnątrz edytora linie są normalizowane, a przy zapisie przywracane.
* Pliki ze mieszanymi końcami: domyślnie zachowujemy je bez zmian. Normalizacja jest tylko świadomym wyborem użytkownika.
* Nowy Enter i wklejany tekst dostają styl końców linii pliku.
* Końcowy znak nowej linii na końcu pliku (jest lub go brak) i spacje na końcu linii (w Markdownie dwie spacje to twardy łamacz wiersza) są zachowywane.


Powiązanie z pustymi liniami: \\r\\n liczymy jako jedną linię. Dzięki temu N pustych linii wygląda tak samo w pliku CRLF i LF.



Kryteria odbioru (do testów):



1. Plik UTF-8 z BOM i CRLF, otwarty i zapisany bez edycji, jest bajt w bajt taki sam.
2. To samo dla UTF-8 bez BOM z LF, dla pliku w Windows-1250 i dla pliku z mieszanymi końcami.
3. Trzy puste linie między akapitami po zapisie i ponownym otwarciu pozostają trzema i wyświetlają się jako odstęp trzech linii, tak samo w podglądzie i w trybie jednego okna.
4. Plik z <script>, onerror= i linkiem javascript: nie wykonuje niczego i nie otwiera niczego.





### Inne

Przyjmujemy kodowanie UTF-8.

Okna z pytaniami i komunikatami (np. o zapisie zmian, otwieraniu pliku z linku, błędach) oraz okno „O programie” wyświetlamy wewnątrz programu, w jego ciemnym stylu. Systemowe pozostają tylko okna wyboru pliku (Otwórz, Zapisz jako) i komunikat o braku WebView2.

Stosujemy sprawdzanie pisowni w języku polskim i angielskim. Błędy podkreślamy cienką pomarańczową linią. Status na dolnym pasku programu, opatrzony ikoną kartki i ołówka. Kliknięcie napisu zmienia tryb działania sprawdzania pisowni wg schematu: polski -> angielski -> sprawdzanie pisowni wyłączone.

Sprawdzanie pisowni korzysta z wbudowanego w Windows Spell Checking API (bez dołączania własnych słowników). Jeśli w systemie brakuje słownika dla wybranego języka, pokazujemy to w statusie na dolnym pasku. Kliknięcie statusu przy braku słownika pokazuje okno z wyjaśnieniem i przyciskami: otwórz ustawienia języka Windows, zmień język pisowni, anuluj.

Przy starcie program sprawdza obecność środowiska WebView2. Jeśli go brakuje, pokazuje okno z przyciskami „Zainstaluj” (otwiera pobieranie instalatora ze strony Microsoft) i „Anuluj”, po czym kończy działanie.







