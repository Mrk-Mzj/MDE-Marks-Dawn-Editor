#### Karty i menu

Nazewnictwo: elementy u góry okna z nazwami otwartych plików to „karty” (ang. tabs). Słowa „zakładka” nie używamy w tym znaczeniu, bo w dokumencie oznacza ono zapamiętane miejsce w tekście.

Program ma mieć możliwość otwierania kilku plików na raz, w kartach umieszczonych u góry programu. Karty mają zamykać się po kliknięciu środkowym przyciskiem myszy. Mają nie mieć widocznego przycisku do zamykania X do momentu aż najedzie się kursorem na daną kartę. Karty mają zawierać nazwę otwartego pliku (bez rozszerzenia) i symbol kropki który pojawi się, gdy zmiany w danej karcie nie zostały zapisane. Na prawo od ostatniej karty jest przycisk z ikoną plusa, który otwiera nową, pustą kartę, tak samo jak Ctrl+N.

Między kartami przełączamy się skrótami Ctrl+Tab / Ctrl+Shift+Tab i Ctrl+PgDn / Ctrl+PgUp, a także kółkiem myszy nad paskiem kart. Kolejność kart można zmieniać przeciąganiem. Gdy karty nie mieszczą się na pasku, zwężają się, a potem pasek przesuwa się tak, by aktywna karta była widoczna. Zamknięcie ostatniej karty zostawia nową, pustą kartę „Bez tytułu”.



