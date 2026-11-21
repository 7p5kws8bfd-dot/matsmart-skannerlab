Matsmart 0.3 – Skannerlabbet (separat test)

VIKTIGT: Detta är INTE en uppdatering av Matsmart 0.2.4.
Ladda INTE upp filerna i ditt befintliga matsmart-test-repo om du vill behålla 0.2.4 orörd.

Publicera separat:
1. Skapa ett nytt PUBLIC GitHub-repo, exempelvis matsmart-skannerlab.
2. Packa upp ZIP och ladda upp index.html och scanner-lab.js i repots rot.
3. Settings > Pages > Deploy from a branch > main > /(root) > Save.
4. Öppna https://DITT-ANVANDARNAMN.github.io/matsmart-skannerlab/

Testmiljön sparar inga matvaror och ändrar inte det befintliga matförrådet.
Kräver HTTPS, kameratillstånd och internet för ZXing och Open Food Facts.
Stöder ZXing och, där webbläsaren stöder det, native BarcodeDetector.
Giltig kontrollsiffra och två överensstämmande avläsningar krävs.

Detta är en testversion. Kameraresultat har inte kunnat verifieras på fysisk iPhone.
