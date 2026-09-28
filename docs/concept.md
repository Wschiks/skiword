# Ski Idle Tycoon: Complete Game Design and Build Spec (v2)

> Working title. 2D portrait mobile idle tycoon. You build and upgrade a ski resort. Real people arrive, queue, ride your lifts, and **every single ride pays**.
>
> This file is the **single source of truth**. Put it in the new repo as `docs/concept.md`.

---

## 0. READ THIS FIRST (instructions for Claude Code)

1. **Do not ask the user any questions.** Every design decision is answered in this file. If something is genuinely not covered, pick the simplest option that fits the pillars (section 1), implement it, and append one line to `docs/decisions.md` explaining what you chose.
2. **All balance numbers and game data live in `src/config/*`.** Never hardcode numbers in logic or UI.
3. **Game logic is pure TypeScript with no Phaser imports** (`src/core`). It may import from `src/config`. It must run in Node for tests and the balance bot.
4. **Work milestone by milestone (section 19).** After each milestone run `npm run typecheck && npm test`, fix everything, then `git commit`.
5. Numbers in this file are **starting values**. Section 17 defines how to tune them with the balance bot until the target timeline is met. Tuning is part of the job, not optional.
6. **No emoji anywhere. No image files.** All art is drawn in code (canvas 2D baked into textures, plus a few Phaser Graphics). Icons are inline SVG.
7. If the other tycoon project's files (`save.ts`, `MapView.ts`, `ads.ts`, `purchases.ts`, `legal.ts`) are available in the workspace, adapt them. If not, write them fresh following section 16. Real ad and purchase plugins are wired in the **last** milestone; before that use the mock services.
8. The finished game must satisfy the **Definition of Done** (section 20).

---

## 1. Vision and pillars

**Fantasy:** watch a busy, living mountain that you built, and always have a clear next thing to upgrade.

**Pillars**
1. **Real people.** Every guest is an individual sprite with a state. Guests visibly queue, ride, ski, get angry and leave.
2. **Pay per ride.** A guest pays each time they board a lift, not once per visit.
3. **Visible bottleneck.** The game always shows what limits income: people, lift throughput, or terrain.
4. **Fast start, long tail.** First purchase within 5 seconds, first big unlock within 5 minutes, full mountain in about 60 to 80 hours of optimal play.
5. **Everything in code.** Config-driven data, pure-TS core, art drawn at runtime.

**Session feel:** open the app, collect offline earnings, spend, watch the mountain fill, close. A few minutes per session.

---

## 2. Locked decisions (all previously open questions)

| Topic | Decision |
|---|---|
| Platform | Phone, **portrait only**. Web first, wrapped with Capacitor (iOS + Android). |
| Start state | $10, 8 parking spaces, 0 housing, Bunny Hill owned, **1 button lift** (tier 1, level 0). |
| Guest types | Skier and Snowboarder, **50/50**, fixed for the whole game. |
| Guest preference | Snowboarders favour the Park, skiers favour Slalom (multipliers in section 10). |
| Lift tier 6 | **8-seat chair** (2, 4, 6, 8). |
| "12-cabin" etc. | Means **people per departure** (capacity). All tiers use the same capacity meaning. |
| Upgrade levels | Every lift has levels 0 to 10 within its tier. |
| Tier gates | Next tier needs current tier at **level >= 3**. The two **gates** (T2 to T3, T6 to T7) need **level >= 8** and cost a lot more. |
| New lift lines | Can be built at **any tier up to the highest tier you have reached** (pays slot cost + tier cost). |
| Gondola specialty | Longest ride time, and **only gondolas can be built in "gondola-only" slots** (Glacier). |
| Parking | 8 to 100 spaces, 30 levels. Day visitors. |
| Housing | 0 to 50 beds, 20 levels. Overnight guests: stay 3 sessions, pay **1.25x** ticket price. |
| Max population | 150 (100 + 50) plus 40 ski bus = 190. Hard cap 200 sprites. All guests are drawn. |
| Patience | About 50 s in a queue or lobby. Then the guest walks to the car and leaves angry. No penalty besides lost rides. |
| Park | **One park with 3 stages**: (1) rails and small jumps, (2) big jumps, (3) half-pipe. |
| Restaurants and bars | **Pure passive income** (earn on their own). Guests only visit them cosmetically. |
| Ski bus | +40 guests as a wave that **leaves after their session**. Ignores parking cap. Cooldown 90 s, max 12 per day. Costs a rewarded ad or 12 gems. |
| Prestige | **New Season** reset. Keeps gems, quests, settings. Grants permanent income bonus (Season Points). |
| Offline earnings | 50% of recent income, max 8 hours. Optional rewarded ad to double. |
| Skills trees, reputation | **Not in v1** (out of scope). |
| Monetization | Rewarded ads, gems, 3 gem packs, 1 permanent "Double Income" purchase. All behind mock services until the last milestone. |

---

## 3. World and map

Portrait world, **1200 x 3200 world units**. The camera pans vertically (pinch zoom 0.6x to 1.6x, default fits width). Base village is at the bottom, the peak at the top.

| Band (y from top) | Content |
|---|---|
| 0 to 500 | **Glacier** (area 5) |
| 500 to 560 | **Canyon gap** (only gondolas cross visually; cable drawn over it) |
| 560 to 1100 | **High Peaks** (area 4) |
| 1100 to 1800 | **Mid Mountain** (area 3) |
| 1800 to 2500 | **Lower Slopes** (area 2) |
| 2500 to 2900 | **Bunny Hill** (area 1) |
| 2900 to 3200 | **Base village**: parking lot left, lodge right, road along the bottom, bus stop in the middle |

Fixed points:
- `PARKING_POS = {x:180, y:3070}`, `LODGE_POS = {x:1020, y:3070}`, `BUS_STOP = {x:600, y:3150}`, `ROAD_START = {x:-40, y:3150}`.
- Area hub (where guests gather at the bottom of an area): `hub(area) = {x:600, y: band.bottom - 30}`.
- Lift slot geometry: for an area with `n` slots, slot `i` has base x = `1200 * (i+1)/(n+1)`, base y = `band.bottom - 40`, top y = `band.top + 40`, top x = base x + (i even ? -60 : +60).
- Locked (unowned) areas are drawn dimmed with a "For sale" sign and price badge.
- Piste: a lighter snow strip beside each built lift. Guests ski along a quadratic curve from top to hub.

