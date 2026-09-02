export type TreeCandidate = {
  id: string;
  name: string;
  shortName: string;
  colour: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageAlt: string;
  promise: string;
  height: string;
  habitat: string;
  identify: string;
  facts: readonly string[];
  profile: string;
};

export const treeCandidates: readonly TreeCandidate[] = [
  {
    id: "basswood",
    name: "Basswood",
    shortName: "Bw",
    colour: "#d5ae2f",
    image: "https://www.toronto.ca/wp-content/uploads/2026/05/8e65-Basswood-fnl2.png",
    imageWidth: 338,
    imageHeight: 404,
    imageAlt: "The City of Toronto’s smiling yellow Basswood leaf character.",
    promise: "Feeds bees with summer flowers",
    height: "About 20 metres",
    habitat: "Forests and ravines",
    identify: "A big heart-shaped leaf with jagged edges",
    facts: [
      "Its flowers bloom in July. Bees and other pollinators drink their nectar.",
      "People use its smooth wood to make carvings and musical instruments.",
      "Leafy parts called bracts help its seeds float like tiny parachutes.",
    ],
    profile: "https://www.toronto.ca/wp-content/uploads/2026/08/97da-2Basswood-KVW-Candidate-Fact-Sheet-Final.pdf",
  },
  {
    id: "paper-birch",
    name: "Paper Birch",
    shortName: "Pb",
    colour: "#6f913f",
    image: "https://www.toronto.ca/wp-content/uploads/2026/05/868d-Paper-Birch-fnl2.png",
    imageWidth: 247,
    imageHeight: 441,
    imageAlt: "The City of Toronto’s smiling green Paper Birch leaf character.",
    promise: "One of the first trees to grow back",
    height: "About 15 metres",
    habitat: "Forests, ravines and savannahs",
    identify: "White papery bark and leaves with toothy edges",
    facts: [
      "It is often one of the first trees to grow on open land.",
      "Its tiny seeds have wings that help them ride the wind.",
      "People have used its waterproof bark to make canoes, coverings and art.",
    ],
    profile: "https://www.toronto.ca/wp-content/uploads/2026/08/9808-2PaperBirch-KVW-Candidate-Fact-Sheet-Final.pdf",
  },
  {
    id: "red-oak",
    name: "Red Oak",
    shortName: "Ro",
    colour: "#bc4b43",
    image: "https://www.toronto.ca/wp-content/uploads/2026/05/8e71-Red-Oak-fnl2.png",
    imageWidth: 310,
    imageHeight: 427,
    imageAlt: "The City of Toronto’s winking red Red Oak leaf character.",
    promise: "Feeds and shelters lots of wildlife",
    height: "20 to 25 metres",
    habitat: "Parks, forests and ravines",
    identify: "A leaf with seven to eleven pointed sections",
    facts: [
      "Its acorns feed blue jays, chipmunks, deer, squirrels and turkeys.",
      "Its leaves feed caterpillars that become moths and butterflies.",
      "It can live for hundreds of years and grow deep, storm-ready roots.",
    ],
    profile: "https://www.toronto.ca/wp-content/uploads/2026/08/9763-2Red-Oak-KVW-Candidate-Fact-Sheet-Final.pdf",
  },
  {
    id: "sugar-maple",
    name: "Sugar Maple",
    shortName: "Sm",
    colour: "#e36f3d",
    image: "https://www.toronto.ca/wp-content/uploads/2026/05/95d8-Sugar-Maple-fnl2.png",
    imageWidth: 350,
    imageHeight: 387,
    imageAlt: "The City of Toronto’s winking orange Sugar Maple leaf character.",
    promise: "Makes sweet sap and bright fall colour",
    height: "About 20 metres",
    habitat: "Parks, forests and ravines",
    identify: "A leaf with three to five points and bright fall colours",
    facts: [
      "Its naturally sweet sap can be boiled into maple syrup.",
      "Its winged seeds spin like helicopters as they fall.",
      "It is a keystone species—a tree that many plants and animals depend on.",
    ],
    profile: "https://www.toronto.ca/wp-content/uploads/2026/08/979a-2SugarMaple-KVW-Candidate-Fact-Sheet-Final.pdf",
  },
  {
    id: "white-pine",
    name: "White Pine",
    shortName: "Wp",
    colour: "#28705a",
    image: "https://www.toronto.ca/wp-content/uploads/2026/05/883f-White-Pine-fnl-350x458.png",
    imageWidth: 350,
    imageHeight: 458,
    imageAlt: "The City of Toronto’s smiling green White Pine needle character.",
    promise: "Stays green and gives animals shelter",
    height: "25 to 30 metres",
    habitat: "Forests and ravines",
    identify: "Soft needles that grow together in bundles of five",
    facts: [
      "It is the only evergreen candidate and keeps its needles all year.",
      "Its branches shelter birds and animals during harsh weather.",
      "It often grows to be the tallest tree in the forest.",
    ],
    profile: "https://www.toronto.ca/wp-content/uploads/2026/08/9615-2WhitePine-KVW-Candidate-Fact-Sheet-Final.pdf",
  },
] as const;
