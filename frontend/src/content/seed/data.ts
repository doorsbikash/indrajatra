/* ------------------------------------------------------------------
   Yenya Punhi — Indra Jatra Melbourne 2026
   Festival content.

   Sources used to build this file:
     · Official 2026 event poster (date, venue, address, tagline)
     · "Silver Indra Jatra_2026.pdf" sponsorship proposal (activities, purpose)
     · "indra-jatra-2026-planned-site-map.jpeg" (all site locations)
     · Vendor Stall EOI responses, 12–21 Aug 2026 (confirmed stallholders)
     · NGV-Intro.pdf (organisation, classes, contact)

   Cultural trail copy is written for visitors and marked
   reviewStatus:"reviewed" — it is ready to read but still needs a
   final sign-off from the Newa Guthi Victoria cultural committee.
   Flip an entry to "approved" once the committee has signed it.
   ------------------------------------------------------------------ */

import type {
  Announcement, FaqItem, FestivalData, InfoCard, Listing,
  Location, LocationType, MapRoute, ScheduleItem, TrailPoint
} from "../../lib/types";

export const FESTIVAL_DAY = "2026-09-26";
const at = (time: string) => `${FESTIVAL_DAY}T${time}:00+10:00`;

/* ==================================================================
   LOCATIONS — traced from the organiser's planned site map
   ================================================================== */

type LocRow = [string, string, LocationType, number, number, string, string];

const locationRows: LocRow[] = [
  ["guest-entry", "Guest Entry & Exit", "entry", 72, 53,
    "The single pedestrian entry and exit for all guests, off Duncans Lane. Entry is free — no ticket needed.",
    "Flat, sealed approach from the car park. Wheelchairs and prams come straight through; there are no steps or turnstiles."],
  ["vehicle-entry", "Vehicle Entry & Exit", "entry", 87, 91,
    "All cars enter and leave here from Duncans Lane. Traffic runs one way through the site — follow the marshals.",
    "Drop-off directly at this point is possible. Tell a marshal if a passenger needs to be set down close to the entry."],
  ["main-stage", "Guest & MC Stage", "stage", 48, 52,
    "The main stage in front of the ANMC building. Everything on the program that is announced, performed or spoken happens here.",
    "Level grass with a firm path along the front. A seated viewing area with a clear line of sight is kept to the left of the stage."],
  ["anmc", "ANMC Building", "community", 50, 59,
    "The Australian Nepalese Multicultural Centre — indoor space, the Newa Guthi Victoria desk, and shelter if the weather turns.",
    "Step-free entry. The accessible toilet is inside, on the left as you enter."],
  ["ganesh-rath", "Ganesh Rath", "culture", 68, 45,
    "The Ganesh chariot, built new for 2026. It waits here before the procession and returns here afterwards.",
    "Stand behind the rope line. The chariot moves slowly but needs a wide, clear path."],
  ["kumari-rath", "Kumari Rath", "culture", 79, 45,
    "The Kumari chariot. This is where the Kumari Rath Yatra begins and ends.",
    "Stand behind the rope line. Marshals will open a viewing gap for wheelchair users on request."],
  ["god-indra", "God Indra Display", "culture", 74, 33,
    "The image of Indra Dyah, arms outstretched and bound, as it is displayed in Kathmandu during the festival.",
    "Firm ground, viewable from a seated position."],
  ["swet-bhairab", "Swet Bhairab", "culture", 74, 29,
    "The great white Bhairab face, revealed only for Indra Jatra.",
    "Firm ground, viewable from a seated position."],
  ["samay-vo", "Samay Baji Display", "culture", 74, 25,
    "Two display tables showing Samay Baji — the ritual Newa plate — and the story of each item on it.",
    "Tables are set at standing height with a lowered section at one end."],
  ["cultural-line", "Cultural Display Line", "culture", 74, 37,
    "The row of cultural displays along the eastern tree line: Ganesh Khath, Indra, Swet Bhairab and Samay Baji.",
    "A continuous firm path runs the length of the display line."],
  ["market-row", "Market Stalls 1–20", "market", 43, 14,
    "Twenty 3m × 3m stalls beside the lake. Each directory listing shows its confirmed stall number.",
    "Two metres of clear space is left between stall blocks so the aisle stays passable."],
  ["food-trucks", "Food Trucks", "food", 14, 28,
    "All hot food is served along the western edge. Newari and Nepali dishes, snacks and drinks.",
    "Queue areas are on level ground. Ask any vendor for help carrying an order to a seat."],
  ["media-station", "Media Station", "amenity", 40, 35,
    "Information desk, lost property, lost children, volunteer check-in and the festival announcements point.",
    "Staffed for the whole event. Hearing assistance and a quiet place to talk are available on request."],
  ["first-aid", "First Aid", "amenity", 74, 22,
    "Qualified first aiders for the whole event. Come here for anything from a scraped knee to feeling unwell.",
    "Step-free. A private, shaded area is available inside the tent."],
  ["baby-change", "Baby Change", "amenity", 74, 18,
    "Baby change table and a seated, screened space for feeding.",
    "Step-free entry with room for a pram inside."],
  ["toilets", "Toilets", "amenity", 32, 58,
    "Main toilet block beside the ANMC building.",
    "The accessible toilet is inside the ANMC building, immediately to your left."],
  ["extra-toilets", "Extra Toilets", "amenity", 25, 58,
    "Additional toilets, west of the main block — usually the shorter queue.",
    "Portable units on level ground. Use the ANMC toilet for full wheelchair access."],
  ["garden", "Garden / Quiet Space", "amenity", 80, 69,
    "A shaded, calmer corner away from the speakers. Good for a break, for feeding, or if the crowd gets too much.",
    "Grass with a firm path to the edge. Seating available."],
  ["lake", "Lake", "amenity", 48, 6,
    "The lake marks the northern boundary of the site. There is no access beyond this point.",
    "Unfenced water. Please keep children within arm's reach along this edge."],
  ["vip-parking", "VIP Guest Parking", "parking", 49, 68,
    "Reserved for invited guests and officials. Please use general parking otherwise.",
    "Closest parking to the stage. Accessible bays are at the eastern end, nearest the entry."],
  ["parking", "General Parking", "parking", 53, 81,
    "Main visitor car park. Free, marshalled, and a two-minute walk to the entry.",
    "Compacted gravel. Ask a marshal for the accessible bays nearest the entry gate."],
  ["overflow-parking", "Overflow Parking", "parking", 42, 2,
    "Opens when the main car park fills. Follow the marshals — they will wave you through.",
    "Grass surface and a longer walk. If you need a shorter walk, tell a marshal at the vehicle entry."],
  ["meet-point", "Meet-Up Point", "amenity", 80, 56,
    "By the tennis court, next to the guest entry. The agreed place to meet if your group gets separated.",
    "Clearly signed, sheltered, and visible from the entry."],
  ["garden-toilet", "Garden Toilet", "amenity", 80, 72,
    "Additional toilet beside the garden and VIP guest waiting area.",
    "Portable toilet on level ground. Use the ANMC toilet for full wheelchair access."]
];