Walk times (used by core): `walkSpeed = 70 units/s`. Arriving from the road to hub 0 takes 8 s. Moving between hubs takes `10 s * |area difference|`. Walking from hub to a lift base takes 4 s. Walking home from area `a` takes `6 + 6*a` s.

---

## 4. Core loop

```
Guests arrive (parking / lodge / bus)
   -> walk to a lift, join queue (or wait in lobby)
   -> board lift: PAY ticket price
   -> ride up (ride time)
   -> ski down (ski time)
   -> choose: ride again | visit pay zone | go home / rest
Money -> upgrades -> more people, faster lifts, more terrain
```

Income is limited by three things and the player chases the tightest:

| Limit | Fixed by |
|---|---|
| People on the mountain | Parking, Housing, ski bus |
| Lift throughput | Lift tier and level, more lift lines |
| Terrain | Mountain areas and lift slots |

---

## 5. Guests

```ts
type GuestKind  = 'ski' | 'board';
type GuestHome  = 'day' | 'lodge' | 'bus';
type GuestState = 'arriving' | 'walkingToLift' | 'lobby' | 'queueing' | 'riding'
                | 'skiing' | 'choosing' | 'walkingToZone' | 'inZone' | 'eating'
                | 'resting' | 'leaving';

interface Guest {
  id: number; kind: GuestKind; home: GuestHome; state: GuestState;
  area: number;            // area index of the hub the guest is at (0..4)
  lineId?: string; zoneId?: string;
  timer: number;           // seconds left in current timed state
  waited: number;          // seconds waiting for the current ride attempt
  patience: number;        // seconds, 50 * (0.8 + rand*0.4)
  ridesDone: number; ridesTarget: number;
  sessionsLeft: number;    // lodge guests only (starts 3)
  zoneSinceRide: boolean;  // limits to 1 zone visit per ride
  angry: boolean;          // true while leaving because of patience
}
```

### 5.1 Arrival
- Every `ARRIVAL_INTERVAL = 2.5 s`: if `dayGuests < parkingCapacity` and total guests `< 200`, spawn a **day guest** (kind random 50/50) at `ROAD_START`, state `arriving` (8 s walk to hub 0). The parking spot is used from spawn until the guest finishes `leaving`.
- Every `LODGE_INTERVAL = 5 s`: if `lodgeGuests < housingCapacity`, spawn a **lodge guest** at the lodge (check-in), `sessionsLeft = 3`.
- Ski bus guests spawn from the bus stop, see section 11.

### 5.2 Ride targets
- Day guest: `ridesTarget = randInt(6, 9)`.
- Bus guest: `ridesTarget = 8`.
- Lodge guest: `ridesTarget = randInt(7, 10)` **per session**, 3 sessions. Between sessions: `resting` in the lodge for 30 s, `ridesDone = 0`. After the 3rd session: check out (walk home), bed frees when they finish leaving.

### 5.3 Choosing a lift
```
candidates = built lines with queue.length < line.queueCap
score(line) = expectedWait(line) + walkBetweenHubs(g.area, line.area) + rand(0, 3)
expectedWait(line) = ceil((queue.length + 1) / line.capacity) * line.interval    // seconds
choose the minimum score
if no candidates -> state 'lobby' (retry every 1 s, waited keeps counting)
```
Only lines in **owned areas** exist. After choosing: `walkingToLift` (walk time), then join the queue.

### 5.4 Patience
`waited` counts up while in `lobby` or `queueing`. If `waited > patience`: leave the queue, `angry = true`, state `leaving` (walk home), `stats.angryLeaves++`. It is reset to 0 when the guest boards. **Angry guests never pay for the ride they gave up on.** No other penalty.

### 5.5 Riding and paying
On boarding (see section 13): `money += ticketPrice(line) * homeFactor * incomeMult` where `homeFactor = 1.25` for lodge guests, else 1. State `riding`, `timer = rideTime(line)`. When it ends: `area = line.area`, `ridesDone++`, `stats.ridesTotal++`, state `skiing`, `timer = skiTime(area) * rand(0.85, 1.15)`. Then `choosing`.

### 5.6 Choosing what next (`choosing`)
1. If `ridesDone >= ridesTarget`: day/bus guest -> `leaving`; lodge guest -> `resting` (or checkout after session 3).
2. Else, if `!zoneSinceRide`: roll once. For each owned zone with free capacity, `p_zone = zone.baseP * preference(kind, zone)`. Cumulative pick. If picked -> `walkingToZone` (5 s), then `inZone` (see section 10), `zoneSinceRide = true`.
3. Else with probability 0.25 and at least one building owned: `eating` (cosmetic, 6 s at the nearest owned building, no money).
4. Else choose a lift (5.3).
`zoneSinceRide` resets to false on each boarding.

### 5.7 Looks
- Skier: 2 thin skis + poles, body colour from palette. Snowboarder: single board, no poles, colour from a different palette.
- Sprite height about 22 world units. Six jacket colours per kind, random per guest.
- Angry guests show a small red frown badge above them while `leaving`.

---

## 6. Lifts

### 6.1 Tier table (`src/config/lifts.ts`)

