# Produksjonskalender-Integrasjon for Shot Lists

## Oversikt

Shot lists må være tett integrert med Produksjonskalender for:
- **Tidsestimering**: Kalkulere om alle shots passer inn i dagens produksjonsdag
- **Deadline-håndtering**: Basere deadlines på ProductionDay.date + wrapTime
- **Time pressure mode**: Aktiveres når estimert tid overstiger gjenværende tid
- **Progress tracking**: Følge fremdrift per produksjonsdag, ikke bare per shot list

## Datastruktur

### ProductionDay
```typescript
interface ProductionDay {
  id: string;
  projectId: string;
  date: string; // ISO date string
  callTime: string; // "09:00"
  wrapTime: string; // "17:00"
  locationId: string;
  scenes: string[]; // Scene IDs - dette kobler til ShotList.sceneId
  crew: string[]; // Crew member IDs
  props: string[]; // Prop IDs
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  // ...
}
```

### ShotList
```typescript
interface ShotList {
  id: string;
  projectId: string;
  sceneId: string; // Kobler til ProductionDay.scenes[]
  sceneName?: string;
  shots: CastingShot[];
  deadline?: string; // Skal baseres på ProductionDay.date + wrapTime
  // ...
}
```

### CastingShot
```typescript
interface CastingShot {
  id: string;
  sceneId: string;
  estimatedTime?: number; // Minutter per shot
  actualDuration?: number; // Faktisk tid brukt (minutter)
  deadline?: string; // Skal baseres på ProductionDay
  // ...
}
```

## Koblingslogikk

### 1. Hent ProductionDay for ShotList

```typescript
async function getProductionDayForShotList(
  shotList: ShotList, 
  projectId: string
): Promise<ProductionDay | null> {
  const productionDays = await productionPlanningService.getProductionDays(projectId);
  
  // Finn ProductionDay som inneholder ShotList.sceneId
  return productionDays.find(day => 
    day.scenes.includes(shotList.sceneId)
  ) || null;
}
```

### 2. Kalkuler tilgjengelig tid i produksjonsdagen

```typescript
function calculateAvailableTime(productionDay: ProductionDay): number {
  const now = new Date();
  const today = new Date(productionDay.date);
  
  // Parse wrapTime (HH:mm) til Date
  const [hours, minutes] = productionDay.wrapTime.split(':').map(Number);
  const wrapDateTime = new Date(today);
  wrapDateTime.setHours(hours, minutes, 0, 0);
  
  // Hvis wrapTime er i fremtiden, returner gjenværende minutter
  if (wrapDateTime > now && today.toDateString() === now.toDateString()) {
    return Math.floor((wrapDateTime.getTime() - now.getTime()) / 60000);
  }
  
  return 0; // Produksjonsdagen er over eller ikke startet
}
```

### 3. Kalkuler estimert tid for shots

```typescript
function calculateEstimatedTime(shots: CastingShot[]): number {
  return shots
    .filter(shot => shot.status !== 'completed')
    .reduce((total, shot) => total + (shot.estimatedTime || 5), 0);
}
```

### 4. Time Pressure Mode

```typescript
function isTimePressureMode(
  productionDay: ProductionDay,
  shots: CastingShot[]
): boolean {
  const availableTime = calculateAvailableTime(productionDay);
  const estimatedTime = calculateEstimatedTime(shots);
  
  // Time pressure hvis estimert tid overstiger gjenværende tid
  return estimatedTime > availableTime && availableTime > 0;
}
```

### 5. Deadline-kalkulasjon

```typescript
function calculateDeadline(productionDay: ProductionDay): Date {
  const dayDate = new Date(productionDay.date);
  const [hours, minutes] = productionDay.wrapTime.split(':').map(Number);
  
  const deadline = new Date(dayDate);
  deadline.setHours(hours, minutes, 0, 0);
  
  return deadline;
}
```

## UI-Integrasjon

### TimeAwareHeader Component