export const locations: Location[] = locationRows.map(([id, name, type, mapX, mapY, description, access]) => ({
  id,
  slug: id,
  type,
  mapX,
  mapY,
  name: { en: name },
  description: { en: description },
  accessibilityNotes: { en: access },
  nearbyLocationIds: ["media-station", "guest-entry"],
  published: true
}));

/* ==================================================================
   SCHEDULE — final event-day run sheet, 09:00–16:00
   Transcribed from the committee's EventDaySheet.docx.
   ================================================================== */

type SchedRow = [string, string, string, string, string, string, string[], boolean?];

const scheduleRows: SchedRow[] = [
  ["arrival-registration", "Participant arrival and registration", "09:00", "09:05", "guest-entry",
    "Welcome tikaa, red and white kapang balla, and traditional music at the entrance.",
    ["community", "music"]],
  ["ganesh-pooja", "Ganesh Pooja — Ganesh worship", "09:05", "09:20", "ganesh-rath",
    "The event day begins with worship of Ganesh.", ["culture"]],
  ["naasa-pooja", "Naasa Pooja — musical instrument worship", "09:20", "09:35", "main-stage",
    "Traditional musical instruments are honoured before the performances begin.", ["culture", "music"]],
  ["mask-worship", "Pulukisi, Lakhe and Jhyalincha Pooja", "09:35", "09:50", "cultural-line",
    "Ceremonial worship of the festival masks and characters.", ["culture", "family"]],
  ["kumari-pooja-morning", "Kumari Pooja — Kumari worship", "09:50", "10:05", "kumari-rath",
    "Morning worship for Kumari before the chariot ceremonies.", ["culture"]],
  ["rath-pooja", "Rath Pooja — chariot worship", "10:05", "10:20", "kumari-rath",
    "The festival chariots are blessed before the procession.", ["culture", "procession"]],
  ["kumari-rathaarohan", "Kumari Rathaarohan — Kumari chariot ride", "10:20", "10:35", "kumari-rath",
    "Kumari ascends the chariot as the procession prepares to move.", ["culture", "procession"], true],
  ["cultural-procession", "Cultural procession and street performances", "10:35", "11:50", "kumari-rath",
    "Lakhe and Pulukisi, the Sukunda rally, Dhimey and Bansuri accompany the procession.",
    ["culture", "procession", "music", "family"], true],
  ["swet-bhairab-pooja", "Swet Bhairab Pooja", "10:45", "10:50", "swet-bhairab",
    "Worship of Swet Bhairab during the cultural procession.", ["culture"]],
  ["kumari-pooja-procession", "Kumari Pooja during the procession", "10:50", "11:50", "kumari-rath",
    "Kumari worship continues as the Rath-pulling programme proceeds.", ["culture", "procession"]],
  ["podium-call", "Call to the podium", "11:50", "11:55", "main-stage",
    "The formal stage programme is about to begin.", ["main-stage", "community"]],
  ["formal-opening", "Formal programme begins", "11:55", "12:00", "main-stage",
    "The MC welcomes guests and opens the formal programme.", ["main-stage", "community"]],
  ["welcome-housekeeping", "Welcome, Acknowledgement of Country and housekeeping", "12:00", "12:05", "main-stage",
    "A welcome to the festival with essential site and safety information.", ["main-stage", "community"]],
  ["panas-lighting", "Panas lighting and national anthem", "12:05", "12:08", "main-stage",
    "Chief guest Basem Abdo MP joins the ceremonial lamp lighting and national anthem.", ["main-stage", "culture"]],
  ["festival-overview", "Opening and festival overview — Ranjan Vaidya", "12:08", "12:10", "main-stage",
    "An overview of the day's festival activities.", ["main-stage", "community"]],
  ["kids-dhimay", "Kids Dhimay performance", "12:10", "12:12", "main-stage",
    "Young performers present traditional Dhimay music.", ["main-stage", "music", "family"], true],
  ["president-welcome", "President's welcome — Maya Prasad Suwal", "12:12", "12:16", "main-stage",
    "The Newa Guthi Victoria president delivers the welcome address.", ["main-stage", "community"]],
  ["chief-guest-address", "Chief guest address — Basem Abdo MP", "12:16", "12:21", "main-stage",
    "Address from the Federal Member for Calwell.", ["main-stage", "community"]],
  ["mass-dhimay", "Mass Dhimay dance performance", "12:21", "12:25", "main-stage",
    "A combined Dhimay performance by the cultural groups.", ["main-stage", "music", "culture"], true],
  ["nirajan-gauli", "Guest address — Nirajan Gauli", "12:25", "12:29", "main-stage",
    "Welcome address from the former Honorary Consul of Nepal to Victoria.", ["main-stage", "community"]],
  ["roshena-campbell", "Guest address — Roshena Campbell", "12:29", "12:36", "main-stage",
    "Address from the Liberal candidate for the Western Metropolitan Region.", ["main-stage", "community"]],
  ["josh-bull", "Guest address — Josh Bull MP", "12:36", "12:39", "main-stage",
    "Address from the State Member for Sunbury.", ["main-stage", "community"]],
  ["john-lister", "Guest address — John Lister MP", "12:39", "12:42", "main-stage",
    "Address from the State Member for Werribee.", ["main-stage", "community"]],
  ["tilak-pokhrel", "Guest address — Tilak Pokhrel", "12:42", "12:45", "main-stage",
    "Address representing the Australian Nepalese Multicultural Centre.", ["main-stage", "community"]],
  ["mahadev-dhanuk", "Guest address — Mahadev Dhanuk", "12:45", "12:48", "main-stage",
    "Address representing NRNA.", ["main-stage", "community"]],
  ["sudip-shrestha", "Guest address — Sudip Shrestha", "12:48", "12:50", "main-stage",
    "Address from the Nepalese Association of Victoria president.", ["main-stage", "community"]],
  ["sponsor-acknowledgement", "Sponsor acknowledgement", "12:50", "13:00", "main-stage",
    "Recognition of the organisations supporting the festival.", ["main-stage", "community"]],
  ["floor-events", "Floor events and Dakshina programme", "13:00", "13:10", "kumari-rath",
    "The formal programme closes and activities move back to the Rath area.", ["procession", "culture"]],
  ["lakhe-pulikisi-rath", "Lakhe, Jhyalincha and Pulukisi near the Rath", "13:10", "13:30", "kumari-rath",
    "Cultural characters, Dhimey and Bansuri perform beside the chariot.", ["culture", "music", "family"], true],
  ["ladies-rath-pulling", "Rath pulling — ladies group", "13:15", "13:30", "kumari-rath",
    "The ladies group leads the first Rath-pulling session.", ["procession", "culture"], true],
  ["senior-samman", "Senior Samman", "13:15", "13:30", "main-stage",
    "A community honour presentation for senior members.", ["main-stage", "community"]],
  ["hatha-haayekegu", "Hatha Haayekegu — refreshment during Rath pulling", "13:20", "13:30", "kumari-rath",
    "A traditional refreshment moment during the procession.", ["procession", "culture", "food"]],
  ["book-launch", "Book launch — Bhim Neupane", "13:30", "13:45", "main-stage",
    "Book launch followed by brief guest remarks.", ["main-stage", "community"]],
  ["floor-cultural-programme", "Cultural activities near the Rath", "13:30", "14:00", "kumari-rath",
    "Lakhe, Jhyalincha and Pulukisi continue their activities near the chariot.", ["culture", "family"]],
  ["gents-rath-pulling", "Rath pulling — gents group", "14:00", "14:30", "kumari-rath",
    "The gents group leads the second Rath-pulling session, with Lakhe and Pulukisi entertainment.",
    ["procession", "culture"], true],
  ["rath-arrival", "Rath reaches its destination", "14:30", "15:00", "kumari-rath",
    "The chariot arrives and the procession concludes with Haathaa Haayekegu and Rasaapan.", ["procession", "culture"]],
  ["lakhe-pulikisi-samay", "Lakhe and Pulukisi dance near Samay Baji", "15:00", "15:30", "samay-vo",
    "Lakhe and Pulukisi perform beside the Samay Baji display.", ["culture", "family"], true],
  ["samay-baji-ceremony", "Lakhe and Samay Baji ceremony", "15:30", "15:45", "samay-vo",
    "The final cultural ceremony takes place around the Samay Baji display.", ["culture", "food"]],
  ["samay-baji-distribution", "Samay Baji distribution", "15:45", "16:00", "samay-vo",
    "Festival guests are invited to receive Samay Baji while supplies last.", ["culture", "food"]],
  ["closing-remarks", "Closing remarks and thank you", "16:00", "16:10", "main-stage",
    "The organisers close the festival and thank guests, volunteers, performers and supporters.", ["main-stage", "community"]]
];

