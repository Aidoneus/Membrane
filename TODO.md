# To-do list

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Different message types about new games depending on the `client.type` (see `types` in config).
- Task stack for telegram messages.
- Reaction to addition to/removal from chats, automatically update the `tgChats` property in config (without overwriting any chat IDs that user may have put there).
- Default CLI arguments for server in the config file.
- CLI argument for specifying custom config path.
- Reaction to possible errors in `receiveTgResponse(...)`.
- Another server for Telegram webhook usage so that bot would be able to keep track of chats it is in/out of.
- Multiple language support + some way to pick message language or multiple for each chat ID separately, probably through configuration file.
- Another server providing web interface for administrators; should probably allow: restarting bot, changing some of the values from configuration files, viewing some statistics and/or logs.

### Changed

- Redirect server should use autodetected hostname if `redirectHost` config property is set to false-y value.
- Replace `sendToTgChat(M.tgChats[0], ...)` in `receiveGames(...)` with `sendToAllChats(...)` when it is implemented.
- Look for config in the `{scriptDir}/{scriptName}.json` path instead of the hardcoded one (if no CLI argument with path was provided).
- Generate help message automatically based on the arguments configuration to avoid duplication of text and/or possible mistakes/typos.
- Consider moving the redirect server to HTTPS protocol and supply it with certificates (as Telegram will require these too anyway); their paths are likely to be put in the configuration file as well.
- Move all displayable strings to a different file for the future multiple language support.

### Deprecated

### Removed

### Fixed

### Security

- Think if you really need to keep bot token as a plain string in the config or maybe it should be protected somehow.

