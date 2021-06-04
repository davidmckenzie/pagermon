# [PagerMon](https://hrng.io/)
![Discord](https://img.shields.io/discord/533900375066017812.svg?style=plastic)
![GitHub issues](https://img.shields.io/github/issues-raw/pagermon/pagermon.svg?style=plastic)
![GitHub pull requests](https://img.shields.io/github/issues-pr/pagermon/pagermon.svg?style=plastic)
![GitHub](https://img.shields.io/github/license/pagermon/pagermon.svg?style=plastic)
![GitHub stars](https://img.shields.io/github/stars/pagermon/pagermon.svg?style=plastic)
![GitHub forks](https://img.shields.io/github/forks/pagermon/pagermon.svg?style=plastic)
![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/pagermon/pagermon.svg?label=release&style=plastic)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/pagermon/pagermon.svg?style=plastic)
![GitHub contributors](https://img.shields.io/github/contributors/pagermon/pagermon.svg?style=plastic)
![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/pagermon/pagermon/Node.js%20CI/master?label=build%20master)
![GitHub Workflow Status (branch)](https://img.shields.io/github/workflow/status/pagermon/pagermon/Node.js%20CI/develop?label=build%20develop)

PagerMon is an API driven client/server framework for parsing and displaying pager messages from multimon-ng.

It is built around POCSAG messages, but should easily support other message types as required.

The UI is built around a Node/Express/Angular/Bootstrap stack, while the client scripts are Node scripts that receive piped input.

## Features

* Capcode aliasing with colors and [FontAwesome](https://fontawesome.io/icons/) icons
* API driven extensible architecture
* Multi-user support
* SQLite or MySQL database backing
* Configurable via UI
* Pagination and searching
* Filtering by capcode or agency
* Duplicate message filtering
* Native POCSAG / FLEX / EAS Client Support
* Keyword highlighting
* WebSockets support - messages are delivered to clients in near realtime
* Pretty HTML5
* Native browser notifications
* Plugin Support - Current Plugins:
    * [Pushover](https://pushover.net/) near realtime muti-device notification service
    * [Prowl](https://prowlapp.com) near realtime iOS notification service with Apple Watch support
    * [Telegram](https://telegram.org/) near realtime cloud based multi-device messaging
    * [Discord](https://discordapp.com/) near realtime cloud based messaging service
    * [Gotify](https://gotify.net/) Self-Hosted messaging service
    * [Twitter](https://www.twitter.com/)
    * [Microsoft Teams](https://products.office.com/en-us/microsoft-teams/group-chat-software) Team colaboration platform
    * [Slack](https://slack.com/) Team colabortation platform
    * SMTP Email Support for conventional SMTP email notifications 
    * Regex Filters - Filter incoming messages via regex
    * Regex Replace - Modify incoming messages via regex
    * Message Repeat - Repeat incoming messages to another pagermon server
* May or may not contain cute puppies

### Planned Features

* Horizontal scaling
* Enhanced message filtering
* Bootstrap 4 + Angular 2 support
* Enhanced alias control
* Graphing

### Screenshots

![main view](http://i.imgur.com/QWKoJjb.jpeg)

![desktop view](http://i.imgur.com/Zik74Dl.jpeg)

![alias edit](http://i.imgur.com/gus8QTe.jpeg)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* [nodejs](https://nodejs.org/) 12.x or higher
* sqlite3
* Probably some other stuff

#### Recommended

* [nvm](https://github.com/creationix/nvm#installation)
* nginx or some kind of reverse proxy for SSL offloading

## Running the server

### Local setup

1) Copy server/process-default.json to server/process.json and modify according to your environment
2) Launch the app from the Terminal:

```
    $ sudo apt-get install npm sqlite3
    $ npm install npm@latest -g
    $ npm install pm2 -g
    $ cd server
    $ npm install
    $ export NODE_ENV=production
    $ pm2 start process.json
```
3) To start on boot, let pm2 handle it:
```
    $ sudo pm2 startup
    $ pm2 save
```
4) You probably want to rotate logs, too:
```
    $ pm2 install pm2-logrotate
    $ sudo pm2 logrotate -u user
```
5) Now login via the website, default port is 3000, default credentials are 'admin' / 'changeme'
6) Head to /admin, change your password, and generate some API keys
6) Grab your API keys and drop them in the PagerMon client, then you're good to go!

Alternatively a production ready setup guide is available here
https://github.com/pagermon/pagermon/wiki/Tutorial---Production-Ready-Ubuntu,-PM2,-Nginx-Reverse-Proxy,-Let's-Encrypt-SSL,-Pagermon-server

### Docker

#### Manual build

You can use image already built for you or you can build it yourself:

``` bash
# For PC
docker build -t pagermon/pagermon .

# For Raspberry Pi
docker build -t pagermon/pagermon:latest-armhf -f Dockerfile.armhf .
```

#### Running

``` bash
docker create \
  --name=pagermon \
  -e APP_NAME=pagermon \
  -p 3000:3000 \
  -e TZ=Europe/London \
  -v </path/to/config-mount>:/config \
  --restart unless-stopped \
  pagermon/pagermon:<VERSION>
docker start pagermon
```

### docker-compose

``` yaml
version: "2"
services:
  pagermon:
    #build: ./server # To build localy
    image: pagermon/pagermon:<VERSION>
    container_name: pagermon
    environment:
      - APP_NAME=pagermon
      - PUID=1000 # Not required since node user inside docker has UID 1000
      - PGID=1000 # Not required since node user inside docker has GID 1000
      - TZ=Europe/London
    ports:
      - "3000:3000"
    volumes:
      - </path/to/config-mount>:/config
    restart: unless-stopped
```

Then run:

``` bash
# Building with compose file
docker-compose build

# Running from compose file in foreground
docker-compose up

# Running from compose file in background
docker-compose up -d
```

#### Parameters

|Parameter|Function|
|:-------:|:-------|
| `-e APP_NAME=<name>` | Application name |
| `-e HOSTNAME=<hostname>` | Hostname |
| `-e USE_COOKIE_HOST=true` | Use cookie host. |
| `-e NO_CHOWN=true`| Disable fixing permissions. |
| `-e PUID=1000` | for UserID |
| `-e PGID=1000` | for GroupID |
| `-e SKIP_APP=true` | Don't start app, useful for development. |
| `-e TZ=Europe/London` | Specify a timezone to use eg. Europe/London. |
| `-v <path>:/config` | Mount config diretory, so config persist during container restarts (option 1) |
| `-v <volumename>:/config` | Create named volume for config diretory, so config persist during container restarts (option 2)|
| `-v /config` | Create unnamed volume for config diretory, so config persist during container restarts (option 3)|
| `-p 3000:3000` | Expose container port |

**Note:**

- Configuration is stored in `/config` inside container and it is owned by *node* user with UID/GID 1000. To fix config directory ownership use `-e PUID=<UID>` and `-e PGID=<GID>`. (Here are database and config file stored)
- The local port `3000` will be forwarded to the docker container to port `3000` (by `-p 3000:3000`)
- In case you would like to follow the logfile, run `docker logs -f pagermon` (by `--name pagermon`)
- To shutdown and remove the container (if using compose), run `docker-compose down`
- If you make changes to the app for testing, you will need to re-build the image, run `docker-compose down && docker-compose up --build`
- To run on *Raspberry Pi* use **armhf** variant (add `-armhf` at the end of version), but **be aware** that OracleDB does not work there.

See [additional parameters](https://github.com/SloCompTech/docker-baseimage).

**Tip:** You probably want to setup docker log rotation before, more can be found [here](https://success.docker.com/article/how-to-setup-log-rotation-post-installation).

## Running the client

### Local setup


#### Prerequisites
These programs/libraries are required for Pagermon Client to work

* [RTL-SDR](https://www.rtl-sdr.com/rtl-sdr-quick-start-guide/) - RTL-SDR tools/libraries to access RTL-SDR dongle
* [RTL-SDR dongle](https://www.rtl-sdr.com/buy-rtl-sdr-dvb-t-dongles/)  - You can get these from Ebay, Amazon or other stores (Has to have RTL2832U chip)
* [nodejs](https://nodejs.org/en/) - JavaScript Programming Language (Only if installing separate from server)
* [npm](https://www.npmjs.com/) - Javascript Package Manager (Only if installing separate from server)
* [Git Client](https://git-scm.com/) - Github.com client for getting source code (Only if installing separate from server) 

To install the Prerequisites run
`sudo apt install nodejs npm git rtl-sdr`

#### Installing Pagermon Client
Run the following commands from Terminal:
```
git clone https://github.com/pagermon/pagermon.git
cd pagermon/client
npm install
```
edit `reader.sh` and edit frequency and rtl_device number, Edit Multimon-ng command
```Bash
rtl_fm -d 0 -E dc -F 0 -A fast -f 148.5875M -s22050 - |
multimon-ng -q -b1 -c -a POCSAG512 -f alpha -t raw /dev/stdin |
node reader.js
```
`-d 0` - change this to your rtl_device number using rtl_test

`-f 148.5875M` - change this to the frequency you are decoding

#### Multimon-ng Command examples
##### POCSAG
> multimon-ng -q -b1 -c -a POCSAG512 -f alpha -t raw /dev/stdin

##### FLEX
>  multimon-ng -a FLEX -t raw /dev/stdin

##### EAS
> multimon-ng -a EAS -t raw /dev/stdin


#### Configuring Pagermon Client
Before running Pagermon Client you have to configure it to send the decoded info to the pagermon server.

copy default.json to config.json 
```
cp config/default.json config/config.json 
```

Edit config.json with your favorite editor
```
{
  "apikey": "changeme",
  "hostname": "http://127.0.0.1:3000",
  "identifier": "TEST",
  "sendFunctionCode": false,
  "useTimestamp": true,
  "EAS": {
    "excludeEvents": [],
    "includeFIPS": [],
    "addressAddType": true
  }
}

```

#### Pager Options

**apikey:**  This is the API key generate on the Pagermon Server http://serverip/admin/settings

**hostname:** The host name or IP of the Pagermon server (If you run Pagermon Server and Client on same PC then you can put this as `http://127.0.0.1:3000`

**identifier:** This will show up in the source column on the server web page good for when you have multiple sources and want to know which one the pager message is coming from

**sendFunctionCode:** This will appand the function code to the address of the message **true** or **false**

**useTimestamp:** This will use the time in the message **true** or **false**

#### EAS Options
**excludeEvents:** Allows a list of [Events](https://github.com/MaxwellDPS/jsame#event-codes) to exclude ie `["RWT","RMT","SVA"]`

**includeFIPS:** Allows you to filter on a list of FIPS to alert on ie `["031109", "031000"]`

**addressAddType:** Will append the event code to the address so `KOAX-WXR` would become KOAX-WXR-W for `ZCZC-WXR-TOR-031109+0015-3650000-KOAX/NWS -` **true** or **false**


## PagermonPi - Raspberry Pi Image
Check out our Raspberry Pi Image for Pi3 & Pi4 which has Pagermon pre-loaded on it.

Check out the following links:

[Releases](https://github.com/pagermon/pagermon/releases) for the latest version
[Wiki](https://github.com/pagermon/pagermon/wiki/PagermonPi-Image-For-Raspberry-Pi) for PagermonPi support

## Support

General PagerMon support can be requested in the #support channel of the PagerMon discord server.

[Click Here](https://discord.gg/3VK7gSD) to join

Bugs and Feature requests can be logged via the GitHub issues page. 

## Contributing

All are welcome to contribute. Contributors should submit a pull request with the requested changes.

CHANGELOG.md is to be updated on each pull request.

If a pull request is the first pull request since a [release](https://github.com/pagermon/pagermon/releases), then the version number should be bumped in `CHANGELOG.md`, `server/app.js`, and `server/package.json`.

If a database schema change is required, this must be done using KnexJS Migration files. **Insert Instructions for this here**

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/pagermon/pagermon/tags).

## Authors

See the list of [contributors](https://github.com/pagermon/pagermon/contributors) who participated in this project.

## License

This project is licensed under The Unlicense - because fuck licenses. Do what you want with it. :>

## Acknowledgments

* [multimon-ng](https://github.com/EliasOenal/multimon-ng)
* [jSAME](https://github.com/MaxwellDPS/jsame)