export const schedule: ScheduleItem[] = scheduleRows.map(
  ([id, title, start, end, locationId, summary, categoryIds, highlight]) => ({
    id,
    slug: id,
    title: { en: title },
    summary: { en: summary },
    scheduledStart: at(start),
    scheduledEnd: at(end),
    status: "scheduled" as const,
    locationId,
    categoryIds,
    highlight: Boolean(highlight),
    published: true,
    updatedAt: at("08:00"),
    updatedBy: "Newa Guthi Victoria"
  })
);

export const scheduleCategories = [
  { id: "all", label: "Everything" },
  { id: "main-stage", label: "Main stage" },
  { id: "procession", label: "Processions" },
  { id: "culture", label: "Culture" },
  { id: "music", label: "Music" },
  { id: "family", label: "Family" },
  { id: "food", label: "Food" },
  { id: "community", label: "Community" }
];

/* ==================================================================
   CULTURAL TRAIL — 12 stops
   ================================================================== */

type TrailRow = {
  slug: string;
  title: string;
  native?: string;
  say?: string;
  locationId: string;
  image?: string;
  teaser: string;
  body: string;
  why: string;
  lookFor: string;
  related?: string[];
};

const trailRows: TrailRow[] = [
  {
    slug: "indra-dyah",
    title: "Indra, Caught and Bound",
    native: "इन्द्र द्यः",
    say: "IN-dra DYAH",
    locationId: "god-indra",
    teaser: "The only festival in the world that begins by arresting a god.",
    body:
      "Indra is the king of heaven. The story goes that he came down to the Kathmandu Valley in disguise, dressed as an ordinary farmer, to pick parijat — night-flowering jasmine — for a ritual his mother Basundhara needed to complete. He was caught in someone's garden, taken for a common thief, tied up, and put on public display.\n\nHis mother came looking for him. When the people of the valley realised whose hands they had bound, they let him go. Before leaving, the family made two promises in return: enough dew and mist to see the crops through the dry months, and safe passage to heaven for everyone who had died in the valley that year.\n\nThe figure you are standing in front of shows Indra exactly as he was caught — arms stretched wide, wrists bound. Not the god enthroned. The god embarrassed.",
    why:
      "Most festivals put their gods on a pedestal. This one keeps Indra tied up in a public square for eight days, and the whole city comes to look. It is a very Newa idea: the divine and the everyday are not separate worlds, and even a god can be humbled by farmers who catch him in the wrong garden.",
    lookFor: "The open, outstretched arms. In Kathmandu this image is displayed at Maru and Indra Chowk for the length of the festival.",
    related: ["swet-bhairab", "pulukisi"]
  },
  {
    slug: "swet-bhairab",
    title: "Swet Bhairab",
    native: "श्वेत भैरव",
    say: "SHWET bhai-RAB",
    locationId: "swet-bhairab",
    image: "/images/trail/swet-bhairab.jpg",
    teaser: "A face kept behind a screen for 357 days of the year.",
    body:
      "Swet Bhairab is the white, fierce form of Shiva — bulging eyes, bared fangs, a crown of skulls. In Kathmandu the great gilded mask stands at Hanuman Dhoka behind a wooden lattice, hidden almost the entire year. It is uncovered for Indra Jatra and covered again when the festival ends.\n\nWhen the screen comes down, rice beer runs from a pipe set in the mask's mouth, and the crowd presses forward to drink straight from it. Getting a mouthful is considered good fortune worth the crush.\n\nBhairab is frightening on purpose. He is a guardian. The terror is pointed outward, at whatever might harm the city, not at the people standing in front of him.",
    why:
      "The mask is a measure of the year. Its uncovering says the festival has started; its covering says the festival is over. Bringing that rhythm to Melbourne is how a community keeps a calendar that is not the one on the office wall.",
    lookFor: "The third eye, the skull crown, and the wide silver eyes. Look for the pipe at the mouth in photographs from Kathmandu.",
    related: ["indra-dyah", "lakhey"]
  },
  {
    slug: "ganesh-rath",
    title: "The Ganesh Chariot",
    native: "गणेश रथ",
    say: "ga-NESH RATH",
    locationId: "ganesh-rath",
    image: "/images/trail/ganesh-rath.jpg",
    teaser: "Brand new for 2026, and built here in Melbourne.",
    body:
      "Three chariots ride in the Kathmandu procession: Ganesh, Bhairab and Kumari. Ganesh goes first. He is the remover of obstacles, and no procession, wedding or new venture starts without him.\n\nThis chariot is new. The community built it this year specifically so that Melbourne's Indra Jatra could carry a full procession rather than a partial one — the single biggest addition to the 2026 festival.\n\nThe chariots are pulled by hand, by whoever takes hold of the rope. There is no crew and no ticket. That is the point: the procession only moves if enough people show up and pull.",
    why:
      "A chariot is a large, awkward, expensive object that serves no purpose for 364 days a year. Building one anyway, in a country on the other side of the world from where the tradition started, is a community saying it intends to still be here in twenty years.",
    lookFor: "Fresh paint and new timber. The tiered roof, marigold garlands and the long wooden pulling beams at the front.",
    related: ["kumari-rath", "newa-guthi"]
  },
  {
    slug: "kumari-rath",
    title: "The Kumari Chariot",
    native: "कुमारी रथ",
    say: "koo-MAH-ree RATH",
    locationId: "kumari-rath",
    image: "/images/trail/kumari-rath.jpg",
    teaser: "A king started this procession in 1756. It has not missed a year since.",
    body:
      "Kumari Jatra — the chariot procession that now defines Indra Jatra — was added by King Jaya Prakash Malla in the middle of the eighteenth century. It runs over three days in Kathmandu, taking a different route through the old city each day so that every neighbourhood gets its turn.\n\nThe rope is the whole event. Hundreds of hands, mostly young men but increasingly everyone, haul the chariot metre by metre through streets barely wider than it is. There are collisions. There is shouting. Nobody is in charge in the way an event manager would understand.\n\nAt Melbourne's festival the route is shorter and the crowd smaller, but the rule is the same. If you want to be part of it, take the rope.",
    why:
      "In Kathmandu the procession is how the city checks on itself once a year — every quarter visited, every neighbourhood counted. A diaspora community has no old city to walk through, so the circuit around this site does the same work: it draws a line around who is here.",
    lookFor: "The thick pulling rope and the rows of hands on it. Women in black-and-red haku patasi pulling together is now one of the defining images of the Melbourne festival.",
    related: ["ganesh-rath", "kumari"]
  },
  {
    slug: "kumari",
    title: "The Living Goddess",
    native: "कुमारी",
    say: "koo-MAH-ree",
    locationId: "kumari-rath",
    image: "/images/trail/kumari.jpg",
    teaser: "A child chosen as a goddess, who goes back to being a child.",
    body:
      "The Kumari is a young girl, selected from the Shakya community, who is believed to hold the living presence of the goddess Taleju. She is chosen very young against a long list of physical and temperamental signs, and — the part everybody remembers — she must not be frightened by the dark or by loud noise.\n\nDuring Indra Jatra the Kumari leaves her house and rides the chariot through the city. Enormous crowds come for a glimpse. Historically even the king came to receive her blessing.\n\nHer term ends at puberty. A new Kumari is chosen, and the former Kumari returns to ordinary life, to school, to her family.",
    why:
      "The Kumari is the clearest example of something Newa culture does constantly: it locates the sacred in a living person rather than in a statue, and then it hands that role on. The divinity is real, and it is temporary, and that is not a contradiction.",
    lookFor: "The painted fire eye on the forehead, the red silk, and the heavy gold-and-silver headdress. At Melbourne's festival a child from the community takes the role.",
    related: ["kumari-rath", "lakhey"]
  },
  {
    slug: "lakhey",
    title: "Lakhey, the Demon Who Changed Sides",
    native: "लाखे",
    say: "LAH-kay",
    locationId: "main-stage",
    image: "/images/trail/lakhey.jpg",
    teaser: "A demon who fell in love with the city and stayed to protect its children.",
    body:
      "Majipa Lakhey is a demon from the forest. The story is that he followed a woman he loved into Kathmandu and asked to stay. The city agreed on one condition — that he take part in the festival and protect the children of the quarter. He has been doing it ever since.\n\nThe Lakhey dances alone, in a heavy red mask with a mane of hair, moving in sudden bursts and long prowling stalks. He dances to his own rhythm, the Lakhey baja, and the drummers follow him rather than the other way round. He will charge at the crowd. Children scream and run and then immediately come back for more.\n\nThe dancer is usually from a specific family and the role is inherited.",
    why:
      "Lakhey is what the Newa tradition does with things that frighten people: rather than banishing them, it gives them a job, a costume and a place in the calendar. The monster becomes the guardian without ever stopping being a monster.",
    lookFor: "The red mask with gold fangs and the wild red mane. Watch the drummers — they are following his feet.",
    related: ["swet-bhairab", "dhimey"]
  },
  {
    slug: "pulukisi",
    title: "Pulukisi, the Elephant Who Lost His Master",
    native: "पुलुकिसि",
    say: "poo-loo-KEE-see",
    locationId: "cultural-line",
    image: "/images/trail/pulukisi.jpg",
    teaser: "He is not performing. He is genuinely still looking for Indra.",
    body:
      "When Indra came down to the valley, he came on his elephant. Indra was caught and tied up; the elephant was not. So Pulukisi went looking for him — through the streets, into courtyards, around corners, refusing to accept that his master was gone.\n\nThat search is what you are watching. Pulukisi runs at the crowd, swings his trunk, pushes into gaps, and never settles anywhere for long. Two people are inside the frame, which is why the movement looks the way it does.\n\nHe is easily the favourite of every child at the festival, and reliably terrifying to a few of them.",
    why:
      "The whole Indra story is told through the eyes of the people who caught him, except for this. Pulukisi is the one character who simply misses someone. It is the emotional centre of the festival hiding inside the funniest part of it.",
    lookFor: "The white body, the painted flowers, the long swinging trunk, and the two pairs of feet underneath.",
    related: ["indra-dyah", "dhimey"]
  },
  {
    slug: "dhimey",
    title: "Dhimey Baja",
    native: "धिमय् बाजा",
    say: "DHEE-may BAH-ja",
    locationId: "main-stage",
    image: "/images/trail/dhimey.jpg",
    teaser: "The drum that tells you the festival has started, from three streets away.",
    body:
      "The dhimey is a wide, two-headed cylindrical drum worn at the hip. One head is struck with a curved stick, the other with the open palm — two different voices from one instrument. It is played in a group, never alone, and paired with bhusya, the heavy hand cymbals that cut across the top of it.\n\nEach rhythm has a name and a purpose. Some belong to a particular procession, some to a particular deity, some only to a particular time of year. Players learn them by ear and by repetition, standing next to someone who already knows them.\n\nNewa Guthi Victoria runs weekly Dhimey classes in Melbourne. Several of the players you will hear today started in that room.",
    why:
      "The rhythms are the part of this tradition most easily lost in migration — they are not written down, and they only survive if somebody in Melbourne is willing to teach them on a Sunday. Every player on the field today is a small argument that they will survive.",
    lookFor: "The stick in one hand, the bare palm on the other head, and the cymbal players watching the lead drummer's shoulders for the change.",
    related: ["bansuri", "lakhey"]
  },
  {
    slug: "bansuri",
    title: "Bansuri and Bhusya",
    native: "बाँसुरी",
    say: "bahn-SOO-ree",
    locationId: "anmc",
    teaser: "The quiet half of Newa music, which almost nobody notices until it stops.",
    body:
      "Against the weight of the drums sits the bansuri — a simple side-blown bamboo flute with no keys and no reed, played entirely with the fingers and the breath. In Newa processional music it carries the melody that the percussion is built around.\n\nBhusya, the thick bronze cymbals, sit in between: loud enough to be heard over the dhimey, precise enough to mark every turn in the rhythm.\n\nNewa Guthi Victoria teaches bansuri, dhimey and bhusya weekly in Melbourne, to children and adults. The classes are open to anyone, whether or not you have any Newa background at all.",
    why:
      "Instruments are the easiest part of a culture to carry across an ocean and the hardest to keep playing once you arrive. A weekly class in a suburban hall is not a small thing — it is the mechanism by which the music is still here in thirty years.",
    lookFor: "Bamboo with six finger holes and no keys. Ask a player to let you try one — they usually will.",
    related: ["dhimey", "newa-guthi"]
  },
  {
    slug: "samay-baji",
    title: "Samay Baji",
    native: "समय् बजि",
    say: "sa-MAY BA-jee",
    locationId: "samay-vo",
    image: "/images/trail/samay-baji.jpg",
    teaser: "A plate where every single item is there for a reason.",
    body:
      "Samay Baji is the ritual Newa plate, served at every feast, festival and rite of passage. Nothing on it is decoration.\n\nAt the centre is baji — beaten rice, flattened and dried, the staple that keeps. Around it: black soybeans, roasted and salted; wo, a thick lentil pancake; a strip of marinated buffalo or chicken choila, grilled and dressed with mustard oil and chilli; a boiled egg; a slice of ginger and a clove of garlic; and, traditionally, aila, the home-distilled spirit.\n\nThe combination is not arbitrary. Each element carries a meaning in Newa practice, and the plate is shared rather than eaten alone — the sharing is half of what makes it Samay Baji rather than lunch.",
    why:
      "You can lose a language in one generation and a festival in two, but food goes last. For a lot of Newa families in Melbourne, this plate is the most regular contact their children have with the culture.",
    lookFor: "The flattened rice in the centre, and the arrangement around it. Ask at the display table which item does what.",
    related: ["newa-guthi", "yenya-story"]
  },
  {
    slug: "newa-guthi",
    title: "What a Guthi Actually Is",
    native: "गुथि",
    say: "GOO-tee",
    locationId: "anmc",
    image: "/images/trail/newa-guthi.jpg",
    teaser: "The reason any of this still exists.",
    body:
      "A guthi is a Newa social institution — a trust, a roster and an obligation rolled into one. Traditionally, a guthi owned land, and the income from that land paid for a specific duty: maintaining a temple, running a festival, carrying out funeral rites, repairing a courtyard. Membership was inherited. If it was your family's turn, you turned up.\n\nIt is how the Kathmandu Valley kept hundreds of festivals running for centuries without a government arts budget. No guthi, no festival.\n\nNewa Guthi Victoria was established in 2024 and launched at Nhu Daya Bhintuna. It has no land. What it has instead is a membership, a weekly class timetable, and a group of people who keep saying yes — which turns out to be the part that actually mattered all along.",
    why:
      "Every performance, chariot, costume and plate of food at this festival exists because a guthi organised it. Understanding the guthi is understanding why a volunteer community can do what it does.",
    lookFor: "The Newa Guthi Victoria desk in the ANMC building. Ask about membership, the weekly classes, or volunteering for next year.",
    related: ["samay-baji", "yenya-story"]
  },
  {
    slug: "yenya-story",
    title: "Why It Is Called Yenya",
    native: "येँया पुन्हि",
    say: "YEN-ya POON-hee",
    locationId: "main-stage",
    image: "/images/trail/yenya-story.jpg",
    teaser: "The festival of Yen — which is what Kathmandu calls itself.",
    body:
      "In Nepal Bhasa, Kathmandu is Yen. Ya means a celebration. Yenya is simply \"the festival of Kathmandu\" — not one festival among many, but the festival, the one the city is named in.\n\nPunhi means full moon. Yenya Punhi is the full-moon day at the heart of it.\n\nIn Kathmandu the festival runs eight days. It opens with the raising of the yosin, a tall wooden pole planted at Hanuman Dhoka, and closes when the pole comes down. In between: the chariots, the masked dances, Swet Bhairab uncovered, families lighting lamps for relatives who died during the year, and a city that stops working and goes outside.\n\nMelbourne's version fits into one Saturday. Everything else about it is the same.",
    why:
      "A festival named after a city, held by people who live eleven thousand kilometres from it, is a fair definition of what diaspora means. This day is Kathmandu's festival, held at Diggers Rest, and both of those facts are true at once.",
    lookFor: "The main stage program. Almost every item on it maps onto something that happens across eight days in Kathmandu.",
    related: ["indra-dyah", "newa-guthi"]
  }
];

