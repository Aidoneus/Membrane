// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt Expat
/**
 * @prettier
 */
"use strict";

const { Socket } = require("net"),
  { request /*createServerS as createServer*/ } = require("https"),
  { createServer } = require("http"),
  { existsSync, readFileSync } = require("fs"),
  { dirname, basename } = require("path"),
  // <editor-fold desc="Constants">
  dir = dirname(__filename),
  scriptFile = basename(__filename),
  args = process.argv.slice(2),
  argsI = [
    args.indexOf("--help"),
    args.indexOf("-h"),
    args.indexOf("--silent"),
    args.indexOf("-s"),
  ],
  argHelp = argsI[0] >= 0 || argsI[1] >= 0,
  argSilent = argsI[2] >= 0 || argsI[3] >= 0,
  M = {},
  configPath = dir + "/membrane.json",
  // Based on https://code.google.com/archive/p/badwordslist/downloads
  badWordsLatinPath = dir + "/bad_words_latin.txt",
  // Based on https://github.com/bars38/Russian_ban_words
  badWordsCyrillicPath = dir + "/bad_words_cyrillic.txt",
  exceptionsLatinPath = dir + "/exceptions_latin.txt",
  exceptionsCyrillicPath = dir + "/exceptions_cyrillic.txt",
  cp866 = `АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмноп${" ".repeat(
    48,
  )}рстуфхцчшщъыьэюяЁё${" ".repeat(14)}`,
  clientPool = new Map(),
  reactions = [
    () => {}, // Default reaction to anything else, e.g. clientKey => { doSomething(); },
    handshake,
    receiveGames,
  ],
  conditions = [
    (clientKey, dataString, dataLength, code) =>
      dataString ===
      `Enter, my son, please...\x00${clientPool.get(clientKey).protocol}`,
    (clientKey, dataString, dataLength, code) => dataLength && code === 0xc1,
  ],
  badWords = { cyr: [], lat: [] },
  exceptionWords = { cyr: [], lat: [] },
  censorCharmap = {
    lat: {
      a: ["a", "а", "@"],
      b: ["b", "6"],
      c: ["c", "с", "("],
      d: ["d"],
      e: ["e", "е"],
      f: ["f"],
      g: ["g"],
      h: ["h", "н"],
      i: ["i", "!"],
      j: ["j"],
      k: ["k", "к"],
      l: ["l"],
      m: ["m", "м"],
      n: ["n", "п"],
      o: ["o", "о"],
      p: ["p", "р"],
      q: ["q"],
      r: ["r", "г"],
      s: ["s", "$"],
      t: ["t", "+", "7", "т"],
      u: ["u", "и", "ц"],
      v: ["v"],
      w: ["w"],
      x: ["x", "х"],
      y: ["y", "у"],
      z: ["z"],
    },
    cyr: {
      а: ["а", "a", "@"],
      б: ["б", "6", "b"],
      в: ["в", "b", "v"],
      г: ["г", "r", "g"],
      д: ["д", "d", "g"],
      е: ["е", "e"],
      ё: ["ё", "e"],
      ж: ["ж" /*, 'zh'*/, "*"],
      з: ["з", "3", "z"],
      и: ["и", "u", "i"],
      й: ["й", "u", "i", "y"],
      к: ["к", "k" /*, 'i{', '|{'*/],
      л: ["л", "l" /*, 'ji', '/\\'*/],
      м: ["м", "m"],
      н: ["н", "h", "n"],
      о: ["о", "o", "0"],
      п: ["п", "n", "p"],
      р: ["р", "r", "p"],
      с: ["с", "c", "s", "("],
      т: ["т", "m", "t", "+"],
      у: ["у", "y", "u"],
      ф: ["ф", "f"],
      х: ["х", "x", "h" /*, '}{'*/],
      ц: ["ц", "c" /*'u,'*/],
      ч: ["ч", /*'ch',*/ "4"],
      ш: ["ш" /*, 'sh'*/],
      щ: ["щ" /*, 'sch'*/],
      ь: ["ь", "b"],
      ы: ["ы" /*, 'bi'*/],
      ъ: ["ъ"],
      э: ["э", "e"],
      ю: ["ю" /*, 'io', '|o'*/],
      я: ["я" /*, 'ya'*/, "r"],
    },
  },
  tgStack = [],
  redirectServerOptions = {
    /* no specific options for now */
  };

let webServer;
// </editor-fold>

