/* VR content: reading passages and the true/false/can't-tell statement sets. */

export const PASSAGES = [
  {
    id: "reservoir",
    title: "Reservoir management",
    text: `The Carnyard reservoir was completed in 1934 and supplied four surrounding parishes until the network was consolidated in 1978. At its opening it held 6.2 million cubic metres, though silting has since reduced usable capacity to roughly 5.1 million. A survey published in 2011 found that the dam wall had shifted by 14 millimetres over the preceding decade, a figure the water authority described as within tolerance. Maintenance is scheduled every seven years, and the most recent inspection took place in spring. Public access to the eastern bank was withdrawn in 1996 following a drowning, and has not been restored. The reservoir is not used for recreation, although anglers hold permits for the feeder stream below the outflow.`,
    facts: [
      { q: "In which year was the survey published?", a: "2011" },
      { q: "How many millimetres had the dam wall shifted?", a: "14" },
      { q: "In which year was eastern bank access withdrawn?", a: "1996" },
    ],
    points: [
      "Completed 1934", "Supplied four parishes", "Network consolidated 1978",
      "Original capacity 6.2 million cubic metres", "Usable capacity now around 5.1 million",
      "Survey published 2011", "Dam wall shifted 14 millimetres", "Maintenance every seven years",
      "Eastern bank closed 1996", "Anglers permitted on the feeder stream",
    ],
    comprehension: [
      { q: "The passage states that the dam wall movement was:", options: ["Cause for closure", "Within tolerance", "Never measured", "Increasing yearly"], correct: 1 },
      { q: "Recreation on the reservoir itself is:", options: ["Encouraged", "Permitted by licence", "Not carried out", "Under review"], correct: 2 },
    ],
  },
  {
    id: "printing",
    title: "The provincial press",
    text: `Provincial printing in the eighteenth century depended less on literacy rates than on the postal network. A town without a post road rarely sustained a paper for more than two years, regardless of its population. Bristol supported three competing weeklies by 1750, while Norwich, comparable in size, supported one. Historians once attributed this to differing rates of subscription, but ledger evidence recovered in 1987 suggests the difference lay in advertising revenue, which accounted for over half the income of the Bristol titles. Circulation figures from the period are unreliable, as printers routinely inflated them to attract advertisers. The claim that the provincial press shaped national opinion before 1760 is therefore difficult to sustain on the surviving evidence.`,
    facts: [
      { q: "How many weeklies did Bristol support by 1750?", a: "3" },
      { q: "In which year was ledger evidence recovered?", a: "1987" },
      { q: "Before which year is the shaping claim hard to sustain?", a: "1760" },
    ],
    points: [
      "Depended on the postal network", "Towns without a post road rarely lasted two years",
      "Bristol had three weeklies by 1750", "Norwich had one despite similar size",
      "Once attributed to subscription rates", "Ledger evidence recovered 1987",
      "Advertising was over half of Bristol income", "Circulation figures unreliable",
      "Printers inflated figures for advertisers", "National influence claim hard to sustain before 1760",
    ],
    comprehension: [
      { q: "Circulation figures are described as:", options: ["Precise", "Unreliable", "Lost", "Government verified"], correct: 1 },
      { q: "The difference between Bristol and Norwich is now attributed to:", options: ["Literacy", "Population", "Advertising revenue", "Postal cost"], correct: 2 },
    ],
  },
  {
    id: "alloy",
    title: "Alloy fatigue",
    text: `Fatigue failure in aluminium alloys differs from that in steel in one important respect: there is no endurance limit below which a component can be cycled indefinitely. A steel bracket loaded below roughly 40 per cent of its tensile strength may survive an effectively unlimited number of cycles. An aluminium bracket under the same proportional load will eventually crack, though it may take several million cycles to do so. Design practice therefore specifies a service life rather than a safety threshold. The 1954 Comet accidents are frequently cited in this context, although the failures there originated at window cut-outs rather than in the alloy itself. Inspection intervals remain the principal defence, and are set by flight hours rather than calendar time.`,
    facts: [
      { q: "Below what percentage of tensile strength may steel survive?", a: "40" },
      { q: "Which year's accidents are frequently cited?", a: "1954" },
      { q: "Inspection intervals are set by what?", a: "flight hours" },
    ],
    points: [
      "Aluminium has no endurance limit", "Steel does have an endurance limit",
      "Steel survives below about 40 per cent tensile strength", "Aluminium eventually cracks under the same proportional load",
      "May take several million cycles", "Design specifies service life not safety threshold",
      "1954 Comet accidents cited", "Those failures began at window cut-outs",
      "Not caused by the alloy itself", "Inspection intervals set by flight hours",
    ],
    comprehension: [
      { q: "The Comet failures originated:", options: ["In the alloy", "At window cut-outs", "In the engines", "At the wing root"], correct: 1 },
      { q: "Aluminium design practice specifies:", options: ["A safety threshold", "An endurance limit", "A service life", "A cycle floor"], correct: 2 },
    ],
  },
  {
    id: "lido",
    title: "The lido revival",
    text: `Britain built more than 160 open-air lidos between the wars, most of them municipal showpieces with fountains and tiered diving boards. By 1990 fewer than forty remained open, undone by indoor pools, package holidays and maintenance bills that councils declined to pay. The revival began unevenly: Tooting Bec offered year-round swimming through the 1990s, while Penzance's Jubilee Pool, storm-damaged in 2014, returned in 2016 with a geothermally heated section added four years later. Campaign groups now do much of the work councils once did, raising funds and staffing rotas. Advocates cite cold-water swimming's popularity, though operators note that enthusiasm peaks in August and vanishes by November, leaving the finances of an unheated pool as seasonal as ever.`,
    facts: [
      { q: "In which year was the Jubilee Pool storm-damaged?", a: "2014" },
      { q: "In which year did the Jubilee Pool return?", a: "2016" },
      { q: "By which month do operators say enthusiasm vanishes?", a: "november" },
    ],
    points: [
      "More than 160 lidos built between the wars", "Municipal showpieces with fountains", "Fewer than forty open by 1990",
      "Undone by indoor pools, holidays, maintenance", "Tooting Bec swam year-round through the 1990s", "Jubilee Pool storm-damaged 2014",
      "Returned 2016", "Geothermal section four years later", "Campaign groups now fund and staff", "Enthusiasm gone by November",
    ],
    comprehension: [
      { q: "The finances of an unheated pool are described as:", options: ["Transformed", "Seasonal as ever", "A council priority", "Secured by heating"], correct: 1 },
      { q: "Much of the work councils once did is now done by:", options: ["Private gyms", "Campaign groups", "Tour operators", "The lottery"], correct: 1 },
    ],
  },
  {
    id: "owls",
    title: "Owls and rodenticides",
    text: `Barn owls hunt by ear, striking field voles they have never seen beneath grass or snow. That specialisation makes them an unintentional monitor of rodent poisons: post-mortem studies routinely find second-generation rodenticides in over 80 per cent of British barn owls, absorbed from prey that fed on baits. Lethal doses are rare; the concern is sublethal exposure, which laboratory work links to slower clotting and poorer body condition. Regulation has tried to square the circle by restricting amateur outdoor use since 2016 while permitting professional deployment under a stewardship scheme. Owl numbers have nonetheless risen over recent decades, aided by nest-box campaigns that offset the loss of hollow trees and old barns, a reminder that populations respond to more than one pressure at a time.`,
    facts: [
      { q: "Rodenticides are found in over what percentage of British barn owls?", a: "80" },
      { q: "Since which year has amateur outdoor use been restricted?", a: "2016" },
      { q: "Barn owls hunt primarily by what sense?", a: "ear" },
    ],
    points: [
      "Owls hunt by ear", "Strike voles they have never seen", "Unintentional monitor of rodent poisons",
      "Rodenticides in over 80 per cent of owls", "Absorbed from prey that fed on baits", "Lethal doses rare",
      "Sublethal exposure linked to slower clotting", "Amateur outdoor use restricted since 2016", "Professional use under stewardship", "Numbers risen, helped by nest boxes",
    ],
    comprehension: [
      { q: "The main stated concern is:", options: ["Lethal doses", "Sublethal exposure", "Nest-box shortages", "Hearing loss"], correct: 1 },
      { q: "Owl numbers over recent decades have:", options: ["Collapsed", "Risen", "Halved", "Gone unrecorded"], correct: 1 },
    ],
  },
  {
    id: "container",
    title: "The box that shrank the sea",
    text: `The shipping container's genius was not the box but the agreement: a 1968 ISO standard fixed the corner castings so that any crane, chassis or cell guide on earth could take any container. Before standardisation, a cargo liner might spend half its life in port; a modern vessel turns around in under a day. The savings came largely from labour, and dock employment in London fell by over 90 per cent within two decades of containerisation, the port itself shifting forty kilometres downstream to Tilbury before Felixstowe's later rise. Economists credit the box with enabling distributed manufacturing, since moving a tonne of goods across an ocean now often costs less than moving it the final fifty kilometres by road.`,
    facts: [
      { q: "In which year was the ISO standard agreed?", a: "1968" },
      { q: "London dock employment fell by over what percentage?", a: "90" },
      { q: "How many kilometres downstream did the port shift?", a: "40" },
    ],
    points: [
      "The genius was the agreement, not the box", "1968 ISO standard", "Corner castings made handling universal",
      "Liners once spent half their life in port", "Modern turnaround under a day", "Savings came largely from labour",
      "London dock jobs fell over 90 per cent", "Within two decades", "Port shifted forty kilometres to Tilbury", "Enabled distributed manufacturing",
    ],
    comprehension: [
      { q: "The passage locates the container's genius in:", options: ["The steel box", "The standard everyone agreed", "Cheap fuel", "Bigger ships"], correct: 1 },
      { q: "A modern vessel turns around in:", options: ["Half its life", "A week", "Under a day", "A month"], correct: 2 },
    ],
  },
  {
    id: "saffron",
    title: "The price of saffron",
    text: `Saffron owes its cost to arithmetic that has never been mechanised: each crocus flower yields three crimson stigmas, and these must be plucked by hand on the single autumn morning the flower opens. Roughly 150,000 flowers go into a kilogram of dried spice, which explains a wholesale price that has hovered near that of some precious metals. Iran supplies the large majority of world production, though Kashmir's harvest commands a premium for its deeper colour. Adulteration is rife, since dyed maize silk or safflower can pass a casual glance; laboratory testing measures three compounds, one for colour, one for aroma and one for the bitter taste, and grades the spice against international standards set in 2010. Attempts to breed a higher-yielding crocus have repeatedly failed, because the plant is sterile and propagates only by division.`,
    facts: [
      { q: "How many stigmas does each crocus flower yield?", a: "3" },
      { q: "Roughly how many flowers make a kilogram of saffron?", a: "150000" },
      { q: "In which year were the grading standards set?", a: "2010" },
    ],
    points: [
      "Three stigmas per flower", "Plucked by hand on one autumn morning", "Around 150,000 flowers per kilogram",
      "Price near some precious metals", "Iran supplies the majority", "Kashmir commands a premium for colour",
      "Adulteration is common", "Testing measures colour, aroma and bitterness", "Standards set in 2010", "The plant is sterile, propagates by division",
    ],
    comprehension: [
      { q: "Higher-yield breeding has failed because the plant is:", options: ["Too fragile", "Sterile", "Slow to dry", "Prone to disease"], correct: 1 },
      { q: "Laboratory testing measures how many compounds?", options: ["One", "Two", "Three", "Four"], correct: 2 },
    ],
  },
  {
    id: "tides",
    title: "Reading the tide",
    text: `Tide tables look like predictions but are closer to calculations, since the gravitational pattern that drives them is known centuries ahead. What cannot be calculated is the weather. A deep depression sitting over a shallow sea can raise water a metre above the predicted height, a surge that in 1953 overwhelmed defences along the east coast and prompted the barriers that protect the capital today. The Thames barrier was completed in 1982 and was expected to close a handful of times a year; by the 2010s it was closing far more often, partly through rising seas and partly through a deliberate policy of holding back river water during heavy rainfall. Engineers distinguish this carefully: a barrier closing more frequently is not proof of a rising threat, because the rules for closing it have themselves changed.`,
    facts: [
      { q: "In which year did a surge overwhelm east coast defences?", a: "1953" },
      { q: "In which year was the Thames barrier completed?", a: "1982" },
      { q: "How much can a deep depression raise water above prediction?", a: "a metre" },
    ],
    points: [
      "Tides are calculated, not predicted", "Known centuries ahead", "Weather cannot be calculated",
      "A depression can raise water a metre", "1953 surge overwhelmed east coast defences", "Prompted the capital's barriers",
      "Thames barrier completed 1982", "Expected to close a few times a year", "Closing far more often by the 2010s", "Partly rising seas, partly changed closing rules",
    ],
    comprehension: [
      { q: "More frequent closures are, according to engineers:", options: ["Proof of rising threat", "Not proof, since the rules changed", "Unrelated to weather", "A sign of failure"], correct: 1 },
      { q: "What about tides cannot be calculated in advance?", options: ["The gravitational pattern", "The weather", "The dates", "The heights"], correct: 1 },
    ],
  },
  {
    id: "cochineal",
    title: "A red from an insect",
    text: `The deepest natural red available to European dyers before the nineteenth century came from a scale insect farmed on cacti in the Spanish Americas. Cochineal was worth guarding: Spain controlled its export as a dried commodity for two centuries, and rivals who obtained the dried bodies still could not tell whether they held a seed, a mineral or a dried animal. Synthetic reds displaced it after 1868, and the trade all but collapsed. Its revival came from an unexpected direction, as concern over synthetic food colourings returned cochineal to ingredient lists under its carmine name, prized precisely because it is not synthetic. Producers in Peru now supply most of the world's supply, and the insect that once dyed cardinals' robes now colours yoghurt and lipstick.`,
    facts: [
      { q: "For how long did Spain control cochineal export?", a: "two centuries" },
      { q: "After which year did synthetic reds displace it?", a: "1868" },
      { q: "Which country now supplies most cochineal?", a: "peru" },
    ],
    points: [
      "Deepest natural red before the 1800s", "From a scale insect on cacti", "Farmed in the Spanish Americas",
      "Spain controlled export for two centuries", "Rivals could not identify what they held", "Synthetic reds displaced it after 1868",
      "Trade all but collapsed", "Revived by concern over synthetic colourings", "Sold as carmine", "Peru now supplies most",
    ],
    comprehension: [
      { q: "Cochineal's modern revival was driven by:", options: ["Lower cost", "Concern over synthetic colourings", "Better farming", "New colours"], correct: 1 },
      { q: "Rivals who obtained the dried bodies could not tell if they held:", options: ["A dye or a paint", "A seed, mineral or animal", "Old or fresh stock", "Real or fake"], correct: 1 },
    ],
  },
  {
    id: "peat",
    title: "The carbon in the bog",
    text: `A healthy peat bog grows by around a millimetre a year, each layer of part-rotted moss sealing the last beneath waterlogged, airless conditions that halt decay. Britain's uplands hold more carbon in peat than its forests hold in wood, which is why drained and eroding bogs have become a concern: exposed to air, ancient peat oxidises and releases the carbon it locked away over millennia. Restoration is deceptively low-technology, often amounting to blocking the drainage ditches cut decades ago to improve grazing, so the water table rises and the moss resumes growth. Results are slow and easily overstated; a bog takes centuries to rebuild what erosion strips in years, and rewetting reduces further loss long before it restores any meaningful store.`,
    facts: [
      { q: "By roughly how much does a healthy bog grow each year?", a: "a millimetre" },
      { q: "Britain's uplands hold more carbon in peat than forests hold in what?", a: "wood" },
      { q: "Restoration often amounts to blocking what?", a: "drainage ditches" },
    ],
    points: [
      "Bog grows about a millimetre a year", "Waterlogged airless conditions halt decay", "Uplands hold more carbon than forests",
      "Drained bogs oxidise and release carbon", "Locked away over millennia", "Restoration is low-technology",
      "Blocking old drainage ditches", "Water table rises, moss regrows", "Rebuilding takes centuries", "Rewetting reduces loss before restoring store",
    ],
    comprehension: [
      { q: "Rewetting a bog first achieves:", options: ["Full restoration", "Reduced further loss", "Faster grazing", "New forest"], correct: 1 },
      { q: "Exposed ancient peat, according to the passage:", options: ["Grows faster", "Oxidises and releases carbon", "Turns to soil", "Stays inert"], correct: 1 },
    ],
  },
  {
    id: "quinine",
    title: "The bark that moved empires",
    text: `Quinine, drawn from the bark of the cinchona tree of the Andes, was for three centuries the only effective treatment for malaria, and control of its supply shaped where Europeans could and could not settle. The bark was harvested destructively at first, and exporting live seeds was forbidden by the South American republics that held a monopoly. That monopoly ended through smuggling: seeds taken to plantations in Asia in the 1860s eventually supplied the majority of the world's quinine, and the Andean trade never recovered. Synthetic antimalarials arrived in the twentieth century, but quinine returned to prominence whenever the parasite evolved resistance to the newer drugs, a pattern that has repeated often enough to keep the old remedy in guidelines rather than museums.`,
    facts: [
      { q: "From which tree's bark does quinine come?", a: "cinchona" },
      { q: "In which decade were seeds taken to Asian plantations?", a: "1860s" },
      { q: "For how long was quinine the only effective malaria treatment?", a: "three centuries" },
    ],
    points: [
      "Quinine from cinchona bark", "From the Andes", "Only effective malaria treatment for three centuries",
      "Shaped where Europeans could settle", "Harvested destructively at first", "Live seed export forbidden",
      "Monopoly ended through smuggling", "Seeds to Asian plantations in the 1860s", "Andean trade never recovered", "Returns whenever resistance to newer drugs appears",
    ],
    comprehension: [
      { q: "Quinine returns to prominence whenever:", options: ["Bark runs short", "The parasite resists newer drugs", "Prices fall", "Plantations close"], correct: 1 },
      { q: "The South American monopoly on quinine ended through:", options: ["A treaty", "Smuggling of seeds", "Synthetic drugs", "War"], correct: 1 },
    ],
  },
  {
    id: "grid",
    title: "Keeping the grid in step",
    text: `An electricity grid must match supply to demand from instant to instant, because power cannot be stored in the wires themselves. The evidence of any mismatch is the frequency: too much demand and the whole system slows fractionally below its target of fifty cycles a second, too little and it drifts above. Operators once relied on large spinning generators whose sheer momentum resisted sudden change and bought seconds to respond, a property engineers call inertia. As coal and gas plants close, that inertia falls, and a grid rich in wind and solar can swing faster than old rules allowed for. The response has not been to slow the transition but to buy the missing stability separately: batteries that inject power within milliseconds, and even spinning flywheels installed for no purpose other than to mimic the inertia the retired plants once provided for free.`,
    facts: [
      { q: "What is the grid's target frequency in cycles a second?", a: "50" },
      { q: "What do engineers call a generator's resistance to sudden change?", a: "inertia" },
      { q: "Batteries can inject power within what timeframe?", a: "milliseconds" },
    ],
    points: [
      "Supply must match demand instant to instant", "Power not stored in the wires", "Frequency reveals any mismatch",
      "Target is fifty cycles a second", "Spinning generators resisted change", "That property is called inertia",
      "Closing coal and gas cuts inertia", "Renewable grids swing faster", "Batteries respond in milliseconds", "Flywheels installed to mimic inertia",
    ],
    comprehension: [
      { q: "A shortage of supply makes the frequency:", options: ["Rise above target", "Drop below target", "Stay fixed", "Reverse"], correct: 1 },
      { q: "Flywheels are installed in modern grids to:", options: ["Store energy long term", "Mimic the inertia of old plants", "Replace batteries", "Generate power"], correct: 1 },
    ],
  },
];

