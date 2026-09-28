export type QuestCond =
  | { t: 'liftLevel'; n: number }
  | { t: 'liftTier'; n: number }
  | { t: 'parkingLevel'; n: number }
  | { t: 'parkingCap'; n: number }
  | { t: 'peopleCap'; n: number }
  | { t: 'guestsServed'; n: number }
  | { t: 'area'; id: string }
  | { t: 'linesInArea'; id: string; n: number }
  | { t: 'housingLevel'; n: number }
  | { t: 'building'; id: string }
  | { t: 'zone'; id: string }
  | { t: 'parkStage'; n: number }
  | { t: 'lifetime'; n: number }
  | { t: 'season'; n: number };

export type QuestReward = { t: 'cash'; minutes: number; floor: number } | { t: 'gems'; n: number };
export interface QuestDef { id: string; name: string; desc: string; cond: QuestCond; reward: QuestReward }

const cash = (minutes: number, floor: number): QuestReward => ({ t: 'cash', minutes, floor });
const gems = (n: number): QuestReward => ({ t: 'gems', n });

export const QUESTS: QuestDef[] = [
  { id: 'q1',  name: 'Warm up',       desc: 'Get any lift to level 3',           cond: { t: 'liftLevel', n: 3 },                  reward: cash(1, 20) },
  { id: 'q2',  name: 'More cars',     desc: 'Parking level 2',                   cond: { t: 'parkingLevel', n: 2 },               reward: cash(1, 30) },
  { id: 'q3',  name: 'T-Bar time',    desc: 'Build any lift of tier 2',          cond: { t: 'liftTier', n: 2 },                   reward: gems(3) },
  { id: 'q4',  name: 'Parking lot',   desc: 'Parking capacity 20',               cond: { t: 'parkingCap', n: 20 },                reward: cash(2, 50) },
  { id: 'q5',  name: 'Busy day',      desc: 'Serve 100 guests',                  cond: { t: 'guestsServed', n: 100 },             reward: gems(3) },
  { id: 'q6',  name: 'Lower Slopes',  desc: 'Own Lower Slopes',                  cond: { t: 'area', id: 'lower' },                reward: gems(5) },
  { id: 'q7',  name: 'Second line',   desc: '2 lift lines in Lower Slopes',      cond: { t: 'linesInArea', id: 'lower', n: 2 },   reward: cash(3, 200) },
  { id: 'q8',  name: 'Sleepover',     desc: 'Housing level 1',                   cond: { t: 'housingLevel', n: 1 },               reward: gems(5) },
  { id: 'q9',  name: 'Chair up',      desc: 'Any lift of tier 3 or higher',      cond: { t: 'liftTier', n: 3 },                   reward: gems(5) },
  { id: 'q10', name: 'Snack time',    desc: 'Own the Snack Hut',                 cond: { t: 'building', id: 'snack' },            reward: cash(5, 500) },
  { id: 'q11', name: 'For the kids',  desc: "Own the Kids' Park",                cond: { t: 'zone', id: 'kids' },                 reward: gems(5) },
  { id: 'q12', name: 'Four seats',    desc: 'Any lift of tier 4 or higher',      cond: { t: 'liftTier', n: 4 },                   reward: gems(8) },
  { id: 'q13', name: 'Six figures',   desc: 'Earn $100,000 in total',            cond: { t: 'lifetime', n: 1e5 },                 reward: gems(8) },
  { id: 'q14', name: 'Mid Mountain',  desc: 'Own Mid Mountain',                  cond: { t: 'area', id: 'mid' },                  reward: gems(10) },
  { id: 'q15', name: 'Park life',     desc: 'Build the Terrain Park',            cond: { t: 'parkStage', n: 1 },                  reward: cash(5, 2000) },
  { id: 'q16', name: 'Big chair',     desc: 'Any lift of tier 6 or higher',      cond: { t: 'liftTier', n: 6 },                   reward: gems(10) },
  { id: 'q17', name: 'Slalom',        desc: 'Own the Slalom Course',             cond: { t: 'zone', id: 'slalom' },               reward: gems(10) },
  { id: 'q18', name: 'High Peaks',    desc: 'Own High Peaks',                    cond: { t: 'area', id: 'peaks' },                reward: gems(15) },
  { id: 'q19', name: 'Big resort',    desc: 'Parking + housing capacity 100',    cond: { t: 'peopleCap', n: 100 },                reward: gems(15) },
  { id: 'q20', name: 'First gondola', desc: 'Any lift of tier 7 or higher',      cond: { t: 'liftTier', n: 7 },                   reward: gems(20) },
  { id: 'q21', name: 'Apres',         desc: 'Own the Apres-Ski Bar',             cond: { t: 'building', id: 'apres' },            reward: gems(15) },
  { id: 'q22', name: 'Half-pipe',     desc: 'Terrain Park stage 3',              cond: { t: 'parkStage', n: 3 },                  reward: gems(20) },
  { id: 'q23', name: 'Glacier',       desc: 'Own the Glacier',                   cond: { t: 'area', id: 'glacier' },              reward: gems(30) },
  { id: 'q24', name: 'Top tier',      desc: 'Any lift of tier 10',               cond: { t: 'liftTier', n: 10 },                  reward: gems(40) },
  { id: 'q25', name: 'Billionaire',   desc: 'Earn $1,000,000,000 in total',      cond: { t: 'lifetime', n: 1e9 },                 reward: gems(50) },
  { id: 'q26', name: 'New Season',    desc: 'Start a New Season',                cond: { t: 'season', n: 2 },                     reward: gems(50) },
];
export const ACTIVE_QUESTS = 3;
