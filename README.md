# Membrane

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

[Vangers](https://github.com/KranX/Vangers) multiplayer servers' monitoring and notification tool, integrated with the [Telegram](https://github.com/topics/telegram) messaging app.

## Launch

You can start the bot using the following command: `node membrane.js`. Script expects a file named `membrane.json` to be in the same folder (see below the "Configuration" section). Script also supports some optional arguments:

- `-h`, `--help`: prints help message.
- `-s`, `--silent`: disables most of logging/"console" output.

## Configuration

Make a copy of the `membrane.json-sample` file and rename it to `membrane.json` – that will be the configuration file used by the script. It has sensible values set by default, but some still need to be changed by hand:

- `tgToken`: a special Telegram Bot API authorization [token](https://core.telegram.org/bots/api#authorizing-your-bot) should be placed here.
- `tgPort`: port to be used for the Telegram Bot webhook and for sending requests to `api.telegram.org`. Telegram API supports one of the following ports at the moment: 443, 80, 88, 8443. Isn't used for now in its full capacity (see to-do list).
- `tgSendTimeout`: milliseconds between sending messages to Telegram. Telegram does not allow to send more than 20 messages per minute in a single chat and no more than 30 messages across all personal/public chats. Isn't used for now (see to-do list).
- `tgChats`: an array of chat IDs where the bot should send messages. Isn't used for now in its full capacity (see to-do list), bot only sends messages to the first chat.
- `censorSensitivity`: maximum % (0.0-1.0) of word distance difference in words for the censoring filter, allowing it to recognize words with typos. The closer it is to zero, the less "flexible" filter is.
- `exceptionSensitivity`: same as `censorSensitivity`, but for "exception" words, which are prioritized over "bad" words.
- `redirectHost`: as Telegram does not consider links using Steam Browser Protocol as valid, this bot sets up a separate web server, whose only task is to redirect users to such links from a Telegram-compliable links. If user decides to start redirect server as a completely separate application somewhere else, they can provide a corresponding host name here.
- `redirectPort`: port to be used with the `redirectHost` when forming links to send to Telegram chats.
- `gameRequestTimeout`: milliseconds between getting an answer and sending a game info request __on one Vangers server__ (requesting clients are run in parallel), when no new games are found.
- `gameRequestCooldown`: same as `gameRequestTimeout`, but is used when new games were found.
- `reconnectTimeout`: milliseconds between trying to connect to a Vangers server after previous attempt was failed (e.g. server is down).
- `servers`: list of Vangers servers that bot will gather info about. `type` field is used only to customize messages sent to Telegram (i.e. to tell players to download specific modification for some server).



## Change log

[CHANGELOG](CHANGELOG.md)

## License

[MIT](LICENSE)
