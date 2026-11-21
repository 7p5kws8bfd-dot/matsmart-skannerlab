Matsmart 0.3.2 – Skannerlabbet 360°

Separat testapp. Ändrar inga uppgifter i ordinarie Matsmart.

Ändringar:
- Kvadratisk synlig skanningsram och kameravy utan beskärning (object-fit:contain).
- Rotationsassistans testar 90°/270° oftare, och även 180°.
- Högre upplösning i rotationsanalysen.
- Rättat fel vid manuell EAN-inmatning.

Publicering: Ersätt index.html och scanner-lab.js i GitHub-projektet matsmart-skannerlab. GitHub Pages publicerar ändringarna. Uppdatera Safari-sidan. Kontrollera att rubriken visar 0.3.2.

Testa samma förpackning i 0°, 90°, 180°, 270° och diagonalt. Kopiera testrapporten efter varje test.

OBS: Kvadratisk ram är en visuell guide, inte en begränsning av ZXing:s sökområde. Rotation och prestanda måste verifieras på iPhone.