W lewej górnej części ekranu ma znajdować się menu hamburgerowe, czyli przycisk dający dostęp do opcji takich, jak Nowy plik, Otwórz, Zapisz, Zapisz jako, Znajdź, O programie, Zamknij kartę, Wyjdź. Pozycja „O programie” otwiera okno z ikoną i pełną nazwą programu (MDE: Mark's "Dawn" Editor), wersją, krótkim opisem (szybki i lekki edytor plików tekstowych i Markdown), informacją o prawach autorskich i licencji GNU GPL v3 (wraz z brakiem gwarancji) oraz linkami do strony projektu i tekstu licencji, które otwierają się w domyślnej przeglądarce.

Okno nie ma systemowego paska tytułu. Przyciski minimalizacji, maksymalizacji i zamknięcia znajdują się w pasku kart, wyrównane do prawej. Puste miejsca tego paska służą do przesuwania okna, a dwuklik w nich maksymalizuje je lub przywraca.



Polecenia mają być obsługiwane powszechnie używanymi skrótami klawiszowymi, np. Nowy plik (Ctrl+N), Zapisz (Ctrl+S), Zamknij kartę (Ctrl+W), Wyjdź (Ctrl+Q), itd.

Znajdź (Ctrl+F) służy wyłącznie do wyszukiwania w lewym panelu, z przechodzeniem do następnego i poprzedniego wyniku (F3 / Shift+F3). Nie ma funkcji zamiany. Wszystkie dopasowania są podświetlone, a bieżące wyróżnione mocniej; pasek pokazuje liczbę wyników. Domyślnie wielkość liter nie ma znaczenia; przełącznik „Uwzględnij wielkość liter” (Aa) to zmienia. Ponowne Ctrl+F lub Esc zamyka wyszukiwanie.

Język interfejsu wybieramy według języka Windows: polski dla polskiej wersji systemu, angielski dla każdej innej. Język wszystkich napisów, także natywnych, wybiera program na podstawie języka wyświetlania Windows.



#### Grupy kart

Grupa kart to zapisany zestaw kart wraz z ustawieniami okna, do którego można wrócić (odpowiednik Obszarów roboczych z Edge). Każda grupa otwiera się we własnym oknie programu.

Okno domyślne: uruchomienie MDE z Windows (bez pliku lub z plikiem) otwiera okno domyślne z jego sesją, tak jak dotąd. Okna domyślnego nie ma na liście grup.

Przycisk „Grupy kart” stoi na prawym końcu górnego paska, przed przyciskami okna, oddzielony od nich pionową kreską: odstęp ikony od kreski i kreski od przycisku minimalizacji jest taki sam jak odstęp między ikonami przycisków okna (podpowiedź „Grupy kart”). Kliknięcie otwiera okienko z listą. Esc albo kliknięcie poza okienkiem je zamyka.

Lista:

* Na górze jest pozycja „Zapisz nową grupę kart”. Gdy istnieją grupy, pod nią stoi separator, napis „Otwórz w nowym oknie:” i lista grup, od najnowszej. Gdy lista się nie mieści, ma pasek przewijania.
* Pozycja grupy to nazwa i liczba kart w nawiasie, np. „Kampania RPG (5 kart)” (odmiana: 1 karta, 2 karty, 5 kart), a po prawej ikony ołówka (zmiana nazwy) i kosza (usunięcie). Grupa bieżącego okna ma jaśniejsze tło i dopisek „– otwarta”, np. „RPGi (3 karty) – otwarta”. Długa nazwa jest ucinana wielokropkiem, a pełna jest w podpowiedzi.
* Kliknięcie nazwy lub wolnego miejsca pozycji otwiera grupę w nowym oknie. Jeśli jest już otwarta w innym oknie, fokus przechodzi do tamtego okna. Jeśli to grupa bieżącego okna, okienko listy się zamyka.

Nadawanie nazwy (nowej grupie i przy zmianie nazwy) odbywa się w miejscu pozycji listy, nie w nowym oknie: pole tekstowe, a obok przyciski „Anuluj” i „Zapisz”. Enter zapisuje, Esc anuluje. Spacje na początku i końcu nazwy są obcinane. „Zapisz” jest nieaktywny, gdy nazwa jest pusta albo taka sama jak innej grupy (bez rozróżniania wielkości liter).

Zapisanie nowej grupy: karty bieżącego okna (z niezapisanymi zmianami, przewinięciami i kursorem) oraz jego ustawienia stają się nową grupą, a okno od tej chwili pracuje na niej. Jeśli było to okno domyślne, jego sesja zostaje pusta: następne uruchomienie MDE z Windows pokaże jedną kartę „Bez tytułu” z dotychczasowymi ustawieniami. Jeśli było to okno innej grupy, tamta grupa zostaje w stanie z tej chwili.

Usuwanie: kosz pyta „Usunąć?” z przyciskami „Anuluj” i „Usuń”. Gdy grupa jest otwarta w którymś oknie, pytanie brzmi „Usunąć grupę i zamknąć jej okno?”, a przyciski „Anuluj” i „Usuń i zamknij”. Okno tej grupy pyta wtedy o karty z niezapisanymi zmianami tak samo jak przy zamykaniu karty; „Anuluj” przerywa usuwanie. Usunięcie grupy nie zmienia plików na dysku.

Zapis sesji: każde okno zapisuje swoją sesję na bieżąco i przy zamknięciu: okno grupy w grupie, okno domyślne w sesji domyślnej. Osobno dla każdej grupy (i dla okna domyślnego) zapamiętujemy: karty i ich treść, przewinięcia i kursor, rozmiar, położenie i maksymalizację okna, powiększenie, podział paneli, minimapę, tryb „Okna: 1 / 2”, „Przewijaj razem”, tryb sprawdzania pisowni i typy plików otwieranych z linków bez pytania.

Tytuł okna (pasek zadań, Alt+Tab) to „nazwa pliku – MDE” (z półpauzą), bez nazwy grupy, w każdym oknie.

Ten sam plik może być otwarty w dwóch oknach. Każde okno ma własną kopię treści; zmianę zapisaną w drugim oknie wykrywamy przy powrocie fokusu, tak jak zmianę dokonaną innym programem.



#### Okna edycji i podglądu

Otwarty plik ma być wyświetlany w obszarze podzielonym na dwie części: 

1. lewy panel służy do edycji pliku. Wyświetla niesformatowaną składnię Markdown. 

Nad nim (w trybie dwóch okien nad oboma panelami, na całą szerokość okna) jest pasek ikon pozwalających na typowe formatowanie zaznaczonego tekstu i akapitów, np.: bold, italic, podkreślenie, lista numerowana i punktowana, lista zadań, nagłówki H1 do H5 i tekst akapitowy, cytat, tabela, obraz, łącze. Ikony są wyrównane do lewej. W trybie dwóch okien pierwsza z nich zaczyna się na tej samej pionowej linii co tekst pod paskiem; w trybie jednego okna tekst ma szerszy margines, a ikony zostają na swoim miejscu. Podkreślenie owija tekst w znacznik `<u>…</u>` (GFM nie ma własnej składni podkreślenia).

Lista zadań zamienia linie w zadania z polem wyboru (`- [ ] `). Zrobione zadanie (`- [x] `) wyświetla się jako obrysowe pole z białym ptaszkiem w środku, nie jako wypełnione pole. W trybie jednego okna kliknięcie pola zaznacza lub odznacza zadanie.

Ikony stoją w kolejności: B, I, U, styl akapitu (H), lista punktowana, numerowana, lista zadań, cytat, tabela, obraz, łącze, bez separatorów. Na końcu jest ikona mikrofonu „Dyktowanie”: uruchamia dyktowanie głosowe Windows (tak jak pozycja „Dyktowanie” w menu pod prawym przyciskiem myszy), a dyktowany tekst trafia w miejsce kursora. Za mikrofonem, po separatorze, stoi przycisk schematu barw (opisany w „Schemat barw”). Gdy okno jest zbyt wąskie, ikony, które się nie mieszczą (z mikrofonem i przyciskiem schematu włącznie), chowają się za przyciskiem „Więcej” (…).

Przycisk „Obraz” wstawia obrazki i zmienia ścieżki do nich, tak jak „Łącze” wstawia i zmienia linki. Gdy zaznaczony jest obrazek (w trybie jednego okna kliknięciem, w trybie dwóch okien kursorem w jego zapisie), otwiera pod sobą okienko ze ścieżką obrazka; Enter ją zmienia, pusta ścieżka usuwa obrazek. W przeciwnym razie otwiera okno wyboru pliku i wstawia obrazek (zasady w sekcji „Obrazki”). Tekstu alternatywnego nie zmieniamy w okienku; można go zmienić w trybie dwóch okien.

Program może pokazywać miniaturowy podgląd całego dokumentu (minimapę) w formie okienka dosuniętego do prawego górnego narożnika panelu (styka się z paskiem narzędzi i z prawą krawędzią panelu). W trybie jednego okna i w trybie dwóch okien (przy prawej krawędzi prawego panelu) minimapa odwzorowuje wyrenderowany dokument i w obu trybach wygląda tak samo: słowa są paskami, tabele i bloki kodu mają obramowanie, a obrazki są wypełnionymi prostokątami o rozmiarze takim jak w dokumencie, także te jeszcze niewczytane. Minimapa lewego panelu (przy wyłączonym „Przewijaj razem”) odwzorowuje źródło Markdown, więc obrazki są w niej tekstem. W trybie dwóch okien z włączonym „Przewijaj razem” lewy panel nie ma ani paska przewijania, ani minimapy (podąża za prawym), a prawy ma pasek przewijania albo minimapę, zależnie od przełącznika „Mapa”. Z wyłączonym „Przewijaj razem” oba panele mają to samo: dwie minimapy (każda przy prawej krawędzi swojego panelu) albo dwa paski przewijania. Okienko ma co najmniej 100 px wysokości, a dla dłuższych plików wydłuża się wraz z długością pliku, najwyżej do dołu panelu. Minimapa zajmuje miejsce paska przewijania swojego panelu, który jest wtedy ukryty. Na dolnym pasku, przy prawej krawędzi (za przełącznikiem „Przewijaj razem”), jest przełącznik z ikoną kartki z liniami tekstu: „Mapa: wł” / „wył”. „Wył” ukrywa minimapę, a tekst ma wtedy pełną szerokość panelu. Przy pierwszym uruchomieniu minimapa jest wyłączona. Ustawienie jest wspólne dla wszystkich kart okna, zapamiętywane w sesji osobno dla każdej grupy kart (i dla okna domyślnego). Gdy minimapa jest widoczna, tekst w jej panelu ma stały prawy margines na całej wysokości panelu, tak szeroki, by okienko miniatury nigdy nie zasłaniało tekstu. Fragment podglądu, który pokazuje obszar pliku widoczny na ekranie, jest oznaczony delikatnie jaśniejszym kolorem. Kliknięcie myszą i przeciągnięcie w górę lub w dół w rejonie miniatury przewija zawartość jej panelu.

Użycie Alt + strzałka w górę przesuwa linię z kursorem (lub zaznaczone linie) o jedną linię w górę, a Alt + strzałka w dół o jedną linię w dół. Puste linie są mijane pojedynczo: przesuwana linia zamienia się miejscami z sąsiednią pustą linią, a gdy styka się z linią tekstu, zamienia się miejscami z nią. Akapit wielolinijkowy przesuwa się, zaznaczając jego linie. Wyjątek stanowią listy: punkt listy przesuwa się razem z jego wcięciami (podpunktami), w obrębie punktów tego samego poziomu tej listy.
 
2. prawy panel służy do wyświetlania wyrenderowanej treści pliku, zgodnie ze składnią Markdown (np. dywiz wyświetla się jako punktor, hasztag jako H1, itd)


Na dolnym pasku, po lewej, zaraz za statusem pisowni, jest licznik znaków bieżącej karty: „XXX znaków”, a gdy zaznaczono tekst, „Y z XXX znaków”. Liczymy spacje i tabulatory, nie liczymy końców linii; rzeczownik odmienia się zgodnie z liczbą.



Oba panele mają być oddzielone od siebie pionową linią, którą użytkownik może chwycić i przeciągnąć w lewo lub w prawo, zmieniając proporcje tych części. Nad linią kursor zmienia się na strzałkę lewo–prawo; sama linia nie zmienia koloru. Dwukrotne kliknięcie linii przywraca domyślny podział 50/50. Zawartość obu paneli ma reagować na zmiany rozmiarów tych paneli.



Wyświetlany tekst przy krawędzi paneli ma zawsze zawijać się do kolejnej linii tak, by uniknąć używania poziomych pasków przewijania.

Szerokość tekstu jest ograniczona do 1314 px przy powiększeniu 100% i rośnie razem z powiększeniem. Tekst leży na „kartce” z marginesami po bokach: 33 px w trybie jednego okna, a w trybie dwóch okien 25 px (tekst zaczyna się wtedy w linii z ikonami paska formatowania). W panelu szerszym od kartki jest ona wyśrodkowana, a po obu stronach są ciemniejsze pola udające tło programu; ich szerokość zależy od rozmiaru okna i może wynosić 0 px.

Zawartość obu paneli pokazuje ten sam otwarty plik. Domyślnie przewijanie jest zsynchronizowane: przewinięcie jednego panelu (rolką, klawiaturą, paskiem przewijania lub podczas pisania) przewija drugi do tego samego miejsca dokumentu. Na dolnym pasku, między przełącznikami „Okna” i „Mapa”, jest przełącznik z ikoną dwóch paneli: „Przewijaj razem: wł” / „wył”. Kliknięcie go wyłącza synchronizację i wtedy panele przewijają się niezależnie. Ustawienie jest wspólne dla wszystkich kart okna, zapamiętywane w sesji osobno dla każdej grupy kart (i dla okna domyślnego). Panele są dopasowane na linii czytania, na 1/3 wysokości prawego panelu (w lewym na tej samej wysokości ekranu): akapit na tej linii stoi obok swojego odpowiednika w drugim panelu. Panele działają jak dwa koła zębate. Gdy jeden z nich nie może pokazać danego miejsca na linii czytania, bo musiałby się przewinąć przed początek lub za koniec dokumentu, stoi, a drugi przewija się dalej, aż akapity znów się zrównają. Od tej chwili znów przewijają się razem. Przykład: przy dużym obrazku na początku pliku lewy panel stoi, aż prawy przewinie się przez obrazek i pierwszy akapit pod nim dojdzie do linii czytania. Obrazek dalej w pliku zajmuje w lewym panelu jedną linię, więc gdy prawy przewija się przez niego, lewy prawie stoi. Rolka nad którymkolwiek panelem przewija prawy równo, a lewy podąża za nim; gdy prawy stoi na początku lub końcu, rolka przewija lewy. Oba panele dochodzą do początku i do końca dokumentu razem. Wczytanie się obrazka nie przesuwa tekstu na linii czytania.

Włączenie synchronizacji (i przełączenie karty) niczego nie przesuwa, także gdy panele pokazują różne miejsca. Rolka przewija wtedy tylko panel, który został w tyle, aż dogoni drugi, a potem oba razem. Klawiatura, pasek przewijania i pisanie przesuwają oba panele o tyle samo linii.



#### Tryb pracy: jedno lub dwa okna

Na dolnym pasku, jako pierwszy z przełączników po prawej (przed „Przewijaj razem”), jest przełącznik z ikoną okna aplikacji: „Okna: 1” / „Okna: 2”. Kliknięcie go przełącza tryb. Przy pierwszym uruchomieniu włączony jest tryb jednego okna. Ustawienie jest wspólne dla wszystkich kart okna, zapamiętywane w sesji osobno dla każdej grupy kart (i dla okna domyślnego). Po przełączeniu trybu miejsce w dokumencie, kursor i zaznaczenie zostają takie same.

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
* Tabele, bloki kodu, HTML z białej listy i linia pozioma: są wyrenderowane. Kliknięcie elementu lub wejście w niego kursorem pokazuje jego surowe źródło do edycji. Gdy kursor wyjdzie z elementu, znów jest wyrenderowany.
* Obrazki są zawsze wyrenderowane, a ich źródło się nie pokazuje, więc tekst i obrazki nigdy się nie przesuwają. Obrazek zachowuje się jak jeden znak: strzałki przeskakują go jednym naciśnięciem, a Backspace i Delete usuwają go w całości. Kliknięcie zaznacza obrazek (widać obwódkę), a dwukrotne kliknięcie otwiera okienko z jego ścieżką. Ctrl+klik otwiera obrazek w domyślnym programie Windows. Obrazki wstawione obok siebie bez odstępu stykają się, tak jak w pliku; program nie dodaje między nimi spacji.
* Pojedynczy Enter i wiele pustych linii wyglądają tak samo jak w podglądzie.
* Znajdź (Ctrl+F) przeszukuje tylko widoczny tekst i pomija ukryte znaczniki oraz adresy linków.
* Bez zmian względem trybu dwóch okien: minimapa, sprawdzanie pisowni, Alt+strzałki i powiększanie. Licznik znaków nadal liczy cały plik razem ze składnią.
* „Przewijaj razem” jest w tym trybie wyszarzony i nie reaguje na kliknięcie. Po powrocie do dwóch okien działa ze swoim zapamiętanym stanem.



Powiększanie: rozmiar zawartości okna (tekstu plików md) ma się skalować z użyciem skrótów Ctrl+ i Ctrl-, a także przy przytrzymaniu wciśniętego klawisza Ctrl i użyciu rolki w myszce. Powiększanie dotyczy treści obu paneli na raz, wszystkich kart okna i plików otwieranych w nim w przyszłości. Jest zapamiętywane w sesji osobno dla każdej grupy kart (i dla okna domyślnego). Ctrl+0 przywraca skalę 100%.



#### Czego nie robimy

Nie numerujemy wierszy, nie wypisujemy nigdzie numeru kolumny ani standardu kodowania znaków. 

Nie wprowadzamy wtyczek ani zapisu w chmurze.



#### Otwieranie, zapisywanie, pamięć sesji


Zamknięcie karty z niezapisanymi zmianami ma wywołać okno z pytaniem czy zapisać zmiany, odrzucić, czy anulować zamykanie.

Zamknięcie okna (Ctrl+Q, „Wyjdź” lub X okna) zamyka tylko bieżące okno i nie wywołuje pytania o zapis: niezapisane edycje trafiają do sesji tego okna (grupy kart albo okna domyślnego) i wracają przy jego następnym otwarciu. Program kończy działanie po zamknięciu ostatniego okna.



Po zamknięciu programu zapamiętujemy sesje, czyli listy otwartych kart, proporcje rozmiaru między lewym i prawym panelem, a także miejsca, do których pliki zostały przewinięte. Zapamiętujemy także edycje plików nawet jeśli nie zostały zapisane oraz rozmiar, położenie i maksymalizację okna.

Jeśli przy przywracaniu sesji pliku nie ma już na dysku (usunięty lub przeniesiony), karta wraca z zapamiętaną treścią i kropką niezapisanych zmian, a zapis otwiera okno „Zapisz jako”. Dlatego sesja przechowuje kopię treści każdej otwartej karty; kopię usuwamy przy zamknięciu karty.

Proporcje między lewym i prawym panelem są wspólne dla wszystkich kart okna i zapamiętywane w sesji osobno dla każdej grupy kart (i dla okna domyślnego).


Przy otwarciu programu przywracamy taką sesję, by użytkownik mógł kontynuować pracę od miejsca, w którym ją zostawił.
Karta po zamknięciu znika z sesji, to znaczy nie przechowujemy dłużej zapisanych danych na jej temat (miejsca do którego przewinięto plik, niezapisanych edycji, itd.)



Otwieranie pliku ma odbywać się w nowej karcie po prawej strony listy otwartych kart. Dostęp do funkcji Otwórz ma miejsce przez menu, przez skrót klawiszowy (te dwa warianty otwierają okno Eksploratora do wskazania pliku), a także przez przeciągnięcie pliku z Eksploratora w okno programu (ten wariant otwiera plik bezpośrednio, bez dodatkowego okna). Upuszczenie kilku plików otwiera każdy w osobnej karcie.

W oknie „Zapisz jako” domyślnie wybrany jest typ Markdown (.md); z listy rozwijanej można wybrać też plik tekstowy (.txt) lub wszystkie pliki.

Plik można też otworzyć przez „Otwórz za pomocą” w Eksploratorze, czyli przez argument wiersza poleceń (`MDE.exe plik.md`). Program jest portable, więc sam nie rejestruje skojarzeń plików; użytkownik wskazuje exe w oknie „Otwórz za pomocą”.

Program działa jako jeden proces, który może mieć kilka okien: okno domyślne i okna grup kart. Ponowne uruchomienie (także z plikiem jako argumentem, np. przez „Otwórz za pomocą”) przenosi fokus do okna domyślnego, a jeśli jest zamknięte, otwiera je z jego sesją. Plik otwiera się tam w nowej karcie. Jeśli plik jest już otwarty w oknie domyślnym, przełączamy się na jego kartę.

Zmiany pliku na dysku dokonane poza programem sprawdzamy przy przywracaniu sesji i za każdym razem, gdy okno programu odzyskuje fokus. Jeśli karta nie ma niezapisanych zmian, plik przeładowujemy po cichu. Jeśli ma, zostaje kropka niezapisanych zmian i pokazujemy pasek z przyciskiem „Odśwież” (wczytuje wersję z dysku, odrzucając zmiany) i ikoną X (zamyka pasek, zachowując nasze zmiany). Plik usunięty z dysku podczas pracy: karta zachowuje treść i dostaje kropkę niezapisanych zmian.




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



* Pokazujemy lokalne pliki graficzne (PNG, JPG/JPEG, GIF, WebP, AVIF, BMP, SVG) w podglądzie i w trybie jednego okna.
* Obrazek wskazujemy ścieżką względną od pliku Markdown (`![opis](obrazy/foto.png)`, także z `../`), wikilinkiem Obsidiana (`![[foto.png]]`, szukanym tak jak notatki) albo znacznikiem `<img>` z białej listy.
* Obrazek ma naturalny rozmiar, zmniejszony do szerokości tekstu, nigdy powiększony. Szerokość można podać w pliku: `![[foto.png|300]]` albo `<img src="foto.png" width="300">`.
* Nie wczytujemy obrazków z internetu (http, https), ze ścieżek bezwzględnych (wyjątek: niezapisany plik, opisany niżej) ani z adresów file: i data:. Takie obrazki, a także brakujące lub nieczytelne pliki, pokazujemy jako subtelną ramkę z ikoną obrazka i tekstem alt.
* SVG wczytujemy wyłącznie jako obrazek (`<img>`), nigdy nie wstawiamy jego kodu do strony, więc skrypty i odwołania zewnętrzne w pliku SVG się nie wykonują.
* Obrazki wczytujemy dopiero, gdy zbliżają się do widocznego fragmentu, i nie blokują pisania. Plik bez obrazków otwiera się tak samo szybko jak bez tej funkcji.
* Rozmiar obrazka odczytujemy z nagłówka pliku, zanim obrazek się wczyta, więc obrazek od razu zajmuje swoje miejsce, a tekst wokół niego nie przesuwa się przy wczytaniu.
* Kliknięcie obrazka w podglądzie (w trybie jednego okna Ctrl+klik) otwiera go w domyślnym programie Windows.

Wstawianie obrazka:

* Przycisk „Obraz” (gdy żaden obrazek nie jest zaznaczony) otwiera systemowe okno wyboru pliku z filtrem obrazów. Plik graficzny upuszczony w oknie programu wstawiamy według tych samych zasad: w edytorze w miejscu upuszczenia, poza nim w miejscu kursora.
* Obrazek leżący w folderze pliku Markdown lub w jego podfolderach (dowolnie głęboko), a jeśli plik leży w sejfie Obsidiana, w dowolnym miejscu tego sejfu, linkujemy ścieżką względną, bez kopiowania.
* Obrazek spoza tego obszaru kopiujemy do folderu „obrazy” obok pliku Markdown (w Windows w innym języku niż polski: „images”) i linkujemy kopię. Jeśli obok pliku istnieje już folder „obrazy” albo „images”, używamy go. Plik o tej samej nazwie i treści nie jest kopiowany ponownie; przy innej treści kopia dostaje numer, np. „foto (2).png”.
* Wstawiamy standardowy Markdown `![opis](ścieżka)` w miejscu kursora, ze spacjami w ścieżce zapisanymi jako `%20`. Opisem jest zaznaczony tekst, a bez zaznaczenia nazwa pliku bez rozszerzenia.
* Plik jeszcze niezapisany („Bez tytułu”) nie ma folderu, więc obrazek linkujemy jego pełną ścieżką i tak go pokazujemy. Przy pierwszym zapisaniu pliku obrazki podlinkowane pełną ścieżką kopiujemy lub linkujemy według zasad powyżej, a ich adresy w tekście zamieniamy na ścieżki względne.


Linki:



* Dozwolone schematy: http, https, mailto. Linki zewnętrzne otwierają się w domyślnej przeglądarce.
* Adres zaczynający się od www. (w linku albo jako zwykły tekst) jest traktowany jak adres strony i otwierany przez https://, bez potrzeby dopisywania schematu. Inne adresy bez schematu traktujemy jak ścieżki do plików.
* Względny link do pliku Markdown (.md, .markdown, .mdown, .mkd) otwiera plik w nowej karcie. 
* Względny link do pliku innego typu (np. .pdf, .txt): przy pierwszym kliknięciu danego typu program pyta o potwierdzenie (z opcją „nie pytaj więcej dla tego typu”), a potem otwiera plik w domyślnym programie Windows. Opcja „nie pytaj więcej dla tego typu” jest przyciskiem w oknie potwierdzenia.
* Pliki wykonywalne i inne typy, które Windows uznaje za niebezpieczne (np. .exe, .bat, .cmd, .ps1, .vbs, .msi, .lnk, .chm, .hta), a także foldery i pliki bez rozszerzenia, zawsze wymagają potwierdzenia.
* Zablokowane: javascript:, data: oraz file: i inne nieznane schematy, a także ścieżki bezwzględne (C:\…, /…, \\serwer\…).
* Linki do nagłówków przewijają do nagłówka, także w innym pliku (`plik.md#nagłówek` otwiera plik w nowej karcie i przewija). Akceptujemy oba zapisy: GitHuba (slug: małe litery, spacje zamienione na dywizy, bez interpunkcji poza „-” i „_”, np. `#grupy-kart`; powtórzenia z końcówkami `-1`, `-2`) i Obsidiana (dosłowny tekst nagłówka, np. `#Grupy%20kart`), bez rozróżniania wielkości liter. Gdy nagłówka nie ma, kliknięcie nic nie robi. Odnośniki do bloków (`#^…`) są nieaktywne. Treść nie dostaje atrybutów `id`.
* Wikilinki Obsidiana (rozszerzenie poza GFM): `[[Notatka]]`, `[[Notatka|tekst]]`, `[[Notatka#Nagłówek]]`, `[[Folder/Notatka]]` wyglądają jak zwykłe linki (widać tylko tekst albo nazwę) i otwierają plik `.md` w nowej karcie. Notatki szukamy najpierw w folderze bieżącego pliku, a jeśli wyżej jest folder `.obsidian`, w całym tym sejfie (jak Obsidian: przy kilku plikach o tej samej nazwie wybieramy ten o najkrótszej ścieżce). Wikilinki do plików innych typów podlegają tym samym zasadom co linki względne. Nieistniejąca notatka nie jest tworzona; kliknięcie nic nie robi. Osadzenia obrazków `![[…]]` pokazujemy jak obrazki (sekcja „Obrazki”), a osadzenia notatek i innych plików jako ramkę z nazwą.
* W podglądzie link działa po kliknięciu, a w trybie jednego okna po Ctrl+kliknięciu, jak inne linki.
* Przy najechaniu pokazujemy pełny adres docelowy, żeby tekst linku nie ukrywał prawdziwego celu.



HTML w pliku (bezpieczeństwo):



* Surowy HTML nie jest wykonywany. Domyślnie jest sanityzowany po białej liście: br, span (tylko color i background-color), details (z atrybutem open)/summary, sub, sup, kbd, u, img (tylko src, alt, width, height; src według zasad z sekcji „Obrazki”).
* Zawsze usuwane: script, iframe, object, embed, style, form, atrybuty on\* i adresy javascript:.
* Renderer działa z restrykcyjnym CSP bez inline-skryptów i bez dostępu do systemu plików z poziomu treści. Jeśli to Electron lub WebView, wyłączamy nodeIntegration.



#### Końce linii i kodowanie

Zasada główna: wierność odczytu i zapisu. Program nie zmienia tego, czego użytkownik nie edytował, więc otwórz i zapisz bez zmian daje plik identyczny co do bajta.



Kodowanie:



* Nowe pliki: UTF-8 bez BOM.
* Istniejące pliki:

  * Wykrywamy BOM (UTF-8, UTF-16 LE/BE) i zapisujemy w tym samym kodowaniu z tym samym BOM lub jego brakiem.
  * Bez BOM najpierw próbujemy ścisłego UTF-8. Jeśli się nie uda, zakładamy starsze kodowanie Windows właściwe dla języka systemu (np. Windows-1250 dla polskiego, Windows-1252 dla angielskiego, francuskiego czy hiszpańskiego) i pokazujemy ostrzeżenie.
  * Nigdy nie zamieniamy cicho nieczytelnych bajtów na znak .
  * Gdy edytowany plik w starszym kodowaniu Windows zawiera znaki, których to kodowanie nie zapisze (np. emoji), zapisujemy go w UTF-8 bez pytania.
* Kodowanie i końce linii są dla użytkownika przezroczyste: program nigdy nie pyta o nie przy otwieraniu ani zapisie i nie wyświetla ich na pasku stanu. Jedyny wyjątek to ostrzeżenie przy fallbacku na starsze kodowanie Windows.


Końce linii:



* Nowe pliki: LF
* Istniejące pliki: wykrywamy dominujący styl (LF, CRLF) i zachowujemy go przy zapisie. Wewnątrz edytora linie są normalizowane, a przy zapisie przywracane.
* Pliki ze mieszanymi końcami: zachowujemy je bez zmian.
* Nowy Enter i wklejany tekst dostają styl końców linii pliku.
* Końcowy znak nowej linii na końcu pliku (jest lub go brak) i spacje na końcu linii (w Markdownie dwie spacje to twardy łamacz wiersza) są zachowywane.


Powiązanie z pustymi liniami: \\r\\n liczymy jako jedną linię. Dzięki temu N pustych linii wygląda tak samo w pliku CRLF i LF.



Kryteria odbioru (do testów):



1. Plik UTF-8 z BOM i CRLF, otwarty i zapisany bez edycji, jest bajt w bajt taki sam.
2. To samo dla UTF-8 bez BOM z LF, dla pliku w starszym kodowaniu Windows (np. Windows-1250) i dla pliku z mieszanymi końcami.
3. Trzy puste linie między akapitami po zapisie i ponownym otwarciu pozostają trzema i wyświetlają się jako odstęp trzech linii, tak samo w podglądzie i w trybie jednego okna.
4. Plik z <script>, onerror= i linkiem javascript: nie wykonuje niczego i nie otwiera niczego.





### Inne

Przyjmujemy kodowanie UTF-8.

Okna z pytaniami i komunikatami (np. o zapisie zmian, otwieraniu pliku z linku, błędach) oraz okno „O programie” wyświetlamy wewnątrz programu, w jego stylu (w bieżącym schemacie barw). Systemowe pozostają tylko okna wyboru pliku (Otwórz, Zapisz jako) i komunikat o braku WebView2.

W oknach z pytaniami i w polach do wpisywania nazw przycisk anulowania („Anuluj”) stoi po lewej, a przycisk zatwierdzenia po prawej; inne przyciski (np. „Nie zapisuj”) stoją między nimi.

Schemat barw: program ma ciemny schemat barw (domyślny) i jasny. Ostatni przycisk na pasku formatowania, za mikrofonem i separatorem, pokazuje bieżący schemat: w ciemnym obrysową ikonę księżyca, w jasnym słońca. Kliknięcie przełącza schemat. Ustawienie jest globalne: wspólne dla wszystkich okien, grup kart i kart, zapamiętywane w ustawieniach programu (nie w sesji). Przełączenie w jednym oknie od razu zmienia wszystkie otwarte okna, także natywne przyciski okna.

Stosujemy sprawdzanie pisowni w języku polskim i angielskim. Błędy podkreślamy cienką pomarańczową linią. Status jest na dolnym pasku programu, przy lewej krawędzi (przed licznikiem znaków), opatrzony ikoną kartki i ołówka. Kliknięcie napisu zmienia tryb działania sprawdzania pisowni wg schematu: polski -> angielski -> sprawdzanie pisowni wyłączone.

Sprawdzanie pisowni korzysta z wbudowanego w Windows Spell Checking API (bez dołączania własnych słowników). Jeśli w systemie brakuje słownika dla wybranego języka, pokazujemy to w statusie na dolnym pasku. Kliknięcie statusu przy braku słownika pokazuje okno z wyjaśnieniem i przyciskami: otwórz ustawienia języka Windows, zmień język pisowni, anuluj.

Przy starcie program sprawdza obecność środowiska WebView2. Jeśli go brakuje, pokazuje okno z przyciskami „Zainstaluj” (otwiera pobieranie instalatora ze strony Microsoft) i „Anuluj”, po czym kończy działanie.







