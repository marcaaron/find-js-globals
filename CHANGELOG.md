# Change Log
All notable changes to the "find-globals" extension will be documented in this file.

## [0.2.2] - 2019-04-19
### Added
- Support for `global.*`

## [0.2.1] - 2019-01-19
###  Changed
- Filtering for badly formatted globals (e.g. things that don't start with $, _, or alpha and include illegal chars.
- Refactored and de-duplicated code
- README errors and instructions on adding ignore patterns to `settings.json`
### Added
- Settings for excluding certain naming patterns for global results.
- Made the exclusion of git, node_modules, and build folders default but optional
- Logo