export const trailPoints: TrailPoint[] = trailRows.map((row, index) => ({
  id: `trail-${index + 1}`,
  number: index + 1,
  slug: row.slug,
  qrCodes: [row.slug, `ij26-${row.slug}`],
  title: { en: row.title },
  nativeName: row.native,
  pronunciation: row.say,
  teaser: { en: row.teaser },
  body: { en: row.body },
  whyItMatters: { en: row.why },
  lookFor: { en: row.lookFor },
  locationId: row.locationId,
  heroMedia: row.image ? { src: row.image, alt: { en: row.title }, credit: "Newa Guthi Victoria" } : undefined,
  relatedTrailPointIds: row.related,
  sources: [{ label: "Newa Guthi Victoria cultural committee" }],
  reviewStatus: "reviewed",
  published: true
}));

/* ==================================================================
   DIRECTORY — stallholders confirmed via the 2026 EOI process
   ================================================================== */

export const listings: Listing[] = [
  {
    id: "pasa-ya-kitchen", slug: "pasa-ya-kitchen", name: "Pasa Ya Kitchen",
    listingType: "food", categories: ["Stall 8", "Newari kitchen"],
    description: { en: "Newari food served from stall 8 in the marquee row." },
    locationId: "market-row",
    logo: "/brand/vendors/pasa-ya-kitchen.png",
    confirmed: true, published: true
  },
  {
    id: "purbeli-food-truck", slug: "purbeli-food-truck", name: "Purbeli Food Truck",
    listingType: "food", categories: ["Nepali food", "Food truck"],
    description: { en: "Nepali food served from the festival food-truck area." },
    locationId: "food-trucks", logo: "/brand/vendors/purbeli-food-truck.jpg",
    confirmed: true, published: true
  },
  {
    id: "mandala-dine-in", slug: "mandala-dine-in", name: "Mandala Dine In",
    listingType: "food", categories: ["Stall 2", "Newari kitchen"],
    description: { en: "Newari food served from stall 2 in the marquee row." },
    locationId: "market-row", logo: "/brand/vendors/mandala-dine-in.jpg",
    confirmed: true, published: true
  },
  {
    id: "mda-twista", slug: "mda-twista", name: "MDA Twista Potato",
    listingType: "food", categories: ["Snacks", "Vegetarian"],
    description: { en: "Twist potatoes served fresh from the food-truck area." },
    locationId: "food-trucks", logo: "/brand/vendors/mda-twista-potato.jpg",
    confirmed: true, published: true
  },
  {
    id: "twist-spot", slug: "twist-spot", name: "The Twist Spot",
    listingType: "food", categories: ["Snacks", "Vegetarian"],
    description: { en: "Twist potatoes served fresh from the food-truck area." },
    locationId: "food-trucks", logo: "/brand/vendors/the-twist-spot.jpg",
    confirmed: true, published: true
  },
  {
    id: "evaryde-gelato", slug: "evaryde-gelato", name: "Evaryde Gelato",
    listingType: "food", categories: ["Gelato", "Food truck"],
    organiserNotes: ["Electricity requested"],
    description: { en: "Gelato and ice cream served from the food-truck area." },
    locationId: "food-trucks", logo: "/brand/vendors/evaryde-gelato.jpg",
    confirmed: true, published: true
  },
  {
    id: "9-meal-cafe", slug: "9-meal-cafe", name: "9 Meal Cafe",
    listingType: "food", categories: ["Stall 5", "Nepalese food"],
    description: { en: "Authentic Nepalese food served from stall 5 in the marquee row." },
    locationId: "market-row", logo: "/brand/vendors/9-meal-cafe.jpg",
    confirmed: true, published: true
  },
  {
    id: "butta-studio", slug: "butta-studio", name: "Butta Studio",
    listingType: "market", categories: ["Stall 7", "Market stall"],
    description: { en: "A confirmed festival market stall in the marquee row." },
    locationId: "market-row", logo: "/brand/vendors/butta-studio.jpg",
    confirmed: true, published: true
  },
  {
    id: "newari-family-attire", slug: "newari-family-attire", name: "Newari Family Attire",
    listingType: "market", categories: ["Stall 6", "Clothing", "Market stall"],
    description: { en: "Newari attire available from stall 6 in the festival marquee row." },
    locationId: "market-row", logo: "/brand/vendors/newari-family-attire.jpg",
    confirmed: true, published: true
  },
  {
    id: "nep-mart", slug: "nep-mart", name: "Nepmart (Indreni Sunshine)",
    listingType: "market", categories: ["Stall 4", "Groceries", "Tea", "Market stall"],
    description: { en: "Nepali groceries and tea available from stall 4 in the festival marquee row." },
    locationId: "market-row", logo: "/brand/vendors/nep-mart.jpg",
    confirmed: true, published: true
  },
  {
    id: "ngv-desk", slug: "ngv-desk", name: "Newa Guthi Victoria",
    listingType: "community", categories: ["Stall 1", "Community", "Classes"],
    description: { en: "Membership, weekly Dhimey, Bhusya Baja, Bansuri and Newa dance classes, and volunteering for next year's festival. Come and say hello." },
    locationId: "market-row", logo: "/brand/ngv-logo.png", confirmed: true, published: true
  },
  {
    id: "nepthic", slug: "nepthic", name: "Nepthic Logic",
    listingType: "market", categories: ["Stall 3", "Market stall"],
    description: { en: "Visit Nepthic Logic at stall 3 in the festival marquee row." },
    locationId: "market-row", logo: "/brand/vendors/nepthic-logic.png",
    confirmed: true, published: true
  },
  {
    id: "eshan-it-stall", slug: "eshan-it-stall", name: "Eshan IT",
    listingType: "market", categories: ["Stall 9", "Sponsor stall"],
    description: { en: "Visit Eshan IT in the festival marquee row." },
    locationId: "market-row", logo: "/brand/sponsors/gold-eshan-it.png",
    confirmed: true, published: true
  },
  {
    id: "accent-windows", slug: "accent-windows", name: "Accent Windows",
    listingType: "market", categories: ["Stall 10", "Market stall"],
    description: { en: "Accent Aluminium Windows & Doors at stall 10 in the festival marquee row." },
    locationId: "market-row", logo: "/brand/vendors/accent-windows.webp",
    confirmed: true, published: true
  },
  {
    id: "meme-sweet-decorations", slug: "meme-sweet-decorations", name: "Meme Sweet Decorations",
    listingType: "market", categories: ["Stall 11", "Market stall"],
    description: { en: "Visit Meme Sweet Decorations at stall 11 in the festival marquee row." },
    locationId: "market-row", logo: "/brand/vendors/stall-11-logo.png",
    confirmed: true, published: true
  },
  {
    id: "aherb", slug: "aherb", name: "Aherb",
    listingType: "market", categories: ["Stall 12", "Market stall"],
    description: { en: "Visit Aherb at stall 12 in the festival marquee row." },
    locationId: "market-row", logo: "/brand/vendors/aherb.jpeg",
    confirmed: true, published: true
  },
  {
    id: "nab-stall", slug: "nab-stall", name: "NAB",
    listingType: "market", categories: ["Stall 13", "Sponsor stall", "BYO gazebo"],
    description: { en: "Visit NAB at stall 13. NAB will bring its own gazebo for this space." },
    locationId: "market-row", logo: "/brand/sponsors/platinum-nab.png",
    confirmed: true, published: true
  },
  {
    id: "grace-international-stall", slug: "grace-international-stall", name: "Grace International",
    listingType: "market", categories: ["Stall 15", "Sponsor stall"],
    description: { en: "Visit Grace International in the festival marquee row." },
    locationId: "market-row", logo: "/brand/sponsors/gold-grace-international.png",
    confirmed: true, published: true
  },
  {
    id: "your-dream-home-stall", slug: "your-dream-home-stall", name: "Your Dream Home Conveyancing",
    listingType: "market", categories: ["Stall 16", "Sponsor stall"],
    description: { en: "Visit Your Dream Home Conveyancing in the festival marquee row." },
    locationId: "market-row", logo: "/brand/sponsors/gold-your-dream-home-conveyancing.png",
    confirmed: true, published: true
  },
  {
    id: "expert-education-stall", slug: "expert-education-stall", name: "Expert Education | Visa",
    listingType: "market", categories: ["Stall 17", "Sponsor stall"],
    description: { en: "Visit Expert Education | Visa in the festival marquee row." },
    locationId: "market-row", logo: "/brand/sponsors/gold-expert-education-visa.png",
    confirmed: true, published: true
  },
  {
    id: "maximax-stall", slug: "maximax-stall", name: "MaxiMax Education & Migration Services",
    listingType: "market", categories: ["Stall 18", "Sponsor stall"],
    description: { en: "Visit MaxiMax Education & Migration Services in the festival marquee row." },
    locationId: "market-row", logo: "/brand/sponsors/gold-maximax-education-migration-services.png",
    confirmed: true, published: true
  },
  {
    id: "alliance-stall", slug: "alliance-stall", name: "Alliance Estate Agents",
    listingType: "market", categories: ["Stall 20", "Sponsor stall"],
    description: { en: "Visit Alliance Estate Agents in the festival marquee row." },
    locationId: "market-row", logo: "/brand/sponsors/contributor-alliance-estate-agents.png",
    confirmed: true, published: true
  },
  {
    id: "info-desk", slug: "info-desk", name: "Media Station — Information",
    listingType: "community", categories: ["Community", "Help"],
    description: { en: "Lost property, lost children, first aid directions, program questions and volunteer check-in. Staffed all day." },
    locationId: "media-station", confirmed: true, published: true
  }
];