// <editor-fold desc="String functions">
function log(...a) {
  if (argSilent) return;
  const date = new Date(),
    msg = [
      "FullYear",
      "Month",
      "Date",
      "Hours",
      "Minutes",
      "Seconds",
      "Milliseconds",
    ]
      .map((m, i) =>
        (date[`getUTC${m}`]() + (i === 1 ? 1 : 0))
          .toString(10)
          .padStart(!i || i === 6 ? 4 : 2, "0"),
      )
      .reduce((p, c, i) => p + c + ".. ::: "[i], "");

  console.log(msg, ...a);
}

function encodeChar(char) {
  if (char === " ") return 32;
  const i = cp866.indexOf(char);
  return !~char ? char.charCodeAt(0) : i + 128;
}

function decodeChar(code) {
  return code < 128 ? String.fromCharCode(code) : cp866[code - 128];
}

function encodeString(charString) {
  return Array.prototype.map.call(charString, (char) => encodeChar(char));
}

function decodeArray(codeArray) {
  return codeArray.reduce((str, code) => str + decodeChar(code), "");
}

function pad(value, length = 2) {
  return value.toString(10).padStart(length, "0");
}

function getRndString(length) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += "█▄▀"[(Math.random() * 3) | 0];
  }
  return result;
}

function distance(a, b) {
  const m = a.length,
    n = b.length,
    d = [[], []],
    c = [0, 0, 0];
  let i = 0,
    j = 0,
    r1 = 0,
    r2 = 1;
  for (j = 0; j <= n; j++) d[1][j] = j;
  for (i = 1; i <= m; i++) {
    r1 = +!r1;
    r2 = +!r2;
    d[r2][0] = i;
    for (j = 1; j <= n; j++) {
      c[0] = d[r1][j] + 1;
      c[1] = d[r2][j - 1] + 1;
      c[2] = d[r1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1);
      d[r2][j] = Math.min(c[0], c[1], c[2]);
    }
  }
  return d[r2][n];
}

// Based on: https://habr.com/ru/sandbox/145868/
function censor(src) {
  // todo Due to possible usage of one symbol as a replacement for multiple different ones there should be a way
  //  to form alternate possible strings with different __order__ of replacements
  // todo You can replace spaces in the source string with "", but you should somehow keep track of the original
  //  __range__ in the src that was occupied by the filtered string
  const censorData = [],
    exceptionData = [];
  let i = 0,
    realStr = "",
    tmpStr = "",
    tmpWord = "";

  ["cyr", "lat"].forEach((type) => {
    realStr = src.slice().toLowerCase();
    exceptionWords[type].forEach((word) => {
      tmpWord = word.toLowerCase();
      for (i = 0; i <= realStr.length - word.length; i += 1) {
        tmpStr = realStr.slice(i, i + word.length);
        if (
          distance(tmpStr, tmpWord) <=
          tmpWord.length * M.exceptionSensitivity
        ) {
          log(
            `[filter exception] Found word "${word}" as "${tmpStr}" in string "${src}"`,
          );
          exceptionData.push([i, src.slice(i, i + word.length)]);
          realStr =
            realStr.slice(0, i) +
            " ".repeat(word.length) +
            realStr.slice(i + word.length);
        }
      }
    });
    Object.entries(censorCharmap[type]).forEach(
      ([realLetter, replacementList]) => {
        replacementList.forEach((replacement) => {
          // todo Keep note of how many extra symbols this specific replacement inserted and make use of it below
          //  in the badWords.forEach(...) cycle
          for (i = 0; i < src.length; i += 1)
            realStr = realStr.replaceAll(replacement, realLetter);
        });
      },
    );
    badWords[type].forEach((word) => {
      tmpWord = word.toLowerCase();
      for (i = 0; i <= realStr.length - word.length; i += 1) {
        tmpStr = realStr.slice(i, i + word.length);
        if (distance(tmpStr, tmpWord) <= tmpWord.length * M.censorSensitivity) {
          log(
            `[filter censor] Found word "${word}" as "${tmpStr}" in string "${src}"`,
          );
          censorData.push([i, i + word.length]);
        }
      }
    });
  });

  tmpStr = src.slice();
  censorData.forEach(([strStart, strEnd]) => {
    tmpStr =
      tmpStr.slice(0, strStart) +
      getRndString(strEnd - strStart) +
      tmpStr.slice(strEnd);
  });
  exceptionData.forEach(([strStart, str]) => {
    tmpStr =
      tmpStr.slice(0, strStart) + str + tmpStr.slice(strStart + str.length);
  });

  return tmpStr;
}
// </editor-fold>

