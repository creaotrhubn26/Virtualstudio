# Panel Integration Guide

## Oversikt
Denne guiden beskriver hvordan du legger til nye paneler med automatisk maks høyde-funksjonalitet og lukking av andre paneler.

## Hjelpefunksjoner

### `checkIfAnyPanelIsMaxHeight(excludePanelId?: string): boolean`
Sjekker om noen av de åpne panelene er i maks høyde (≥90% av vinduet).

**Parametere:**
- `excludePanelId` (valgfri): ID på panel som skal ekskluderes fra sjekken

**Returverdi:**
- `true` hvis noen panel er i maks høyde
- `false` hvis ingen panel er i maks høyde

**Eksempel:**
```typescript
const wasMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight('myNewPanel');
```

### `setPanelToMaxHeight(panelId: string, storageKey: string): void`
Setter et panel til maks høyde (90% av vinduet) og lagrer i localStorage.

**Parametere:**
- `panelId`: ID på panelet som skal settes til maks høyde
- `storageKey`: Nøkkel for localStorage (f.eks. 'myNewPanelHeight')

**Eksempel:**
```typescript
(window as any).setPanelToMaxHeight('myNewPanel', 'myNewPanelHeight');
```

## Steg-for-steg: Legge til et nytt panel

### 1. Legg til panel ID i hjelpefunksjonen

I `src/main.ts`, legg til din nye panel ID i `checkIfAnyPanelIsMaxHeight`:

```typescript
const panelIds = [
  'helpPanel',
  'marketplacePanel',
  'aiAssistantPanel',
  'actorBottomPanel',
  'myNewPanel' // ← Legg til her
];
```

### 2. Sett opp resize handle

I `src/main.ts`, legg til setup for resize handle:

```typescript
setupPanelResizeHandle('myNewPanelResizeHandle', 'myNewPanel', 'myNewPanelHeight');
```

### 3. Legg til i React-komponenten

I din React-komponent (f.eks. `MyNewPanelApp`), legg til logikk for å:

#### a) Lukke andre paneler når ditt panel åpnes:

```typescript
if (newState) {
  // Close other panels
  const helpPanel = document.getElementById('helpPanel');
  if (helpPanel && helpPanel.classList.contains('open')) {
    window.dispatchEvent(new CustomEvent('toggle-help-panel'));
  }
  
  // Close CourseCreatorSidebar if open
  window.dispatchEvent(new CustomEvent('close-course-creator-sidebar'));
  
  panel.style.display = 'flex';
  panel.classList.add('open');
  
  // Check if any panel was at max height and set new panel to max height if so
  const checkMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight;
  const setMaxHeight = (window as any).setPanelToMaxHeight;
  if (checkMaxHeight && setMaxHeight && checkMaxHeight('myNewPanel')) {
    setMaxHeight('myNewPanel', 'myNewPanelHeight');
  }
}
```

#### b) Lukke ditt panel når andre paneler åpnes:

I hver av de andre panel-komponentene, legg til:

```typescript
// Close my new panel if open
const myNewPanel = document.getElementById('myNewPanel');
if (myNewPanel && myNewPanel.classList.contains('open')) {
  window.dispatchEvent(new CustomEvent('toggle-my-new-panel'));
}
```

### 4. Legg til HTML-struktur

I `index.html`, legg til:

```html
<div class="actor-bottom-panel" id="myNewPanel" style="display:none;">
  <div class="panel-resize-handle" id="myNewPanelResizeHandle" aria-label="Dra for å endre panelstørrelse"></div>
  <!-- Resten av panel-innholdet -->
</div>
```

### 5. Legg til toggle event listener

I din React-komponent, legg til event listener:

```typescript
React.useEffect(() => {
  const handleToggle = () => {
    setIsOpen(prev => {
      const newState = !prev;
      // ... toggle logikk ...
      return newState;
    });
  };

  window.addEventListener('toggle-my-new-panel', handleToggle);
  return () => window.removeEventListener('toggle-my-new-panel', handleToggle);
}, []);
```

## Komplett eksempel

```typescript
export const MyNewPanelApp: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => {
        const newState = !prev;
        const panel = document.getElementById('myNewPanel');
        
        if (panel) {
          if (newState) {
            // Close other panels
            const helpPanel = document.getElementById('helpPanel');
            if (helpPanel && helpPanel.classList.contains('open')) {
              window.dispatchEvent(new CustomEvent('toggle-help-panel'));
            }
            
            // Close CourseCreatorSidebar if open
            window.dispatchEvent(new CustomEvent('close-course-creator-sidebar'));
            
            panel.style.display = 'flex';
            panel.classList.add('open');
            
            // Check if any panel was at max height and set new panel to max height if so
            const checkMaxHeight = (window as any).checkIfAnyPanelIsMaxHeight;
            const setMaxHeight = (window as any).setPanelToMaxHeight;
            if (checkMaxHeight && setMaxHeight && checkMaxHeight('myNewPanel')) {
              setMaxHeight('myNewPanel', 'myNewPanelHeight');
            }
          } else {
            panel.style.display = 'none';
            panel.classList.remove('open');
          }
        }
        
        return newState;
      });
    };

    window.addEventListener('toggle-my-new-panel', handleToggle);
    return () => window.removeEventListener('toggle-my-new-panel', handleToggle);
  }, []);

  if (!isOpen) return null;

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline>
        {/* Ditt panel-innhold */}
      </CssBaseline>
    </ThemeProvider>
  );
};
```

## Best Practices

1. **Konsistent navngiving**: Bruk samme navngivingsmønster for alle paneler
   - Panel ID: `myNewPanel`
   - Resize handle ID: `myNewPanelResizeHandle`
   - Storage key: `myNewPanelHeight`
   - Event name: `toggle-my-new-panel`

2. **Alltid lukk CourseCreatorSidebar**: Hvis CourseCreatorSidebar er åpen, lukk den når ditt panel åpnes

3. **Bruk hjelpefunksjoner**: Bruk `checkIfAnyPanelIsMaxHeight` og `setPanelToMaxHeight` i stedet for å duplisere logikk

4. **Test med alle paneler**: Sjekk at ditt panel lukker seg når andre paneler åpnes, og at det åpnes i maks høyde hvis forrige panel var det

## Feilsøking

### Panel åpnes ikke i maks høyde
- Sjekk at panel ID er lagt til i `checkIfAnyPanelIsMaxHeight`
- Sjekk at `checkMaxHeight` og `setMaxHeight` er tilgjengelige på `window`
- Sjekk at panelet faktisk er åpent før du sjekker høyde

### Panel lukker seg ikke når andre paneler åpnes
- Sjekk at du har lagt til logikk for å lukke ditt panel i alle andre panel-komponenter
- Sjekk at event listener er satt opp riktig
- Sjekk at event navnet matcher mellom dispatcher og listener

### Resize handle fungerer ikke
- Sjekk at `setupPanelResizeHandle` er kalt med riktige parametere
- Sjekk at resize handle elementet finnes i HTML
- Sjekk at panel ID matcher mellom setup og HTML




















