function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function buildResult(parties, rejectedBallots, observations = "") {
  const totalVotes = parties.reduce((sum, party) => sum + Number(party.votes || 0), 0);
  return {
    parties,
    partyVotes: parties.reduce((acc, party) => {
      acc[String(party.name || "").toUpperCase()] = Number(party.votes || 0);
      return acc;
    }, {}),
    totalVotes,
    totalValidVotes: totalVotes,
    rejectedBallots,
    totalBallots: totalVotes + Number(rejectedBallots || 0),
    accreditedVoters: totalVotes + Number(rejectedBallots || 0) + 22,
    presiding_officer: "Placeholder Officer",
    observations,
    anomalies: []
  };
}

export const submissions = [
  {
    id: "seed-pu-001",
    agentName: "Amina Bello",
    state: "Lagos",
    localGovernment: "Ikeja",
    ward: "Ward A",
    pollingUnitCode: "PU-LAG-001",
    electionType: "PRESIDENTIAL",
    electionCycle: "2027 General Election",
    imageUrl: "https://via.placeholder.com/800x1100?text=PU-LAG-001+Result+Sheet",
    imageBase64: null,
    mediaType: "image/jpeg",
    imagePreview: "https://via.placeholder.com/800x1100?text=PU-LAG-001+Result+Sheet",
    createdAt: minutesAgo(120),
    status: "processed",
    processedAt: minutesAgo(116),
    ocrResult: buildResult(
      [
        { name: "APC", votes: 312 },
        { name: "PDP", votes: 266 },
        { name: "LP", votes: 198 },
        { name: "NNPP", votes: 54 },
        { name: "ADC", votes: 19 }
      ],
      11,
      "Clean sheet. All party entries legible."
    )
  },
  {
    id: "seed-pu-002",
    agentName: "Chinedu Okafor",
    state: "Enugu",
    localGovernment: "Nsukka",
    ward: "Ward 4",
    pollingUnitCode: "PU-ENU-014",
    electionType: "GOVERNORSHIP",
    electionCycle: "2027 General Election",
    imageUrl: "https://via.placeholder.com/800x1100?text=PU-ENU-014+Result+Sheet",
    imageBase64: null,
    mediaType: "image/jpeg",
    imagePreview: "https://via.placeholder.com/800x1100?text=PU-ENU-014+Result+Sheet",
    createdAt: minutesAgo(101),
    status: "processed",
    processedAt: minutesAgo(98),
    ocrResult: buildResult(
      [
        { name: "PDP", votes: 341 },
        { name: "APC", votes: 214 },
        { name: "LP", votes: 152 },
        { name: "APGA", votes: 66 }
      ],
      9,
      "One overwritten digit verified against totals row."
    )
  },
  {
    id: "seed-pu-003",
    agentName: "Ibrahim Musa",
    state: "Kano",
    localGovernment: "Nasarawa",
    ward: "Ward 2",
    pollingUnitCode: "PU-KAN-233",
    electionType: "SENATE",
    electionCycle: "2027 General Election",
    imageUrl: "https://via.placeholder.com/800x1100?text=PU-KAN-233+Result+Sheet",
    imageBase64: null,
    mediaType: "image/jpeg",
    imagePreview: "https://via.placeholder.com/800x1100?text=PU-KAN-233+Result+Sheet",
    createdAt: minutesAgo(92),
    status: "processed",
    processedAt: minutesAgo(89),
    ocrResult: buildResult(
      [
        { name: "APC", votes: 420 },
        { name: "NNPP", votes: 301 },
        { name: "PDP", votes: 144 }
      ],
      14,
      "Totals balanced; no anomaly detected."
    )
  },
  {
    id: "seed-pu-004",
    agentName: "Bassey Etim",
    state: "Cross River",
    localGovernment: "Calabar Municipal",
    ward: "Ward 7",
    pollingUnitCode: "PU-CRS-077",
    electionType: "HOUSE_OF_REPRESENTATIVES",
    electionCycle: "2027 General Election",
    imageUrl: "https://via.placeholder.com/800x1100?text=PU-CRS-077+Result+Sheet",
    imageBase64: null,
    mediaType: "image/jpeg",
    imagePreview: "https://via.placeholder.com/800x1100?text=PU-CRS-077+Result+Sheet",
    createdAt: minutesAgo(72),
    status: "processed",
    processedAt: minutesAgo(68),
    ocrResult: buildResult(
      [
        { name: "APC", votes: 188 },
        { name: "PDP", votes: 273 },
        { name: "LP", votes: 131 },
        { name: "YPP", votes: 37 }
      ],
      7,
      "Stamp present and signed."
    )
  },
  {
    id: "seed-pu-005",
    agentName: "Hadiza Garba",
    state: "Kaduna",
    localGovernment: "Zaria",
    ward: "Ward 11",
    pollingUnitCode: "PU-KAD-118",
    electionType: "STATE_HOUSE_OF_ASSEMBLY",
    electionCycle: "2027 General Election",
    imageUrl: "https://via.placeholder.com/800x1100?text=PU-KAD-118+Result+Sheet",
    imageBase64: null,
    mediaType: "image/jpeg",
    imagePreview: "https://via.placeholder.com/800x1100?text=PU-KAD-118+Result+Sheet",
    createdAt: minutesAgo(49),
    status: "processed",
    processedAt: minutesAgo(46),
    ocrResult: buildResult(
      [
        { name: "APC", votes: 289 },
        { name: "PDP", votes: 201 },
        { name: "LP", votes: 89 }
      ],
      12,
      "One smudge at party initials resolved using totals row."
    )
  },
  {
    id: "seed-pu-006",
    agentName: "Ngozi Eze",
    state: "Rivers",
    localGovernment: "Obio/Akpor",
    ward: "Ward 5",
    pollingUnitCode: "PU-RIV-045",
    electionType: "PRESIDENTIAL",
    electionCycle: "2027 General Election",
    imageUrl: "https://via.placeholder.com/800x1100?text=PU-RIV-045+Result+Sheet",
    imageBase64: null,
    mediaType: "image/jpeg",
    imagePreview: "https://via.placeholder.com/800x1100?text=PU-RIV-045+Result+Sheet",
    createdAt: minutesAgo(24),
    status: "pending_ocr",
    ocrResult: null
  }
];

export const tally = {
  APC: 0,
  PDP: 0,
  LP: 0,
  NNPP: 0,
  ADC: 0,
  REJECTED: 0,
  TOTAL_VALID: 0,
  TOTAL_BALLOTS: 0
};

export function applyResultToTally(result) {
  const partyVotes =
    result?.partyVotes ||
    (result?.parties || []).reduce((acc, party) => {
      acc[String(party?.name || "").toUpperCase()] = Number(party?.votes || 0);
      return acc;
    }, {});

  for (const [party, votes] of Object.entries(partyVotes)) {
    tally[party] = (tally[party] || 0) + Number(votes || 0);
  }

  tally.REJECTED += Number(result?.rejectedBallots || 0);
  tally.TOTAL_VALID += Number((result?.totalValidVotes ?? result?.totalVotes) || 0);
  tally.TOTAL_BALLOTS += Number(
    result?.totalBallots ?? (((result?.totalValidVotes ?? result?.totalVotes) || 0) + Number(result?.rejectedBallots || 0))
  );
}

for (const submission of submissions) {
  if (submission.status === "processed" && submission.ocrResult) {
    applyResultToTally(submission.ocrResult);
  }
}
