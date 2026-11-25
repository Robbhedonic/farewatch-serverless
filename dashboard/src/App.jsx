import { useEffect, useMemo, useState } from "react";
import { login, createApi, DEMO } from "./api.js";
import Home from "./Home.jsx";

const kr = (n) => (n ?? 0).toLocaleString("en-US", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
const daysTo = (d) => Math.ceil((new Date(d) - Date.now()) / 864e5);
const status = (w) => (w.lastPrice <= w.targetPrice ? "ok" : w.lastPrice <= w.targetPrice * 1.15 ? "warn" : "low");
const label = { ok: "Below target", warn: "Near target", low: "Above target" };
const recText = { BUY_NOW: "Buy now – the price is near its lowest or departure is close.", WAIT: "Wait – the price is trending down.", HOLD: "Hold – no clear trend yet." };

export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("home");
  useEffect(() => { window.scrollTo(0, 0); }, [view, session]);
  if (session) return <Dashboard session={session} onLogout={() => { setSession(null); setView("home"); }} />;
  if (view === "login") return <Login onLogin={setSession} onBack={() => setView("home")} />;
  return <Home onStart={() => setView("login")} />;
}

function Logo() { return <div className="logo"><span className="dot" />FareWatch</div>; }

function Login({ onLogin, onBack }) {
  const [email, setEmail] = useState(DEMO ? "demo@farewatch.se" : "");
  const [pw, setPw] = useState(DEMO ? "Demo1234" : "");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try { onLogin(await login(email, pw)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="login">
      <div className="login-art">
        <button type="button" className="link-back" onClick={onBack}>← Back to home</button>
        <Logo />
        <h1>Book when the price<br /><span>is actually low.</span></h1>
        <p>Track flight routes, see price history and get an alert the moment the price drops below your target.</p>
        <div className="pulse-line"><span /></div>
      </div>
      <form className="login-card" onSubmit={submit}>
        <h2>Sign in</h2>
        {DEMO && <div className="chip">Demo mode – no AWS required</div>}
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Continue"}</button>
      </form>
    </div>
  );
}

function Dashboard({ session, onLogout }) {
  const api = useMemo(() => createApi(session), [session]);
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState(null);
  const refresh = async () => { setItems(await api.list()); setLoading(false); };
  useEffect(() => { refresh(); }, [api]);
  const notify = (msg, kind = "ok") => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3000); };

  const under = items.filter((w) => status(w) === "ok");
  const savings = items.reduce((s, w) => s + Math.max(0, (w.prevPrice ?? w.lastPrice) - w.lastPrice), 0);

  return (
    <div className="shell">
      <header className="top">
        <Logo />
        <div className="user"><span>{session.email}</span><button className="btn ghost" onClick={onLogout}>Sign out</button></div>
      </header>
      <main>
        <section className="hero-row">
          <div><h1>Your <span>watches</span></h1><p className="muted">Every route below is re-priced automatically every hour. When a price crosses your target or drops 15% or more to a new low, you get an email alert.</p></div>
          <button className="btn primary" onClick={() => setAdding(true)}>+ Track route</button>
        </section>
        <section className="guide">
          <div><span className="step">1</span><b>Add a route</b><p>Pick airports, a departure date and the price you would happily pay.</p></div>
          <div><span className="step">2</span><b>We watch it</b><p>A scheduled function fetches the fare every hour and stores it in your price history.</p></div>
          <div><span className="step">3</span><b>You get alerted</b><p>Below target or a sharp drop triggers an instant email. Open a route for trends and advice.</p></div>
        </section>
        <section className="stats">
          <Stat title="Tracked routes" value={items.length} />
          <Stat title="Below target" value={under.length} tone={under.length ? "ok" : ""} />
          <Stat title="Latest price drops" value={kr(savings)} />
          <Stat title="Price alerts" value={under.length ? "Sent" : "Waiting"} tone={under.length ? "ok" : ""} />
        </section>
        {under.length > 0 && <div className="alert" style={{ background: "rgba(22,163,106,.08)", borderColor: "rgba(22,163,106,.3)" }}><span className="ping" style={{ background: "var(--ok)" }} /><b>Time to book:</b>&nbsp;{under.map((w) => `${w.origin} → ${w.destination} ${kr(w.lastPrice)}`).join(" · ")}</div>}
        <section className="panel">
          {loading ? <div className="empty">Loading…</div> : items.length === 0 ? <div className="empty">No watches yet. Add your first route!</div> : (
            <div className="grid">{items.map((w) => <WatchCard key={w.id} w={w} onClick={() => setSelected(w.id)} />)}</div>
          )}
        </section>
      </main>
      {selected && <Drawer id={selected} api={api} onClose={() => setSelected(null)} onChange={async (m, k) => { notify(m, k); await refresh(); }} />}
      {adding && <AddModal api={api} onClose={() => setAdding(false)} onDone={async () => { setAdding(false); notify("Watch created"); await refresh(); }} />}
      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </div>
  );
}