/* ==================================================================
   SPONSORS — the businesses paying for a festival that is free at
   the gate. Logos and tiers come from the 2026 sponsor pack.
   ================================================================== */

type SponsorTier =
  | "Platinum"
  | "Gold"
  | "Silver"
  | "Photography Partner"
  | "Community Supporters"
  | "Valued Contributor";

type SponsorRow = [string, string, SponsorTier, string?];

const sponsorRows: SponsorRow[] = [
  ["nab", "NAB", "Platinum", "platinum-nab.png"],
  ["better-choice", "Better Choice Mortgage + Finance", "Gold", "gold-better-choice-mortgage-finance.png"],
  ["eshan-it", "Eshan IT", "Gold", "gold-eshan-it.png"],
  ["everest-gardens", "Everest Gardens Landscapes", "Gold", "gold-everest-garden-landscape.png"],
  ["everest-refrigeration", "Everest Refrigeration & Air Conditioning", "Gold", "gold-everest-refrigeration-air-conditioning.png"],
  ["expert-education", "Expert Education | Visa", "Gold", "gold-expert-education-visa.png"],
  ["grace-international", "Grace International", "Gold", "gold-grace-international.png"],
  ["maximax", "MaxiMax Education & Migration Services", "Gold", "gold-maximax-education-migration-services.png"],
  ["sierra-homes", "Sierra Homes", "Gold", "gold-sierra-homes.png"],
  ["your-dream-home", "Your Dream Home Conveyancing", "Gold", "gold-your-dream-home-conveyancing.png"],
  ["solve-education", "Solve Education Consultancy", "Gold", "silver-solve-education.jpg"],
  ["everest-home-loans", "Everest Home Loans", "Gold", "silver-everest-home-loans.jpeg"],
  ["jeni-homes", "Jeni Homes", "Silver", "silver-jeni-homes.jpeg"],
  ["maven-consultancy", "Maven Consulting Group", "Silver", "silver-maven-consulting-group.png"],
  ["sunrise-energy", "Sunrise Saves Energy", "Silver", "silver-sunrise-saves-energy.jpg"],
  ["derrimut-butcher", "Derrimut Butcher", "Silver", "silver-derrimut-butcher.png"],
  ["sapphire-estate", "Sapphire Estate Agents", "Silver", "silver-sapphire-estate-agents.png"],
  ["st-aust-cares", "St Aust Cares", "Silver", "silver-st-aust-cares.png"],
  ["supreme-mortgage", "Supreme Mortgage & Finance", "Silver", "silver-supreme-mortgage-finance.png"],
  ["apbiz-solutions", "APBiz Solutions", "Silver", "silver-apbiz-solutions.png"],
  ["colorate-prints", "Colorate Prints", "Silver", "silver-colorate-signs.png"],
  ["elite-curtains", "Elite Curtains and Blinds", "Silver", "silver-elite-curtains-blinds.jpeg"],
  ["rs-painting", "RS Painting & Maintenance", "Silver", "silver-rs-painting-maintenance.jpeg"],
  ["capkon-home-loans", "Capkon Home Loans", "Silver", "silver-capkon-home-loans.jpeg"],
  ["mit", "Melbourne Institute of Technology", "Silver", "silver-mit.png"],
  ["preferred-consultancy", "Preferred Education & Migration Consultants", "Silver", "silver-preferred-education.png"],
  ["central-australian-college", "Central Australian College", "Silver", "silver-central-australian-college.png"],

  ["nepali-mate", "Nepali Mate", "Photography Partner", "photography-nepali-mate.png"],
  ["dms", "DMS", "Photography Partner"],

  ["nrna-victoria", "NRNA SCC Victoria", "Community Supporters"],
  ["nav", "Nepalese Association of Victoria", "Community Supporters"],
  ["nmc", "Nepali Community Centre", "Community Supporters", "supporter-nepali-community-centre.jpeg"],
  ["hume-city", "Hume City Council", "Community Supporters", "supporter-hume-city-council.jpeg"],

  ["alliance-estate-agents", "Alliance Estate Agents", "Valued Contributor", "contributor-alliance-estate-agents.png"]
];