```ts
export const LIFT_TIERS = [
  // tier, id,       name,               family,  capacity, interval(s), rideBase(s), price($), tierCost($), levelBase($)
  { tier: 1,  id: 'button',  name: 'Button Lift',       family: 'drag',    capacity: 1,  interval: 6, rideBase: 12, price: 5,    tierCost: 0,          levelBase: 8 },
  { tier: 2,  id: 'tbar',    name: 'T-Bar',             family: 'drag',    capacity: 2,  interval: 6, rideBase: 12, price: 8,    tierCost: 250,        levelBase: 12 },
  // ---- GATE 1: drag -> chair (T2 must be level >= 8) ----
  { tier: 3,  id: 'chair2',  name: 'Chair Lift 2',      family: 'chair',   capacity: 2,  interval: 5, rideBase: 18, price: 20,   tierCost: 1200,       levelBase: 60 },
  { tier: 4,  id: 'chair4',  name: 'Chair Lift 4',      family: 'chair',   capacity: 4,  interval: 5, rideBase: 18, price: 30,   tierCost: 5000,       levelBase: 250 },
  { tier: 5,  id: 'chair6',  name: 'Chair Lift 6',      family: 'chair',   capacity: 6,  interval: 5, rideBase: 18, price: 60,   tierCost: 21000,      levelBase: 1050 },
  { tier: 6,  id: 'chair8',  name: 'Chair Lift 8',      family: 'chair',   capacity: 8,  interval: 5, rideBase: 18, price: 125,  tierCost: 90000,      levelBase: 4500 },
  // ---- GATE 2: chair -> gondola (T6 must be level >= 8) ----
  { tier: 7,  id: 'gond12',  name: 'Gondola 12',        family: 'gondola', capacity: 12, interval: 6, rideBase: 26, price: 280,  tierCost: 600000,     levelBase: 30000 },
  { tier: 8,  id: 'gond16',  name: 'Gondola 16',        family: 'gondola', capacity: 16, interval: 6, rideBase: 26, price: 600,  tierCost: 2500000,    levelBase: 125000 },
  { tier: 9,  id: 'gond20',  name: 'Gondola 20',        family: 'gondola', capacity: 20, interval: 6, rideBase: 26, price: 1350, tierCost: 11000000,   levelBase: 550000 },
  { tier: 10, id: 'gond24',  name: 'Gondola 24',        family: 'gondola', capacity: 24, interval: 6, rideBase: 26, price: 3200, tierCost: 45000000,   levelBase: 2250000 },
] as const;

export const LEVEL_MAX = 10;
export const LEVEL_EFFECT = { pricePerLevel: 0.10, intervalPerLevel: 0.025 };
export const LEVEL_COST_GROWTH = 1.28;
export const GATE_TIERS = [2, 6];          // rebuilding FROM these tiers is a gate
export const REQ_LEVEL_NORMAL = 3;
export const REQ_LEVEL_GATE = 8;
export const QUEUE_CAP = (tier: number) => 6 + 6 * tier;   // T1 = 12 ... T10 = 66
```

### 6.2 Formulas
```
ticketPrice(line)   = price * (1 + 0.10 * level)
interval(line)      = interval * (1 - 0.025 * level)               // seconds between departures
rideTime(line)      = rideBase * area.liftLenMul                    // seconds
throughput(line)    = capacity / interval(line)                     // people per second
levelUpgradeCost(t, L) = levelBase * 1.28 ^ L                       // cost to go from level L to L+1 (L = 0..9)
rebuildCost(t -> t+1)  = tierCost[t+1]
newLineCost(slot, t)   = slot.cost + tierCost[t]
```
Tier 1 levels use `levelBase = 8`. A rebuild resets the line to `level = 0` of the new tier.

**Design invariant (must hold and be tested):** base saturated income of tier `t+1` >= max-level saturated income of tier `t`, where saturated income = `throughput * ticketPrice`. (The starting numbers satisfy this; if tuning changes prices, keep it true.)

### 6.3 Upgrade and gate rules
- **Level up:** `level < 10`, cost as above.
- **Rebuild to next tier:** current `level >= 3` (or `>= 8` if the current tier is in `GATE_TIERS`), pay `tierCost[next]`, and next tier must not be `> 10`. Rebuild raises `unlockedTier = max(unlockedTier, next)`.
- **Build new line in an empty slot:** choose any tier `<= unlockedTier`. Gondola-only slots require `tier >= 7`. Pay `slot.cost + tierCost[tier]`.
- Building a line also needs the **area to be owned**.

### 6.4 Gondolas
Same logic as other tiers, plus: longest ride time (26 base), the only lifts allowed in gondola-only slots, and their cables are drawn across the canyon on the Glacier connection.

### 6.5 Carriers (visual)
Every departure spawns a visual **carrier** moving base -> top over `rideTime`: a small dot (button), a T shape (T-bar), a chair (chairs), a cabin (gondola). Passengers are drawn as tiny dots on the carrier (up to capacity). Riding guests are **hidden** as individual sprites while on the carrier. Core exposes `line.departures: {t0, n, rideTime}[]` for the view (keep only the last 30 s).

---

## 7. Parking and housing (population capacity)

```ts
// src/config/capacity.ts
export const PARKING = { levelMax: 30, base: 8, perLevelTotal: 92, costBase: 25, costGrowth: 1.5 };
// capacity(L) = 8 + round(L * 92 / 30);   cost(L -> L+1) = 25 * 1.5^L
export const HOUSING = { levelMax: 20, base: 0, perLevelTotal: 50, costBase: 3000, costGrowth: 1.42, requiresArea: 'lower' };
// capacity(L) = round(L * 50 / 20);        cost(L -> L+1) = 3000 * 1.42^L
export const ARRIVAL_INTERVAL = 2.5, LODGE_INTERVAL = 5, HARD_CAP = 200;
```
- Both are repeatable upgrade tracks. Housing needs Lower Slopes owned.
- Parking holds day guests and bus guests are exempt. Lodge guests use beds.
- **Feedback rule:** when the player buys capacity faster than lifts, queues grow and guests leave angry. This is intended and shown by the bottleneck hint (section 14.6).

---

## 8. Mountain areas

