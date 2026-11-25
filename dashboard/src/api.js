const API = import.meta.env.VITE_API_URL;
const REGION = import.meta.env.VITE_REGION;
const CLIENT_ID = import.meta.env.VITE_USER_POOL_CLIENT_ID;
export const DEMO = !API;

export async function login(email, password) {
  if (DEMO) return { token: "demo", email };
  const res = await fetch(`https://cognito-idp.${REGION}.amazonaws.com/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-amz-json-1.1", "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth" },
    body: JSON.stringify({ AuthFlow: "USER_PASSWORD_AUTH", ClientId: CLIENT_ID, AuthParameters: { USERNAME: email, PASSWORD: password } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Login failed");
  const token = data.AuthenticationResult.IdToken;
  const claims = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  return { token, email: claims.email };
}

// ---------- Demo mode ----------
const day = 864e5;
const mkHistory = (base, n = 36) => Array.from({ length: n }, (_, i) => ({
  ts: new Date(Date.now() - (n - i) * day / 2).toISOString(),
  price: Math.round(base * (1 + Math.sin(i / 4) * 0.12 + Math.cos(i / 1.7) * 0.05 - i * 0.003)),
  airline: ["SAS", "Norwegian", "KLM"][i % 3],
}));
const future = (d) => new Date(Date.now() + d * day).toISOString().slice(0, 10);
let demo = [
  { id: "w1", origin: "ARN", destination: "BCN", departDate: future(40), targetPrice: 1100, history: mkHistory(1350) },
  { id: "w2", origin: "GOT", destination: "LIS", departDate: future(65), targetPrice: 1500, history: mkHistory(1900) },
  { id: "w3", origin: "ARN", destination: "NRT", departDate: future(10), targetPrice: 6500, history: mkHistory(7400) },
  { id: "w4", origin: "CPH", destination: "JFK", departDate: future(90), targetPrice: 3200, history: mkHistory(3600) },
];
const summarize = (w) => {
  const prices = w.history.map((h) => h.price);
  const last = w.history[w.history.length - 1];
  return { ...w, lastPrice: last?.price, lastAirline: last?.airline, lowestPrice: Math.min(...prices), prevPrice: prices[prices.length - 2], lastCheckedAt: last?.ts };
};
const recommend = (h, departDate) => {
  if (h.length < 3) return "HOLD";
  const p = h.map((x) => x.price), last = p[p.length - 1], min = Math.min(...p);
  if ((new Date(departDate) - Date.now()) / day < 14 || last <= min * 1.03) return "BUY_NOW";
  return p[p.length - 1] < p[p.length - 3] ? "WAIT" : "HOLD";
};
const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 250));

export function createApi(session) {
  const call = async (path, opts = {}) => {
    const res = await fetch(API + path, { ...opts, headers: { Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" } });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || (data.errors || []).join(", ") || "Error");
    return data;
  };
  if (!DEMO) return {
    list: () => call("/watches"),
    get: (id) => call(`/watches/${id}`),
    create: (w) => call("/watches", { method: "POST", body: JSON.stringify(w) }),
    remove: (id) => call(`/watches/${id}`, { method: "DELETE" }),
    check: (id) => call(`/watches/${id}/check`, { method: "POST" }),
  };
  return {
    list: () => wait(demo.map(summarize)),
    get: (id) => { const w = demo.find((x) => x.id === id); return wait({ ...summarize(w), recommendation: recommend(w.history, w.departDate) }); },
    create: (w) => { const n = { ...w, id: crypto.randomUUID(), history: mkHistory(w.targetPrice * 1.25, 3) }; demo = [n, ...demo]; return wait(n); },
    remove: (id) => { demo = demo.filter((x) => x.id !== id); return wait(null); },
    check: (id) => {
      const w = demo.find((x) => x.id === id);
      const last = w.history[w.history.length - 1].price;
      w.history.push({ ts: new Date().toISOString(), price: Math.round(last * (0.82 + Math.random() * 0.25)), airline: "SAS" });
      return wait(summarize(w));
    },
  };
}