function Stat({ title, value, tone }) { return <div className={`stat ${tone || ""}`}><span className="muted">{title}</span><strong>{value}</strong></div>; }

function Sparkline({ history, target, height = 44, big = false }) {
  if (!history?.length) return null;
  const W = 300, H = height, pad = big ? 16 : 2;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices, target) * 0.97, max = Math.max(...prices, target) * 1.03;
  const x = (i) => pad + (i / Math.max(1, history.length - 1)) * (W - pad * 2);
  const y = (p) => H - pad - ((p - min) / (max - min)) * (H - pad * 2);
  const d = prices.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(" ");
  const id = big ? "gBig" : "g" + Math.random().toString(36).slice(2);
  return (
    <svg className={big ? "chart" : "spark"} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="#ff6a3d" /><stop offset=".5" stopColor="#ff3d7f" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
        <linearGradient id={id + "f"} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ff3d7f" stopOpacity=".18" /><stop offset="1" stopColor="#ff3d7f" stopOpacity="0" /></linearGradient>
      </defs>
      <path d={`${d} L${x(prices.length - 1)},${H} L${x(0)},${H} Z`} fill={`url(#${id}f)`} />
      <line x1={pad} x2={W - pad} y1={y(target)} y2={y(target)} stroke="#16a36a" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={big ? 2.5 : 2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      {big && <circle cx={x(prices.length - 1)} cy={y(prices[prices.length - 1])} r="4" fill="#ff3d7f" />}
    </svg>
  );
}

function WatchCard({ w, onClick }) {
  const s = status(w);
  const diff = w.prevPrice ? w.lastPrice - w.prevPrice : 0;
  return (
    <button className="card" onClick={onClick}>
      <div className="card-head"><span className="sku">{w.departDate} · in {daysTo(w.departDate)} d</span><span className={`badge ${s}`}>{label[s]}</span></div>
      <div className="route">{w.origin}<span className="plane">✈</span>{w.destination}</div>
      <Sparkline history={w.history} target={w.targetPrice} />
      <div className="price-row">
        <div><strong>{kr(w.lastPrice)}</strong><div className="muted small">target {kr(w.targetPrice)}</div></div>
        {diff !== 0 && <span className={`badge ${diff < 0 ? "ok" : "low"}`}>{diff < 0 ? "↓" : "↑"} {kr(Math.abs(diff))}</span>}
      </div>
    </button>
  );
}