```ts
// src/config/areas.ts
export const AREAS = [
  { id: 'bunny',   name: 'Bunny Hill',    cost: 0,        band: [2500, 2900], skiTime: 20, liftLenMul: 1.0,  slots: [ {cost:0, type:'any'}, {cost:120, type:'any'} ] },
  { id: 'lower',   name: 'Lower Slopes',  cost: 1500,     band: [1800, 2500], skiTime: 26, liftLenMul: 1.1,  slots: [ {cost:0,type:'any'}, {cost:4000,type:'any'}, {cost:12000,type:'any'} ] },
  { id: 'mid',     name: 'Mid Mountain',  cost: 20000,    band: [1100, 1800], skiTime: 32, liftLenMul: 1.25, slots: [ {cost:0,type:'any'}, {cost:60000,type:'any'}, {cost:180000,type:'any'} ] },
  { id: 'peaks',   name: 'High Peaks',    cost: 400000,   band: [560, 1100],  skiTime: 40, liftLenMul: 1.4,  slots: [ {cost:0,type:'any'}, {cost:1500000,type:'any'}, {cost:4000000,type:'any'} ] },
  { id: 'glacier', name: 'Glacier',       cost: 20000000, band: [0, 500],     skiTime: 50, liftLenMul: 1.7,  slots: [ {cost:0,type:'gondolaOnly'}, {cost:60000000,type:'gondolaOnly'} ] },
] as const;
```
- Areas must be bought **in order** (each needs the previous one owned).
- The first slot of an area is included with the area purchase (slot cost 0). You still pay the tier cost to build a lift there.
- Total: 13 lift lines.
- Areas also gate: housing (Lower), buildings and zones (see sections 9 and 10).

---

## 9. Passive income: restaurants and bars

```ts
// src/config/facilities.ts
export const BUILDINGS = [
  { id: 'snack',    name: 'Snack Hut',           requiresArea: 'lower',   cost: 3000,     baseIncome: 0.6,  pos: {x:1000,y:2250} },
  { id: 'mountain', name: 'Mountain Restaurant', requiresArea: 'mid',     cost: 40000,    baseIncome: 6,    pos: {x:1000,y:1500} },
  { id: 'apres',    name: 'Apres-Ski Bar',       requiresArea: 'peaks',   cost: 600000,   baseIncome: 60,   pos: {x:1000,y:850}, lodgeBonus: 1.0 },
  { id: 'lodge',    name: 'Lodge Restaurant',    requiresArea: 'glacier', cost: 15000000, baseIncome: 900,  pos: {x:1000,y:250}, lodgeBonus: 0.5 },
] as const;
export const BUILDING_LEVEL_MAX = 10;
// level L (1..10) income multiplier = 1 + 0.4 * (L - 1)
// upgrade cost from L to L+1 = 0.5 * cost * 1.45^(L - 1)
```

**Income per second** (before global multiplier):
```
income = baseIncome * (1 + 0.4 * (L - 1)) * (0.5 + 0.5 * pop / maxPop) * (1 + lodgeBonus * lodgeOccupancy)
pop = current guests, maxPop = parking + housing, lodgeOccupancy = lodgeGuests / max(1, housingCapacity)
lodgeBonus defaults to 0 for buildings without it.
```
Buying a building sets level 1. Guests visiting buildings is cosmetic only.

---

## 10. Pay-to-enter zones

```ts
// src/config/zones.ts
export const ZONES = [
  { id: 'kids',     name: "Kids' Park",   requiresArea: 'lower', cost: 5000,     fee: 3,   capacity: 8,  stay: 20, baseP: 0.10, pos:{x:180,y:2150} },
  { id: 'park',     name: 'Terrain Park', requiresArea: 'mid',   cost: 60000,    fee: 6,   capacity: 10, stay: 18, baseP: 0.18, pos:{x:200,y:1450},
    stages: [
      { name: 'Rails and Small Jumps', cost: 60000,   fee: 6,  capacity: 10 },
      { name: 'Big Jumps',             cost: 150000,  fee: 15, capacity: 14 },   // needs stage 1 level >= 5
      { name: 'Half-Pipe',             cost: 2000000, fee: 40, capacity: 18 },   // needs stage 2 level >= 5
    ] },
  { id: 'slalom',   name: 'Slalom Course', requiresArea: 'mid',  cost: 90000,    fee: 10,  capacity: 12, stay: 18, baseP: 0.15, pos:{x:850,y:1250} },
  { id: 'offpiste', name: 'Off-Piste',     requiresArea: 'peaks', cost: 1200000,  fee: 45,  capacity: 8,  stay: 30, baseP: 0.08, pos:{x:200,y:800} },
] as const;

export const ZONE_PREFERENCE = {   // multiplier on baseP
  park:   { board: 1.8, ski: 0.6 },
  slalom: { board: 0.6, ski: 1.8 },
  kids: { board: 1, ski: 1 }, offpiste: { board: 1, ski: 1 },
};
export const ZONE_LEVEL_MAX = 10;
// level L (1..10): fee multiplier = 1 + 0.10*(L-1);  capacity bonus = floor((L-1)/3)
// upgrade cost L -> L+1 = 0.4 * baseCostOfCurrentStageOrZone * 1.5^(L-1)
```
- **Park stages:** buying the next stage replaces the current one (visuals change), level resets to 1, requires the previous stage at level >= 5.
- Entering a zone: guest pays `fee * feeMult * incomeMult`. Zone occupancy is limited by capacity (guests skip it if full). They stay `stay` seconds (state `inZone`), then `choosing` again.
- A zone is unlocked by buying it (needs its area owned).

---

## 11. Ski bus, gems, ads and shop

### 11.1 Ski bus
- Trigger: player taps the **Ski Bus** button (in the Shop tab and as a floating button on the map when available). It costs **one rewarded ad** or **12 gems**.
- Effect: a bus animates in from the left to `BUS_STOP` and 40 bus guests (20 ski, 20 board) spawn over 10 s. They ignore the parking limit but total guests never exceeds 200 (if it would, spawn fewer). They have `ridesTarget = 8` and leave after their session (they never re-arrive).
- Limits: cooldown **90 s** after use, max **12 uses per local calendar day**. The button shows the cooldown timer.

### 11.2 Gems
Soft premium currency. Earned from quests (section 12.1), sold in packs. Spent on:
| Item | Gems |
|---|---|
| Ski Bus (instead of ad) | 12 |
| Cash bundle = 30 minutes of current income (min $100) | 25 |

