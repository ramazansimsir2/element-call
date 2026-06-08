/*
Yerel gelistirme yardimcisi (upstream'in parcasi DEGILDIR).

Amac: dev sunucusunu Cloudflare quick tunnel ile telefondaki APK'ye (Hamsi)
acabilmek. Hamsi WebView origin'e duz HTTP konustugu icin HTTPS'i kapatiriz ve
rastgele *.trycloudflare.com host'una izin vermek icin allowedHosts: true
veririz.

Bu dosya vite.config.ts'i DEGISTIRMEDEN ayni sonucu verir; boylece upstream
(element-hq) ile merge cakismasi olmaz. vite-embedded.config.ts ile ayni
oruntudedir.
lan 
EK (gecici teshis): element-call'un tum console loglarini telefondan toplayip
hem bir dosyaya (../debug-logs/ec-remote.log) yazan hem de canli bir izleme
sayfasinda (http://localhost:3002/__logs) gosteren bir borular. Sadece bu dev
config'te yasar; uygulama kaynagina dokunmaz. Kaldirmak icin bu dosyayi eski
haline almak yeterli.

Kullanim:
  pnpm dev --config vite-tunnel.config.ts --port 3002
  Izleme: tarayicida http://localhost:3002/__logs
*/

import { type ConfigEnv, type UserConfig, type Plugin } from "vite";
import * as fs from "node:fs";
import * as path from "node:path";

import fullConfig from "./vite.config";

const LOG_DIR = path.resolve(process.cwd(), "..", "debug-logs");
const LOG_FILE = path.join(LOG_DIR, "ec-remote.log");

interface LogItem {
  seq: number;
  t: number;
  level: string;
  tag: string;
  rid: string;
  msg: string;
}

const ring: LogItem[] = [];
let seq = 0;

function record(
  items: Array<{
    level?: string;
    tag?: string;
    rid?: string;
    t?: number;
    msg?: string;
  }>,
): void {
  const lines: string[] = [];
  for (const it of items) {
    seq += 1;
    const entry: LogItem = {
      seq,
      t: typeof it.t === "number" ? it.t : Date.now(),
      level: String(it.level ?? "log"),
      tag: String(it.tag ?? "?"),
      rid: String(it.rid ?? "?"),
      msg: String(it.msg ?? ""),
    };
    ring.push(entry);
    const ts = new Date(entry.t).toISOString().slice(11, 23);
    lines.push(
      "[" +
        ts +
        "] [" +
        entry.tag +
        "/" +
        entry.rid +
        "] " +
        entry.level.toUpperCase() +
        ": " +
        entry.msg,
    );
  }
  while (ring.length > 8000) ring.shift();
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, lines.join("\n") + "\n");
  } catch {
    /* yoksay */
  }
}

// element-call icine enjekte edilen console-forward shim'i (backtick KULLANMA).
const SHIM = [
  "<script>",
  "(function(){",
  "  if (window.__ecLogShim) return; window.__ecLogShim = true;",
  '  var m = (navigator.userAgent.match(/SM-[A-Za-z0-9]+|Pixel ?[0-9A-Za-z]+|Redmi[^;)]*|moto[^;)]*/)||["dev"])[0];',
  "  var rid = Math.random().toString(36).slice(2,6);",
  "  var q = [];",
  '  function s(a){ try { if (a instanceof Error) return (a.stack||a.message); if (typeof a==="object") return JSON.stringify(a); return String(a); } catch(e){ return String(a); } }',
  "  function push(level, args){ try { var parts=[]; for (var i=0;i<args.length;i++) parts.push(s(args[i])); q.push({level:level,tag:m,rid:rid,t:Date.now(),msg:parts.join(' ')}); if (q.length>1000) q.shift(); } catch(e){} }",
  '  ["log","info","warn","error","debug"].forEach(function(name){ var o=console[name]?console[name].bind(console):function(){}; console[name]=function(){ push(name,[].slice.call(arguments)); o.apply(null,arguments); }; });',
  '  window.addEventListener("error", function(e){ push("error",["[onerror]", e.message, (e.filename||"")+":"+(e.lineno||"")]); });',
  '  window.addEventListener("unhandledrejection", function(e){ var r=e.reason; push("error",["[unhandledrejection]", (r&&(r.stack||r.message))||String(r)]); });',
  '  function flush(){ if(!q.length) return; var b=q.splice(0,q.length); try { fetch("/__eclog",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b),keepalive:true}).catch(function(){}); } catch(e){} }',
  '  setInterval(flush, 700); window.addEventListener("pagehide", flush); document.addEventListener("visibilitychange", function(){ if(document.visibilityState==="hidden") flush(); });',
  '  console.info("[ec-remote-log] shim aktif", m, rid);',
  "})();",
  "</script>",
].join("\n");

