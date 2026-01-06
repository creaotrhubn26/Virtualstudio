# Studio Utstyr - Hyper3D Rodin Prompts

Dette dokumentet inneholder gode beskrivelser for å generere studio-utstyr med Hyper3D Rodin.

## Automatisk Prompt-forbedring

Systemet har nå en automatisk prompt-forbedringsfunksjon som forbedrer alle prompts før de sendes til Hyper3D Rodin API. Dette sikrer bedre kvalitet på genererte 3D-modeller.

### Hvordan det fungerer:
- Alle prompts sendt til API-en blir automatisk forbedret av `PromptEnhancer`-klassen
- Forbedringen følger best practices for Hyper3D Rodin API
- Prompts som allerede er godt strukturert blir ikke endret unødvendig
- Original og forbedret prompt logges for debugging

### Forbedringsregler (prioritert rekkefølge):
1. **Objektidentifikasjon**: Starter med objekttype (f.eks. "Professional photography softbox")
2. **Materialer**: Legger til spesifikke materialer (aluminum, steel, fabric, etc.) hvis mangler
3. **Størrelse**: Inkluderer dimensjoner hvis de mangler eller er vage
4. **Farger/Finish**: Spesifiserer farger og finish (black, white, chrome, matte, glossy)
5. **Funksjonelle detaljer**: Legger til relevante funksjoner (adjustable, foldable, portable)
6. **Kontekst**: Legger til "studio equipment" eller "photography equipment" hvis mangler
7. **Kvalitet**: Legger til "professional" eller "high quality" hvis mangler
8. **Isolering**: Legger til "isolated on white background" for produktfotografering

### Eksempel på automatisk forbedring:
**Før**: "Softbox"  
**Etter**: "Professional photography softbox, white diffusion fabric, black outer shell, aluminum frame, studio equipment, isolated on white background"

## Prinsipper for gode prompts:
- Vær spesifikk om materialer (metall, tre, stoff, etc.)
- Inkluder størrelse/form (stor, liten, rektangulær, rund, etc.)
- Beskriv farger og finish (svart, hvit, krom, matte, glans, etc.)
- Legg til funksjonelle detaljer (justerbar, foldbar, etc.)
- Inkluder "isolated on white background" eller "studio equipment" for bedre resultater
- Start med "Professional" eller lignende kvalitetsindikator

---

## 💡 LYSUTSTYR

### Softbox
- "Professional photography softbox, large rectangular shape, white diffusion fabric, black outer shell, aluminum frame, studio lighting equipment, isolated on white background"
- "Small square photography softbox, compact studio light modifier, white diffusion panel, portable lighting equipment, isolated product shot"
- "Photography strip softbox, long narrow rectangular shape, studio lighting modifier for rim light, black fabric exterior, white diffusion"

### Beauty Dish
- "Photography beauty dish reflector, silver interior, white outer shell, circular parabolic shape, professional studio lighting modifier, isolated on white"
- "White beauty dish photography light modifier, matte white interior, round parabolic reflector, studio portrait lighting, isolated product"

### Octabox
- "Photography octabox, octagonal softbox, large studio light modifier, white diffusion fabric, black metal frame, professional portrait lighting"

### Ring Light
- "Professional ring light for photography, large circular LED light, adjustable brightness, camera mount center, beauty lighting, black metal housing"

### Fresnel
- "Fresnel spotlight for photography, metal housing, adjustable focus lens, barn doors attached, professional film lighting, black finish"
- "Compact LED fresnel light, cinema lighting equipment, adjustable beam angle, metal construction, black housing"

### Paraply
- "Photography umbrella reflector, silver interior, black exterior, studio lighting modifier, collapsible design, metal ribs"
- "White translucent photography umbrella, shoot-through diffuser, studio lighting equipment, foldable"

---

## 📐 STATIV/OPPHENG

### C-Stand
- "Professional C-stand for photography, chrome steel construction, turtle base legs, grip arm and knuckle, studio equipment stand"
- "Heavy duty C-stand with boom arm, black steel, adjustable height, studio grip equipment, counterweight system"

### Lysstativ
- "Photography light stand, black aluminum tripod, adjustable height, air cushioned, studio equipment, foldable legs"
- "Compact light stand for photography, portable tripod base, lightweight aluminum, foldable legs, black finish"

### Boom Arm
- "Photography boom arm, extendable cantilever arm, counterweight, studio overhead lighting mount, black metal construction"

---

## 🔧 MODIFIKATORER

### Reflektor
- "Photography reflector disc, 5-in-1, silver gold white black translucent, circular collapsible, studio lighting tool, metal frame"
- "Large rectangular photography reflector, silver surface, aluminum frame, studio fill light equipment, foldable"

