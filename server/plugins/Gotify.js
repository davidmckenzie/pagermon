const axios = require('axios').default;
const path = require('path');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
  let pConf = data.pluginconf.Gotify;
  if (pConf && pConf.enable) {
    const message = {
      title: data.agency + ' - ' + data.alias,
      message: data.message,
      priority: (pConf.priority) ? parseInt(pConf.priority) : 1,
    };

    let url = config.URL;
    if (!/^https+:\/\//.test(url)) // URL doesn't start with http(s)
      url = `https://${url}`; // Add https:// if not present
    if (config.port && !isNaN(config.port)) 
      url = `${url}:${parseInt(config.port, 10)}`; // Add port to the end
    url = url + '/message'; // Append /message to URL

    logger.main.debug('Gotify: Sending to ' + url + ': ' + JSON.stringify(message));

    axios.post(url, message, {
      headers: {
        'X-Gotify-Key': config.APIKey,
      },
      timeout: 5000, // Timeout 5s
    }).then(res => {
      logger.main.info('Gotify: Message Sent');
    }).catch(error => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.main.error('Gotify: Headers: ' + JSON.stringify(error.response.headers));
        logger.main.error('Gotify: Data: ' + error.response.data);
        logger.main.error('Gotify: Status Code: ' + error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.main.error('Gotify: No response:' + error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.main.error('Gotify: Error:' +  error.message);
      }
    });

    callback();
  } else {
    callback();
  }
}

module.exports = {
  run: run
}