// Canli izleme sayfasi (backtick KULLANMA — outer template literal degil dize).
const VIEWER = [
  "<!doctype html><html><head><meta charset='utf-8'>",
  "<meta name='viewport' content='width=device-width, initial-scale=1'>",
  "<title>EC Canli Log</title>",
  "<style>",
  "  html,body{margin:0;background:#0b0e13;color:#d7dde5;font:13px/1.45 ui-monospace,Consolas,monospace;height:100%}",
  "  #bar{position:sticky;top:0;display:flex;gap:8px;align-items:center;padding:8px;background:#11161e;border-bottom:1px solid #222c3a;flex-wrap:wrap}",
  "  #bar input{flex:1;min-width:140px;background:#0b0e13;color:#d7dde5;border:1px solid #2a3647;border-radius:6px;padding:6px 8px}",
  "  #bar button{background:#1d2735;color:#d7dde5;border:1px solid #2a3647;border-radius:6px;padding:6px 10px;cursor:pointer}",
  "  #bar button.on{background:#2563eb;border-color:#2563eb;color:#fff}",
  "  #stat{color:#7d8aa0}",
  "  #log{padding:8px 10px;white-space:pre-wrap;word-break:break-word}",
  "  .row{padding:1px 0;border-bottom:1px solid #141a23}",
  "  .t{color:#5f6b7e}  .tag{color:#8b5cf6}",
  "  .error{color:#ff6b6b}  .warn{color:#ffb454}  .info{color:#9cdcfe}  .debug{color:#6b7a8d}  .log{color:#cdd6e0}",
  "  .hot{background:#23314a;border-radius:3px;padding:0 3px}",
  "</style></head><body>",
  "<div id='bar'>",
  "  <b>EC Canli Log</b>",
  "  <input id='f' placeholder='filtre (or: callintent|route|leave|error)'>",
  "  <button id='pause'>Durdur</button>",
  "  <button id='clear'>Temizle</button>",
  "  <button id='wrap' class='on'>Otokaydir</button>",
  "  <span id='stat'></span>",
  "</div>",
  "<div id='log'></div>",
  "<script>",
  "var since=0, paused=false, autoscroll=true, count=0;",
  "var logEl=document.getElementById('log'), statEl=document.getElementById('stat');",
  "var fEl=document.getElementById('f');",
  "var HOT=/callintent|intent=|earpiece|speaker|handset|route|join_existing|start_call|leave|disconnect|reconnect|hangup|terminat|sfu|livekit|focus|membership|delayed|to-device|key|error|fail/i;",
  "document.getElementById('pause').onclick=function(){ paused=!paused; this.classList.toggle('on',paused); this.textContent=paused?'Devam':'Durdur'; };",
  "document.getElementById('clear').onclick=function(){ logEl.innerHTML=''; };",
  "var wrapBtn=document.getElementById('wrap'); wrapBtn.onclick=function(){ autoscroll=!autoscroll; this.classList.toggle('on',autoscroll); };",
  "function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }",
  "function add(it){",
  "  var flt=fEl.value.trim();",
  "  if(flt){ try{ if(!new RegExp(flt,'i').test(it.msg)) return; }catch(e){ if(it.msg.toLowerCase().indexOf(flt.toLowerCase())<0) return; } }",
  "  var d=new Date(it.t), ts=('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2)+'.'+('00'+d.getMilliseconds()).slice(-3);",
  "  var msg=esc(it.msg); if(HOT.test(it.msg)) msg='<span class=hot>'+msg+'</span>';",
  "  var row=document.createElement('div'); row.className='row';",
  "  row.innerHTML=\"<span class='t'>\"+ts+\"</span> <span class='tag'>\"+esc(it.tag)+\"</span> <span class='\"+it.level+\"'>\"+it.level.toUpperCase()+\"</span> \"+msg;",
  "  logEl.appendChild(row); count++;",
  "  while(logEl.childNodes.length>3000) logEl.removeChild(logEl.firstChild);",
  "}",
  "function poll(){",
  "  fetch('/__logs/data?since='+since).then(function(r){return r.json();}).then(function(j){",
  "    if(j.items && j.items.length && !paused){ j.items.forEach(add); if(autoscroll) window.scrollTo(0,document.body.scrollHeight); }",
  "    since=j.last; statEl.textContent='son seq '+j.last+' | gosterilen '+count;",
  "  }).catch(function(){}).finally(function(){ setTimeout(poll, 700); });",
  "}",
  "poll();",
  "</script></body></html>",
].join("\n");

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 5_000_000) body = body.slice(-5_000_000);
    });
    req.on("end", () => resolve(body));
    req.on("error", () => resolve(body));
  });
}

function remoteLogPlugin(): Plugin {
  return {
    name: "ec-remote-log",
    transformIndexHtml(html): string {
      return html.includes("__ecLogShim")
        ? html
        : html.replace("</head>", SHIM + "\n</head>");
    },
    configureServer(server): void {
      server.middlewares.use("/__eclog", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        void readBody(req).then((body) => {
          try {
            const parsed = JSON.parse(body || "[]");
            record(Array.isArray(parsed) ? parsed : [parsed]);
          } catch {
            record([{ level: "log", msg: body }]);
          }
          res.statusCode = 204;
          res.end();
        });
      });
      server.middlewares.use("/__logs/data", (req, res) => {
        const u = new URL(req.url ?? "", "http://x");
        const sinceParam = Number(u.searchParams.get("since") ?? "0");
        const items = ring.filter((b) => b.seq > sinceParam).slice(-1000);
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ items, last: seq }));
      });
      server.middlewares.use("/__logs", (_req, res) => {
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(VIEWER);
      });
      // eslint-disable-next-line no-console
      console.log(
        "[ec-remote-log] hazir -> izleme: http://localhost:3002/__logs , dosya: " +
          LOG_FILE,
      );
    },
  };
}

export default (env: ConfigEnv): UserConfig => {
  const base = fullConfig({ ...env, packageType: "full" });
  return {
    ...base,
    plugins: [...(base.plugins ?? []), remoteLogPlugin()],
    server: {
      ...(base.server ?? {}),
      https: undefined, // HTTPS kapali -> duz HTTP (Hamsi WebView icin)
      allowedHosts: true, // rastgele *.trycloudflare.com host'una izin ver
    },
  };
};