function Drawer({ id, api, onClose, onChange }) {
  const [w, setW] = useState(null); const [busy, setBusy] = useState(false);
  const load = async () => setW(await api.get(id));
  useEffect(() => { load(); }, [id]);
  const check = async () => {
    setBusy(true);
    try { const r = await api.check(id); await load(); onChange(r.lastPrice <= r.targetPrice ? `Price alert! ${kr(r.lastPrice)} – below your target` : `New price: ${kr(r.lastPrice)}`, r.lastPrice <= r.targetPrice ? "ok" : "warn"); }
    catch (e) { onChange(e.message, "low"); } finally { setBusy(false); }
  };
  const del = async () => { if (!confirm("Stop tracking this route?")) return; await api.remove(id); onChange("Watch removed"); onClose(); };
  return (
    <div className="overlay" onClick={onClose}>
      <aside className="drawer wide" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose} aria-label="Close">×</button>
        {!w ? <div className="empty">Loading…</div> : <>
          <span className="sku">DEPARTS {w.departDate} · IN {daysTo(w.departDate)} DAYS</span>
          <div className="route" style={{ fontSize: "2.2rem", margin: ".4rem 0" }}>{w.origin}<span className="plane">✈</span>{w.destination}</div>
          <div className="big-qty"><strong>{kr(w.lastPrice)}</strong><span className={`badge ${status(w)}`}>{label[status(w)]}</span></div>
          <Sparkline history={w.history} target={w.targetPrice} height={220} big />
          <div className="kv">
            <div><span className="muted">Target price</span><strong>{kr(w.targetPrice)}</strong></div>
            <div><span className="muted">Lowest</span><strong>{kr(w.lowestPrice)}</strong></div>
            <div><span className="muted">Airline</span><strong>{w.lastAirline ?? "–"}</strong></div>
          </div>
          <Insights w={w} />
          {w.recommendation && <div className={`rec ${w.recommendation}`}><b>Our advice:</b> {recText[w.recommendation]}</div>}
          <details className="explain">
            <summary>How is this advice calculated?</summary>
            <p><b>Buy now</b> when the current fare is within 3% of the lowest price seen, or departure is less than 14 days away (fares usually rise sharply then).</p>
            <p><b>Wait</b> when the last three checks show a falling trend.</p>
            <p><b>Hold</b> when there is not enough history or no clear direction yet.</p>
          </details>
          <h4>Recent checks</h4>
          <ul className="timeline">
            {[...w.history].reverse().slice(0, 6).map((h, i, arr) => {
              const prev = arr[i + 1]?.price; const d = prev ? h.price - prev : 0;
              return <li key={h.ts}><span className={`tdot ${d <= 0 ? "IN" : "OUT"}`} /><div><b>{kr(h.price)}</b> · {h.airline}{d !== 0 && <span className={`delta ${d < 0 ? "down" : "up"}`}>{d < 0 ? "↓" : "↑"} {kr(Math.abs(d))}</span>}<div className="muted small">{new Date(h.ts).toLocaleString("en-GB")}</div></div></li>;
            })}
          </ul>
          <div className="move-btns"><button className="btn primary" disabled={busy} onClick={check} style={{ flex: 1 }}>{busy ? "Checking…" : "Check price now"}</button></div>
          <button className="btn danger" onClick={del}>Stop tracking</button>
        </>}
      </aside>
    </div>
  );
}

function Insights({ w }) {
  const p = (w.history ?? []).map((h) => h.price);
  if (p.length < 2) return null;
  const avg = Math.round(p.reduce((a, b) => a + b, 0) / p.length);
  const high = Math.max(...p);
  const vsAvg = Math.round(((w.lastPrice - avg) / avg) * 100);
  const gap = w.lastPrice - w.targetPrice;
  return (
    <div className="insights">
      <div><span className="muted">Average</span><strong>{kr(avg)}</strong></div>
      <div><span className="muted">Highest</span><strong>{kr(high)}</strong></div>
      <div><span className="muted">vs. average</span><strong className={vsAvg <= 0 ? "good" : "bad"}>{vsAvg > 0 ? "+" : ""}{vsAvg}%</strong></div>
      <div><span className="muted">{gap > 0 ? "Above target by" : "Below target by"}</span><strong className={gap > 0 ? "bad" : "good"}>{kr(Math.abs(gap))}</strong></div>
    </div>
  );
}

function AddModal({ api, onClose, onDone }) {
  const [f, setF] = useState({ origin: "ARN", destination: "", departDate: "", targetPrice: 1500 });
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value.toUpperCase() });
  const submit = async (e) => { e.preventDefault(); try { await api.create(f); onDone(); } catch (x) { setErr(x.message); } };
  return (
    <div className="overlay center" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Track a route</h2>
        <p className="muted small" style={{ margin: 0 }}>Use 3-letter airport codes (ARN = Stockholm, BCN = Barcelona, JFK = New York). Set the target to the price you would book at without thinking twice.</p>
        <div className="row">
          <label>From (IATA)<input value={f.origin} onChange={set("origin")} maxLength={3} placeholder="ARN" required /></label>
          <label>To (IATA)<input value={f.destination} onChange={set("destination")} maxLength={3} placeholder="BCN" required /></label>
        </div>
        <div className="row">
          <label>Departure<input type="date" value={f.departDate} onChange={(e) => setF({ ...f, departDate: e.target.value })} required /></label>
          <label>Target price (SEK)<input type="number" min="100" value={f.targetPrice} onChange={set("targetPrice")} /></label>
        </div>
        {err && <div className="error">{err}</div>}
        <div className="move-btns"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary">Start tracking</button></div>
      </form>
    </div>
  );
}
