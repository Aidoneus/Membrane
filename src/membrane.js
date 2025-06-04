// @license magnet:?xt=urn:btih:d3d9a9a6595521f9666a5e94cc830dab83b65699&dn=expat.txt Expat
/**
 * @prettier
 */
"use strict";

/**
 * @typedef {Object} VangersGame
 * @property {number} [id]
 * @property {string} name - Displayed name of the game
 * @property {number} players - Number of players currently in the game
 * @property {string} mode - Localized name of the game mode
 * @property {number} time - Lifetime of the game in seconds
 * @property {boolean} isNew - `true` if this game was not present during in
 * the previous Vangers server's response to `requestGames(...)`
 */

/**
 * @typedef {Object} VangersUpperLevelClient
 * @property {Socket} client
 * @property {string} host
 * @property {number} port
 * @property {number} type
 * @property {number} protocol
 * @property {Object<string, VangersGame>} games
 * @property {(null|number)} lastTimeout
 * @property {boolean} alive
 * @property {boolean} gamesRead
 */

const { Socket } = require("net");
const { request /* createServerS as createServer*/ } = require("https");
const { createServer } = require("http");
const { existsSync, readFileSync } = require("fs");
const { dirname, basename } = require("path");
// <editor-fold desc="Constants">
const dir = dirname(__filename);
const scriptFile = basename(__filename);
const args = process.argv.slice(2);
const argsI = [
  args.indexOf("--help"),
  args.indexOf("-h"),
  args.indexOf("--silent"),
  args.indexOf("-s"),
];
const argHelp = argsI[0] >= 0 || argsI[1] >= 0;
const argSilent = argsI[2] >= 0 || argsI[3] >= 0;
/**
 * @type {Object}
 * @property {Object<string, number>} types
 * @property {{host: string, port: number, type: number, protocol: string}[]} servers
 * @property {number} reconnectTimeout
 * @property {number} gameRequestTimeout
 * @property {number} gameRequestCooldown
 * @property {string[]} gameModes
 * @property {string[]} gameLetters
 * @property {string} tgToken
 * @property {number} tgPort
 * @property {number} tgSendTimeout
 * @property {number[]} tgChats
 * @property {string} redirectHost
 * @property {number} redirectPort
 * @property {number} censorSensitivity
 * @property {number} exceptionSensitivity
 */
const M = {};
const configPath = dir + "/membrane.json";
// Based on https://code.google.com/archive/p/badwordslist/downloads
const badWordsLatinPath = dir + "/bad_words_latin.txt";
// Based on https://github.com/bars38/Russian_ban_words
const badWordsCyrillicPath = dir + "/bad_words_cyrillic.txt";
const exceptionsLatinPath = dir + "/exceptions_latin.txt";
const exceptionsCyrillicPath = dir + "/exceptions_cyrillic.txt";
const cp866 = `АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмноп${" ".repeat(
  48,
)}рстуфхцчшщъыьэюяЁё${" ".repeat(14)}`;
const clientPool = new Map();
/**
 * @type {((function(string, (Buffer|string), number): Promise<void>)|function(string, (Buffer|string), number))[]}
 */
const reactions = [
  () => {}, // Default reaction to anything else, e.g. clientKey => { doSomething(); },
  handshake,
  receiveGames,
];
/* eslint-disable-next-line valid-jsdoc */
/**
 * @type {(function(string, string, number, number): boolean)[]}
 */
const conditions = [
  (clientKey, dataString, dataLength, code) =>
    dataString ===
      `Enter, my son, please...\x00${clientPool.get(clientKey).protocol}`,
  (clientKey, dataString, dataLength, code) => dataLength && code === 0xc1,
];
/**
 * @type {{cyr: string[], lat: string[]}}
 */
const badWords = { cyr: [], lat: [] };
/**
 * @type {{cyr: string[], lat: string[]}}
 */
const exceptionWords = { cyr: [], lat: [] };
/**
 * @type {{cyr: Object<string, string>, lat: Object<string, string>}}
 */
