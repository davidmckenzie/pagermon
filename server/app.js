var version = "0.3.11-beta";

var debug = require('debug')('pagermon:server');
var io = require('@pm2/io').init({
    http          : true, // HTTP routes logging (default: true)
    ignore_routes : [/socket\.io/, /notFound/], // Ignore http routes with this pattern (Default: [])
    errors        : true, // Exceptions logging (default: true)
    custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
    network       : true, // Network monitoring at the application level
    ports         : true,  // Shows which ports your app is listening on (default: false)
    transactions  : true
});
var http = require('http');
var compression = require('compression');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('./log');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var session = require('express-session');
var request = require('request');
var SQLiteStore = require('connect-sqlite3')(session);
var flash    = require('connect-flash');


process.on('SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    process.exit(1);
});

// create config file if it does not exist, and set defaults
var conf_defaults = require('./config/default.json');
var confFile = './config/config.json';
if( ! fs.existsSync(confFile) ) {
    fs.writeFileSync( confFile, JSON.stringify(conf_defaults,null, 2) );
}
// load the config file
var nconf = require('nconf');
    nconf.file({file: confFile});
    nconf.load();

//Load current theme
var theme = nconf.get('global:theme')
// set the theme if none found, for backwards compatibility
if (!theme) {
  nconf.set('global:theme', "default");
  nconf.save();
  var theme = nconf.get('global:theme')
}

//Enable Azure Monitoring if enabled
var azureEnable = nconf.get('monitoring:azureEnable')
var azureKey = nconf.get('monitoring:azureKey')
if (azureEnable) {
  logger.main.debug('Starting Azure Application Insights')
  const appInsights = require('applicationinsights');
  appInsights.setup(azureKey)
             .setAutoDependencyCorrelation(true)
             .setAutoCollectRequests(true)
             .setAutoCollectPerformance(true)
             .setAutoCollectExceptions(true)
             .setAutoCollectDependencies(true)
             .setAutoCollectConsole(true)
             .setUseDiskRetryCaching(true)
             .start();
}

var dbinit = require('./db');
    dbinit.init();
var db = require('./knex/knex.js');

var passport = require('./auth/local');

// routes
var index = require('./routes/index');
var admin = require('./routes/admin');
var api = require('./routes/api');
var auth = require('./routes/auth');

var port = normalizePort(process.env.PORT || '3000');
var app = express();
    app.set('port', port);
    // view engine setup
    app.set('views', path.join(__dirname,'themes',theme, 'views'));
    app.set('view engine', 'ejs');
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');



var server = http.createServer(app);
var io = require('socket.io').listen(server);
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
    //Set connection timeout to prevent long running queries failing on large databases - mostly capacode refresh on MySQL
    server.on('connection', function(connection) {
      connection.setTimeout(600 * 1000);
    });
    //Lets set setMaxListeners to a decent number - not to high to allow the memory leak warking to still trigger
    io.sockets.setMaxListeners(20);
io.sockets.on('connection', function (socket) {
    socket.removeAllListeners();
    debug('client connect to normal socket');
//    socket.on('echo', function (data) {
//        io.sockets.emit('message', data);
//        console.log('message', data);
//    });
});
//Admin Socket
var adminio = io.of('/adminio');
adminio.on('connection', function (socket) {
    socket.removeAllListeners();
    debug('client connect to admin socket');
//    adminio.on('echo', function (data) {
//        adminio.emit('message', data);
//        console.log('message', data);
//    });
});

app.use(favicon(path.join(__dirname,'themes',theme, 'public', 'favicon.ico')));

// set socket.io to be shared across all modules
app.use(function(req,res,next){
    req.io = io;
    next();
});

// session secret is controlled by config
var secret = nconf.get('global:sessionSecret');
// compress all responses
app.use(compression());
app.use(require("morgan")("combined", { "stream": logger.http.stream }));
app.use(bodyParser.json({
  limit: '1mb',
}));       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     
  extended: true,
  limit: '1mb',
})); // to support URL-encoded bodies
app.use(cookieParser());

var sessSet = {
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
    store: new SQLiteStore,
    saveUninitialized: true,
    resave: 'true',
    secret: secret
}

if (process.env.HOSTNAME && process.env.USE_COOKIE_HOST)
    sessSet.cookie.domain = '.'+process.env.HOSTNAME;

app.use(session(sessSet));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());
app.use(express.static(path.join(__dirname,'themes',theme, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(function(req, res, next) {
  res.locals.version = version;
  res.locals.loglevel = nconf.get('global:loglevel') || 'info';
  next();
});


app.use('/', index);
app.use('/admin', admin);
app.use('/post', api);
app.use('/api', api);
app.use('/auth', auth);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  var title = nconf.get('global:monitorName') || 'PagerMon';
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  //these 3 have to be here to stop the error handler shitting up the logs with undefined references when it receives a 500 error ... nfi why
  res.locals.login = req.isAuthenticated();
  res.locals.gaEnable = nconf.get('monitoring:gaEnable');
  res.locals.monitorName = nconf.get("global:monitorName");
  res.locals.register = nconf.get('auth:registration')

  // render the error page
  res.status(err.status || 500);
  res.render(path.join(__dirname,'themes',theme, 'views', 'global', 'error'), { title: title });
});

// Add cronjob to automatically refresh aliases
var dbtype = nconf.get('database:type')
if (dbtype == 'mysql') {
  var aliasRefreshJob = require('cron').CronJob;
  new aliasRefreshJob('0 5,35 * * * *', function() {
    var refreshRequired = nconf.get('database:aliasRefreshRequired')
    logger.main.debug('CRON: Running Cronjob AliasRefresh')
    if (refreshRequired == 1) {
      console.time('updateMap');
      logger.main.info('CRON: Alias Refresh required, running.')
      db('messages').update('alias_id', function() {
        this.select('id')
            .from('capcodes')
            .where(db.ref('messages.address'), 'like', db.ref('capcodes.address') )
            .orderByRaw("REPLACE(address, '_', '%') DESC LIMIT 1")
      })
      .then((result) => {
          console.timeEnd('updateMap');
          nconf.set('database:aliasRefreshRequired', 0);
          nconf.save();
          logger.main.info('CRON: Alias Refresh Successful')
      })
      .catch((err) => {
        logger.main.error('CRON: Error refreshing aliases' + err); 
        console.timeEnd('updateMap'); 
      })
    } else {
      logger.main.debug('CRON: Alias Refresh not Required, Skipping.')
    }
  }, null, true);
}

//Disable all logging for tests
if(process.env.NODE_ENV === 'test') { 
  logger.main.silent = true
  logger.auth.silent = true
  logger.db.silent = true
  logger.http.silent = true
}

module.exports = app;

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
    logger.main.info('Listening on ' + bind);
}
