# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2023-09-05

### Added

- First public release.
- Most of Vangers-specific data moved to the configuration file.
- Vangers clients pool gathering info about servers with configuration-specified interval.
- Clients in the pool try to reconnect, if they didn't manage to do so initially or the connection was dropped due to some reason.
- `-s`/`--silent` argument to disable most of the output from the script.
- Distinction between "new" and "old" games on servers.
- Usage of Telegram Bot API to send messages about new games to a configuration-specified chat.
- Usage of an HTTP server to create redirect links that Telegram considers valid to a different URL formed using Steam Browser Protocol, which allows to start up the game and put players immediately into specific game (without the need for players to type server address and port and select a game themselves).
- Simple censoring of Russian swear language.

[0.1.0]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.0