const censorCharmap = {
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
    ж: ["ж" /* , 'zh'*/, "*"],
    з: ["з", "3", "z"],
    и: ["и", "u", "i"],
    й: ["й", "u", "i", "y"],
    к: ["к", "k"],
    л: ["л", "l"],
    м: ["м", "m"],
    н: ["н", "h", "n"],
    о: ["о", "o", "0"],
    п: ["п", "n", "p"],
    р: ["р", "r", "p"],
    с: ["с", "c", "s", "("],
    т: ["т", "m", "t", "+"],
    у: ["у", "y", "u"],
    ф: ["ф", "f"],
    х: ["х", "x", "h"],
    ц: ["ц", "c"],
    ч: ["ч", /* 'ch',*/ "4"],
    ш: ["ш"],
    щ: ["щ"],
    ь: ["ь", "b"],
    ы: ["ы"],
    ъ: ["ъ"],
    э: ["э", "e"],
    ю: ["ю"],
    я: ["я" /* , 'ya'*/, "r"],
  },
};
// tgStack = [],
const redirectServerOptions = {
  /* no specific options for now */
};

/**
 * @type {Server}
 */
let webServer;
// </editor-fold>

/* elint-disable valid-jsdoc */
// <editor-fold desc="String functions">
/**
 * Function used for default output.
 * @param a - The same arguments one would pass to `console.log(...)`
 */
/* elint-enable valid-jsdoc */
function log(...a) {
  if (argSilent) return;
  const date = new Date();
  const msg = [
    "FullYear",
    "Month",
    "Date",
    "Hours",
    "Minutes",
    "Seconds",
    "Milliseconds",
  ]
    .map((m, i) =>
      pad(date[`getUTC${m}`]() + (i === 1 ? 1 : 0), !i || i === 6 ? 3 : 2),
    )
    .reduce((p, c, i) => p + c + ".. ::: "[i], "");

  console.log(msg, ...a);
}

/**
 * Encode a single character to CP-866.
 * @param {string} char
 * @return {number} - CP-866 byte
 */
function encodeChar(char) {
  if (char === " ") return 32;
  const i = cp866.indexOf(char);
  return !~char ? char.charCodeAt(0) : i + 128;
}

/**
 * Decode a single CP-866 byte to character.
 * @param {number} code - CP-866 byte
 * @return {string}
 */
function decodeChar(code) {
  return code < 128 ? String.fromCharCode(code) : cp866[code - 128];
}

/**
 * Encode a string to CP-866.
 * @param {string} charString
 * @return {number[]} - CP-866 bytes
 */
/* eslint-disable-next-line no-unused-vars */
function encodeString(charString) {
  return Array.prototype.map.call(charString, (char) => encodeChar(char));
}

/**
 * Decode an array of CP-866 bytes to string.
 * @param {number[]} codeArray
 * @return {string}
 */
function decodeArray(codeArray) {
  return codeArray.reduce((str, code) => str + decodeChar(code), "");
}

/**
 * Converts a number to string and pads its with zeroes (useful in formatting output).
 * @param {number} value
 * @param {number} length
 * @return {string}
 */
function pad(value, length = 2) {
  return value.toString(10).padStart(length, "0");
}

/**
 * Generates a string of specified length with random rectangles.
 * @param {number} length
 * @return {string}
 */
function getRndString(length) {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += "█▄▀"[(Math.random() * 3) | 0];
  }
  return result;
}

/**
 * Wagner-Fischer algorithm implementation for calculating the Levenshtein
 * distance with some optimizations.
 * @param {string} a
 * @param {string} b
 * @return {number}
 */
