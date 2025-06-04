# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.6] - 2025-06-04

### Added

- Notification suppression for games with `[silent]`/`[тихо]` in their names.
- Sending messages to specific topics in "forum" Telegram chats.
- Configuration example now has more servers & Cx game modes.
- More words in `bad_words_*` & `exceptions_*`.

### Fixed

- Formatting here and there.

### Removed

- Commented out some functions that aren't used at the moment, but are likely to be used in the future.

## [0.1.5] - 2024-01-12

### Added

- Webpack build system
- Linter based on Google recommendations
- Action for GitHub

## [0.1.4] - 2023-12-04

### Added

- Logs are now timestamped.
- Minor additions to `bad_words_cyrillic.txt` and `bad_words_latin.txt`.
- Added dictionaries with "exception" words (game terms for now) which are prioritized over "bad" words.
- Waiting time period after polling now differs depending on whether new games were found.

### Changed

- Minor change to Telegram message templates.
- `gameRequestTimeout` in the sample config is set back to its old value due to new `gameRequestCooldown` having the value of 5 minutes.

### Fixed

- Occasional cutting of game names in `receiveGames(...)`.
- Skipping all games except the last one when sending Telegram message about more than 1 game being created between checks.
- Potential candidate word for censoring was not forced to the same case as in the transformed source string.

### Removed

- TODO file due to existence of more detailed to-do list in my own notes.
- Some unneeded comments.

## [0.1.3] - 2023-10-25

### Changed

- Replaced word distance function for censoring with more efficient one.
- Moved the word distance sensitivity threshold to configuration file to the `censorSensitivity` field.
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

[0.1.6]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.6
[0.1.5]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.5
[0.1.4]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.4
[0.1.3]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.3
[0.1.2]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.2
[0.1.1]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.1
[0.1.0]: https://github.com/Aidoneus/Membrane/releases/tag/v0.1.0
