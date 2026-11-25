const features = [
  { icon: "📈", title: "Full price history", text: "Every check is stored, so you see how a fare actually moves over weeks – not just today's number." },
  { icon: "🔔", title: "Smart alerts, no spam", text: "You're notified once when the price crosses your target, or when it drops 15% or more to a new low." },
  { icon: "🧭", title: "Buy-or-wait advice", text: "A simple trend model tells you whether to book now, wait for a dip, or hold until there's more data." },
  { icon: "⚡", title: "Manual re-check", text: "Want the latest fare right now? Trigger an instant check (limited to once a minute to stay fair)." },
  { icon: "🔒", title: "Private by design", text: "Sign-in with Amazon Cognito. Your watches are stored under your own user key – nobody else can read them." },
  { icon: "☁️", title: "Runs 100% serverless", text: "No servers to manage. It scales from one traveller to thousands and costs nothing when idle." },
];
const steps = [
  { n: "01", title: "Tell us the trip", text: "Origin, destination, departure date and the price you're willing to pay." },
  { n: "02", title: "We check every hour", text: "A scheduled Lambda function fetches the current fare and saves it to DynamoDB." },
  { n: "03", title: "Change is detected", text: "DynamoDB Streams instantly fires an event-driven function whenever a price is updated." },
  { n: "04", title: "You get the email", text: "If the rules match, Amazon SNS sends you an alert so you can book before it goes back up." },
];
const stack = [
  ["API Gateway", "5 secured HTTP routes with JWT auth and throttling"],
  ["AWS Lambda", "Python 3.12 business logic – one function per route"],
  ["DynamoDB", "Single-table design for watches and price history, with TTL"],
  ["DynamoDB Streams", "Triggers the alert function on every price change"],
  ["Amazon SNS", "Delivers price-drop emails"],
  ["Cognito", "User sign-up, sign-in and JWT tokens"],
  ["CloudWatch", "Per-route metrics, logs and failure alarms"],
  ["AWS SAM", "The whole stack as code – deploy with one command"],
];
const faq = [
  ["Are the prices real?", "In this version prices come from a built-in simulator that behaves like real fares (seasonality, last-minute increases). The provider is one file and can be swapped for a real flight API such as Amadeus."],
  ["How often are prices checked?", "Every hour by default. The schedule is a single parameter in the deployment template."],
  ["Will I get flooded with emails?", "No. An alert is only sent when the price first crosses your target, or on a big drop to a new lowest price."],
  ["Is my data shared?", "No. Every request is authenticated and each user can only read and change their own watches."],
];

export default function Home({ onStart }) {
  return (
    <div className="home">
      <header className="top">
        <div className="logo"><span className="dot" />FareWatch</div>
        <nav className="nav">
          <a href="#how">How it works</a><a href="#features">Features</a><a href="#tech">Technology</a><a href="#faq">FAQ</a>
          <button className="btn primary" onClick={onStart}>Open app</button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-text">
          <span className="chip">Serverless · AWS · Python</span>
          <h1>Stop guessing when to book.<br /><span>Let the price tell you.</span></h1>
          <p className="lead">FareWatch tracks the flights you care about every hour, keeps the full price history and emails you the moment a fare drops below your target. Book at the right time – not the most expensive one.</p>
          <div className="hero-cta">
            <button className="btn primary big" onClick={onStart}>Start tracking – it's free</button>
            <a className="btn ghost big" href="#how">See how it works</a>
          </div>
          <div className="trust"><span>✓ No credit card</span><span>✓ Alerts by email</span><span>✓ Cancel any route anytime</span></div>
        </div>
        <div className="hero-card">
          <div className="card-head"><span className="sku">DEPARTS 14 MAR · IN 40 DAYS</span><span className="badge ok">Below target</span></div>
          <div className="route" style={{ fontSize: "2rem" }}>ARN<span className="plane">✈</span>BCN</div>
          <svg className="spark" viewBox="0 0 300 80" preserveAspectRatio="none" style={{ height: 110 }}>
            <defs><linearGradient id="hg" x1="0" x2="1"><stop offset="0" stopColor="#ff6a3d" /><stop offset=".5" stopColor="#ff3d7f" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient></defs>
            <path d="M0,20 C40,10 60,35 100,30 S160,15 190,45 S250,70 300,66" fill="none" stroke="url(#hg)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <line x1="0" x2="300" y1="55" y2="55" stroke="#16a36a" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="price-row"><div><strong>SEK 980</strong><div className="muted small">target SEK 1,100</div></div><span className="badge ok">↓ 24% this week</span></div>
          <div className="mail"><b>📧 Price alert sent</b><span className="muted small">ARN → BCN is now SEK 980 – below your target!</span></div>
        </div>
      </section>

      <section className="numbers">
        <div><strong>24×</strong><span>price checks per route, every day</span></div>
        <div><strong>&lt; 1 s</strong><span>from price change to alert event</span></div>
        <div><strong>15%</strong><span>drop threshold for "big drop" alerts</span></div>
        <div><strong>SEK 0</strong><span>infrastructure cost when idle</span></div>
      </section>

      <section id="how" className="block">
        <h2>How it works</h2>
        <p className="section-lead">From the moment you add a route to the email in your inbox – fully automated and event-driven.</p>
        <div className="steps">{steps.map((s) => <div key={s.n} className="step-card"><span className="num">{s.n}</span><h3>{s.title}</h3><p>{s.text}</p></div>)}</div>
      </section>

      <section id="features" className="block">
        <h2>Everything you need to book smarter</h2>
        <p className="section-lead">Simple on the surface, solid underneath.</p>
        <div className="features">{features.map((f) => <div key={f.title} className="feature"><span className="ficon">{f.icon}</span><h3>{f.title}</h3><p>{f.text}</p></div>)}</div>
      </section>

      <section id="tech" className="block tech">
        <div>
          <h2>Built on a modern serverless architecture</h2>
          <p className="section-lead">FareWatch was built as a cloud-native project to show how a real product can run without a single server. Each part of AWS has one clear job.</p>
          <pre className="arch">{`Dashboard ──JWT──▶ API Gateway ──▶ Lambda (×5)
                                      │
             Scheduler ──▶ Lambda ──▶ DynamoDB
                                      │ Streams
                                      ▼
                     Lambda alerter ──▶ SNS ──▶ 📧
                             └──▶ CloudWatch`}</pre>
        </div>
        <ul className="stack">{stack.map(([n, d]) => <li key={n}><b>{n}</b><span>{d}</span></li>)}</ul>
      </section>

      <section id="faq" className="block">
        <h2>Frequently asked questions</h2>
        <div className="faq">{faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>

      <section className="final">
        <h2>Your next trip could be cheaper.</h2>
        <p>Add your first route in under a minute and let FareWatch do the watching.</p>
        <button className="btn primary big" onClick={onStart}>Open FareWatch</button>
      </section>

      <footer className="foot"><span>© 2026 FareWatch</span><span className="muted">Built with AWS Lambda, API Gateway, DynamoDB, SNS & Cognito</span></footer>
    </div>
  );
}
