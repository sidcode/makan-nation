// Two ways to play together, behind one small interface.
//
//   host:  { code, send(peer, msg), broadcast(msg), onJoin(peer), onLeave(peer), onMessage(peer, msg), close() }
//   guest: { code, send(msg), onMessage(msg), onClose(reason), close() }
//
// LAN goes through the Bun server, which only relays. Online goes peer to peer over WebRTC with Trystero,
// so it also works from a static site with no server of ours at all.

const CODE_CHARS = "ACDEFHJKMNPRTUVWXY";

export function randomCode() {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
}

export const cleanCode = (s) =>
  String(s ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);

function noop() {}

// ---------- LAN: WebSocket rooms on the Bun server ----------

function wsUrl(params) {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/ws/hawker?${new URLSearchParams(params)}`;
}

export function lanHost() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl({ role: "host" }));
    const t = {
      kind: "lan",
      code: "",
      onJoin: noop,
      onLeave: noop,
      onMessage: noop,
      onClose: noop,
      send: (peer, msg) => ws.readyState === 1 && ws.send(JSON.stringify({ to: peer, d: msg })),
      broadcast: (msg) => ws.readyState === 1 && ws.send(JSON.stringify({ to: null, d: msg })),
      close: () => ws.close(),
    };
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.e === "ok") {
        t.code = m.room;
        resolve(t);
      } else if (m.e === "join") t.onJoin(m.id);
      else if (m.e === "leave") t.onLeave(m.id);
      else if (m.e === "msg") t.onMessage(m.id, m.d);
      else if (m.e === "err") reject(new Error(m.why));
    };
    ws.onerror = () => reject(new Error("Could not reach the game server"));
    ws.onclose = () => t.onClose("The room closed");
  });
}

export function lanGuest(code) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl({ role: "join", room: code }));
    const t = {
      kind: "lan",
      code,
      onMessage: noop,
      onClose: noop,
      send: (msg) => ws.readyState === 1 && ws.send(JSON.stringify({ d: msg })),
      close: () => ws.close(),
    };
    let opened = false;
    ws.onmessage = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.e === "ok") {
        opened = true;
        resolve(t);
      } else if (m.e === "msg") t.onMessage(m.d);
      else if (m.e === "err") reject(new Error(m.why));
    };
    ws.onerror = () => reject(new Error("Could not reach the game server"));
    ws.onclose = () => (opened ? t.onClose("The host left") : reject(new Error("No room with that code")));
  });
}

// ---------- Online: peer to peer with Trystero ----------

const APP_ID = "common-ground-makan-nation-v1";

async function trysteroRoom(code) {
  const { joinRoom, selfId } = await import("trystero");
  const room = joinRoom({ appId: APP_ID }, `kitchen-${code}`);
  const action = room.makeAction("m");
  return { room, action, selfId };
}

export async function p2pHost(code = randomCode()) {
  const { room, action } = await trysteroRoom(code);
  const peers = new Set();
  const t = {
    kind: "p2p",
    code,
    onJoin: noop,
    onLeave: noop,
    onMessage: noop,
    onClose: noop,
    send: (peer, msg) => action.send(msg, { target: peer }).catch(noop),
    broadcast: (msg) => peers.size && action.send(msg, { target: [...peers] }).catch(noop),
    close: () => room.leave(),
  };
  room.onPeerJoin = (peer) => {
    // Everyone in the room meets everyone, so say who is in charge.
    action.send({ t: "host" }, { target: peer }).catch(noop);
  };
  room.onPeerLeave = (peer) => {
    if (peers.delete(peer)) t.onLeave(peer);
  };
  action.onMessage = (msg, { peerId }) => {
    if (msg?.t === "hello" && !peers.has(peerId)) {
      peers.add(peerId);
      t.onJoin(peerId);
    }
    if (peers.has(peerId)) t.onMessage(peerId, msg);
  };
  return t;
}

export async function p2pGuest(code, { timeoutMs = 25000 } = {}) {
  const { room, action } = await trysteroRoom(code);
  return new Promise((resolve, reject) => {
    let host = null;
    const t = {
      kind: "p2p",
      code,
      onMessage: noop,
      onClose: noop,
      send: (msg) => host && action.send(msg, { target: host }).catch(noop),
      close: () => room.leave(),
    };
    const timer = setTimeout(() => {
      if (host) return;
      room.leave();
      reject(new Error("Could not find that kitchen online. Check the code, or try LAN."));
    }, timeoutMs);
    action.onMessage = (msg, { peerId }) => {
      if (!host && msg?.t === "host") {
        host = peerId;
        clearTimeout(timer);
        resolve(t);
        return;
      }
      if (peerId === host) t.onMessage(msg);
    };
    room.onPeerLeave = (peer) => peer === host && t.onClose("The host left");
  });
}