// <editor-fold desc="Vangers network functions">
function initClient(clientKey, { host, port, type, protocol }) {
  if (clientPool.get(clientKey)?.alive) return;
  log(`[${clientKey}] initClient`);
  const client = new Socket();
  clientPool.set(clientKey, {
    client,
    host,
    port,
    type,
    protocol,
    games: {},
    lastTimeout: null,
    alive: true,
    gamesRead: false,
  });
  client.on("data", async function (data) {
    const dataString = data.toString(),
      dataBuffer = data,
      dataLength = dataBuffer.readUInt16LE(0);
    let pos = 2,
      code;
    if (dataLength) {
      code = dataBuffer.readUInt8(pos);
      pos += 1;
    }
    reactions[
      conditions.findIndex(
        (c) => !!c(clientKey, dataString, dataLength, code),
      ) + 1
    ](clientKey, dataBuffer, pos);
  });
  client.on("error", function () {
    log(`[${clientKey}] error`);
    disconnect(clientKey);
  });
  client.on("timeout", function () {
    log(`[${clientKey}] timeout`);
    disconnect(clientKey);
  });
  client.on("close", function () {
    log(
      `[${clientKey}] connection closed, try again in ${
        M.reconnectTimeout / 1000 / 60
      } min`,
    );
    clientPool.get(clientKey).alive = false;
    globalThis.clearTimeout(clientPool.get(clientKey).lastTimeout);
    clientPool.get(clientKey).lastTimeout = globalThis.setTimeout(
      () => initClient(clientKey, { host, port, type, protocol }),
      M.reconnectTimeout,
    );
  });
  connect(clientKey);
}

function connect(clientKey) {
  const { port, host, protocol, client } = clientPool.get(clientKey);
  client.connect(port, host, () => {
    client.write(`Vivat Sicher, Rock\'n\'Roll forever!!!\x00${protocol}`);
  });
}

function disconnect(clientKey) {
  send(clientKey, 0x86, Buffer.alloc(0));
  clientPool.get(clientKey).client.destroy();
}

function send(clientKey, code, dataBuffer) {
  const lengthBuffer = Buffer.alloc(2);
  lengthBuffer.writeInt16LE(1 + dataBuffer.length); // 1 = code buffer's length
  clientPool
    .get(clientKey)
    .client.write(
      Buffer.concat([lengthBuffer, Buffer.from([code]), dataBuffer]),
    );
}

async function handshake(clientKey) {
  log(`[${clientKey}] handshake`);
  requestGames(clientKey);
}

function requestGames(clientKey) {
  send(clientKey, 0x81, Buffer.alloc(0));
}

async function receiveGames(clientKey, dataBuffer, pos) {
  const games = {},
    gamesCount = dataBuffer.readUInt8(pos),
    client = clientPool.get(clientKey),
    oldGames = client.games,
    newGames = [];
  let gameIndex = 0;
  while (pos < dataBuffer.length && gameIndex < gamesCount) {
    let gameName = [],
      tmpName = "";
    const id = dataBuffer.readUInt32LE(pos + 1);
    pos += 5;
    while (dataBuffer[pos] !== 0) {
      gameName.push(dataBuffer[pos]);
      pos += 1;
    }
    tmpName = decodeArray(gameName);
    tmpName = tmpName.split(" ");
    games[id] = {
      name: tmpName
        .filter((e, i) => i < tmpName.length - 3)
        .join(" ")
        .slice(0, -1),
      players: tmpName[tmpName.length - 3],
      mode: M.gameModes[M.gameLetters.indexOf(tmpName[tmpName.length - 2])],
      time: tmpName[tmpName.length - 1],
      isNew: !client.gamesRead ? false : !oldGames[id],
    };
    gameIndex += 1;
  }
  log(`[${clientKey}] games:`, games);

  Object.entries(games).forEach(([gameId, gameData]) => {
    if (gameData.isNew) newGames.push({ ...gameData, id: gameId });
  });
  if (newGames.length)
    sendToTgChat(
      M.tgChats[0],
      (newGames.length > 1
        ? `Созданы новые игры:${newGames.reduce(
            (acc, gameData) => acc + "\n" + getTgGameLink(client, gameData),
            "",
          )}`
        : `Создана новая игра: ${getTgGameLink(client, newGames[0])}`) +
        `\n\nНажмите по названию игры, чтобы присоединиться к ней (требуется установленная из Steam игра)`,
    );

  client.games = games;
  client.gamesRead = true;
  globalThis.clearTimeout(client.lastTimeout);
  client.lastTimeout = globalThis.setTimeout(
    () => requestGames(clientKey),
    newGames.length ? M.gameRequestCooldown : M.gameRequestTimeout,
  );
}
// </editor-fold>

