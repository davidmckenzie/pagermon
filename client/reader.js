//
// PagerMon - reader.js
// 2017-06-04
// Author: Dave McKenzie
//
// Description: Takes output of multimon-ng and pushes to PagerMon server
//
// Usage: Invoke via a shell script, ideally
// 		If not, just pipe multimon's output to it
//
// Example: reader.sh
//

// CONFIG
// create config file if it does not exist, and set defaults
var fs = require('fs');
var conf_defaults = require('./config/default.json');
var confFile = './config/config.json';
if( ! fs.existsSync(confFile) ) {
    fs.writeFileSync( confFile, JSON.stringify(conf_defaults,null, 2) );
    console.log('created config file - set your api key in '+confFile);
    return;
}
// load the config file
var nconf = require('nconf');
    nconf.file({file: confFile});
    nconf.load();

var hostname = nconf.get('hostname');
var apikey = nconf.get('apikey');
var identifier = nconf.get('identifier');
var sendFunctionCode = nconf.get('sendFunctionCode') || false;
var useTimestamp = nconf.get('useTimestamp') || true;
var EASOpts = nconf.get('EAS'); // Import EAS Config Object Ref Pull 435


//Check if hostname is in a valid format - currently only removes trailing slash - possibly expand to validate the whole URI? 
if(hostname.substr(-1) === '/') {
  var uri = hostname.substr(0, hostname.length - 1)+'/api/messages';
} else {
  var uri = hostname+'/api/messages'
}

var http = require('http');
var request = require('request');
require('request').debug = true;
var rp = require('request-promise-native');
var moment = require('moment');

var colors = require('colors/safe');
colors.setTheme({
  success: ['white', 'bold', 'bgBlue'],
  error: ['red', 'bold', 'bgwhite']
});

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    terminal: true
});