### 11.3 Rewarded ad rules
- Ski bus (11.1).
- Offline earnings double (12.2) if `OFFLINE.adDouble` is true in config (default true).
- All ad calls go through `AdsService` (`src/ads.ts`): `isReady()`, `showRewarded(): Promise<boolean>`. Web/dev implementation is a mock that waits 1.5 s and returns true.
- Android and iOS use **Google's public test rewarded unit IDs** in `src/config/ads.ts` with a `LIVE` flag (default false):
  - Android: `ca-app-pub-3940256099942544/5224354917`
  - iOS: `ca-app-pub-3940256099942544/1712485313`
  - Live IDs are placeholders `REPLACE_ME`; switching `LIVE` requires them.

### 11.4 In-app purchases (`src/purchases.ts`, mock on web)
| Product id | Type | Grants |
|---|---|---|
| `gems_small` | consumable | 100 gems |
| `gems_medium` | consumable | 550 gems |
| `gems_large` | consumable | 1200 gems |
| `income_x2` | non-consumable | permanent 2x income |
Fallback display prices: 1.99, 8.99, 16.99, 7.99. Include "Restore purchases" in the menu.

---

## 12. Progression systems

### 12.1 Quests (`src/config/quests.ts`, `src/core/quests.ts`)
A sequential chain. **Three quests are active at once**; completing one reveals the next. Rewards are collected with a tap. `cash(m, floor)` means `max(floor, m minutes of current income)`.

| # | Quest | Condition | Reward |
|---|---|---|---|
| 1 | Warm up | Any lift at level 3 | cash(1, 20) |
| 2 | More cars | Parking level 2 | cash(1, 30) |
| 3 | T-Bar time | Any lift tier 2 | 3 gems |
| 4 | Parking lot | Parking capacity >= 20 | cash(2, 50) |
| 5 | Busy day | 100 guests served (`guestsServed`) | 3 gems |
| 6 | Lower Slopes | Own Lower Slopes | 5 gems |
| 7 | Second line | 2 lift lines in Lower Slopes | cash(3, 200) |
| 8 | Sleepover | Housing level 1 | 5 gems |
| 9 | Chair up | Any lift tier >= 3 | 5 gems |
| 10 | Snack time | Own Snack Hut | cash(5, 500) |
| 11 | For the kids | Own Kids' Park | 5 gems |
| 12 | Four seats | Any lift tier >= 4 | 8 gems |
| 13 | Six figures | Lifetime earned $100,000 | 8 gems |
| 14 | Mid Mountain | Own Mid Mountain | 10 gems |
| 15 | Park life | Terrain Park stage 1 | cash(5, 2000) |
| 16 | Big chair | Any lift tier >= 6 | 10 gems |
| 17 | Slalom | Own Slalom Course | 10 gems |
| 18 | High Peaks | Own High Peaks | 15 gems |
| 19 | Big resort | Parking + housing capacity >= 100 | 15 gems |
| 20 | First gondola | Any lift tier >= 7 | 20 gems |
| 21 | Apres | Own Apres-Ski Bar | 15 gems |
| 22 | Half-pipe | Terrain Park stage 3 | 20 gems |
| 23 | Glacier | Own Glacier | 30 gems |
| 24 | Top tier | Any lift tier 10 | 40 gems |
| 25 | Billionaire | Lifetime earned $1,000,000,000 | 50 gems |
| 26 | New Season | Do a New Season (prestige) once | 50 gems |

### 12.2 Offline earnings
- The state stores `incomeEma` (exponential moving average of income per second, time constant 120 s of simulated time).
- On load, and when the tab becomes visible again after more than 30 s: `away = min(now - lastSeen, 8 h)`; `earned = incomeEma * 0.5 * away`. If `lastSeen` is in the future, earn nothing.
- Show a **Welcome back** dialog with the amount and a Collect button. If `OFFLINE.adDouble`, also a "Double it" button (rewarded ad).
- Offline never buys things and never simulates guests. Guests are respawned gradually after loading.

### 12.3 Prestige: New Season
- Available when **all 5 areas are owned** and the player would gain at least 5 Season Points.
- `totalSP = floor(10 * sqrt(lifetimeEarned / 1e9))`; gain = `totalSP - currentSP`.
- **Income bonus** `seasonBonus = 1 + 0.05 * totalSP` (applies to all money income).
- Reset: money ($10), lifts, areas, parking, housing, buildings, zones, unlockedTier, guests, `earnedThisSeason`. **Keep:** gems, quests progress, Season Points, `lifetimeEarned`, settings, purchases, tutorial flag.
- Confirmation dialog shows the SP gain and the new bonus. Increment `season`.

### 12.4 Tutorial (`state.tutorial.step`)
Scripted highlights, each with a short toast and a pulsing ring on the target:
1. "Tap the lift to upgrade it." Ends when any lift level >= 1.
2. "Guests pay for every ride. Upgrade again." Ends when level >= 3.
3. "More parking means more guests." (highlight People tab) Ends when parking level >= 1.
4. "Rebuild your button lift into a T-Bar." Ends when tier >= 2.
5. First angry leave ever: toast "Guests give up when queues are long. Upgrade your lift."
6. When Lower Slopes is affordable: highlight Mountain tab, "Open more mountain."
7. Done (`tutorial.done = true`).

---

## 13. Simulation spec (`src/core`)

### 13.1 Time
- Fixed step `SIM_STEP = 0.1 s`. `game.advance(realDt)` accumulates and runs steps. Clamp per-frame `realDt` to 0.5 s. Never more than 20 steps per frame.
- Guests are simulated as light data. The scene reads them each frame and interpolates positions.

### 13.2 Tick order
```
step(dt):
  time += dt
  spawnArrivals(dt)               // day, lodge, bus queue
  for line in lines: lineTick(line, dt)
  for guest in guests: guestTick(guest, dt)
  buildingsTick(dt)               // passive income
  updateIncomeEma(dt)
  quests check (once per second)
  remove finished guests, free parking/beds
```

### 13.3 Line tick
```
line.timer -= dt
if line.queue.length > 0 and line.timer <= 0:
    n = min(line.capacity, line.queue.length)
    board n guests (FIFO): each pays ticketPrice * homeFactor * incomeMult
    line.timer = interval(line)
    push departure {t0: time, n, rideTime}
else if line.queue.length == 0: line.timer = max(line.timer, 0)
```
Income is credited to `money`, `lifetimeEarned`, `earnedThisSeason` and to per-source stats (`rides`, `zones`, `buildings`).

