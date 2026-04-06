import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const STATUS = { PENDING: "pending_ocr", PROCESSING: "processing_ocr", DONE: "processed", ERROR: "ocr_error" };
const ELECTION_TYPES = [
  "PRESIDENTIAL",
  "GOVERNORSHIP",
  "SENATE",
  "HOUSE_OF_REPRESENTATIVES",
  "STATE_HOUSE_OF_ASSEMBLY",
  "UNSPECIFIED"
];
const HIERARCHY_LEVELS = ["Polling Unit", "Ward", "Local Gov", "State", "Federal"];
const STATUS_LABEL = {
  pending_ocr: "Pending",
  processing_ocr: "Processing",
  processed: "Done",
  ocr_error: "Error"
};

function Badge({ status }) {
  return <span className={`status-pill ${status}`}>{STATUS_LABEL[status] || status}</span>;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function normalizeElectionType(value) {
  const text = String(value || "UNSPECIFIED").toUpperCase().replace(/\s+/g, "_");
  return ELECTION_TYPES.includes(text) ? text : "UNSPECIFIED";
}

function buildHierarchyKey(record, level) {
  if (level === "Polling Unit") {
    return record.pollingUnitCode || "Unspecified Polling Unit";
  }
  if (level === "Ward") {
    return record.ward || "Unspecified Ward";
  }
  if (level === "Local Gov") {
    return record.localGovernment || "Unspecified LGA";
  }
  if (level === "State") {
    return record.state || "Unspecified State";
  }
  return "Federal";
}

function aggregateByHierarchy(records, selectedElectionType, selectedLevel) {
  const filtered = records.filter(
    (record) => selectedElectionType === "ALL" || normalizeElectionType(record.electionType) === selectedElectionType
  );
  const buckets = {};
  for (const record of filtered) {
    const key = buildHierarchyKey(record, selectedLevel);
    if (!buckets[key]) {
      buckets[key] = {
        name: key,
        submissions: 0,
        processed: 0,
        totalVotes: 0
      };
    }
    buckets[key].submissions += 1;
    if (record.status === STATUS.DONE) {
      buckets[key].processed += 1;
      buckets[key].totalVotes += Number(record?.ocrResult?.totalVotes || 0);
    }
  }
  return Object.values(buckets).sort((a, b) => b.totalVotes - a.totalVotes || b.submissions - a.submissions);
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("portal_token");
    const user = localStorage.getItem("portal_user");
    if (!token || !user) return null;
    return { token, user: JSON.parse(user) };
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [records, setRecords] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedElectionType, setSelectedElectionType] = useState("ALL");
  const [selectedLevel, setSelectedLevel] = useState("State");
  const [search, setSearch] = useState("");

  async function handleLogin(event) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      setAuth(data);
      localStorage.setItem("portal_token", data.token);
      localStorage.setItem("portal_user", JSON.stringify(data.user));
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoginBusy(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    setAuth(null);
  }

  useEffect(() => {
    if (!auth) return undefined;
    fetch(`${API_URL}/api/submissions`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.submissions)) {
          setRecords(data.submissions);
        }
      })
      .catch(() => {
        // Socket bootstrap is primary; this fallback keeps initial data visible if socket connect is delayed.
      });

    const socket = io(API_URL);
    socket.on("bootstrap", (payload) => setRecords(payload.submissions || []));
    socket.on("submission:created", (submission) => setRecords((prev) => [...prev, submission]));
    socket.on("submission:processed", (submission) =>
      setRecords((prev) => prev.map((r) => (r.id === submission.id ? submission : r)))
    );
    socket.on("submission:error", (submission) =>
      setRecords((prev) => prev.map((r) => (r.id === submission.id ? submission : r)))
    );
    return () => socket.disconnect();
  }, [auth]);

  const totalVotes = records.filter((r) => r.ocrResult?.totalVotes).reduce((s, r) => s + (r.ocrResult?.totalVotes || 0), 0);
  const done = records.filter((r) => r.status === STATUS.DONE).length;
  const processing = records.filter((r) => r.status === STATUS.PROCESSING).length;

  const partyTotals = {};
  records.forEach((r) => {
    (r.ocrResult?.parties || []).forEach((p) => {
      const key = p.name.toUpperCase();
      partyTotals[key] = (partyTotals[key] || 0) + (p.votes || 0);
    });
  });
  const sorted = Object.entries(partyTotals).sort((a, b) => b[1] - a[1]);
  const hierarchyRows = useMemo(
    () => aggregateByHierarchy(records, selectedElectionType, selectedLevel),
    [records, selectedElectionType, selectedLevel]
  );
  const visibleRows = hierarchyRows.filter((row) =>
    row.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    if (selected) {
      const updated = records.find((r) => r.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [records, selected]);

  async function handleProcess(id) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, status: STATUS.PROCESSING } : r)));
    await fetch(`${API_URL}/api/submissions/${id}/process-ocr`, { method: "POST" });
  }

  async function processAllPending() {
    const pendingIds = records.filter((record) => record.status === STATUS.PENDING).map((record) => record.id);
    for (const id of pendingIds) {
      // Sequential processing keeps OCR requests manageable.
      // eslint-disable-next-line no-await-in-loop
      await handleProcess(id);
    }
  }

  if (!auth) {
    return (
      <div className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Election Situation Room</h1>
          <p>Login required to access the secured monitoring portal.</p>
          <label>
            Username
            <input
              value={loginForm.username}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, username: e.target.value }))}
              placeholder="admin"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="password123"
            />
          </label>
          {loginError ? <div className="error-text">{loginError}</div> : null}
          <button type="submit" disabled={loginBusy}>
            {loginBusy ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="portal-root">
      <header className="topbar">
        <div>
          <div className="brand-title">e-Situation Room</div>
          <div className="brand-subtitle">
            Scalable national election flow: Polling Unit -&gt; Ward -&gt; Local Gov -&gt; State -&gt; Federal
          </div>
        </div>
        <div className="topbar-actions">
          <span className="welcome-tag">{auth.user.name}</span>
          <button className="ghost-btn" onClick={processAllPending}>Process all pending</button>
          <button className="ghost-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="portal-content">
        <div className="metric-grid">
          {[
            { label: "Sheets received", value: records.length, color: "#1D4ED8" },
            { label: "Processed", value: done, color: "#166534" },
            { label: "Processing", value: processing, color: "#7C3AED" },
            { label: "Total votes", value: totalVotes.toLocaleString(), color: "#0F172A" }
          ].map((s) => (
            <div key={s.label} className="metric-card">
              <div className="metric-label">{s.label}</div>
              <div style={{ color: s.color }} className="metric-value">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="election-controls">
          <select value={selectedElectionType} onChange={(e) => setSelectedElectionType(e.target.value)}>
            <option value="ALL">All Elections</option>
            {ELECTION_TYPES.map((type) => (
              <option key={type} value={type}>{type.replaceAll("_", " ")}</option>
            ))}
          </select>
          <select value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
            {HIERARCHY_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <input
            placeholder={`Search ${selectedLevel}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="portal-grid">
          <section className="panel">
            <div className="panel-title">Hierarchical aggregation</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{selectedLevel}</th>
                    <th>Submissions</th>
                    <th>Processed</th>
                    <th>Total votes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 ? (
                    <tr><td colSpan={4} className="empty-cell">No rows for current filter.</td></tr>
                  ) : visibleRows.map((row) => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td>{row.submissions}</td>
                      <td>{row.processed}</td>
                      <td>{row.totalVotes.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-title">Incoming transmissions</div>
            {records.length === 0 && (
              <div className="empty-state">
                Awaiting field transmissions
              </div>
            )}
            {[...records].reverse().slice(0, 50).map((r) => (
              <div key={r.id} onClick={() => setSelected(r)} className={`feed-item ${selected?.id === r.id ? "selected" : ""}`}>
                <div className="feed-item-head">
                  <div>
                    <div className="feed-title">{r.pollingUnitCode}</div>
                    <div className="feed-subtitle">
                      {r.ward || "Unspecified Ward"} · {r.localGovernment || "Unspecified LGA"} · {r.state}
                    </div>
                    <div className="feed-time">{formatTime(r.createdAt)}</div>
                  </div>
                  <div className="feed-actions">
                    <Badge status={r.status} />
                    {r.status === STATUS.PENDING && (
                      <button onClick={(e) => { e.stopPropagation(); handleProcess(r.id); }}>
                        Process OCR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="panel side">
            {selected && (
              <div className="detail-card">
                <div className="panel-title">Sheet detail</div>
                {selected.imagePreview && <img src={selected.imagePreview} alt="" className="sheet-preview" />}
                <div className="meta-list">
                  <div><strong>Election:</strong> {normalizeElectionType(selected.electionType).replaceAll("_", " ")}</div>
                  <div><strong>Cycle:</strong> {selected.electionCycle || "2027 General Election"}</div>
                  <div><strong>Agent:</strong> {selected.agentName}</div>
                  <div>
                    <strong>Location:</strong>{" "}
                    {[selected.pollingUnitCode, selected.ward || "Ward", selected.localGovernment || "LGA", selected.state, "Federal"].join(" -> ")}
                  </div>
                </div>
              </div>
            )}

            <div className="detail-card">
              <div className="panel-title">Live party tally</div>
              {sorted.length === 0 ? <div className="empty-cell">No results processed yet.</div> : sorted.map(([party, votes]) => (
                <div key={party} className="party-row">
                  <span>{party}</span>
                  <strong>{votes.toLocaleString()}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
