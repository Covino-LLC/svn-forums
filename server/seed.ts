import { storage } from "./storage";
import { loadSeedPlants } from "./seed-plants";
import { generateHeuristicScore } from "./scoring/alpha-omega-lens";

export function seedDatabase() {
  // Check if data already exists
  const existingUsers = storage.getAllUsers();
  if (existingUsers.length > 0) return;

  // Demo data (fictional users and plants) is for local development only.
  if (process.env.SVN_DEMO_SEED === "true") return seedDemoData();
  return seedProvingGrounds();
}

/**
 * Seed the live Proving Grounds with the research-backed plants in
 * docs/seed-plants (plants 1-20), planted by a single steward account.
 */
function seedProvingGrounds() {
  const plants = loadSeedPlants();
  const steward = storage.createUser({
    username: "svn_stewards",
    email: "contact@ammoncovino.com",
    tier: 1,
    energy: 8,
    createdAt: new Date().toISOString(),
  });

  const now = Date.now();
  plants.forEach((p, idx) => {
    const aiScore = generateHeuristicScore(p.content);
    storage.createPlant({
      userId: steward.id,
      title: p.title,
      content: p.content,
      biome: p.biome,
      energy: 0,
      aiScore: JSON.stringify(aiScore),
      status: "growing",
      // Keep plant order: plant 1 oldest, plant 20 newest.
      createdAt: new Date(now - (plants.length - idx) * 60_000).toISOString(),
    });
  });

  console.log(`Seeded Proving Grounds: ${plants.length} seed plants`);
}

