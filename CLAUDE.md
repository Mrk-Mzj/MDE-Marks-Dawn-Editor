### Cel i opis projektu

Celem projektu jest opracowanie szybkiego i lekkiego edytora plików Markdown. Ważny jest krótki czas uruchamiania oraz wysoka szybkość i płynność działania interfejsu. Dobór języków i technologii zależy od Ciebie. Platforma to system Windows 11, chcę otrzymać uruchamialny plik exe, bez instalatora (portable).



### Stos technologiczny (zatwierdzony)

* **Tauri 2** — powłoka aplikacji: backend w **Rust**, interfejs w HTML/CSS/TypeScript renderowany przez systemowy **WebView2** (preinstalowany w Windows 11). Cel: pojedynczy exe ≈ 5–10 MB, start < 0,5 s.
* **CodeMirror 6** — edytor w lewym panelu.
* **markdown-it** — parser GFM dla podglądu w prawym panelu (z własnymi regułami, np. wiele pustych linii) i sanityzacją HTML po białej liście z docs/SPEC.md.
* **Rust (backend)** — odczyt i zapis plików z zachowaniem kodowania i końców linii (w tym Windows-1250), pamięć sesji i ustawień, jedna instancja, otwieranie pliku z argumentu wiersza poleceń, sprawdzanie pisowni przez Windows Spell Checking API.
* Czcionki systemowe: Segoe UI, Cascadia Mono (bez dołączania plików czcionek).

Konkretne biblioteki (crate'y Rust, pakiety npm) nadal wymagają mojej zgody przed dodaniem — patrz „Zasady samodzielnej pracy".



### Język

Język interfejsu niech będzie spójny z wersją językową Windows użytkownika. Komunikacja z deweloperem ma odbywać się po polsku. Natomiast kod, komentarze, dokumentacja i commity po angielsku.



### Pliki dokumentacji i założeń projektowych

* Nowe elementy i zmiany dokumentuj w pliku **README.md** w głównym katalogu repozytorium. Możesz robić to samodzielnie.
* Wygląd elementów opisuje plik **@docs/DESIGN.md**. Przy zmianach w wyglądzie modyfikuj go samodzielnie.
* Budując i modyfikując projekt opieraj się na specyfikacji zapisanej w podkatalogu **@docs/SPEC.md**. To źródło prawdy. Jeśli czegoś nie rozumiesz /dopytaj. Możesz proponować zapisanie zmian w tym pliku, ale faktyczne zmiany wprowadzaj dopiero po zatwierdzeniu przeze mnie.



### Zasady samodzielnej pracy

Pytaj przed dodaniem zależności i uzasadniaj, czemu są potrzebne.

Po wprowadzeniu zmian i nowych funkcjonalności przetestuj czy faktycznie wyglądają i działają zgodnie z założeniami. Popraw kod, jeśli tak nie jest. Dopiero potem pisz, że są gotowe.

Funkcja jest skończona, gdy: działa po uruchomieniu, README.md jest zaktualizowany, a zmiany wizualne zgodne z docs/DESIGN.md.

Po każdej turze programowania funkcji lub poprawek zbuduj plik portable (`npm run portable` → `portable/MDE.exe`), żebym mógł od razu testować.

Commituj i wysyłaj na GitHuba tylko na moją prośbę.







