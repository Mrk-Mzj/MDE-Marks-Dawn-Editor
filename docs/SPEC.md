#### Zakładki i menu

Program ma mieć możliwość otwierania kilku plików na raz, w zakładkach umieszczonych u góry programu. Zakładki mają zamykać się po kliknięciu środkowym przyciskiem myszy. Mają nie mieć widocznego przycisku do zamykania X do momentu aż najedzie się kursorem na daną zakładkę. Zakładki mają zawierać nazwę otwartego pliku (bez rozszerzenia) i symbol kropki który pojawi się, gdy zmiany w danej zakładce nie zostały zapisane.



W lewej górnej części ekranu ma znajdować się menu hamburgerowe, czyli przycisk dający dostęp do opcji takich, jak Nowy plik, Otwórz, Zapisz, Zapisz jako, Znajdź, Zamknij zakładkę, Wyjdź.



Polecenia mają być obsługiwane powszechnie używanymi skrótami klawiszowymi, np. Nowy plik (Ctrl+N), Zapisz (Ctrl+S), Zamknij zakładkę (Ctrl+W), Wyjdź (Ctrl+Q), itd.

Znajdź (Ctrl+F) służy wyłącznie do wyszukiwania w lewym panelu, z przechodzeniem do następnego i poprzedniego wyniku (F3 / Shift+F3). Nie ma funkcji zamiany.

Język interfejsu wybieramy według języka Windows: polski dla polskiej wersji systemu, angielski dla każdej innej.



#### Okna edycji i podglądu

Otwarty plik ma być wyświetlany w obszarze podzielonym na dwie części: 

1. lewy panel służy do edycji pliku. Wyświetla niesformatowaną składnię Markdown. 

W górnej części zawiera wycentrowane względem tego panelu ikony pozwalające na typowe formatowanie zaznaczonego tekstu i akapitów, np. jako.: bold, italic, podkreślenie, lista numerowana i punktowana, nagłówki H1 do H5 i tekst akapitowy, cytat, hiperłącze, tabela. Podkreślenie owija tekst w znacznik `<u>…</u>` (GFM nie ma własnej składni podkreślenia).

Prawa górna część tego panelu ma zawierać miniaturowy podgląd całego dokumentu w formie małego okienka w prawym górnym rogu panelu. Tekst w lewym panelu ma stały prawy margines na całej wysokości panelu, tak szeroki, by okienko miniatury nigdy nie zasłaniało tekstu. Fragment tego podglądu, który pokazuje obszar pliku widoczny na ekranie, ma być oznaczony delikatnie jaśniejszym kolorem. Kliknięcie myszą i przeciągnięcie w górę lub w dół w rejonie miniatury ma przewijać wyświetlaną zawartość lewego panelu. Miniatura wyświetla więc zawartość pliku i pozwala go przewijać w pionie.

Zaznaczanie tekstu i użycie Ctrl + strzałka w górę ma przesuwać cały akapit zawierający zaznaczony tekst o jeden akapit w górę. Ctrl + strzałka w dół ma przesuwać akapit z zaznaczonym tekstem o jeden akapit w dół. Akapit to blok tekstu oddzielony pustymi liniami (np. akapit, cała tabela). Wyjątek stanowią listy: wewnątrz listy przesuwa się pojedynczy punkt razem z jego wcięciami (podpunktami), w obrębie tej listy. Puste linie pozostają na swoich miejscach.
 
2. prawy panel służy do wyświetlania wyrenderowanej treści pliku, zgodnie ze składnią Markdown (np. dywiz wyświetla się jako punktor, hasztag jako H1, itd)


Oba panele mają być oddzielone od siebie pionową linią, którą użytkownik może chwycić i przeciągnąć w lewo lub w prawo, zmieniając proporcje tych części. Zawartość obu paneli ma reagować na zmiany rozmiarów tych paneli.



Wyświetlany tekst przy krawędzi paneli ma zawsze zawijać się do kolejnej linii tak, by uniknąć używania poziomych pasków przewijania.

Zawartość obu paneli pokazuje ten sam otwarty plik, ale można przewijać ich zawartość niezależnie - to znaczy że nie są zsynchronizowane tak, by prawy panel wyświetlał to samo miejsce dokumentu, co lewy panel.



Powiększanie: rozmiar zawartości okna (tekstu plików md) ma się skalować z użyciem skrótów Ctrl+ i Ctrl-, a także przy przytrzymaniu wciśniętego klawisza Ctrl i użyciu rolki w myszce. Powiększanie jest ustawieniem globalnym, to znaczy, że dotyczy treści obu paneli na raz, dla każdej z otwartych zakładek, i dla plików otwieranych w przyszłości. Ma być zapamiętywane jako ustawienie aplikacji. Ctrl+0 przywraca skalę 100%.



#### Czego nie robimy

Nie numerujemy wierszy, nie wypisujemy nigdzie numeru kolumny ani standardu kodowania znaków. 

Nie wprowadzamy jasnego motywu.

Nie wprowadzamy wtyczek ani zapisu w chmurze.



#### Otwieranie, zapisywanie, pamięć sesji


Zamknięcie zakładki z niezapisanymi zmianami ma wywołać okno z pytaniem czy zapisać zmiany, odrzucić, czy anulować zamykanie.

