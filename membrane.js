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
  // https://gist.github.com/imDaniX/8449f40655fcc1b92ae8d756cbca1264
  censorRegExp =
    /(?<![а-яё])(?:(?:(?:у|[нз]а|(?:хитро|не)?вз?[ыьъ]|с[ьъ]|(?:и|ра)[зс]ъ?|(?:о[тб]|п[оа]д)[ьъ]?|(?:\S(?=[а-яё]))+?[оаеи-])-?)?(?:[её](?:б(?!о[рй]|рач)|п[уа](?:ц|тс))|и[пб][ае][тцд][ьъ]).*?|(?:(?:н[иеа]|ра[зс]|[зд]?[ао](?:т|дн[оа])?|с(?:м[еи])?|а[пб]ч)-?)?ху(?:[яйиеёю]|л+и(?!ган)).*?|бл(?:[эя]|еа?)(?:[дт][ьъ]?)?|\S*?(?:п(?:[иеё]зд|ид[аое]?р|ед(?:р(?!о)|[аое]р|ик))|бля(?:[дбц]|тс)|[ое]ху[яйиеёю]|хуйн).*?|(?:о[тб]?|про|на|вы)?м(?:анд(?:[ауеыи](?:л(?:и[сзщ])?[ауеиы])?|ой|[ао]в.*?|юк(?:ов|[ауи])?|е[нт]ь|ища)|уд(?:[яаиое].+?|е?н(?:[ьюия]|ей))|[ао]л[ао]ф[ьъ](?:[яиюе]|[еёо]й))|елд[ауые].*?|ля[тд]ь|(?:[нз]а|по)х)(?![а-яё])/giu,
  tgStack = [],
  redirectServerOptions = {
    /* no specific options for now */
  };

let webServer;
// </editor-fold>

// <editor-fold desc="String functions">
function log(...a) {
  !argSilent && console.log(...a);
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
    pos += 1; // terminating zero
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
            (acc, gameData) => "\n" + getTgGameLink(client, gameData),
            "",
          )}`
        : `Создана новая игра: ${getTgGameLink(client, newGames[0])}`) +
        `\n\nНажмите на название игры, чтобы присоединиться к ней \\(требуется установленная из Steam игра\\)`,
    );

  client.games = games;
  client.gamesRead = true;
  globalThis.clearTimeout(client.lastTimeout);
  client.lastTimeout = globalThis.setTimeout(
    () => requestGames(clientKey),
    M.gameRequestTimeout,
  );
}
// </editor-fold>

// <editor-fold desc="Telegram network functions">
function sendToTgChat(chatId, content) {
  log(`[tg] sendToChat ${chatId}: ${content}`);
  const json = JSON.stringify({
      chat_id: chatId,
      parse_mode: "MarkdownV2",
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
  // Commented out for now as telegram does not support links with Steam browser protocol atm
  // return `[${gameData.name}](steam://run/264080//\-server ${client.host} \-port ${client.port} \-game ${gameData.id}/) \\(${gameData.mode}\\)`;
  let censoredName = gameData.name.slice();
  [...gameData.name.matchAll(censorRegExp)].forEach(([censoredString]) => {
    censoredName = censoredName.replace(
      censoredString,
      "\\*".repeat(censoredString.length),
    );
  });

  return `[${censoredName}](${M.redirectHost}:${M.redirectPort}/r?s\\=${client.host}&p\\=${client.port}&g\\=${gameData.id}) \\(${gameData.mode}\\)`;
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

  if (!existsSync(configPath)) {
    log(`Configuration file ${configPath} was not found, aborting`);
    process.exit(1);
  }
  Object.assign(
    M,
    JSON.parse(readFileSync(configPath, { encoding: "utf8", flag: "r" })),
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