function seedDemoData() {
  console.log("Seeding database with demo data...");

  // Create users at different tiers
  const users = [
    { username: "elena_roots", email: "elena@svn.local", tier: 3, energy: 12, createdAt: "2025-01-15T10:00:00Z" },
    { username: "marcus_logic", email: "marcus@svn.local", tier: 4, energy: 18, createdAt: "2025-01-10T08:00:00Z" },
    { username: "kai_seedling", email: "kai@svn.local", tier: 1, energy: 4, createdAt: "2025-02-01T14:00:00Z" },
    { username: "priya_canopy", email: "priya@svn.local", tier: 4, energy: 22, createdAt: "2025-01-05T09:00:00Z" },
    { username: "torres_grove", email: "torres@svn.local", tier: 2, energy: 7, createdAt: "2025-01-20T11:00:00Z" },
  ];

  const createdUsers = users.map(u => storage.createUser(u));

  // Create plants across biomes with realistic content
  const plantsData = [
    // PLOT biome
    {
      userId: createdUsers[0].id,
      title: "The power lines on Elm Street are above ground and ugly — here's what underground conversion would cost our neighborhood",
      content: "Elm Street has had above-ground power lines since 1978. The current infrastructure is rated for 40-year service life, which means we're 7 years past due. Underground conversion for our 0.3-mile stretch would cost approximately $1.2M based on Austin Energy's 2024 rate of $4M/mile for residential areas. However, because the existing conduit from the old cable TV installation could be repurposed, the actual cost drops to roughly $800K. Split among 47 households, that's $17,000 per home — or about $140/month over 10 years. The property value increase from underground utilities averages 3-5% according to the National Association of Realtors. For our median home value of $450K, that's $13,500-$22,500 in equity. The numbers therefore suggest this is close to break-even, with the added benefit of storm resilience.",
      biome: "plot",
      energy: 7,
      aiScore: JSON.stringify({
        logic: 8, rhetoric: 1, nostalgia: 0, emotionalAppeal: 0,
        novelty: 6, verifiability: 9, scope: 7,
        assessment: "Strong logical foundation with extensive numerical support. Claims are specific and falsifiable. The cost-benefit analysis uses concrete data points and acknowledges limitations. This plant has deep roots — the reasoning holds structural weight."
      }),
      status: "growing",
      createdAt: "2025-02-10T15:30:00Z",
    },
    {
      userId: createdUsers[2].id,
      title: "The drainage ditch on 5th street floods every spring — someone should fix it",
      content: "Every year the ditch floods and everyone knows it's a problem. The city never does anything about it. It used to be fine back when I was a kid but now it's terrible. Someone obviously needs to take responsibility and fix this before it gets worse. I feel like nobody cares about our neighborhood anymore.",
      biome: "plot",
      energy: 2,
      aiScore: JSON.stringify({
        logic: 1, rhetoric: 4, nostalgia: 3, emotionalAppeal: 3,
        novelty: 2, verifiability: 1, scope: 1,
        assessment: "High rhetoric and nostalgia density. Relies on 'everyone knows' and 'used to be' framings without structural evidence. No data on drainage capacity, flood frequency, or cost estimates. Vulnerable to consumption by logic-based challenges."
      }),
      status: "growing",
      createdAt: "2025-02-12T09:15:00Z",
    },

    // GROVE biome
    {
      userId: createdUsers[4].id,
      title: "Austin ISD's PTA fundraising spent $12K on candy sales last year — a bake sale with local restaurants would have netted 3x with zero sugar",
      content: "I pulled the PTA financial report for 2024. Total candy fundraiser revenue: $18,200. Cost of candy wholesale: $6,100. Net: $12,100. Profit margin: 66%. Now compare: Three local restaurants (Torchy's, Home Slice, Thai Fresh) have each confirmed they'd donate 50% of proceeds from a designated 'PTA night.' Average restaurant PTA night in Austin generates $3,200-$4,800 per restaurant per event according to the Austin Restaurant Association's community giving report. Three restaurants × 4 events per year × $4,000 average = $48,000 gross, with zero inventory cost to PTA. That's a 3.97x improvement. Additionally, we'd eliminate the 2,400 lbs of sugar being pushed through elementary schools annually.",
      biome: "grove",
      energy: 9,
      aiScore: JSON.stringify({
        logic: 9, rhetoric: 0, nostalgia: 0, emotionalAppeal: 0,
        novelty: 7, verifiability: 8, scope: 8,
        assessment: "Exceptional logical framework with concrete financial analysis. Direct comparison with verifiable numbers. The argument is structured, specific, and falsifiable. This is a strong plant — any challenge would need to bring equally strong data to consume it."
      }),
      status: "growing",
      createdAt: "2025-02-08T16:45:00Z",
    },
    {
      userId: createdUsers[0].id,
      title: "Community pool repair fund is being misallocated — accounting shows $23K unaccounted for",
      content: "The Westlake HOA collected $45,000 in special assessments for pool repairs in Q3 2024. Contractor bid from Blue Water Pools: $22,000 for resurfacing. The remaining $23,000 was categorized as 'administrative costs' in the December financial statement. I requested an itemized breakdown through the HOA transparency provision (Section 8.2 of our bylaws). The board has not responded in 47 days, which exceeds the 30-day requirement. For context, typical HOA administrative overhead for a project this size ranges from 5-15% according to the Community Associations Institute — that would be $2,250-$6,750. The gap between expected admin costs and the $23,000 claimed is therefore between $16,250 and $20,750.",
      biome: "grove",
      energy: 6,
      aiScore: JSON.stringify({
        logic: 8, rhetoric: 0, nostalgia: 0, emotionalAppeal: 1,
        novelty: 5, verifiability: 9, scope: 7,
        assessment: "Strong evidence-based analysis with specific financial data. The comparison to industry benchmarks adds credibility. The claim is highly verifiable through public records and HOA bylaws. Well-scoped to the community level."
      }),
      status: "growing",
      createdAt: "2025-02-05T11:20:00Z",
    },

    // FOREST biome
    {
      userId: createdUsers[1].id,
      title: "I-35 downtown bottleneck costs Austin drivers 47 hours per year in delays — here's a structural fix",
      content: "Texas A&M Transportation Institute's 2024 Urban Mobility Report ranks the I-35 corridor through downtown Austin as the 4th worst bottleneck in Texas. Average commuter delay: 47 hours annually, costing $1,340 per driver in wasted time and fuel. TxDOT's current $4.9B expansion plan adds lanes — but induced demand research (Duranton & Turner, 2011) demonstrates that lane additions generate equivalent new traffic within 5-8 years. The structural alternative: Convert the upper deck to a boulevard (as proposed in the Reconnect Austin plan), cap the lower deck, and invest $800M of the savings into dedicated BRT lanes connecting Mueller, the Domain, and downtown. The Cap Metro Project Connect ridership projections show this could serve 45,000 daily riders by 2030. The cost per rider-mile drops from $1.85 (car, including externalities) to $0.45 (BRT). This isn't about preference — it's about throughput per dollar.",
      biome: "forest",
      energy: 11,
      aiScore: JSON.stringify({
        logic: 10, rhetoric: 0, nostalgia: 0, emotionalAppeal: 0,
        novelty: 8, verifiability: 10, scope: 9,
        assessment: "Exceptional logical architecture. Every claim is sourced and falsifiable. The argument moves from problem identification to solution with rigorous cost-benefit analysis. References peer-reviewed research on induced demand. This plant has the deepest roots in the forest — consuming it would require equally rigorous counter-evidence."
      }),
      status: "growing",
      createdAt: "2025-01-28T08:00:00Z",
    },
    {
      userId: createdUsers[3].id,
      title: "Austin's water infrastructure needs $2.1B in upgrades — here's the funding gap",
      content: "Austin Water's 2024 Infrastructure Assessment identifies $2.1B in needed improvements over the next decade. Current capital improvement budget: $180M/year, or $1.8B over 10 years. That leaves a $300M gap. The utility's current rate structure charges $0.0094/gallon for residential users. A $0.001/gallon surcharge would generate approximately $42M annually based on Austin's 42B gallon/year consumption. Over 10 years, that's $420M — covering the gap with a $120M buffer. For the median Austin household using 6,000 gallons/month, the increase would be $6/month. The alternative — deferred maintenance — historically costs 6-10x more per the American Water Works Association, meaning the $300M gap becomes $1.8B-$3B if left unaddressed for another decade.",
      biome: "forest",
      energy: 8,
      aiScore: JSON.stringify({
        logic: 9, rhetoric: 0, nostalgia: 0, emotionalAppeal: 0,
        novelty: 6, verifiability: 9, scope: 8,
        assessment: "Strong logical framework with detailed financial modeling. The argument chain is clear: gap identified, solution proposed, cost quantified per household, and consequences of inaction cited with industry data. Well-scoped to the city level with national benchmarks for context."
      }),
      status: "growing",
      createdAt: "2025-02-01T14:30:00Z",
    },

    // BIOSPHERE biome
    {
      userId: createdUsers[1].id,
      title: "The prison-industrial loop: how sentencing guidelines create demand for the facilities that lobby for them",
      content: "The Sentencing Project's 2024 report documents that private prison companies (CoreCivic, GEO Group) spent $7.2M on federal lobbying in 2023. These same companies hold contracts requiring states to maintain 80-90% occupancy rates — Arizona's contract with CoreCivic guarantees 90% bed fill or the state pays for empty beds. Meanwhile, sentencing guidelines for non-violent drug offenses average 5.4 years federally (USSC data), compared to 2.1 years in countries with similar legal systems (Netherlands, Germany, Portugal — EU Penal Statistics). The structural loop: longer sentences → higher occupancy → more revenue → more lobbying capacity → maintained or increased sentence lengths. The Bureau of Justice Statistics shows recidivism rates for private facilities are 8% higher than public facilities, meaning the system also generates its own future demand. This is a self-reinforcing feedback loop that requires structural intervention — specifically, eliminating occupancy guarantee clauses and decoupling facility revenue from headcount.",
      biome: "biosphere",
      energy: 14,
      aiScore: JSON.stringify({
        logic: 10, rhetoric: 1, nostalgia: 0, emotionalAppeal: 1,
        novelty: 7, verifiability: 10, scope: 10,
        assessment: "Masterful logical construction. The feedback loop is clearly identified with specific data at each link in the chain. International comparison provides falsifiable benchmarks. The argument correctly identifies structural intervention points rather than treating symptoms. Minimal rhetoric — the data does the work. This plant has reached canopy height."
      }),
      status: "growing",
      createdAt: "2025-01-20T10:00:00Z",
    },
    {
      userId: createdUsers[3].id,
      title: "Global energy policy is captured by rhetoric on both sides — here's the structural reality",
      content: "The IEA's World Energy Outlook 2024 shows global energy demand will grow 15% by 2035 regardless of policy changes already enacted. The debate between 'all renewables' and 'keep fossil fuels' is a false binary that serves both lobbying groups. Structural reality: The levelized cost of solar is now $24/MWh (Lazard LCOE 17.0), compared to natural gas at $45/MWh. Solar is already cheaper. But intermittency means storage costs add $15-25/MWh (depending on geography), bringing the effective cost to $39-49/MWh — roughly equivalent to gas. The deciding structural factor is transmission infrastructure: 80% of the cost difference comes from grid modernization, not generation technology. Neither 'side' discusses this because grid infrastructure is a public utility problem, not a private sector lobbying opportunity. The structural fix: separate the generation debate from the transmission investment, fund grid modernization as infrastructure (like highways), and let generation technology compete on actual levelized cost.",
      biome: "biosphere",
      energy: 10,
      aiScore: JSON.stringify({
        logic: 9, rhetoric: 1, nostalgia: 0, emotionalAppeal: 0,
        novelty: 8, verifiability: 9, scope: 9,
        assessment: "Excellent structural analysis that cuts through partisan framing. The argument identifies the real cost driver (transmission, not generation) with specific data. Successfully reframes the debate from ideology to infrastructure economics. Minor rhetoric flag for 'false binary' framing, but the data supports the claim."
      }),
      status: "growing",
      createdAt: "2025-01-25T13:15:00Z",
    },

    // A composted plant
    {
      userId: createdUsers[2].id,
      title: "Schools should go back to the way they were — kids learned better before technology",
      content: "Everyone knows kids were smarter before smartphones. Back when I was in school, we actually paid attention and learned real things. Now they just stare at screens all day. The whole education system has obviously gone downhill since they started using technology. We need to go back to basics — books, chalkboards, and discipline. That's what always worked. Teachers used to care more and students used to respect authority. Now it's all participation trophies and iPad babysitters.",
      biome: "grove",
      energy: 0,
      aiScore: JSON.stringify({
        logic: 0, rhetoric: 7, nostalgia: 8, emotionalAppeal: 4,
        novelty: 1, verifiability: 0, scope: 1,
        assessment: "Extreme nostalgia and rhetoric density. No data, no evidence, no falsifiable claims. 'Everyone knows' and 'obviously' are pure rhetoric markers. Appeals entirely to 'the good old days' without any structural analysis. Highly vulnerable to logical consumption. This plant has no roots."
      }),
      status: "composted",
      createdAt: "2025-02-03T16:00:00Z",
    },
  ];

  const createdPlants = plantsData.map(p => storage.createPlant(p));

  // Create some contributions
  const contributionsData = [
    // Contributions to the Elm Street power lines plant
    {
      plantId: createdPlants[0].id,
      userId: createdUsers[1].id,
      content: "I checked Austin Energy's underground conversion program — they offer a 15% rebate for neighborhoods that coordinate 10+ households. That would bring the per-home cost from $17K to $14,450. Also worth noting: the 2024 ice storm caused $12,000 in outage-related damages on Elm Street alone (homeowner insurance claims data from my adjustor contact).",
      type: "expand",
      energyTransferred: 1,
      createdAt: "2025-02-11T08:00:00Z",
    },
    {
      plantId: createdPlants[0].id,
      userId: createdUsers[3].id,
      content: "The NAR property value increase figure should be scoped more carefully — that 3-5% is a national average. In Austin's market, aesthetic improvements tend to yield higher returns due to the competitive housing market. The Austin Board of Realtors 2024 data shows underground utilities correlate with 4.2-6.1% value increases specifically in central Austin neighborhoods.",
      type: "clarify",
      energyTransferred: 1,
      createdAt: "2025-02-11T14:00:00Z",
    },

    // Contribution to the PTA fundraising plant
    {
      plantId: createdPlants[2].id,
      userId: createdUsers[1].id,
      content: "Joining this. I ran similar numbers for Mueller Elementary's PTA and the restaurant model outperforms candy sales by 4.2x when you factor in volunteer labor hours. Candy sales require approximately 120 parent-volunteer hours for distribution; restaurant nights require about 8 hours of coordination.",
      type: "join",
      energyTransferred: 1,
      createdAt: "2025-02-09T10:00:00Z",
    },

    // Consumption of the drainage ditch plant
    {
      plantId: createdPlants[1].id,
      userId: createdUsers[1].id,
      content: "This post has zero data. 'Everyone knows' is rhetoric, not evidence. 'Used to be fine back when I was a kid' is pure nostalgia. No measurement of the ditch capacity, no rainfall data, no drainage engineering analysis, no cost estimates. If you want this to survive, bring numbers: what's the ditch's rated flow capacity vs. actual peak flow during spring rains?",
      type: "consume",
      energyTransferred: -2,
      createdAt: "2025-02-13T11:00:00Z",
    },

    // Contributions to the I-35 plant
    {
      plantId: createdPlants[4].id,
      userId: createdUsers[3].id,
      content: "The Duranton & Turner induced demand research is solid but I want to add: Houston's Katy Freeway expansion (2011) is the perfect case study. They expanded to 26 lanes and by 2019, commute times were longer than before the expansion. The data is from TTI's own monitoring reports — same source this plant cites.",
      type: "expand",
      energyTransferred: 1,
      createdAt: "2025-01-30T09:00:00Z",
    },
    {
      plantId: createdPlants[4].id,
      userId: createdUsers[0].id,
      content: "Joining because the throughput-per-dollar framing is exactly right. The cost comparison needs one correction though: the $1.85/rider-mile for cars should include parking infrastructure costs. UT's 2023 parking study found Austin subsidizes parking at $4,200/space/year. Including that, car cost rises to approximately $2.30/rider-mile.",
      type: "join",
      energyTransferred: 1,
      createdAt: "2025-02-02T16:00:00Z",
    },

    // Consumption attempt on the composted school plant
    {
      plantId: createdPlants[8].id,
      userId: createdUsers[1].id,
      content: "PISA scores show no correlation between technology adoption and declining performance — the countries with highest tech integration (Finland, Singapore, South Korea) consistently outperform. The NCES Long-term Trend Assessment shows US reading scores have been essentially flat since 1971, well before smartphones. The 'golden age' this post references never existed in the data. Every claim here is rhetoric or nostalgia. Consumed.",
      type: "consume",
      energyTransferred: -2,
      createdAt: "2025-02-04T10:00:00Z",
    },
  ];

  contributionsData.forEach(c => storage.createContribution(c));

  console.log(`Seeded: ${createdUsers.length} users, ${createdPlants.length} plants, ${contributionsData.length} contributions`);
}