```typescript
interface TimeAwareHeaderProps {
  shotList: ShotList;
  productionDay: ProductionDay | null;
  shots: CastingShot[];
}

function TimeAwareHeader({ shotList, productionDay, shots }: TimeAwareHeaderProps) {
  if (!productionDay) {
    return <Box>⚠️ Ingen produksjonsdag koblet til denne shot list</Box>;
  }
  
  const availableTime = calculateAvailableTime(productionDay);
  const estimatedTime = calculateEstimatedTime(shots);
  const isTimePressure = isTimePressureMode(productionDay, shots);
  const deadline = calculateDeadline(productionDay);
  
  return (
    <Box>
      <Typography variant="h6">
        {productionDay.date} - {productionDay.callTime} til {productionDay.wrapTime}
      </Typography>
      
      <Box>
        <Typography>
          Tilgjengelig tid: {formatMinutes(availableTime)}
        </Typography>
        <Typography>
          Estimert tid: {formatMinutes(estimatedTime)}
        </Typography>
        <Typography color={isTimePressure ? 'error' : 'success'}>
          {isTimePressure ? '⚠️ Time pressure!' : '✅ Tiden passer'}
        </Typography>
      </Box>
      
      <Typography>
        Deadline: {deadline.toLocaleString()}
      </Typography>
    </Box>
  );
}
```

### Shot List Card med ProductionDay-info

```typescript
function ShotListCard({ shotList, productionDay }: { shotList: ShotList, productionDay: ProductionDay | null }) {
  return (
    <Card>
      <CardHeader>
        <Typography variant="h6">{shotList.sceneName}</Typography>
        {productionDay && (
          <Chip 
            label={`${productionDay.date} ${productionDay.callTime}-${productionDay.wrapTime}`}
            color={productionDay.status === 'in_progress' ? 'primary' : 'default'}
          />
        )}
      </CardHeader>
      {/* ... */}
    </Card>
  );
}
```

## Tidsestimering per Produksjonsdag

### Samle alle shots for en ProductionDay

```typescript
async function getShotsForProductionDay(
  productionDay: ProductionDay,
  projectId: string
): Promise<CastingShot[]> {
  // Hent alle shot lists for scenes i produksjonsdagen
  const shotLists = await castingService.getShotLists(projectId);
  const relevantShotLists = shotLists.filter(sl => 
    productionDay.scenes.includes(sl.sceneId)
  );
  
  // Samle alle shots
  const allShots = relevantShotLists.flatMap(sl => sl.shots);
  
  return allShots;
}
```

### Kalkuler total tidsestimering per dag

```typescript
async function calculateDayTimeEstimate(
  productionDay: ProductionDay,
  projectId: string
): Promise<{
  totalEstimated: number;
  totalActual: number;
  remaining: number;
  available: number;
  fitsInDay: boolean;
}> {
  const shots = await getShotsForProductionDay(productionDay, projectId);
  const available = calculateAvailableTime(productionDay);
  
  const totalEstimated = shots
    .filter(s => s.status !== 'completed')
    .reduce((sum, s) => sum + (s.estimatedTime || 5), 0);
    
  const totalActual = shots
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + (s.actualDuration || 0), 0);
  
  const remaining = available - totalActual;
  const fitsInDay = totalEstimated <= remaining;
  
  return {
    totalEstimated,
    totalActual,
    remaining,
    available,
    fitsInDay
  };
}
```

## Implementasjonssteg

1. **Legg til helper-funksjoner** i `productionPlanningService.ts`
   - `getProductionDayForShotList()`
   - `getShotsForProductionDay()`
   - `calculateDayTimeEstimate()`

2. **Oppdater ShotList interface** (hvis nødvendig)
   - Legg til `productionDayId` for direkte kobling (valgfritt)

3. **Oppdater CastingShotListPanel**
   - Hent ProductionDay for hver ShotList
   - Vis ProductionDay-info i header
   - Kalkuler og vis tidsestimering

4. **Oppdater InteractiveShotListView**
   - Vis ProductionDay-info
   - Time pressure mode basert på ProductionDay
   - Deadline countdown basert på ProductionDay

5. **Oppdater TimeAwareHeader**
   - Baser alle kalkulasjoner på ProductionDay
   - Vis produksjonsdag-info

6. **Testing**
   - Test med flere ProductionDays
   - Test time pressure mode
   - Test deadline-kalkulasjoner
   - Test med shots som ikke passer inn i dagen


