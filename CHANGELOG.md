# 0.3.11 - 2021-06-24

* Change includes to HTTPS to support [CORS-RFC1918](https://wicg.github.io/private-network-access/)
* Added EAS support, Just run multimon-ng -a EAS #432 @maxwelldps
* Added EAS FIltering Based on FIPS and EVENT and moved [jsame to git](https://github.com/MaxwellDPS/jsame/packages/329242) And updated jSAME to 0.1.9 #435 @MaxwellDPS
* Fix to PDW Python ingestion script time format #439 @jjeffhendryx
* Fix Gotify Plugin URL construction #445 @stubbers
* Fix textAngular.css not being called in header.ejs #449 @DingosGotMyBaby
* Fix Alias Column on iPhoneX devices #450 @DanrwAU
* Fix Index breaking bug in #412 #452 @DanrwAU
* Fix Broken Alias Search #453 @marshyonline
* Fix Twitter trunication at 280 chars #461 @maxwelldps
* Fixed Typo's #465 @geelongmicrosoldering
* Fix layout when message contains long word #474 @geelongmicrosoldering
* Improved wildcard feature #458 @eopo
* Change includes to HTTPS to support [CORS-RFC1918](https://wicg.github.io/private-network-access/)

# 0.3.10 - 2020-06-24

* Downgrade discord.js package to fix crashes #415 @DanrwAU
* Add user-agent strings for webhook plugins #416 @DanrwAU
* Cleanup redundant code in db.js #417 @DanrwAU
* Add Multi-User support, moves all authentication to be DB backed. #411 @DanrwAU
* Add Unit testing #420 @DanrwAU @marshyonline

# 0.3.9 - 2020-05-13
 
 * Add fix allowing for greater than 100KB CSV files #397 @DanrwAU
 * Remove errant packages that shouldn't have made the release #398 @DanrwAU
 * Fix 500 errors filling the logs with errors #398 @DanrwAU
 * Convert PMX to PM2/IO #398 @DanrwAU
 * Migrated plugins from request and http to axios client #401 @SloCompTech
 * Add fix for Multi-Delete on MySQL DB #403 @DanrwAU
 * Fix Delete button on AliasDetail screen #404 @DanrwAU
 * Fix Shell Plugin callbacks #407 @all3kcis
 
 # 0.3.8 - 2020-05-04

* Add CSV Export for Aliases #383 #388 @DanrwAU
* Add Theme support #385 @DanrwAU
* Docker documentation update #387 @SloCompTech
* Implement FontAwesome 5 #389 @Maaaaattee @DanrwAU 
* Readability update #390 @RyanUnderwood
* Add title support #391 @RyanUnderwood
* Add CSV Import for Aliases #392 @DanrwAU
* Add fix for Sitename being blank #395 @DanrwAU @davidmckenzie 

# 0.3.7 - 2020-04-21

* Add Oracle support because why the heck not #345 @davidmckenzie
* Fix new FLEX multimon format #357 @davidmckenzie
* ~~Changed FontAwesome to v5.13.0 + Switched to cdnjs.cloudflare.com to serve #365 @MaxwellDPS~~
* Docker Improvements and Auto-build with dockerhub #367 @SloCompTech
* ~~Add FontAwesome Shims to make 0.3.7 non-breaking #369 @DanrwAU~~
* Fix Agency Searching crashing applicaiton #370 @DanrwAU
* Docker: Fix for saving config in docker if changed UID,GID #376 @SloCompTech
* Docker: Multistage build #377 @SloCompTech
* Add option to relocate searchbar #378 @marshyonline, @DanrWAU

Note: FontAwesome V5 removed due to compatibility issues

# 0.3.6 - 2020-03-19

* Add Generic Webhook plugin #325 @stubbers
* Cleanup legacy DB code, add more logging to Knex #335 @DanrwAU
* GA De-Dupe - Resolved Dupe GA Hits. @marshyonline
* Add front page popout. @marshyonline
* Fix mixed content errors on admin panel @davidmckenzie
* Fix Knex serialisation #343 @davidmckenzie
* Enable Help Button @marshyonline

# 0.3.5 - 2019-09-06

* Add Knex logging to Winston #311 @DanrwAU
* Fix incorrect setting in default.json #310 @DanrwAU
* Add Google Analytics Support @Marshyonline
* Change Footer link to Pagermon Repo to prevent tracking @marshyonline
* Add Login_Failed to failed login URL to allow Log Scanners to detect failed logins easier. @marshyonline

# 0.3.4 - 2019-08-22

* Fix error handling of messagerepeat plugin #304 @DanrwAU
* Add support for Azure Application Insights #306 @DanrwAU
* Fix Vulnerability in capcodeCheck route leaking capcodes and plugin data #308 @DanrwAU @marshyonline

# 0.3.3 - 2019-08-14

* Fixed Messages/id route #295 @SloCompTech
* Added Prowl-Plugin. Very similar to Pushover, but just for iOS and a little different. #293 #297 @eopo
* Fix security vulnerability - capcode route security in v0.2.2 did not account for the case sensitivity of route URIs. #292 @davidmckenzie (Thanks to TallTechDude for picking this up!)
* Add Agency route to the API to allow listing of distinct agencies. Not used in the application as yet. #300 @DanrwAU
* Add PDW Admin Override. Allow's admins to see messages that would normally be filtered by PDWMode, to allow creation of aliases/full visibility of received messages. #298 @marshyonline @DanrwAU
* Fix duplicate message checking when multiple clients are sending the same message #301 @DanrwAU
* Really fix duplicate message handling by adding tech debt #302 @davidmckenzie

# 0.3.2 - 2019-05-15

**MySQL/MariaDB Upgrades from 0.3.0/0.3.1 aren't possible. Databases will need to be recreated and data re-imported.**

**Fixes DoS Vulerability in search handling** #286, #288 @davidmckenzie

* Multiple Bugfixes and cleanups for Knex. Mainly around MySQL/MariaDB #281 @DanrwAU
    * Makes DB Settings required when MySQL/MariaDB Selected
    * Removes MariaDB specific settings, Knex uses the MySQL library to drive MariaDB
    * Removes old Debugging Code
    * Removes custom Trigger for creating capcodes
    * Sets capcodes.id column to correct autoincrementing type - ***BREAKING CHANGE***
    * Set's Foreign Key correctly between messages.alias_id and capcodes.id 
    * Sets correct Charset and Collation for MariaDB Compatibility 
* Add sticky buttons to all pages, standardize size and layout. #275 @DanrwAU
* Plugin: Shell Script Plugin #154 @all3kcis


# 0.3.1 - 2019-05-07

* **Fixes DoS vulnerability in search handling** #278 @davidmckenzie
* Remove stripping of double quotes from messages #274 @DanrwAU
* Hide database password and add visible toggle #273 @DanrwAU
* Resolve migration did not return a promise errors #272 @DanrwAU

# 0.3.0 - 2019-04-28

**Upgrade Notes:** 
This is a major release with a complete rewrite of all database queries. 

This may result in unintended or different behaviour to previous versions, in testing this has mainly been around searching. 

Upgrades are only possible from version **0.2.3**, if you are on a lower version than this, you must first upgrade to 0.2.3 then upgrade to 0.3.0 

**PLEASE ENSURE YOU TAKE A FULL BACKUP BEFORE PERFORMING THE UPGRADE** 

* Compeletly rebuilt database driver to use the [KnexJS](https://knexjs.org/) query builder. #174 @DanrwAU
    * **Upgrades of existing SQLite databases must be performed from v0.2.3**
    * Adds  **EXPERIMENTAL** support for **MySQL** - This is used at users own risk, limited testing has been performed however not recommended for production. 
    * MariaDB may also work however this has not been tested at all.
    * Conversion of existing databases is up to the user. We recommend starting a new database if you would like to switch to MySQL.
    * This is super BETA, it has been tested as best as possible but bugs WILL exist. Please report via github bugtracker. 
    * Database upgrades are now handled by migration files to make upgrades easier in the future. 

* Convince Winston to follow the laws of Physics #251 @DanrwAU
* More complete docker support #243, #249 @nicko170
* Fix display issues on large resolution mobile devices #241, #253 @DanrwAU
* Update old repository URL in package.json and index.ejs #240 #252 #263 @DanrwAU @WasThisUsernameTaken
* Add ability to select the icon size on the homepage #239 @DanrwAU
* Fix 404 error when trailing slash added to hostname in client config #223 @DanrwAU
* Patch Total.js CVE #232 @marshyonline
* Message Repeat Plugin #222 @marshyonline
* Parse timestamps in messages #72 @davidmckenzie
* Compatibility with multimon timestamp option #57 @davidmckenzie
* Fix URL state not updating properly on Firefox #229 @davidmckenzie
* Updates import.js to support generic CSV import #260 @davidmckenzie
* Added Gotify Plugin #257 @ryaneast

# 0.2.3 - 2019-02-05

* Fix cookies expiring on browser close #206
* Fix refresh aliases button not appearing #194
* Remove solid white background from Icon images #216
* Fix capcode route not allowing API authentication #218

# 0.2.2 - 2019-01-15

* Fix security vulnerability - /api/capcodes route unsecured and leaking confidential info when hideCapcode and secMode both disabled

# 0.2.1 - 2019-01-13

* Added CHANGELOG.md (hey, that's this thing!) #192
* Stopped naughty Winston from modifying objects #152
* Added missing dependencies #153
* Updated README.md #163
* Added regex replacement plugin #172
* Client script now properly handles "KFC" flags #173
* Client script now retries sending messages 10 times before it gives up and goes back to napping #173
* Added additional index for... indexing things #181
* Update documentation to point to correct FA icons #182
* Added PDW to PagerMon python client script #183
* Added User-Agent to Powershell client script #184
* Fixed bug on Pushover plugin when configuration partially missing #186
* Made cookie hostname configuration optional, to make bad stuff less bad #188
* Added optional flag to include function codes with address on POCSAG messages #191


# 0.2.0 - 2018-12-06

* All notification engines (Telegram, Discord, etc.) have been moved to independent plugins that can be enabled/disabled globally and per-alias
* Plugins exist for Discord, Microsoft Teams, Pushover, SMTP, Slack, Telegram, Twitter #142
* Added plugin to filter out messages before processing
* Plugin configuration is now stored in one big char column that holds JSON
* Migrated to Winston logging so that the loglevel option actually works
* Logging for HTTP vs all other things are now segregated in files under the log directory
* Messages now sort by timestamp instead of id #148 
* Minimum address length bumped down to 2 for compatibility with POCSAG1200 #145 
* Improvements to security mode make it more secure and stuff #118 / #136
* History state pushed to browser on page or search #120
* Cookies now work on www and non-www domains when set properly in ENV vars #121
* Clicking on things now makes pretty popovers #123
* Duplicate message filtering can now be based on time, instead of last x messages #126
* Fragmented FLEX messages are now (almost) handled properly #110
* Started to actually reference PRs in change notes.

# 0.1.8 - 2018-08-20

* Search capability has been refactored to depend on the Full Text Search (FTS3) module of SQLite. Database structure should be automagically updated on first start, however if you encounter any issues please see #102.
* Dependencies updated to fix a few security vulnerabilities.

*(Note: Despite the introduction of searching capabilities, the release notes for 0.1.7 are still missing. If found, please escort to your nearest developer.)*

# 0.1.6 - 2018-08-20

* Adds the ability for pushover notifications to be sent to a different destination on a per-alias basis
* Make the 'edit alias' links on homepage open in new window
* Add option to hide capcodes and source column from main UI unless admin
* Fix for multimon's curious encoding of square brackets
* Client console output uses the padded address for prettier text alignment
* Fix for an undefined body in response under certain conditions

# 0.1.5 - 2018-04-24

* Adds email support

# 0.1.4 - 2017-08-15

* Adds pushover notifications

# 0.1.3 - 2017-06-30

This release contains a huge number of changes to the database structure, as well as a complete refactor of huge chunks of the API. Please ensure instructions are read and understood before upgrading:

### [Upgrade Instructions](https://github.com/davidmckenzie/pagermon/wiki/0.1.3-Upgrade-Instructions)

#### Change Notes
* Massive performance optimisation
* Change to stricter capcode alias matching
* Client updated to send new capcode format, and new message format
* Many minor tweaks and bugfixes
* [Wiki](https://github.com/davidmckenzie/pagermon/wiki) has been created (it's really empty at the moment).

# 0.1.2 - 2017-06-24

This release mostly contains bug fixes and minor UI tweaks.
* Updated documentation
* Cdnjs and unpkg includes now explicitly specify HTTPS
* Fixed bug with async loading of includes
* Added FLEX support and expanded POCSAG to include other bitrates
* Capcodes can now be longer than 7 chars
* Fixed bug with special chars in messages, improved sanitisation
* Prevented inappropriate database closing
* Refactored the message pushing system:
  * Incoming messages obey filters
  * Ignored messages are now actually ignored
  * Socket emit sends full message, instead of instructing clients to get it themselves (reduces load on DB and number of HTTP calls)
* Browser now scrolls to top when clicking on a filter
* Banner alerts now fade after 3 seconds
* Some minor code cleanup and cute little puppies

# 0.1.1 - 2017-06-14

* Added a regex aliasing feature - allows you to set labels for specific search strings, which are displayed in a tooltip when hovering over the search match.
* Added a 'source' column to the messages table - allows you to visually differentiate between messages that come from different systems or locations

# 0.1.0 - 2017-06-12

✨ Initial release
