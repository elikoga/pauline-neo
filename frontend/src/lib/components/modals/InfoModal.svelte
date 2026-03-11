<script>
  import { bustCache } from '$lib/api';
</script>

<h1 class="text-3xl">Pauline</h1>
<p>
  Pauline ist dein Stundenplaner für die Universität Paderborn. Mit Pauline kannst du schnell und
  einfach deinen Stundenplan für das Semester planen.
</p>
<p>
  Im linken Teil des Bildschirms, oder im Hamburger-Menü am Handy, befindet sich eine Liste mit
  allen Kursen, die du mit Pauline planen kannst. Wenn du einen Kurs ausklappst, kannst du dort
  sowohl die Hauptterminreihe, als auch die Termine der Kleingruppen auswählen.
</p>
<p>
  Wenn du auf den Text "Kleingruppen" selber klickst, wählst du alle Kleingruppen aus und siehst,
  wie alle in deinen Stundenplan passen. Du kannst sie dann im Stundenplan selber, als auch in der
  Seitenleiste abwählen.
</p>
<p>
  Du kannst deinen Stundenplan in eine Kalenderdatei mit "Kalender Exportieren" exportieren, und
  dann in das Kalenderprogramm deiner Wahl importieren.
  <span class="underline">
    Von Pauline erstellte Kalenderdateien können auch in Pauline wieder importiert werden, sodass du
    deine Termine einfach speichern kannst.
  </span>
</p>
<p>
  Wenn du einen Fehler machst, kannst du ihn am Rechner mit <kbd>Ctrl</kbd>+<kbd>Z</kbd> rückgängig
  machen. Mit <kbd>Ctrl</kbd>+<kbd>Y</kbd> kannst du ihn wiederherstellen. Für Undo/Redo am Handy arbeiten
  wir noch ;)
</p>
<br />
<h2 class="text-2xl">Autoren</h2>
<ul>
  <li>Adrian Block (adrblo)</li>
  <li>Eli Kogan-Wang (elikoga)</li>
  <li>Maximilian Schmöcker (maxsch)</li>
</ul>
<p>
  Wir alle sind unter unserem IMT-Usernamen (in Klammern) @mail.upb.de zu erreichen. Bitte Erwähne
  "Pauline" in deinem Betreff, damit wir wissen, worum es geht.
</p>
<br />
<h2 class="text-2xl">Mitwirkung</h2>
<p>
  Das Projekt ist Open-Source unter <a href="https://git.cs.uni-paderborn.de/pauline">GitLab</a> zu finden.
</p>
<br />
<h2 class="text-2xl">Privatsphäre</h2>
<p>
  Pauline sammelt anonymisierte Nutzungsdaten, um Nutzerzahlen auszuwerten. Es werden jedoch keine
  persönlichen Daten erhoben.
</p>

<p>
  <button
    on:click={bustCache}
    class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
  >
    Cache leeren
  </button>
</p>

<style>
  p {
    margin-bottom: 1em;
    margin-top: 1em;
  }
  ul {
    margin-bottom: 1em;
    margin-top: 1em;
  }
  kbd {
    border: 1px solid #aaa;
    border-radius: 0.2em;
    box-shadow: 0.1em 0.1em 0.2em rgba(0, 0, 0, 0.1);
    background-color: #f9f9f9;
    background-image: linear-gradient(to bottom, #eee, #f9f9f9, #eee);
    color: #000;
    padding: 0.1em 0.3em;
    font-family: inherit;
    font-size: 0.85em;
  }
</style>