Zamknięcie programu (Ctrl+Q lub X okna) nie wywołuje pytania o zapis: niezapisane edycje trafiają do sesji i wracają przy następnym uruchomieniu.



Po zamknięciu programu zapamiętujemy sesje, czyli listy otwartych zakładek, proporcje rozmiaru między lewym i prawym panelem, a także miejsca, do których pliki zostały przewinięte. Zapamiętujemy także edycje plików nawet jeśli nie zostały zapisane.

Proporcje między lewym i prawym panelem są wspólne dla wszystkich zakładek i zapamiętywane jako ustawienie aplikacji.


Przy otwarciu programu przywracamy taką sesję, by użytkownik mógł kontynuować pracę od miejsca, w którym ją zostawił.
Zakładka po zamknięciu znika z sesji, to znaczy nie przechowujemy dłużej zapisanych danych na jej temat (miejsca do którego przewinięto plik, niezapisanych edycji, itd.)



Otwieranie pliku ma odbywać się w nowej zakładce po prawej strony listy otwartych zakładek. Dostęp do funkcji Otwórz ma miejsce przez menu, przez skrót klawiszowy (te dwa warianty otwierają okno Eksploratora do wskazania pliku), a także przez przeciągnięcie pliku z Eksploratora w okno programu (ten wariant otwiera plik bezpośrednio, bez dodatkowego okna).

Plik można też otworzyć przez „Otwórz za pomocą” w Eksploratorze, czyli przez argument wiersza poleceń (`MDE.exe plik.md`). Program jest portable, więc sam nie rejestruje skojarzeń plików; użytkownik wskazuje exe w oknie „Otwórz za pomocą”.

Program działa w jednej instancji. Ponowne uruchomienie (także z plikiem jako argumentem) przenosi fokus do już otwartego okna i otwiera w nim plik w nowej zakładce, zamiast uruchamiać drugie okno. Jeśli plik jest już otwarty, przełączamy się na jego zakładkę.

Zmiany pliku na dysku dokonane poza programem: jeśli zakładka nie ma niezapisanych zmian, plik przeładowujemy po cichu. Jeśli ma, pokazujemy pasek z wyborem „Przeładuj / Zachowaj moje”. Tak samo postępujemy przy przywracaniu sesji.




#### Wariant Markdown, obrazki, linki, HTML


Wariant: GitHub Flavored Markdown (GFM).



Rozszerzenia poza GFM:



* Wiele pustych linii:

  * Plik jest źródłem prawdy. Każda pusta linia jest zapisywana dokładnie tak, jak wpisał ją użytkownik, bez zamiany na <br> ani \&nbsp;.
  * W widoku N pustych linii między akapitami daje odstęp o wysokości N−1 dodatkowych linii. Jedna pusta linia to zwykły odstęp akapitowy.
  * Otwarcie i zapisanie pliku bez edycji daje identyczne bajty.
  * Inne programy (GitHub, Notatnik) te linie zwiną. To świadomy kompromis, bo plik pozostaje czystym Markdownem.


Obrazki:



* nie obsługujemy
* W podglądzie zamiast obrazka pokazujemy subtelną ramkę z ikoną obrazka i tekstem alt. Pliku obrazka nie wczytujemy.


Linki:



* Dozwolone schematy: http, https, mailto. Linki zewnętrzne otwierają się w domyślnej przeglądarce.
* Względny link do .md otwiera plik w nowej zakładce. 
* Względny link do pliku innego typu (np. .pdf, .txt): przy pierwszym kliknięciu danego typu program pyta o potwierdzenie (z opcją „nie pytaj więcej dla tego typu”), a potem otwiera plik w domyślnym programie Windows. Pliki wykonywalne (np. .exe, .bat, .cmd, .ps1, .vbs, .msi, .lnk) zawsze wymagają potwierdzenia.
* Zablokowane: javascript:, data: oraz file: i inne nieznane schematy.
* Przy najechaniu pokazujemy pełny adres docelowy, żeby tekst linku nie ukrywał prawdziwego celu.



HTML w pliku (bezpieczeństwo):



* Surowy HTML nie jest wykonywany. Domyślnie jest sanityzowany po białej liście: br, span (tylko color i background-color), details/summary, sub, sup, kbd, u.
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
3. Trzy puste linie między akapitami po zapisie i ponownym otwarciu pozostają trzema i wyświetlają się jako odstęp dwóch dodatkowych linii.
4. Plik z <script>, onerror= i linkiem javascript: nie wykonuje niczego i nie otwiera niczego.





### Inne

Przyjmujemy kodowanie UTF-8.

Stosujemy sprawdzanie pisowni w języku polskim i angielskim. Błędy podkreślamy cienką pomarańczową linią. Status na dolnym pasku programu, opatrzony ikoną kartki i ołówka. Kliknięcie napisu zmienia tryb działania sprawdzania pisowni wg schematu: polski -> angielski -> sprawdzanie pisowni wyłączone.

Sprawdzanie pisowni korzysta z wbudowanego w Windows Spell Checking API (bez dołączania własnych słowników). Jeśli w systemie brakuje słownika dla wybranego języka, pokazujemy to w statusie na dolnym pasku.