export const sponsors: Listing[] = sponsorRows.map(([id, name, tier, logo]) => ({
  id: `sponsor-${id}`,
  slug: id,
  name,
  listingType: "sponsor" as const,
  categories: [tier],
  sponsorTier: tier,
  logo: logo ? `/brand/sponsors/${logo}` : undefined,
  confirmed: true,
  published: true
}));

/* ==================================================================
   ANNOUNCEMENTS
   ================================================================== */

export const announcements: Announcement[] = [
  {
    id: "welcome",
    title: { en: "Welcome to Yenya Punhi Melbourne" },
    message: { en: "Entry is free. Grab a coffee, find the Media Station, and follow the drums." },
    severity: "info", startsAt: at("09:30"), endsAt: at("11:00"), published: true
  },
  {
    id: "sun",
    title: { en: "Spring sun — bring a hat" },
    message: { en: "Most of the site is open ground with little shade. Water is available at the food trucks and there is a shaded quiet space in the Garden." },
    severity: "update", startsAt: at("09:00"), published: true
  },
  {
    id: "rope",
    title: { en: "Anyone can pull the chariot" },
    message: { en: "You do not need to be invited and you do not need to be Newa. Take the rope, listen to the marshals, and keep children off the wheels." },
    severity: "update", startsAt: at("11:00"), published: false
  },
  {
    id: "emergency-template",
    title: { en: "Emergency notice" },
    message: { en: "Reserved for genuine emergencies only. Publishing this shows a full-width red banner on every screen in the app." },
    severity: "emergency", startsAt: at("09:00"), published: false
  }
];