// <editor-fold desc="Telegram network functions">
function sendToTgChat(chatId, content) {
  log(`[tg] sendToChat ${chatId}: ${content}`);
  const json = JSON.stringify({
      chat_id: chatId,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      text: content,
    }),
    req = request(
      {
        host: "api.telegram.org",
        port: M.tgPort,
        path: `/bot${M.tgToken}/sendMessage`,
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      receiveTgResponse,
    );
  req.write(json);
  req.end();
}

function receiveTgResponse(response) {
  let data = "";
  response.on("data", (chunk) => (data += chunk));
  response.on("end", () => {
    log(`[tg] response status code: ${response.statusCode}`);
    log("[tg] response body:", data);
  });
}

function getTgGameLink(client, gameData) {
  return `<a href="${M.redirectHost}:${M.redirectPort}/r?s=${client.host}&p=${
    client.port
  }&g=${gameData.id}">${censor(gameData.name.slice())}</a> (${gameData.mode})`;
}
// </editor-fold>

// <editor-fold desc="Redirect server functions">
function redirectReqListener(request, response) {
  const url = decodeURIComponent(request.url);
  if (
    url.slice(0, 3) === "/r?" &&
    !!~url.indexOf("s=") &&
    !!~url.indexOf("p=") &&
    !!~url.indexOf("g=")
  ) {
    const { s, p, g } = url
      .split("&")
      .map((part) => part.slice(part.indexOf("=") - 1).split("="))
      .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    response.writeHead(302, {
      Location: `steam://run/264080//-server ${s} -port ${p} -game ${g}/`,
    });
  } else {
    response.writeHead(400);
    response.write("Invalid redirect request format");
  }
  return response.end();
}
// </editor-fold>

// <editor-fold desc="Lifecycle">
function printHelp() {
  [
    `Usage: node ${scriptFile} [OPTIONS]`,
    "",
    "Options:",
    "  --help, -h       Print this",
    "  --silent, -s     Disable output",
  ].forEach((line) => console.log(line));
}

async function init() {
  if (argHelp) {
    printHelp();
    process.exit(0);
  }

  [
    [
      existsSync(configPath),
      `Configuration file ${configPath} was not found, aborting`,
    ],
    [
      existsSync(badWordsLatinPath),
      `Bad words file ${badWordsLatinPath} was not found, aborting`,
    ],
    [
      existsSync(badWordsCyrillicPath),
      `Bad words file ${badWordsCyrillicPath} was not found, aborting`,
    ],
    [
      existsSync(exceptionsLatinPath),
      `Exception words file ${exceptionsLatinPath} was not found, aborting`,
    ],
    [
      existsSync(exceptionsCyrillicPath),
      `Exception words file ${exceptionsCyrillicPath} was not found, aborting`,
    ],
  ].forEach((doesExist, errorMessage) => {
    if (!doesExist) {
      log(errorMessage);
      process.exit(1);
    }
  });

  Object.assign(
    M,
    JSON.parse(readFileSync(configPath, { encoding: "utf8", flag: "r" })),
  );
  badWords.lat.push(
    ...readFileSync(badWordsLatinPath, { encoding: "utf8", flag: "r" }).split(
      "\n",
    ),
  );
  badWords.cyr.push(
    ...readFileSync(badWordsCyrillicPath, {
      encoding: "utf8",
      flag: "r",
    }).split("\n"),
  );
  exceptionWords.lat.push(
    ...readFileSync(exceptionsLatinPath, { encoding: "utf8", flag: "r" }).split(
      "\n",
    ),
  );
  exceptionWords.cyr.push(
    ...readFileSync(exceptionsCyrillicPath, {
      encoding: "utf8",
      flag: "r",
    }).split("\n"),
  );

  webServer = createServer(redirectServerOptions, redirectReqListener);
  webServer.listen(M.redirectPort);

  // Init pool of connections to Vangers' servers
  M.servers.forEach((serverData) =>
    initClient(`${serverData.host}:${serverData.port}`, serverData),
  );
}

init().then((r) => {
  log("All clients in the pool were initialized");
});
// </editor-fold>

// @license-end