### 13.4 Analytic income estimate (used by the bot and quest rewards)
`estimateIncomePerSecond(state)`:
```
N       = min(parking + housing, HARD_CAP) * 0.9        // typical fill
S_i     = capacity_i / interval_i                        // per line
S       = sum(S_i)
cycle   = 8 + avgRideTime + avgSkiTime                   // avg weighted by S_i, walk approx 8
D       = N / cycle                                      // demand in rides per second
rides   = min(D, S)
pAvg    = sum(S_i * ticketPrice_i) / S                   // weighted average price
lodgeF  = 1 + 0.25 * housing / max(1, parking + housing)
income  = rides * pAvg * lodgeF
zones   = sum over owned zones of min( rides * pVisit_z * fee_z, capacity_z / stay_z * fee_z )
buildings = sum of section 9 formula using pop = N
total   = (income + zones + buildings) * incomeMult
```
Cross-check test: the estimate must be within **25%** of the measured income of the full simulation after 10 simulated minutes, for at least 5 hand-built states across early, mid, late game.

### 13.5 Core API (exports)
```
newGame(): GameState              ensureState(s)                 
advance(state, dt)                 
canBuy*/buy*: buyLiftLevel(lineId, n|'max'), rebuildLine(lineId), buildLine(areaId, slotIdx, tier),
              buyArea(areaId), buyParkingLevel(n|'max'), buyHousingLevel(n|'max'),
              buyBuilding(id), upgradeBuilding(id, n|'max'), buyZone(id), upgradeZone(id, n|'max'), nextParkStage()
callSkiBus(state, payWith: 'ad'|'gems'): Result
claimQuest(id), claimOffline(double: boolean), startNewSeason()
nextGoal(state): {label, cost, kind}     // cheapest sensible next purchase, used by UI hint
bottleneck(state): 'lifts' | 'people' | 'balanced'
```
All buy functions return `{ok:true} | {ok:false, reason}` and never mutate on failure.

### 13.6 State shape (persisted subset marked P)
```ts
interface GameState {
  version: number;                                   // P (save schema version, start at 1)
  money: number; gems: number;                       // P
  lifetimeEarned: number; earnedThisSeason: number;  // P
  season: number; seasonPoints: number;              // P
  parkingLevel: number; housingLevel: number;        // P
  areasOwned: string[];                              // P  ('bunny' always)
  lines: { id: string; areaId: string; slot: number; tier: number; level: number }[]; // P
  unlockedTier: number;                              // P
  buildings: Record<string, number>;                 // P  level (0 = not owned)
  zones: Record<string, { owned: boolean; level: number; stage?: number }>; // P
  quests: { doneIds: string[]; claimedIds: string[]; progress: Record<string, number> }; // P
  stats: { ridesTotal: number; guestsServed: number; angryLeaves: number; angryRecent: number[] }; // P (angryRecent: ring buffer)
  ads: { busCount: number; dayKey: string; busCooldownUntil: number };  // P
  purchases: { incomeX2: boolean };                  // P
  settings: { sound: boolean; haptics: boolean };    // P
  tutorial: { step: number; done: boolean };         // P
  incomeEma: number; lastSeen: number;               // P
  // runtime only (not saved): guests, line queues, timers, time, spawn timers, busPending
}
```

---

## 14. UI spec

Map = Phaser WebGL canvas. UI = **HTML/CSS overlay** on top (`#ui`), custom inline SVG icons (`src/ui/icons.ts`). Portrait only, safe-area insets respected. Minimum tap target 44 px.

### 14.1 Layout
- **Top bar:** money (large), gems, population `current / max` with a small mood face (green/yellow/red), and a gear button (menu).
- **Quests strip** under the top bar: the 3 active quests as compact chips (progress bar + reward). A completed one pulses and collects on tap.
- **Map:** full screen behind. Pan with drag, pinch to zoom, wheel on desktop.
- **Bottom bar (6 tabs):** Lifts, People, Mountain, Buildings, Zones, Shop. Tabs open a **bottom sheet** (drag handle, max 70% height). A red dot appears on a tab when something is affordable and useful.
- **Floating:** Ski Bus button (bottom right, above bar) when available, buy multiplier toggle (x1, x10, Max) inside sheets.

### 14.2 Lifts sheet
List of all lines grouped by area, plus empty slots. A line row shows: name, tier, level dots (10), people per ride, seconds between rides, price per ride, live income/s (measured over 10 s), queue `n / cap`. Buttons:
- **Upgrade** level (cost, honours x1/x10/Max).
- **Rebuild to <next lift>** (cost) with a lock line if the level requirement is not met: "Needs level 3 (or 8 at a gate)" and a progress bar.
- Empty slot: **Build** -> tier picker (only tiers <= `unlockedTier`, gondola-only slots show only tier >= 7) with costs.
Tapping a lift on the map opens this sheet scrolled to that line.

### 14.3 People sheet
Two cards: Parking and Housing (level, capacity now -> next, cost, buy/x10/Max). Housing shows a lock note until Lower Slopes is owned. Card shows current guests vs capacity.

### 14.4 Mountain sheet
Five area cards: name, status (Owned / Next / Locked), price, number of lift slots, what it unlocks. Only the next area is purchasable.

### 14.5 Buildings and Zones sheets
Cards with name, cost or level, income/s (buildings) or fee and capacity (zones), unlock requirement ("Needs Mid Mountain"), buy and upgrade buttons. Park card shows its 3 stages with a "Next stage" button.

### 14.6 Bottleneck hint (top of each sheet, one line)
```
if angryRecent (last 60 s) >= 2 or avgQueueFill > 0.6  -> "Queues are long. Upgrade your lifts."
else if lift utilisation < 0.5 and population < capacity -> "Lifts are idle. Wait for guests or add parking."   // when population is below cap
else if lift utilisation < 0.5 and population >= capacity   -> "Lifts are idle. Add parking or housing."
else                                                         -> "Looking good."
```
Also `nextGoal(state)` drives a small "Next: ..." label above the bottom bar.