/* ==================================================================
   PRACTICAL INFORMATION
   ================================================================== */

export const infoCards: InfoCard[] = [
  {
    id: "emergency", icon: "police",
    title: { en: "Life-threatening emergency" },
    body: { en: "Call 000. Tell the operator you are at the Australian Nepalese Multicultural Centre, 100 Duncans Lane, Diggers Rest VIC 3427, then send someone to the guest entry to meet the ambulance." },
    action: { label: "Call 000", href: "tel:000" }
  },
  {
    id: "first-aid", icon: "firstaid",
    title: { en: "First aid" },
    body: { en: "Qualified first aiders are on site all day at the First Aid tent, on the eastern display line between Baby Change and the Samay Baji display. Any volunteer in a hi-vis vest can walk you there." },
    locationId: "first-aid"
  },
  {
    id: "lost", icon: "lost",
    title: { en: "Lost child or lost property" },
    body: { en: "Go straight to the Media Station in the centre of the site. Tell any volunteer — they will radio it in immediately. Agree a meeting point with your group when you arrive: the Meet-Up Point by the tennis court is the easiest one to find." },
    locationId: "media-station"
  },
  {
    id: "access", icon: "access",
    title: { en: "Accessibility" },
    body: { en: "The site is flat with firm ground throughout. The accessible toilet is inside the ANMC building. Accessible parking bays are at the eastern end of the general car park, closest to the entry — ask a marshal at the vehicle entry. A seated viewing area with a clear view of the stage is kept to the left of the main stage." },
    locationId: "anmc"
  },
  {
    id: "toilets", icon: "toilet",
    title: { en: "Toilets" },
    body: { en: "Main block beside the ANMC building, with extra toilets a little further west that usually have a shorter queue. Baby change and a screened feeding space are on the eastern display line." },
    locationId: "toilets"
  },
  {
    id: "parking", icon: "parking",
    title: { en: "Parking and getting here" },
    body: { en: "Free parking on site. Enter from Duncans Lane and follow the marshals — the main car park is a two-minute walk from the entry, and overflow parking opens when it fills. Traffic runs one way through the site." },
    action: { label: "Open in Maps", href: "https://maps.google.com/?q=Australian+Nepalese+Multicultural+Centre+100+Duncans+Ln+Diggers+Rest+VIC+3427" },
    locationId: "parking"
  },
  {
    id: "quiet", icon: "quiet",
    title: { en: "Quiet space" },
    body: { en: "The Garden, behind the tennis court on the eastern side, is shaded and well away from the speakers. Use it for a break, for feeding, or if the crowd and the drums get to be too much." },
    locationId: "garden"
  },
  {
    id: "water", icon: "water",
    title: { en: "Water and food" },
    body: { en: "All hot food and drinks are along the western edge at the food trucks. Please note that no food or drink is permitted north of the marked line past the Media Station — signage on site makes this clear." },
    locationId: "food-trucks"
  }
];

