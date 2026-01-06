---
name: Implementer RenderTargetTexture pixel reading
overview: Implementere riktig metode for å lese pikseldata direkte fra RenderTargetTexture-teksturer til monitor-canvasene, ved å bruke RenderTargetTexture.readPixels() eller engine.readPixels() med InternalTexture.
todos: []
---

#Implementere lesing fra RenderTargetTexture

## Bakgrunn

For øyeblikket leser `updateMonitorCanvases()` pikseldata fra hoved-canvaset i stedet for fra RenderTargetTexture-teksturene. Dette må fikses for at hvert kamera-preset skal vise riktig visning.**RenderTargetTexture i denne konteksten:**

- Vi bruker RTT for "overvåkningskameraer" (monitor feeds) - et typisk bruksområde
- Hvert kamera-preset (camA-E) har sin egen RenderTargetTexture
- RTT rendrer scenen fra preset-kameraets perspektiv til en tekstur
- Teksturen må deretter leses og vises på 2D canvas-elementer i monitor-dialogen

## Løsning

Bruke `RenderTargetTexture.readPixels()` som returnerer en Promise med ArrayBuffer, eller `engine.readPixels()` med InternalTexture fra render target.

## Implementering

### 1. Oppdater `updateMonitorCanvases()` i [src/main.ts](src/main.ts)

**Nåværende tilnærming (linje ~5498-5568):**

- Bruker `engine.readPixels()` uten texture-parameter
- Leser fra hoved-canvaset i stedet for render target

**Ny tilnærming:**

1. Etter `renderTarget.render(true)` (linje ~5487)
2. Hent InternalTexture: `const internalTexture = renderTarget.getInternalTexture()`
3. Bruk `renderTarget.readPixels()` (Promise-basert) ELLER
4. Bruk `engine.readPixels(0, 0, width, height, internalTexture)` (hvis støttet)
5. Håndter Promise/resultat og konverter til ImageData
6. Flip pikseldata vertikalt (WebGL bruker bottom-up koordinater)
7. Tegn til canvas med `ctx.putImageData()`

### 2. Metodevalg

**Alternativ A: RenderTargetTexture.readPixels()** (anbefalt)

```typescript
renderTarget.readPixels().then((data: ArrayBuffer) => {
  // Konverter ArrayBuffer til Uint8ClampedArray
  // Opprett ImageData
  // Flip vertikalt
  // Tegn til canvas
});
```

**Alternativ B: engine.readPixels() med InternalTexture**

```typescript
const internalTexture = renderTarget.getInternalTexture();
if (internalTexture) {
  this.engine.readPixels(0, 0, width, height, internalTexture).then((pixels) => {
    // Behandle pikseldata
  });
}
```



### 3. Detaljerte endringer

**Fil: [src/main.ts](src/main.ts)**

- **Linje ~5498-5568**: Erstatt placeholder-koden med riktig implementering
- Fjern TODO-kommentarer
- Implementer piksel-lesing fra RenderTargetTexture
- Håndter edge cases (null checks, feilhåndtering)
- Sikre at rendering er ferdig før pixel-lesing (kan bruke `onAfterRenderObservable` hvis nødvendig)

### 4. Tekniske detaljer

- **Pixel-format**: RGBA (4 bytes per pixel)
- **Koordinat-system**: WebGL bruker bottom-up, må flippes vertikalt
- **Async-håndtering**: `readPixels()` returnerer Promise
- **Feilhåndtering**: Try-catch rundt pixel-lesing, vis "no signal" ved feil

### 5. Testing

Etter implementering:

- Verifiser at hvert kamera-preset viser riktig visning
- Test med flere presets samtidig
- Verifiser ytelse (oppdateres hver 3. frame)
- Test edge cases (ingen preset, invalid texture, osv.)

## Notater

- RenderTargetTexture må rendres FØR pixel-lesing: `renderTarget.render(true)`
- `readPixels()` er async og returnerer Promise
- Pixel-data må konverteres fra ArrayBuffer til ImageData-format
- Vertikal flipping er nødvendig pga. WebGL koordinatsystem

## RenderTargetTexture kontekst

**Bruksområde i denne implementeringen:**

- Overvåkningskameraer / Monitor feeds (typisk RTT-bruk)
- Offscreen rendering for hvert kamera-preset
- Hver preset har egen RTT med eget kamera og renderList

**Eksisterende konfigurasjon:**

- `renderTarget.activeCamera = monitorCamera` (linje ~5471)
- `renderTarget.renderList = this.scene.meshes` (linje ~5472)
- RTT opprettes med TEXTURETYPE_UNSIGNED_INT (linje ~5450)
- Størrelse: 640x360 (16:9 aspect ratio)

**Viktige RTT-funksjoner vi bruker:**

- `renderTarget.render(true)` - Renderer til tekstur
- `renderTarget.getSize()` - Henter teksturstørrelse
- `renderTarget.getInternalTexture()` - Henter InternalTexture for engine.readPixels()
- `renderTarget.readPixels()` - Leser pikseldata direkte (hvis tilgjengelig)

**RTT-funksjonalitet relevant for monitor feeds:**

- Rendre utvalgte mesher via `renderList`