### 14.7 Shop sheet
- Ski Bus card (ad button, gems button, cooldown, daily count).
- Cash bundle (25 gems).
- Gem packs and Double Income with store prices (fallback prices when unavailable), Restore purchases.

### 14.8 Menu
Settings (sound, haptics), Help (6 short how-to cards), Legal (Terms, Privacy, Credits generated from `src/config/legal.ts` with a `PUBLISHER` block of placeholders), New Season (if available), Reset save (two-step confirm), version.

### 14.9 Feedback and juice
- Floating `+$` text on every ride payment (pooled, throttled to at most 30 per second on screen, aggregate when over).
- Coin pop in the top bar on income. Buttons scale on press. Purchase = short confetti burst.
- Numbers formatted `1.23K, 4.5M, 6.7B, 8.9T, 1.2Qa, 3.4Qi`, then scientific.
- Haptic tick on purchase (Capacitor Haptics, guarded).

### 14.10 Design tokens (`styles.css`)
```
--snow #F4F8FB   --ice #DCEAF5   --shadow #C2D3E3   --pine #2F6B4F   --rock #6D7A8C
--sky #8FC4E8    --accent #FF6B3D  --accent2 #2E86DE  --gold #F2B705   --danger #D64545
--text #1E2A38   --panel #FFFFFFEE  radius 16px  font: system-ui, 600 for headings
```

---

## 15. Art and audio (all drawn in code)