function distance(a, b) {
  const m = a.length;
  const n = b.length;
  const d = [[], []];
  const c = [0, 0, 0];
  let i = 0;
  let j = 0;
  let r1 = 0;
  let r2 = 1;
  for (j = 0; j <= n; j++) d[1][j] = j;
  for (i = 1; i <= m; i++) {
    r1 = +!r1;
    r2 = +!r2;
    d[r2][0] = i;
    for (j = 1; j <= n; j++) {
      c[0] = d[r1][j] + 1;
      c[1] = d[r2][j - 1] + 1;
      c[2] = d[r1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      d[r2][j] = Math.min(c[0], c[1], c[2]);
    }
  }
  return d[r2][n];
}

/**
 * Filters inappropriate words according to global dictionaries.<br>
 * Based on: https://habr.com/ru/sandbox/145868/
 * @param {string} src
 * @return {string}
 */
function censor(src) {
  // TODO Due to possible usage of one symbol as a replacement for multiple
  //  different ones there should be a way to form alternate possible strings
  //  with different __order__ of replacements
  // TODO You can replace spaces in the source string with "", but you should
  //  somehow keep track of the original __range__ in the src that was occupied
  //  by the filtered string
  const censorData = [];
  const exceptionData = [];
  let i = 0;
  let realStr = "";
  let tmpStr = "";
  let tmpWord = "";

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
          // TODO Keep note of how many extra symbols this specific replacement
          //  inserted and make use of it below in the badWords.forEach(...) cycle
          for (i = 0; i < src.length; i += 1) {
            realStr = realStr.replaceAll(replacement, realLetter);
          }
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

// <editor-fold desc="File functions">
/**
 * Reads the text file from the `fp` path and splits it by linebreaks into array.
 * @param {string} fp
 * @return {string[]}
 */
function readArray(fp) {
  return readFileSync(fp, { encoding: "utf8", flag: "r" }).split("\n");
}

/**
 * Reads the text file from the `fp` path and parses it as JSON.
 * @param {string} fp
 * @return {Object}
 */
function readJson(fp) {
  return JSON.parse(readFileSync(fp, { encoding: "utf8", flag: "r" }));
}
// </editor-fold>

// <editor-fold desc="Vangers network functions">
/**
 * Initializes a socket, fills corresponding data and setups the lifecycle for
 * a connection to a Vangers server.
 * @param {string} clientKey
 * @param {string} host
 * @param {number} port
 * @param {number} type
 * @param {number} protocol
 */
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
  client.on("data", async function(data) {
    const dataString = data.toString();
    const dataBuffer = data;
    const dataLength = dataBuffer.readUInt16LE(0);
    let pos = 2;
    let code;
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
  client.on("error", function() {
    log(`[${clientKey}] error`);
    disconnect(clientKey);
  });
  client.on("timeout", function() {
    log(`[${clientKey}] timeout`);
    disconnect(clientKey);
  });
  client.on("close", function() {
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

/**
 * Connect to a Vangers server.
 * @param {string} clientKey
 */
function connect(clientKey) {
  const { port, host, protocol, client } = clientPool.get(clientKey);
  client.connect(port, host, () => {
    client.write(`Vivat Sicher, Rock\'n\'Roll forever!!!\x00${protocol}`);
  });
}

/* elint-disable valid-jsdoc */
/**
 * Disconnect from a Vangers server.
 * @param clientKey
 */
/* elint-enable valid-jsdoc */
function disconnect(clientKey) {
  send(clientKey, 0x86, Buffer.alloc(0));
  clientPool.get(clientKey).client.destroy();
}

/**
 * Sends the packet to a Vangers server.
 * @param {string} clientKey
 * @param {number} code
 * @param {Buffer} dataBuffer
 */
function send(clientKey, code, dataBuffer) {
  const lengthBuffer = Buffer.alloc(2);
  lengthBuffer.writeInt16LE(1 + dataBuffer.length); // 1 = code buffer's length
  clientPool
    .get(clientKey)
    .client.write(
      Buffer.concat([lengthBuffer, Buffer.from([code]), dataBuffer]),
    );
}

/* eslint-disable valid-jsdoc */
/**
 * Reaction to successfully connecting to a Vangers server.
 * @param clientKey
 * @return {Promise<void>}
 */
/* eslint-enable valid-jsdoc */
async function handshake(clientKey) {
  log(`[${clientKey}] handshake`);
  requestGames(clientKey);
}

/**
 * Send request to a Vangers server for the list of current games.
 * @param {string} clientKey
 */
function requestGames(clientKey) {
  send(clientKey, 0x81, Buffer.alloc(0));
}

/**
 * Reaction to successfully receiving the list of current games.
 * @param {string} clientKey
 * @param {Buffer|string} dataBuffer
 * @param {number} pos
 * @return {Promise<void>}
 */
async function receiveGames(clientKey, dataBuffer, pos) {
  /**
   * @type {Object.<string, VangersGame>}
   */
  const games = {};
  const gamesCount = dataBuffer.readUInt8(pos);
  /**
     * @type {VangersUpperLevelClient}
     */
  const client = clientPool.get(clientKey);
  /**
     * @type {Object.<string, VangersGame>}
     */
  const oldGames = client.games;
  /**
   * @type {VangersGame[]}
   */
  const newGames = [];
  let gameIndex = 0;
  while (pos < dataBuffer.length && gameIndex < gamesCount) {
    const gameName = [];
    let tmpName = "";
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
      players: Number.parseInt(tmpName[tmpName.length - 3], 10),
      mode: M.gameModes[M.gameLetters.indexOf(tmpName[tmpName.length - 2])],
      // TODO Use both the time told by server and time measured by Membrane
      //  to approximate a more realistic lifetime of a game, that'd allow
      //  to resume tracking lifetime of games after Membrane restarts
      // in seconds
      time: tmpName[tmpName.length - 1]
        .split(":")
        .reduce((a, c, i) => a + c * [3600, 60, 1][i], 0),
      isNew: !client.gamesRead ? false : !oldGames[id],
    };
    gameIndex += 1;
  }
  log(`[${clientKey}] games:`, games);

  Object.entries(games).forEach(([gameId, gameData]) => {
    if (
      gameData.isNew &&
      !gameData.name.includes("[тихо]") &&
      !gameData.name.includes("[silent]")
    ) newGames.push({ ...gameData, id: gameId });
  });
  if (newGames.length) {
    sendToTgChat(
      M.tgChats[0][0],
      M.tgChats[0][1] ?? undefined,
      (newGames.length > 1 ?
        `Созданы новые игры:${newGames.reduce((acc, gameData) => acc + "\n" + getTgGameLink(client, gameData), "")}` :
        `Создана новая игра: ${getTgGameLink(client, newGames[0])}`
      ) +
        "\n\nНажмите по названию игры, чтобы присоединиться к ней (требуется установленная из Steam игра)",
    );
  }

  client.games = games;
  client.gamesRead = true;
  globalThis.clearTimeout(client.lastTimeout);
  client.lastTimeout = globalThis.setTimeout(
    () => requestGames(clientKey),
    // TODO Timeout here should always be the same; "gameRequestCooldown"
    //  instead needs to be used just for TG messages (above, when
    //  sendToTgChat(...) is called)
    newGames.length ? M.gameRequestCooldown : M.gameRequestTimeout,
  );
}
// </editor-fold>

// <editor-fold desc="Telegram network functions">
/**
 * Send a Telegram text message to the specified chat.
 * @param {number} chatId
 * @param {number} [threadId]
 * @param {string} content
 */
function sendToTgChat(chatId, threadId, content) {
  log(`[tg] sendToChat ${chatId} ${threadId ? threadId : "-"}: ${content}`);
  const json = {
    chat_id: chatId,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    text: content,
  };
  if (threadId) json.message_thread_id = threadId;
  const req = request(
    {
      host: "api.telegram.org",
      port: M.tgPort,
      path: `/bot${M.tgToken}/sendMessage`,
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
    },
    receiveTgResponse,
  );
  req.write(JSON.stringify(json));
  req.end();
}

/**
 * Reaction to receiving the text response to a Telegram request.
 * @param {IncomingMessage} response
 */
function receiveTgResponse(response) {
  let data = "";
  response.on("data", (chunk) => (data += chunk));
  response.on("end", () => {
    log(`[tg] response status code: ${response.statusCode}`);
    log("[tg] response body:", data);
  });
}

/**
 * Form an HTML code for a Vangers game link for latter use in Telegram.
 * @param {VangersUpperLevelClient} client
 * @param {VangersGame} gameData
 * @return {string}
 */
function getTgGameLink(client, gameData) {
  return `<a href="${M.redirectHost}:${M.redirectPort}/r?s=${client.host}&p=${
    client.port
  }&g=${gameData.id}">${censor(gameData.name.slice())}</a> (${
    gameData.mode
  }) на <code>${client.host}</code>:<code>${client.port}</code>`;
}
// </editor-fold>

// <editor-fold desc="Redirect server functions">
/**
 * Sends a redirect to a URL using Steam browser protocol in response to requests.
 * @param {IncomingMessage} request
 * @param {ServerResponse} response
 * @return {ServerResponse}
 */
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
/**
 * Prints a help message describing possible arguments of this script.
 */
function printHelp() {
  [
    `Usage: node ${scriptFile} [OPTIONS]`,
    "",
    "Options:",
    "  --help, -h       Print this",
    "  --silent, -s     Disable output",
  ].forEach((line) => console.log(line));
}

/**
 * Initializes this script.
 * @return {Promise<void>}
 */
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
