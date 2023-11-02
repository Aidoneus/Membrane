# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2023-10-25

### Changed

- Replaced word distance function for censoring with more efficient one.
- Moved the word distance sensitity threshold to configuration file to the `censorSensitivity` field.
- Decreased default word distance sensitivity from 25% to 20%.
- Decreased default Vangers servers' polling frequency from 10 seconds to 5 minutes.

## [0.1.2] - 2023-09-23

### Changed

- Censoring of swear language was changed/improved: added English profanities and more possible replacement for symbols.
- Telegram messages are now sent using HTML mode instead of MarkdownV2 due to the latter's complicated rules for escaping characters in different situations.

## [0.1.1] - 2023-09-22

### Changed

- Censoring of swear language was changed/improved.

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

[0.1.3]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.3
[0.1.2]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.2
[0.1.1]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.1
[0.1.0]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.0