export const TFC = ["True", "False", "Can't tell"];

export const TFC_SETS = {
  reservoir: [
    { t: "The reservoir supplied more than four parishes before 1978.", a: 1,
      w: "The passage states it supplied four parishes until consolidation. More than four contradicts that, so it is False. Numbers stated exactly are the easiest False statements to build." },
    { t: "Silting has reduced the reservoir's usable capacity by more than a million cubic metres.", a: 0,
      w: "6.2 million fell to roughly 5.1 million, a reduction of about 1.1 million. The arithmetic is done for you inside the passage, which makes this True rather than Can't tell." },
    { t: "The drowning in 1996 was caused by the dam wall movement.", a: 2,
      w: "Both facts appear, but the passage never connects them. Two true facts sitting near each other do not make a causal link, and inventing one is the commonest route to a wrong True." },
    { t: "Anglers are permitted to fish on the reservoir itself.", a: 1,
      w: "Permits cover the feeder stream below the outflow, and the passage says the reservoir is not used for recreation. Close but contradicted, so False rather than Can't tell." },
  ],
  printing: [
    { t: "Norwich had a smaller population than Bristol in 1750.", a: 2,
      w: "The passage calls them comparable in size but never gives figures or says which was larger. Comparable is not the same as equal, so you cannot tell." },
    { t: "Advertising accounted for more than half the income of the Bristol papers.", a: 0,
      w: "Stated almost word for word. When a statement matches the passage's own claim without adding to it, True is safe." },
    { t: "Printers were prosecuted for inflating circulation figures.", a: 2,
      w: "The passage says they routinely inflated figures, and says nothing whatever about consequences. The statement adds a plausible detail the text never mentions." },
    { t: "The provincial press definitely shaped national opinion before 1760.", a: 1,
      w: "The passage says that claim is difficult to sustain on surviving evidence, which contradicts a definite assertion. Watch for absolute words like definitely." },
  ],
  alloy: [
    { t: "An aluminium bracket loaded below 40 per cent of its tensile strength will never crack.", a: 1,
      w: "That is the steel property. Aluminium has no endurance limit and will eventually crack under the same proportional load, so the statement is contradicted." },
    { t: "The Comet accidents happened more than fifty years ago.", a: 0,
      w: "1954 is stated, and any current reading date puts that beyond fifty years. Time-elapsed statements built on a stated date are True, not Can't tell." },
    { t: "Aircraft inspection intervals are set by the manufacturer.", a: 2,
      w: "The passage says intervals are set by flight hours rather than calendar time, which describes the unit, not who decides. A statement about a different aspect entirely is Can't tell." },
    { t: "Steel components can be cycled indefinitely at any load.", a: 1,
      w: "Only below roughly 40 per cent of tensile strength. Dropping the condition turns a true statement into a false one, which is exactly how False options are built." },
  ],
  lido: [
    { t: "Most of the lidos built between the wars had closed by 1990.", a: 0,
      w: "More than 160 built, fewer than forty remaining, so most had closed. The passage supplies both numbers and the comparison is straightforward arithmetic." },
    { t: "The Jubilee Pool's geothermal section opened in 2020.", a: 0,
      w: "It returned in 2016 with geothermal heating added four years later, which is 2020. Chained arithmetic inside a passage still counts as stated." },
    { t: "Councils were wrong to stop funding lido maintenance.", a: 2,
      w: "The passage records that councils declined to pay and never passes judgement. Any statement asking whether something was right or wrong is almost always Can't tell." },
    { t: "Cold-water swimming is more popular in November than in August.", a: 1,
      w: "The passage says enthusiasm peaks in August and vanishes by November, which is the reverse. Reversed comparisons are a favourite False construction." },
  ],
  owls: [
    { t: "Most British barn owls carry detectable rodenticide residues.", a: 0,
      w: "Over 80 per cent qualifies as most. Converting a stated percentage into a plain-English quantifier is a legitimate True, and candidates often mark it Can't tell out of caution." },
    { t: "Rodenticides are the main reason barn owl numbers have changed.", a: 2,
      w: "Numbers have risen and nest boxes are credited, but the passage never ranks the causes. Statements that assign a main cause where none is stated are Can't tell." },
    { t: "Professional users may still deploy these rodenticides outdoors.", a: 0,
      w: "The passage says professional deployment is permitted under a stewardship scheme while amateur outdoor use was restricted. The contrast is explicit." },
    { t: "Barn owls locate prey primarily by sight.", a: 1,
      w: "They hunt by ear, striking prey they have never seen. Directly contradicted in the first sentence." },
  ],
  container: [
    { t: "Standardisation reduced the time ships spend in port.", a: 0,
      w: "Half a ship's life in port before, under a day now. The passage draws the before-and-after comparison itself." },
    { t: "Felixstowe handles more containers than Tilbury today.", a: 2,
      w: "Felixstowe's later rise is mentioned with no figures and no comparison. A named entity appearing in a passage does not mean the passage supports claims about it." },
    { t: "Containerisation was the sole cause of falling dock employment in London.", a: 2,
      w: "The passage says savings came largely from labour and gives the timing, but never claims it was the only cause. Sole and only are words that usually force Can't tell." },
    { t: "Moving goods across an ocean is always cheaper than moving them fifty kilometres by road.", a: 1,
      w: "The passage says often costs less, not always. Swapping a hedge for an absolute is the single most common False construction in this section." },
  ],
};
