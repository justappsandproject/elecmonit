import axios from "axios";

function hashString(input) {
  return [...String(input || "")].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function normalizeResult(raw = {}) {
  const parties =
    Array.isArray(raw.parties) && raw.parties.length > 0
      ? raw.parties.map((item) => ({
          name: String(item?.name || "UNKNOWN"),
          votes: Number(item?.votes || 0)
        }))
      : Object.entries(raw.partyVotes || {}).map(([name, votes]) => ({
          name,
          votes: Number(votes || 0)
        }));

  const partyVotes = parties.reduce((acc, party) => {
    acc[party.name.toUpperCase()] = Number(party.votes || 0);
    return acc;
  }, {});

  const totalVotes = Number(
    raw.totalVotes ?? raw.totalValidVotes ?? parties.reduce((sum, party) => sum + Number(party.votes || 0), 0)
  );
  const rejectedBallots = raw.rejectedBallots == null ? null : Number(raw.rejectedBallots);
  const totalBallots = Number(raw.totalBallots ?? totalVotes + Number(rejectedBallots || 0));

  return {
    parties,
    partyVotes,
    totalVotes,
    totalValidVotes: totalVotes,
    rejectedBallots,
    totalBallots,
    accreditedVoters: raw.accreditedVoters == null ? null : Number(raw.accreditedVoters),
    presiding_officer: raw.presiding_officer || null,
    observations: raw.observations || "",
    anomalies: Array.isArray(raw.anomalies) ? raw.anomalies : []
  };
}

function runMockOcr(imageSeed) {
  const seed = hashString(imageSeed || "default-seed");
  const apc = (seed % 250) + 50;
  const pdp = ((seed * 3) % 250) + 30;
  const lp = ((seed * 5) % 170) + 20;
  const nnpp = ((seed * 7) % 80) + 5;
  const adc = ((seed * 11) % 40) + 1;
  const rejected = (seed % 20) + 1;
  const totalValidVotes = apc + pdp + lp + nnpp + adc;
  const totalBallots = totalValidVotes + rejected;

  return normalizeResult({
    parties: [
      { name: "APC", votes: apc },
      { name: "PDP", votes: pdp },
      { name: "LP", votes: lp },
      { name: "NNPP", votes: nnpp },
      { name: "ADC", votes: adc }
    ],
    totalVotes: totalValidVotes,
    rejectedBallots: rejected,
    totalBallots,
    observations: totalBallots > 1000 ? "Total ballots unusually high." : ""
  });
}

function extractTextFromClaude(responseData) {
  return (responseData?.content || [])
    .filter((block) => block?.type === "text")
    .map((block) => block?.text || "")
    .join("");
}

async function runAnthropicVision({ imageUrl, imageBase64, mediaType, pollingUnitCode, state }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const prompt = `You are reading a polling unit election result sheet image.
Polling Unit: ${pollingUnitCode || "unknown"}
State: ${state || "unknown"}

Return strict JSON only with keys:
{
  "parties": [{"name":"PARTY","votes":123}],
  "totalVotes": 1234,
  "accreditedVoters": 1200,
  "rejectedBallots": 12,
  "presiding_officer": "name or null",
  "observations": "short notes"
}
If not an election result sheet, return:
{"error":"Not an election result sheet","parties":[],"totalVotes":0}`;

  const imageSource = imageBase64
    ? { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 }
    : { type: "url", url: imageUrl };

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-3-5-sonnet-latest",
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image", source: imageSource }
          ]
        }
      ]
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      }
    }
  );

  const rawText = extractTextFromClaude(response.data).replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(rawText || "{}");
  if (parsed?.error) {
    throw new Error(parsed.error);
  }

  return normalizeResult(parsed);
}

export async function extractElectionResultFromImage(payload) {
  const imageSeed = payload?.imageUrl || payload?.imageBase64?.slice(0, 512) || "default-seed";
  const provider = process.env.OCR_PROVIDER || "mock";
  if (provider === "anthropic") {
    return runAnthropicVision(payload || {});
  }
  return runMockOcr(imageSeed);
}
