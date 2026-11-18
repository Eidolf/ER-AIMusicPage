# Audiowiedergabe: Android-Analyse und minimale Stabilisierung

## Temporäre Diagnose für Android 17

1. Im Player die Wiedergabeliste öffnen und **Record playback diagnostics**
   einschalten. Die Aufzeichnung ist nach einem Seitenaufruf standardmäßig aus.
2. Titel starten, den Bildschirm sperren und den Stillstand reproduzieren.
   Nach dem Entsperren möglichst vor einem weiteren Play-Klick wieder die
   Wiedergabeliste öffnen, die Aufzeichnung ausschalten und **Export diagnostics
   (JSON)** wählen. Der Export ist auch während der Aufzeichnung möglich.
3. Die JSON-Datei nach `sequence` lesen: `track-end` und `track-start` zeigen
   den Titelwechsel, `play-request` und dessen Ergebnis sind per `requestId`
   verknüpft. `pause-request` nennt den App-Auslöser, `pause` ist das native
   Medienereignis. `trackId` ist der zuletzt gerenderte Titel und `audioTrackId`
   die dem Audioelement zugewiesene Quelle. Beim Übergang können sie kurz abweichen.

Der Export enthält die letzten 200 Ereignisse mit UTC-Zeit und monotoner
Zeit innerhalb der Seite. `discardedEvents` zeigt an, ob frühere Einträge
verdrängt wurden. Es werden keine URLs oder Anmeldedaten protokolliert. Die
Daten bleiben im Arbeitsspeicher der Seite und werden nicht übertragen:
Vor einem Reload oder Schließen des Tabs exportieren. Ein Browser-Discard
kann den Puffer verwerfen. Ein erneutes Einschalten in derselben Seite setzt
die Aufzeichnung mit dem bisherigen Puffer fort. Die Funktion verändert keine
Wiedergabe- oder Recovery-Regeln.

## Ursprüngliche Analyse

Stand: 17.11.2026. Untersucht wurde der Repository-Stand vor dieser Änderung
(`4e4c5d8` enthält die bisherige Player-Implementierung) und die unten beschriebene
Korrektur. „Android 17“ und „Android 13“ sind die gemeldeten Geräteversionen;
Browser, Browserversion, Hersteller, Energiesparmodus, Ausgabegerät und konkrete
Audiodateien liegen nicht vor. Es fand kein Test auf diesen Geräten statt.

## Kurzfazit

- **Belegt:** Ein einziges HTMLAudioElement wechselt seine `src`. Vorher startete
  der Folgetitel erst nach React-State-Update und anschließendem `useEffect`.
  Der Folgetitel wird nicht vorab geladen oder dekodiert.
- **Belegt:** Die bisherige „Stall Recovery“ führte zwei Sekunden nach `waiting`,
  `stalled` oder `error` ein `load()` aus. Das bricht laufendes Laden und
  ausstehende Play-Promises ab und setzt den Medienzustand zurück. Eine langsame,
  aber funktionierende Verbindung konnte dadurch zusätzlich gestört werden.
- **Android 17:** Der JS-/React-abhängige Übergang, Hintergrundscheduling und
  gegebenenfalls zurückgestellte Netzwerk-/Play-Vorgänge sind plausible Ursachen.
  Die vorhandene Wiederaufnahme bei `visibilitychange` erklärt, warum Entsperren
  helfen kann. Ein bestimmter Android- oder Browserfehler ist damit nicht bewiesen.
- **Android 13:** Kalter Quellenwechsel und die aggressive Reload-Behandlung sind
  plausible Ursachen für Lücken und Stottern. Die genaue Ursache hörbarer
  Knackser ist ohne Audiodateien und Messung nicht bewiesen.
- Beide Symptome haben **eine gemeinsame Schwachstelle im Titelwechsel**, sind aber
  nicht nachweislich derselbe Fehler. Hintergrundaussetzung erklärt eher den
  längeren Stillstand; Nachladen/Dekodieren und Reloads eher kurze Unterbrechungen.
- Die implementierte Korrektur beseitigt belegte Schwachstellen. Sie garantiert
  weder lückenlose Wiedergabe noch das Umgehen von Android-Hintergrundregeln.

## Technischer Ablauf und Fundstellen

