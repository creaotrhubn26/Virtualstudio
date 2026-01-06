# Testing Guide: Light Recommendations

## Oversikt
Denne funksjonaliteten detekterer når lysene i scenen er for svake og anbefaler sterkere alternativer.

## Testscenarier

### Test 1: Automatisk deteksjon av svake lys

1. **Start applikasjonen**
   - Åpne Virtual Studio i nettleseren
   - Naviger til "Kamera & Lys" panelet

2. **Legg til et svakt lys**
   - Gå til "Lys"-fanen
   - I "Legg til lys"-dropdown, velg det svakeste lyset (f.eks. en liten LED-panel eller svak flash)
   - Klikk "Legg til valgt lys"
   - Plasser lyset relativt langt fra subjektet (f.eks. 5-10 meter unna)

3. **Forventet oppførsel**
   - Systemet skal automatisk detektere at EV er for lavt (under EV 9)
   - En dialog skal dukke opp med tittel "💡 Anbefaling: Sterkere lys"
   - Dialogen skal vise at belysningen er under anbefalt nivå

### Test 2: Se anbefalte lys med spesifikasjoner

1. **Når dialogen dukker opp:**
   - Du skal se en melding som "Scenariet krever sterkere lys. Nåværende belysning er X.X EV under anbefalt nivå (EV 10)."
   - Under skal det stå "Velg et anbefalt lys for å bytte:"

2. **Sjekk anbefalte lys:**
   - Du skal se et grid med 3-6 anbefalte lys
   - Hvert lyskort skal vise:
     - Brand og modell (f.eks. "Godox AD600 Pro")
     - Type (📸 Blits eller 💡 Videolys)
     - Alle spesifikasjoner:
       - Effekt (f.eks. "600 Ws")
       - Lux @ 1m (f.eks. "24,000 lx")
       - Guide Number (for strobes, f.eks. "87")
       - Lumens (f.eks. "24,000 lm")
       - CRI (f.eks. "97")
       - Fargetemperatur (f.eks. "5600K")
       - Beam Angle (f.eks. "45°")
     - En "Velg dette lyset"-knapp

### Test 3: Bytte til anbefalt lys

1. **Velg et anbefalt lys:**
   - Klikk på "Velg dette lyset"-knappen på et av lyskortene
   
2. **Forventet oppførsel:**
   - Dialogen skal lukkes
   - Det svake lyset skal bli erstattet med det anbefalte
   - Det nye lyset skal være på samme posisjon
   - Fargetemperatur (CCT) skal være bevart
   - Power multiplier skal være bevart
   - Scene brightness skal oppdateres
   - Light meter reading skal oppdateres med ny EV-verdi

### Test 4: Lukke dialogen uten å bytte

1. **Test lukke-knappen:**
   - Når dialogen dukker opp, klikk på "×"-knappen øverst til høyre
   - Dialogen skal lukkes
   
2. **Test "Ikke nå"-knappen:**
   - Når dialogen dukker opp, klikk på "Ikke nå"-knappen nederst
   - Dialogen skal lukkes
   
3. **Test overlay-klick:**
   - Når dialogen dukker opp, klikk på den mørke bakgrunnen (overlay)
   - Dialogen skal lukkes

### Test 5: Spam-beskyttelse

1. **Test at dialogen ikke dukker opp for ofte:**
   - Når dialogen har dukket opp og du har lukket den
   - Dialogen skal ikke dukke opp igjen før minst 1 minutt har gått
   - Dette forhindrer at dialogen blir irriterende

### Test 6: Responsiv design

1. **Test på mobil/stor skjerm:**
   - Dialogen skal være responsiv
   - På små skjermer skal lyskortene være i én kolonne
   - På store skjermer skal de være i flere kolonner (grid)
   - Dialogen skal være scrollebar hvis innholdet er for høyt

## Manuell testing via konsoll (utvikler)

Hvis du vil teste funksjonaliteten direkte, kan du bruke følgende i browser konsollen:

```javascript
// Få tilgang til VirtualStudio-instansen
const studio = window.virtualStudio;

// Få nåværende lys
console.log('Nåværende lys:', Array.from(studio.lights.keys()));

// Sjekk EV-verdi
// Gå til lys-måleren i UI og se EV-verdi

// Hvis du vil manuelt trigge anbefalingsdialogen:
// (Denne metoden er private, så du må kalle den indirekte)
// Men du kan legge til et svakt lys og vente på automatisk deteksjon
```

## Forventede resultater

✅ **Suksess-kriterier:**
- Dialogen dukker opp automatisk når lysene er for svake
- Anbefalte lys vises med alle spesifikasjoner
- Lys kan byttes med ett klikk
- Alle innstillinger (posisjon, CCT, power) bevares ved bytte
- Dialogen lukkes korrekt ved alle lukke-metoder
- Spam-beskyttelse fungerer (maks 1 gang per minutt)

❌ **Hvis noe ikke fungerer:**
- Sjekk browser konsoll for feilmeldinger
- Sjekk at LIGHT_DATABASE er riktig importert
- Sjekk at CSS-styling er lastet
- Sjekk at EV-beregningen fungerer korrekt (sjekk light meter display)

## Tips for testing

1. **For å få svake lys raskt:**
   - Bruk lys med lav power (f.eks. små LED-paneler)
   - Plasser lysene langt unna subjektet
   - Bruk lange distanser (10+ meter)

2. **For å få sterke lys raskt:**
   - Bruk profesjonelle strobes (f.eks. Godox AD600 Pro, Profoto D2)
   - Plasser lysene nære subjektet (1-2 meter)

3. **For å se EV-endringer:**
   - Hold øye med light meter display i UI
   - EV skal være over 10 for god belysning
   - EV under 9 skal trigge anbefaling

