- **Textures** baked at startup with the 2D canvas API into Phaser textures (`src/scene/art.ts`): snow tile, pines (3 sizes), rocks, lift towers, carriers (dot, T, chair, cabin), station houses, parking cars (4 colours), lodge, buildings (4), zone props (kids' fence, rail, jumps, half-pipe, slalom gates, off-piste flags), guest sprites (ski and board, 6 colours each, 2 frames), bus, frown badge, "For sale" sign.
- Layers (back to front): sky, mountain snow fills per area, canyon, pistes, decoration, buildings and zones, lift cables and towers, carriers, guests, effects, world labels.
- Locked areas: multiply-tint dark and add a lock plate.
- Day/night not required. Light snowfall particle effect (cheap, capped at 60 particles).
- **Guests:** simple 2-frame walk/ski bob, moved by interpolation along paths (walk line, ski curve). No per-frame tweens.
- **Performance budget:** 60 fps on a mid Android phone with 190 guests. Pool all sprites. Hide off-screen sprites. Use one texture atlas per category.
- **Audio** (WebAudio, synthesized, no files): coin blip (throttled to 8 per second), purchase chime, error buzz, bus horn, unlock fanfare (3 notes), UI tap. Master toggle in settings.

---

## 16. Technology and repo

Stack: **Phaser 4 (4.2.x)**, **TypeScript**, **Vite**, **npm**, **Vitest**, **Playwright**, **Capacitor** (iOS and Android projects, no publishing). Canvas rendered at device pixel ratio (max 2), `Scale.NONE`, `render.maxTextures: 8`. Layout in page pixels.

```
index.html                 #app > #game (canvas), #ui (overlay), #splash
src/main.ts                Phaser game, resize observer
src/styles.css             all CSS
src/ads.ts                 AdsService (mock on web, AdMob on device)
src/purchases.ts           PurchasesService (mock on web, store on device)
src/config/
  layout.ts                world size, zoom limits, fixed points, walk times
  areas.ts lifts.ts capacity.ts facilities.ts zones.ts
  quests.ts balance.ts     START, SIM, OFFLINE, SEASON, BUS constants
  ads.ts shop.ts legal.ts
src/core/                  (NO Phaser imports)
  state.ts economy.ts guests.ts lifts.ts unlocks.ts quests.ts
  season.ts save.ts game.ts bot.ts
src/scene/
  MapScene.ts MapView.ts background.ts art.ts
  liftView.ts guestView.ts zoneView.ts buildingView.ts busView.ts fx.ts
src/ui/
  ui.ts liftSheet.ts peopleSheet.ts mountainSheet.ts buildingSheet.ts zoneSheet.ts shopSheet.ts
  menu.ts quests.ts tutorial.ts icons.ts format.ts sound.ts
tests/                     unit tests + full playthrough test
scripts/                   simulate.ts, screenshots.mjs, smoke.mjs, design-tables.ts, make-icons.mjs
public/                    icons, manifest, generated privacy.html and terms.html
docs/                      concept.md (this file), decisions.md
android/ ios/              Capacitor native projects
```

`package.json` scripts: `dev`, `build` (`tsc --noEmit && vite build`), `typecheck`, `test` (`vitest run`), `simulate` (`tsx scripts/simulate.ts`), `screenshots`, `smoke`, `cap:sync`.

**Save** (`src/core/save.ts`): localStorage key `skitycoon.save.v1`. JSON of the persisted subset with `version`. Autosave every 10 s, on `visibilitychange` (hidden), and on `pagehide`. `load()` validates and repairs (unknown ids dropped, numbers clamped, missing fields defaulted via `ensureState`). Write a `migrate(fromVersion)` stub. Guests and queues are not saved: on load, respawn `min(capacity, previousPopulation)` guests staggered over 10 s.

**Create `CLAUDE.md`** in the repo root (short): the rules from section 0 plus the commands above.

---

## 17. Balance targets and tuning procedure

### 17.1 Target timeline (optimal play, no offline, bot time)
| Milestone | Target | Tolerance |
|---|---|---|
| First lift upgrade | 5 s | -- |
| T-Bar built | 4 min | +/-35% |
| Parking level 5 | 6 min | +/-35% |
| Lower Slopes owned | 10 min | +/-35% |
| First chair (tier 3) | 20 min | +/-35% |
| Snack Hut owned | 25 min | +/-35% |
| Mid Mountain owned | 55 min | +/-35% |
| Tier 5 | 1.5 h | +/-35% |
| High Peaks owned | 4 h | +/-35% |
| First gondola (tier 7) | 6 h | +/-35% |
| Glacier owned | 14 h | +/-35% |
| First tier 10 | 30 h | +/-35% |
| Everything maxed (end of Season 1) | 60 to 80 h | -- |

A casual player who plays a few short sessions per day and collects offline earnings should reach the end of Season 1 in about 7 to 12 days.

### 17.2 Balance bot (`src/core/bot.ts`, `scripts/simulate.ts`)
- **Policy:** every simulated second, list all purchases available (level ups, rebuilds, new lines, parking, housing, areas, buildings, zones). For each compute `payback = cost / delta` where `delta` = increase in `estimateIncomePerSecond` after the purchase. For areas treat the purchase as a bundle with the cheapest useful line built after it. For rebuilds add the value of the next tier's future levels (use `1.5x delta`). Buy the affordable purchase with the lowest payback; if the lowest-payback item is not yet affordable but will be within 60 s, wait for it (do not buy a worse one that would delay it by more than 20%). Never buy parking/housing when lifts are the bottleneck by `bottleneck(state)`.
- **Modes:** `--fast` uses the analytic estimate to advance time (no guests, 0.5 s steps); `--full` runs the real simulation (use for the first 30 minutes and cross-checks). Print a timeline table of milestones with actual vs target and the deviation.
- Also report: total time to max, income/s checkpoints, angry leave counts (should be low in the first minutes, present when parking outruns lifts).

### 17.3 Tuning procedure (do this in milestone 2)
1. Run `npm run simulate -- --fast`.
2. For every milestone outside its tolerance, scale the responsible cost group by `factor = (actualTime / targetTime) ^ 0.8` **in the direction that fixes it** (too slow -> cheaper, too fast -> pricier). Cost groups: parking cost, housing cost, lift level costs, tier costs, area costs, slot costs, building costs, zone costs.
3. Repeat up to 12 iterations. Keep every rule in section 6.2 (design invariant) true. Keep all cost sequences monotonic increasing.
4. Save final numbers in `src/config/*`, write the resulting table to `docs/balance-report.md`.

### 17.4 Other tuning limits
- Income must never drop after a tier rebuild (test).
- The first 60 seconds: at least 4 purchases should be possible.
- `ARRIVAL_INTERVAL` and patience stay as specified unless the bot shows the early game breaks.

---

## 18. Testing

**Unit tests (Vitest)**
- Lift formulas: price, interval, throughput, level costs, gate levels (3 and 8).
- Design invariant: base saturated income of tier `t+1` >= max saturated income of tier `t`, for all tiers.
- Buy functions: failure never mutates, success deducts exact cost, `unlockedTier` rises only via gated rebuilds, gondola-only slots reject tiers below 7, areas must be bought in order.
- Guest state machine: arrival, patience (guest waiting longer than `patience` leaves angry and does not pay), lodge guest three sessions, bus guests leave and never re-arrive, zone capacity and one zone visit per ride, parking freed on leaving.
- Population caps: never exceeds 200, parking cap respected, lodge cap respected.
- Ski bus: cooldown 90 s, 12 per day, ad vs gems, spawns fewer near cap.
- Offline: 8 h cap, 50% rate, future `lastSeen` gives 0.
- Prestige: SP formula, bonus, what resets and what stays.
- Save: round trip, corrupt save is repaired, unknown ids dropped.
- Estimate vs full simulation within 25% for 5 states.
- Quest conditions and rewards.

**Playthrough test:** the balance bot plays the whole of Season 1 headless (fast mode) and asserts that all milestones are reached and every quest completes. A second run does New Season and asserts the bonus applies.

**Smoke test (Playwright):** page loads, canvas renders, the first lift upgrade works, opening each of the 6 sheets works, no console errors.

**Screenshots script:** 390x844 portrait at start, after 5 minutes, and late game, stored under `screenshots/`.

---

## 19. Milestones (each ends with typecheck + tests + commit)

| # | Milestone | Deliverable and acceptance |
|---|---|---|
| **M0** | Setup | Repo with Vite, TS, Phaser 4, Vitest, Playwright, scripts, `CLAUDE.md`, `docs/decisions.md`, empty config files. `npm run dev` shows a blank canvas. |
| **M1** | Core sim | `src/core` guests, lines, parking, patience, per-ride pay. No graphics. Unit tests pass. Headless run for 10 minutes shows money growing. |
| **M2** | Economy + bot + tuning | All lift tiers, gates, areas, capacity, buildings, zones, ski bus, prestige, offline in core. Analytic estimate. Balance bot and tuning procedure done. `docs/balance-report.md` shows milestones within tolerance. |
| **M3** | Map | Map scene with all art baked in code, areas, lifts with carriers, guests moving with all states, camera pan/zoom, locked areas. Playable with debug buy keys. 60 fps. |
| **M4** | UI | Top bar, bottom bar, all six sheets, quests strip, tutorial, bottleneck hint, formatting, juice, sounds. Full game loop playable in the browser. |
| **M5** | Meta | Save/load, autosave, offline dialog, quests with rewards, prestige dialog, menu (settings, help, legal), reset. |
| **M6** | Monetization | Ski bus button and flow with mock ads, gems, cash bundle, gem packs and Double Income (mock), restore purchases. |
| **M7** | Polish | Balance re-check, performance pass (190 guests at 60 fps), screenshots, smoke test green, accessibility (contrast, tap sizes). |
| **M8** | Native | Capacitor Android and iOS projects, icons, splash, AdMob and purchases plugins wired behind the services (test IDs, `LIVE=false`), `cap sync` works. No publishing. |

---

## 20. Definition of Done

- All milestones M0 to M8 complete; `npm run typecheck`, `npm test`, `npm run smoke` all pass.
- A new player can play from $10 to the end of Season 1 with no dead ends, and every UI action is reachable on a 390x844 portrait screen.
- Balance bot timeline is within tolerance; `docs/balance-report.md` is committed.
- No emoji, no image files in `src` or `public` except generated icons and manifest.
- `docs/decisions.md` lists every choice made where this spec was silent.

**Out of scope for v1** (do not build): skill trees, resort reputation, weather, extra sports, multiplayer, cloud saves, leaderboards, day/night cycle.