Die Links zeigen auf den Stand **nach** der Korrektur. Entfernte Mechanismen
lassen sich im Git-Diff beziehungsweise im oben genannten Ausgangsstand prüfen.

| Prüfpunkt | Ergebnis und Fundstelle |
| --- | --- |
| Audioobjekte | Genau ein verstecktes `<audio>` in [MusicPlayer.tsx](../frontend/src/components/MusicPlayer.tsx#L465), gehalten über [audioRef](../frontend/src/components/MusicPlayer.tsx#L44). Keine Audioobjekte je Titel und kein zweiter Vorladeplayer. Videos verwenden eigene `<video>`-Elemente in [VideoGrid.tsx](../frontend/src/components/VideoGrid.tsx#L67). |
| Titelwechsel | Früher: `ended -> playNext -> setCurrentTrackIndex -> React-Render -> useEffect -> src -> play()`. Jetzt: [playNext](../frontend/src/components/MusicPlayer.tsx#L134) ruft [startTrack](../frontend/src/components/MusicPlayer.tsx#L109) auf; `src` und `play()` werden im Ereignishandler angestoßen. Render und Metadaten folgen weiterhin über React. |
| Vorladen | `preload="auto"` betrifft nur die ausgewählte Quelle. Es ist ein Browserhinweis, keine Downloadgarantie. Keine Vorbereitung des Folgetitels und kein garantierter Cache-Treffer. |
| Wiedergabelücke | Ja, architekturbedingt möglich: Der Browser muss die neue Ressource laden, demultiplexen und dekodieren. Bereits gepufferte Daten der alten Quelle sind kein Puffer für die neue. Der Patch entfernt nur die zusätzliche React-Abhängigkeit, nicht diese gesamte Pipeline. |
| Media Session | Bereits vorher vorhanden: Titel, Interpret, Album sowie Play/Pause/Previous/Next. Jetzt [aktuelle Handler mit Cleanup](../frontend/src/components/MusicPlayer.tsx#L287) und expliziter [playbackState](../frontend/src/components/MusicPlayer.tsx#L309). Keine native Playlist und kein Hintergrunddienst. |
| AudioContext | Im Frontend nicht verwendet. `running`, `suspended`, `interrupted` und `AudioContext.resume()` sind deshalb hier nicht anwendbar. Das Medienereignis `suspend` wäre zudem kein AudioContext-Zustand, sondern betrifft das Laden. |
| Medienauslieferung | URLs zeigen direkt auf `/limit_static/uploads/...`, siehe [media.py](../backend/app/api/v1/endpoints/media.py#L100); Auslieferung über [StaticFiles](../backend/app/main.py#L51). Kein eigener Streaming-/Transcoding-Endpunkt oder codecübergreifendes Normalisieren. |
| Konkurrenz zu Videos | [App.tsx](../frontend/src/App.tsx#L238) übergibt `shouldPause`, wenn ein Video aktiv wird. Explizite Pause löscht die Wiedergabeabsicht. Audio-Start meldet sich weiterhin beim Parent an und stoppt über dessen bestehende Koordination Videos. |

### Kritische Ereignisse

- **`ended`:** Entscheidet über Folgetitel, Mix, Repeat und Playlist-Ende.
  Solange der Browser JavaScript nicht ausführt, kann auch der neue Handler
  keinen Titelwechsel durchführen. Native Einzeltitel-Wiederholung bleibt über
  `loop` erhalten und benötigt normalerweise kein `ended`.
- **`canplay`:** Wiederaufnahme nur bei pausiertem, nicht beendetem Element und
  bestehender Wiedergabeabsicht. Kein Warten auf `canplaythrough`:
  Dessen Prognose über vollständige, unterbrechungsfreie Wiedergabe ist weder
  notwendig noch eine belastbare Voraussetzung für den Start.
- **`waiting` / `stalled`:** Können normale Pufferung beziehungsweise ausbleibende
  Netzwerkdaten signalisieren. Sie lösen jetzt keinen erzwungenen Reload mehr aus;
  die native Ladepipeline darf fortfahren.
- **`playing` / `pause`:** Synchronisieren den angezeigten Wiedergabestatus.
  Eine Browserpause löscht nicht automatisch die Absicht zur Wiederaufnahme;
  eine Bedienpause, ein aktives Video und ein terminaler Medienfehler dagegen schon.
- **`visibilitychange`:** Die bisherige Wiederaufnahme bei sichtbarer Seite bleibt.
  Sie passt zum beobachteten Fortsetzen nach Entsperren, beweist aber nicht,
  welcher Schritt zuvor blockiert war.
- **`resume` / `pageshow`:** Zusätzliche Wiederaufnahmepunkte nach Lifecycle-
  beziehungsweise History-Rückkehr. `resume` ist nicht browserübergreifend
  verfügbar; unbekannte Ereignisse sind keine Voraussetzung für die Wiedergabe.
- **`pagehide`:** Kein eigener Handler, auch vorher nicht. Es wird bewusst keine
  generelle Pause bei Seitenunsichtbarkeit eingebaut. Ein terminierter oder
  verworfener Tab lässt sich mit diesen Listenern nicht am Leben halten.
- **`error` und abgelehntes `play()`:** Werden explizit mit `console.error`
  protokolliert. Terminale Medienfehler stoppen die Absicht; Play-Ablehnungen
  korrigieren die Anzeige und können bei späteren Resume-Ereignissen erneut
  versucht werden. Kein timergetriebener Retry-Loop.

## Ursachenbewertung

### Problem 1: Stillstand bis zum Entsperren

1. **Belegte Anfälligkeit, wahrscheinlicher Mitverursacher:** Der alte
   Ereignishandler änderte nur React-State. Die neue Quelle und ihr Play-Aufruf
   lagen in einem späteren Effekt. Damit musste zwischen zwei Audiodateien
   zusätzliche JS-/React-Arbeit stattfinden, während keine fortlaufende
   Audiowiedergabe mehr bestand.
2. **Plausibel, geräteabhängig:** Browser können Hintergrundseiten einfrieren,
   Timer drosseln oder unter Ressourcenknappheit verwerfen. Ein eingefrorener
   Kontext führt auch React-Effekte und Timer-Retries nicht aus.
   Android-/OEM-Energiesparregeln, Audiofokus und eine unterbrochene
   Netzwerkverbindung sind zusätzliche Kandidaten. Aktive Audiowiedergabe wird
   von Browsern häufig bevorzugt behandelt; daraus folgt keine zuverlässige
   Schutzwirkung während eines Quellenwechsels.
3. **Belegt, aber kein hinreichender Ursachennachweis:** Beim Entsperren kann der
   vorhandene Visibility-Handler `play()` erneut aufrufen. Ebenso können dann
   zurückgestellte JS- oder Netzwerkvorgänge weiterlaufen.
4. **Weiterer belegter Fehler:** Am regulären Playlist-Ende wurde bisher nur
   `isPlaying=false` gesetzt, nicht die Wiedergabeabsicht gelöscht. Visibility-
   oder Canplay-Recovery konnte den letzten Titel erneut starten. Das erklärt
   nicht jeden Stillstand mitten in einer Playlist, verfälscht aber Recovery.

**Bewertung:** Der Patch verringert die angreifbare Übergangsphase. War bereits
die Zustellung von `ended` eingefroren oder blockiert der Browser den
Folgedownload beziehungsweise `play()`, reicht er allein nicht aus.

### Problem 2: Knackser, Aussetzer oder Stottern zwischen Titeln

1. **Belegt:** Ohne Folgetitel-Vorladen muss der Start auf neue Daten und den
   Decoder warten. Schwaches Netz, große Dateien, anderer Codec oder andere
   Abtastrate können diese Lücke vergrößern.
2. **Belegter störender Mechanismus:** Ein Stall-Timer rief nach zwei Sekunden
   `load()` auf, setzte anschließend sofort `currentTime` zurück und startete
   erneut. Das verwarf laufende Vorgänge; das Zurücksetzen ohne Abwarten neuer
   Metadaten war keine robuste Positionswiederherstellung. Selbst ein schon
   überholter Timer konnte eingreifen, wenn kein löschendes `canplay` eintraf.
   **Nicht belegt:** Dass dieser Timer auf dem betroffenen Gerät tatsächlich
   ausgelöst wurde. Unterbrechungen deutlich unter zwei Sekunden lassen sich
   nicht allein damit erklären.
3. **Belegtes Auslieferungsrisiko im Lock-Stand:** [poetry.lock](../backend/poetry.lock#L1750)
   fixiert Starlette 0.36.3. Dessen `FileResponse` enthält keine HTTP-Range-
   Verarbeitung. Bei direkter Auslieferung durch diesen Stack sind daher keine
   Teilantworten wie bei aktuellen Versionen zu erwarten. Das erschwert effizientes
   Nachladen und Seek-Recovery, beweist aber keinen Übergangsfehler.
   Ein vorgeschalteter Proxy kann das Verhalten ändern; die produktive
   Auslieferung wurde nicht gemessen.
4. **Offen:** Knackser können zusätzlich aus bereits vorhandenen Dateienden,
   abrupten Wellenformsprüngen, Encoder-Padding, Decoder-/Audioausgabewechseln
   oder Bluetooth entstehen. Es gibt keine Dateiproben oder akustischen
   Messungen, die einen dieser Kandidaten bestätigen.

## Maßnahmen nach Aufwand/Nutzen

| Priorität | Maßnahme | Aufwand / Nutzen | Risiko / Entscheidung |
| --- | --- | --- | --- |
| 1 | Quellenwechsel und `play()` unmittelbar im Bedien-/Medienereignis | Klein bis mittel / hoch für vermeidbare Übergangsverzögerungen | Niedrig; umgesetzt, dasselbe Audioelement und dieselben Quellen bleiben erhalten. |
| 2 | Destruktive Stall-/Retry-Timer entfernen, native Pufferung erlauben | Klein / hoch bei langsamen oder schwankenden Verbindungen | Niedrig bis mittel: Ein echter dauerhafter Stall wird nicht mehr blind alle zwei Sekunden neu geladen. Manuelle Bedienung kann nötig sein. |
| 3 | Explizite Wiedergabeabsicht, Playlist-Ende, aktuelle Media-Session-Handler und Status absichern | Klein / mittel bis hoch | Niedrig; umgesetzt. Verhindert unter anderem Wiederstart nach expliziter Pause oder Playlist-Ende. Mix-/Repeat-Änderungen werden sofort von Sperrbildschirm-Aktionen berücksichtigt. |
| 4 | `resume`/`pageshow` zusätzlich zur Visibility-Recovery | Klein / mittel, browserabhängig | Niedrig; umgesetzt, nur bei weiter bestehender Absicht. Keine Hintergrundgarantie. |
| 5 | Reale Geräte-/Netzwerkmessung und Range-Prüfung | Klein bis mittel / hoch zur weiteren Eingrenzung | Kein Playerumbau. Vor weiteren Architekturänderungen empfohlen. |
| 6 | FastAPI/Starlette kompatibel aktualisieren oder Range-fähige Medienauslieferung einsetzen | Mittel / mittel bis hoch für Streaming und Seek | Nicht als Minimalpatch umgesetzt: betrifft Backend-Abhängigkeiten, Deployment und alle Medien. Kompatibilitäts- und Range-Tests notwendig. Keine selbstgebaute Range-Implementierung ergänzen. |
| 7 | Genau einen Folgetitel gezielt vorladen | Mittel / mittel für Netzwerklücken | Nicht umgesetzt: zusätzlicher Datenverbrauch, Konkurrenz zur aktiven Datei, Speicherbedarf, Browserlimits; Mix, Repeat und geänderte Playlists müssen konsistent vorbereitet werden. Cache-Wiederverwendung und Decodierbereitschaft sind nicht garantiert. |
| 8 | Zweiter Decoder, Crossfade oder Web-Audio-/MSE-Playlist | Hoch / gezielt für echte lückenlose Übergänge | Kein Minimalumfang: Audiofokus, iOS-Autoplay, Codecgrenzen, Speicher, Strom und hörbare UX-Änderungen. Nur bei nachgewiesenem weiterem Bedarf. |

Ein Screen Wake Lock oder lautlose Dauerschleifen sind keine geeignete Lösung:
Ein Bildschirm-Wake-Lock ist kein verlässlicher Hintergrund-Audio-Dienst; ein
Keep-alive-Hack würde Ressourcen verbrauchen und Plattformregeln nicht zuverlässig
überwinden. Media Session ist ebenfalls keine Befreiung von diesen Regeln.

## Geänderte Dateien und Plattformauswirkungen

- [MusicPlayer.tsx](../frontend/src/components/MusicPlayer.tsx): synchroner
  Startpfad für Next/Previous/Playlist/Media Session; keine Stall-Reload-Timer;
  kontrollierte Resume- und Fehlerbehandlung; Ende versus manueller Skip explizit
  unterschieden; aktualisierte Media-Session-Handler mit Cleanup und Status;
  `loop` deklarativ am bestehenden Element.
- Dieses Dokument und die Verlinkung im [README](../README.md).
- Keine neuen Abhängigkeiten, kein zweiter Player, kein Web Audio, kein Crossfade,
  keine Änderung an Server-/Dateiformaten. Generierte Build-Ausgaben sind nicht
  Bestandteil des Quellcodepatches.

**Desktop:** Dieselben Bedienelemente, Seek-/Lautstärkefunktionen, Mix und Repeat;
weniger doppelte Play-Aufrufe und keine timerbedingten Reloads. Reguläres
Playlist-Ende bleibt beendet. Letzteres korrigiert unbeabsichtigtes Recovery.

**iOS:** Wiederverwendung desselben Elements bleibt erhalten; Play-Aufrufe aus
Bedienereignissen benötigen keinen vorgeschalteten Effekt mehr. Safari kann
Autoplay, Vorladen und Hintergrundwiedergabe weiterhin begrenzen. Nicht
verfügbare Media-Session-/Metadata-Funktionen sind abgefragt. Keine iOS-
Kompatibilitätsgarantie ohne Gerätetest und kein neuer AudioContext-Suspend-Pfad.

**Ältere Android-Geräte:** Keine zusätzlichen Decoder oder Downloads; dadurch
keine neue Speicher-/Netzlast. Fehlendes `resume` wird durch die bisherigen
Medien-/Visibility-Ereignisse ergänzt. Gemeint sind Geräte mit einem Browser,
der die bereits vorhandene React-/Vite-Anwendung und Play-Promises unterstützt,
nicht beliebig alte Browser.

**Bewusste Grenze:** Bei terminalem Netzwerk-/Codecfehler pausiert der Player mit
Konsolenfehler statt unbegrenzt zu laden. Ein expliziter erneuter Titelstart setzt
bei vorhandenem Medienfehler die Quelle erneut. Ein nichtterminaler Dauerstall
ohne Fehlerereignis hat keinen automatischen Reload-Watchdog mehr. Falls echte
Gerätetests dessen Notwendigkeit zeigen, sollte eine begrenzte, quellengebundene
Recovery mit Fortschrittsprüfung und Metadaten-abgewartetem Seek separat folgen.

## Validierung und verbleibende Abnahme

Erfolgreich ausgeführt:

- TypeScript-Prüfung und Vite-Produktionsbuild mit `npm --prefix frontend run build`
  beziehungsweise abschließend mit separatem Ausgabeordner.
- Gezielter ESLint-Lauf:
  `cd frontend && npx eslint src/components/MusicPlayer.tsx --max-warnings 0`.
- Browser-Regressionsprüfungen der tatsächlichen React-Komponente mit drei
  simulierten Titeln und instrumentiertem HTMLMediaElement:
  - Vorher blieb direkt nach `ended` Quelle 1 aktiv; anschließend erfolgte der
    Effektwechsel. Nach `waiting` erschien nach 2,15 Sekunden ein `load()`-Aufruf.
  - Nachher wurden Quelle 2 **und** ihr `play()` noch während des
    `ended`-Dispatches registriert. `waiting`/`stalled` über 2,15 Sekunden führten
    zu keinem `load()`.
  - Playlist-Ende blieb trotz Visibility/Canplay/Resume/Pageshow beendet.
    Manueller Next am Ende wechselte weiterhin zum ersten Titel.
  - Explizite Media-Session-Pause verhinderte Recovery; eine simulierte
    Browserpause mit fortbestehender Absicht wurde wieder aufgenommen.
  - Media-Session-Status, sofort wirksamer Mix-Modus, Mix-Zurück-Historie,
    Repeat-All, natives Repeat-One und manueller Skip in Repeat-One bestanden.
  - Playlist-Auswahl setzte die Quelle synchron. Ein injizierter
    `NotAllowedError` wurde protokolliert, korrigierte die Anzeige und erlaubte
    spätere Wiederaufnahme.
  - Ein dauerhaft gesetztes sowie ein nachträglich gesetztes `shouldPause`
    stoppten die Wiedergabe. Recovery hob diese externe Pause nicht auf;
    normales Pause/Resume behielt die Position bei.
- Separater nativer Browser-API-Check sowie ein Durchlauf der tatsächlichen
  React-Komponente mit zwei selbst erzeugten WAV-Dateien als Blob-URLs:
  genau ein Audioelement, zwei `playing`- und zwei `ended`-Ereignisse,
  automatischer Titelwechsel und abschließend pausierter Player mit
  Play-Schaltfläche. Keine simulierten Medienmethoden in diesem Durchlauf;
  stummgeschaltete Wiedergabe ohne AudioContext. Dies prüft die native
  Lade-/Dekodierpipeline lokal, nicht das Produktionsnetz oder die Klangqualität.

Diese Prüfungen sind **kein Android-Gerätetest, kein akustischer Test und kein
Nachweis einer gemessenen Verbesserung in Millisekunden auf Mobilgeräten**.
Die Ablaufprüfungen nutzten Browserinstrumentierung ohne neue Testabhängigkeiten;
es wurde kein dauerhafter automatischer Frontend-Testrunner eingerichtet.

Empfohlene Geräteabnahme vor einer Aussage „behoben“:

1. Auf beiden betroffenen Geräten Browsername/-version, OS-Build, Energiespar-
   und Website-/Browser-Hintergrundbeschränkungen dokumentieren. Mit mindestens
   zehn Titelwechseln pro Durchlauf vergleichen: sichtbar, App im Hintergrund,
   Bildschirm gesperrt; anschließend mit und ohne Energiesparmodus.
2. Repeat-Off/All/One, Mix, Sperrbildschirm Next/Previous/Pause, Video-
   Audiokonflikt, WLAN/Mobilfunk und möglichst lokale Ausgabe/Bluetooth prüfen.
   Explizite Pausen dürfen durch Entsperren nicht aufgehoben werden.
3. Zeitstempel von `ended`, Quellensetzung, Play-Promise, `waiting`, `stalled`,
   `canplay`, `playing`, `pause`, `error` und Lifecycle-Ereignissen erfassen.
   `readyState`, `networkState`, Pufferbereiche und Fehlername/-code ergänzen.
   `ended -> playing` als Steuerungs-/Ladeindikator und die tatsächliche
   Audiolücke getrennt messen. Remote-Debugging kann Lifecycle-Verhalten verändern;
   deshalb auch ohne verbundenen Debugger reproduzieren.
4. Die konkrete Medien-URL mit einer Range-Anfrage prüfen, etwa
   `curl --range 0-1023 --dump-header - --output /dev/null 'https://HOST/limit_static/uploads/DATEI.mp3'`.
   Erwartet bei Range-Unterstützung: `206` mit passendem `Content-Range`;
   eine vollständige `200`-Antwort deutet auf ignorierte Ranges hin.
5. Betroffene Dateipaare auf Format, Abtastrate, Bitrate, Encoder-Padding und
   hörbare Artefakte an Anfang/Ende prüfen. Langsame Antwort des Folgetitels und
   kurzfristigen Netzverlust gezielt testen.

Das private Projektprofil und externe betroffene Ansichten wurden nicht
aufgerufen oder geändert: Die erforderliche ausdrückliche Freigabe liegt nicht
vor. Deren Aktualisierung ist gegebenenfalls nach Freigabe nachzuziehen.

## Referenzen

- [MDN: load() bricht laufende Vorgänge ab und setzt Medienzustand zurück](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load)
- [MDN: preload ist ein Hinweis](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/preload)
- [MDN: stalled bedeutet ausbleibende Daten, nicht zwingend terminalen Fehler](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/stalled_event)
- [MDN: play(), Play-Promise und Autoplay-Ablehnungen](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)
- [Chrome: Page Lifecycle, eingefrorene Tasks und verworfene Seiten](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)
- [Starlette 0.36.3: tatsächliche FileResponse-Implementierung](https://github.com/encode/starlette/blob/0.36.3/starlette/responses.py)