### Diffusjonspanel
- "Photography diffusion panel, white translucent fabric, rectangular frame, studio soft light modifier, freestanding stand"

### Flag
- "Photography flag blocker, black fabric on metal frame, light control tool, studio grip equipment, rectangular shape"
- "White bounce flag for photography, foam board on stand, studio fill light tool, freestanding"

### Snoot
- "Photography snoot light modifier, conical metal tube, focused spotlight beam, studio lighting accessory, black metal"

### Barn Doors
- "Barn doors light modifier, four metal flaps, adjustable light control, studio lighting accessory, black metal construction"

### Grid
- "Photography honeycomb grid, black metal, hexagonal pattern, light control modifier, studio lighting accessory"

---

## 🪑 MØBLER

### Poseringskrakk
- "Photography posing stool, round seat, adjustable height, chrome base, studio furniture, modern design, black cushion"

### Regissørstol
- "Director chair for photography studio, black canvas seat, wooden frame, foldable, professional set furniture, portable"

### Apple Box
- "Apple box set for photography, wooden boxes, various sizes, studio grip equipment, posing props, natural wood finish"
- "Single apple box, wooden photography prop, studio posing equipment, natural wood, rectangular shape"

### Sidebord
- "Small side table for photography studio, white surface, minimalist design, product photography prop, metal legs"
- "Photography table, white seamless surface, studio furniture, minimalist design, metal frame"

### Poseringskube
- "Photography posing cube, white acrylic box, studio prop, product display stand, minimalist design"

---

## 📦 PROPS

### Kamera
- "Professional DSLR camera on tripod, black camera body, telephoto lens, carbon fiber tripod, photography equipment"
- "Vintage film camera, black body, leather details, professional photography equipment, isolated on white"

### Monitor
- "Studio monitor on stand, video reference display, adjustable mount, professional film equipment, black frame"
- "Field monitor for photography, small LCD screen, adjustable stand, professional video equipment"

### Kabeltrommel
- "Photography cable drum, orange power cable, professional studio electrical equipment, portable design"

---

## 🖼️ BAKGRUNNER

### Papirrulle
- "Paper backdrop roll on stand, white seamless paper, aluminum crossbar, photography studio background system"
- "Gray paper backdrop roll on stand, seamless background, studio photography equipment, metal stand"

### V-Flat
- "Photography V-flat, two hinged white foam boards, studio bounce reflector, freestanding, large size"
- "Black V-flat for photography, two hinged black panels, negative fill, studio light control, freestanding"

### Muslin Backdrop
- "Photography muslin backdrop, fabric background, studio photography, hanging system, various colors"

---

## 💻 VIDEO PRODUKSJON

### Teleprompter
- "Professional teleprompter, glass screen, adjustable angle, studio video equipment, black frame"

### Mikrofon
- "Studio microphone on boom arm, professional audio equipment, black finish, adjustable mount"

### Headphones
- "Professional studio headphones, over-ear design, black finish, audio monitoring equipment"

---

## 🎨 DEKORASJON/PROPS

### Planter
- "Decorative plant in ceramic pot, modern design, studio prop, minimalist style, white pot"
- "Artificial plant, studio decoration, modern design, photography prop"

### Bøker
- "Stack of books, photography prop, studio decoration, various sizes and colors"

### Skulptur
- "Modern abstract sculpture, studio decoration, minimalist design, photography prop, white finish"

---

## Tips for beste resultater:

1. **Vær spesifikk**: "Large rectangular softbox" er bedre enn "softbox"
2. **Inkluder materialer**: "Black aluminum" er bedre enn bare "black"
3. **Legg til kontekst**: "Studio lighting equipment" eller "photography equipment" hjelper
4. **Beskriv form**: "Circular", "rectangular", "octagonal" etc.
5. **Funksjonelle detaljer**: "Adjustable height", "foldable", "portable" etc.
6. **Finish/tekstur**: "Matte", "glossy", "chrome", "brushed metal" etc.
7. **Start med kvalitetsindikator**: "Professional", "High quality", "Detailed" etc.
8. **Inkluder isolering**: "Isolated on white background" for produktfotografering

## Eksempel på komplett prompt:

**Dårlig:**
"Softbox"

**Bra (manuelt skrevet):**
"Professional photography softbox, large rectangular shape, white diffusion fabric, black outer shell, aluminum frame, studio lighting equipment, isolated on white background"

**Automatisk forbedret (fra "Softbox"):**
Systemet vil automatisk forbedre enkelte prompts som "Softbox" til en strukturert prompt med alle nødvendige elementer.

## Teknisk informasjon:

Prompt-forbedringen skjer automatisk i `backend/prompt_enhancer.py` og kalles fra `backend/rodin_service.py` før hver API-forespørsel. Se koden for detaljer om implementasjonen.