export const faqs: FaqItem[] = [
  { id: "cost", q: { en: "How much does it cost to get in?" },
    a: { en: "Nothing. Entry is free for everyone, and there is no ticket to book or show." } },
  { id: "who", q: { en: "Do I need to be Newa or Nepali to come?" },
    a: { en: "No. This is a public multicultural festival and everybody is welcome — including taking the chariot rope." } },
  { id: "kids", q: { en: "Is it good for young children?" },
    a: { en: "Yes. There is face painting, a children's showcase at 1:45pm, and Pulukisi, which is the highlight of the day for most kids. Baby change and a feeding space are on site. Note that Lakhey and Pulukisi both charge at the crowd — some very young children find it frightening at first." } },
  { id: "dogs", q: { en: "Can I bring my dog?" },
    a: { en: "Please leave pets at home. Assistance animals are always welcome." } },
  { id: "weather", q: { en: "What happens if it rains?" },
    a: { en: "The festival goes ahead. The ANMC building provides indoor shelter, and the stage program may be re-ordered — check this app, which updates live." } },
  { id: "cash", q: { en: "Do stalls take card?" },
    a: { en: "Most do, but mobile reception at Diggers Rest can be patchy. Bringing some cash is a good idea." } },
  { id: "volunteer", q: { en: "How do I help next year?" },
    a: { en: "Talk to the Newa Guthi Victoria desk in the ANMC building, or email info@newaguthi.org.au. Volunteers, performers and committee members are all needed." } }
];

/* ==================================================================
   ROUTES
   ================================================================== */

export const routes: MapRoute[] = [
  { id: "entry-stage", fromLocationId: "guest-entry", toLocationId: "main-stage",
    steps: [{ en: "From the guest entry, turn left and walk along the front of the ANMC building. The stage is directly ahead, about 60 metres." }],
    accessibleNotes: { en: "Step-free the whole way on a firm path." } },
  { id: "entry-first-aid", fromLocationId: "guest-entry", toLocationId: "first-aid",
    steps: [{ en: "From the guest entry, head north along the eastern tree line past the chariots and the cultural displays. First Aid is the marked tent between the Samay Baji display and Baby Change." }],
    accessibleNotes: { en: "Firm ground all the way. Around 120 metres." } },
  { id: "stage-food", fromLocationId: "main-stage", toLocationId: "food-trucks",
    steps: [{ en: "From the stage, walk north past the Media Station and continue to the western edge. The food trucks run the length of that side." }] },
  { id: "entry-toilets", fromLocationId: "guest-entry", toLocationId: "toilets",
    steps: [{ en: "Walk west along the front of the ANMC building. The toilet block is at the far end, with extra toilets just beyond it." }],
    accessibleNotes: { en: "The accessible toilet is inside the ANMC building, on the left as you enter." } }
];

/* ==================================================================
   EVENT
   ================================================================== */

export const seedData: FestivalData = {
  event: {
    id: "ij26",
    name: { en: "Indra Jatra — Yenya Punhi Melbourne 2026" },
    shortName: { en: "Indra Jatra Melbourne" },
    tagline: { en: "Celebrate culture. Support community." },
    intro: {
      en: "Kathmandu's biggest street festival, held for one Saturday at Diggers Rest. Two chariots, a masked demon, an elephant looking for his master, and the drums that hold it all together."
    },
    startAt: at("09:00"),
    endAt: at("16:10"),
    timezone: "Australia/Melbourne",
    venueName: "Australian Nepalese Multicultural Centre",
    venueAddress: "100 Duncans Ln, Diggers Rest VIC 3427",
    venueMapsUrl: "https://maps.google.com/?q=Australian+Nepalese+Multicultural+Centre+100+Duncans+Ln+Diggers+Rest+VIC+3427",
    entryCost: { en: "Free entry for all" },
    heroMedia: {
      src: "/images/festival-hero.jpg",
      alt: { en: "Pulukisi, the white elephant, dancing through the crowd at Indra Jatra Melbourne 2025" },
      credit: "Indra Jatra — Yenya Punhi Melbourne 2025"
    },
    organiser: "Newa Guthi Victoria",
    brandName: "Newa Guthi Victoria",
    organiserUrl: "https://newaguthi.org.au",
    membershipUrl: "https://newaguthi.org.au/membership",
    newsletterUrl: "https://newaguthi.org.au",
    contactPhone: "+61402556696",
    contactEmail: "info@newaguthi.org.au",
    socials: [{ label: "Facebook & Instagram", url: "https://www.facebook.com/newaguthivictoria" }],
    featureFlags: { aiGuide: false, push: false, volunteerBoard: false, checkIn: false }
  },
  schedule,
  locations,
  trailPoints,
  listings: [...listings, ...sponsors],
  announcements,
  routes,
  infoCards,
  faqs
};