var frag = {};
var SAME = require('@maxwelldps/jsame'); //Import jSAME EAS decode 
rl.on('line', (line) => {
    //console.log(`Received: ${line.trim()}`);
    var time = moment().format("YYYY-MM-DD HH:mm:ss");
    var timeString = '';
    var datetime = moment().unix();
    var address;
    var message;
    var trimMessage;
    // TODO: pad address with zeros for better address matching
    //  if (line.indexOf('POCSAG512: Address:') > -1) {	
    if (/POCSAG(\d+): Address: /.test(line)) {
        address = line.match(/POCSAG(\d+): Address:(.*?)Function/)[2].trim();
        if (sendFunctionCode) {
            address += line.match(/POCSAG(\d+): Address:(.*?)Function: (\d)/)[3];
        }
        if (line.indexOf('Alpha:') > -1) {
            message = line.match(/Alpha:(.*?)$/)[1].trim();
            if (useTimestamp) {
                if (message.match(/\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/)) {
                    timeString = message.match(/\d+ \w+ \d+ \d{2}:\d{2}:\d{2}/)[0];
                    if (moment(timeString, 'DD MMMM YYYY HH:mm:ss').isValid()) {
                        datetime = moment(timeString, 'DD MMMM YYYY HH:mm:ss').unix();
                        message = message.replace(/\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/, '');
                    }
                } else if (message.match(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)) {
                    timeString = message.match(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)[0];
                    if (moment(timeString).isValid()) {
                        datetime = moment(timeString).unix();
                        message = message.replace(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/, '');
                    }
                }
            }
            trimMessage = message.replace(/<[A-Za-z]{3}>/g, '').replace(/Ä/g, '[').replace(/Ü/g, ']').trim();
        } else if (line.indexOf('Numeric:') > -1) {
            message = line.match(/Numeric:(.*?)$/)[1].trim();
            trimMessage = message.replace(/<[A-Za-z]{3}>/g, '').replace(/Ä/g, '[').replace(/Ü/g, ']');
        } else {
            message = false;
            trimMessage = '';
        }
    } else if (line.match(/FLEX[:|]/)) {
        address = line.match(/FLEX[:|] ?.*?[\[|](\d*?)[\]| ]/)[1].trim();
        if (useTimestamp) {
            if (line.match(/FLEX[:|] ?\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/)) {
                timeString = line.match(/\d+ \w+ \d+ \d{2}:\d{2}:\d{2}/)[0];
                if (moment(timeString, 'DD MMMM YYYY HH:mm:ss').isValid()) {
                    datetime = moment(timeString, 'DD MMMM YYYY HH:mm:ss').unix();
                }
            } else if (line.match(/FLEX[:|] ?\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)) {
                timeString = line.match(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)[0];
                if (moment(timeString).isValid()) {
                    datetime = moment(timeString).unix();
                }
            }
        }
        if (line.match(/([ |]ALN[ |]|[ |]GPN[ |]|[ |]NUM[ |])/)) {
            message = line.match(/FLEX[:|].*[|\[][0-9 ]*[|\]] ?...[ |](.+)/)[1].trim();
            if (line.match(/[ |][0-9]{4}\/[0-9]\/F\/.[ |]/)) {
                // message is fragmented, hold onto it for next line
                frag[address] = message;
                message = false;
                trimMessage = '';
            } else if (line.match(/[ |][0-9]{4}\/[0-9]\/C\/.[ |]/)) {
                // message is a completion of the last fragmented message
                trimMessage = frag[address] + message;
                delete frag[address];
            } else if (line.match(/[ |][0-9]{4}\/[0-9]\/K\/.[ |]/)) {
                // message is a full message
                trimMessage = message;
            } else {
                // message doesn't have the KFC flags, treat as full message
                trimMessage = message;
            }
        }
    } else if (line.match(/(EAS[:|]|ZCZC-)/)) {                                                     // Adds EAS US/CA SAME Message Support          //Matches "EAS: ZCZC-ORG-EEE-PSSCCC+TTTT-JJJHHMM-CALL/FM -" OR "ZCZC-ORG-EEE-PSSCCC+TTTT-JJJHHMM-CALL/FM -" This allows future proofing or alternative feeding
        var decodedMessage = SAME.decode(line, EASOpts.excludeEvents, EASOpts.includeFIPS);          // Returns a object with all the info
        if (decodedMessage) {
            if (EASOpts.addressAddType) {                                                             // Add type to address usefull for aleting to pushover, so a severe thunderstorm watch is KOAX-WXR-A and severe thunderstorm warning is KOAX-WXR-W // This allows easy alert filtering if useing pushover or something similar 
                address = decodedMessage["LLLL-ORG"] + '-' + decodedMessage["type"];                // Addresses are the following schema LLLL-ORG-type so for the exaple following the address is "KOAX-WXR-W" :  ZCZC-WXR-TOR-031109+0015-3650000-KOAX/NWS -
            } else {
                address = decodedMessage["LLLL-ORG"]                                                 // Addresses are the following schema LLLL-ORG      so for the exaple following the address is "KOAX-WXR"   :  ZCZC-WXR-TOR-031109+0015-3650000-KOAX/NWS -
            }
            message = decodedMessage
            trimMessage = decodedMessage["MESSAGE"]
            datetime = moment().unix();                                                               // Just get current time as any EAS will likely be effective at time of transmission
        } else {
          address = '';
          message = false;
          trimMessage = '';
      }
   }else {
    address = '';
    message = false;
    trimMessage = '';
  }

  // filter out most false hits
  // if too much junk data, make sure '-p' option isn't enabled in multimon
  if (address.length > 2 && message) {
    var padAddress = padDigits(address,7);
    console.log(colors.red(time+': ')+colors.yellow(padAddress+': ')+colors.success(trimMessage));
    // now send the message
    var form = {
      address: padAddress,
      message: trimMessage,
      datetime: datetime,
      source: identifier
    };
    sendPage(form, 0);
  } else {
    console.log(colors.red(time+': ')+colors.grey(line));
  }
}).on('close', () => {
  console.log('Input died!');
});

var sendPage = function(message,retries) {
  var options = {
    method: 'POST',
    uri: uri,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'PagerMon reader.js',
      apikey: apikey
    },
    form: message
  };
  rp(options)
  .then(function (body) {
    // console.log(colors.success('Message delivered. ID: '+body)); 
  })
  .catch(function (err) {
    console.log(colors.yellow('Message failed to deliver. '+err));
    if (retries < 10) {
      var retryTime = Math.pow(2, retries) * 1000;
      retries++;
      console.log(colors.yellow(`Retrying in ${retryTime} ms`));
      setTimeout(sendPage, retryTime, message, retries);
    } else {
      console.log(colors.yellow('Message failed to deliver after 10 retries, giving up'));
    }
  });
};

var padDigits = function(number, digits) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
};
