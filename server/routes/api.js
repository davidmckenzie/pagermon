var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var basicAuth = require('express-basic-auth');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var push = require('pushover-notifications');
var util = require('util')
const nodemailer = require('nodemailer');
require('../config/passport')(passport); // pass passport for configuration

var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

var teleenable = nconf.get('telegram:teleenable');
if (teleenable) {
  var telegram = require('telegram-bot-api');
  var telekey = nconf.get('telegram:teleAPIKEY');
  var t = new telegram({
    token: telekey
  });
}
var twitenable = nconf.get('twitter:twitenable');
if (twitenable) {
  var twit = require('twit');
  var twitconskey = nconf.get('twitter:twitconskey');
  var twitconssecret = nconf.get('twitter:twitconssecret');
  var twitacctoken = nconf.get('twitter:twitacctoken');
  var twitaccsecret = nconf.get('twitter:twitaccsecret');
  var twitglobalhashtags = nconf.get('twitter:twitglobalhashtags');
}

var discenable = nconf.get('discord:discenable');
if (discenable) {
  var discord = require('discord.js');
}

router.use( bodyParser.json() );       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./messages.db');
    db.configure("busyTimeout", 30000);

// defaults
var initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;

// auth variables
var HideCapcode = nconf.get('messages:HideCapcode');
var apiSecurity = nconf.get('messages:apiSecurity');

if (HideCapcode) {
  router.get('/capcodes', isLoggedIn, function(req, res, next) {
    db.serialize(() => {
      db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
        if (err) return next(err);
        res.json(rows);
      });
    });
  });
} else {
  router.get('/capcodes', isSecMode, function(req, res, next) {
    db.serialize(() => {
      db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
        if (err) return next(err);
        res.json(rows);
      });
    });
  });
}

///////////////////
//               //
// GET messages  //
//               //
///////////////////

/* GET message listing. */
router.get('/messages', isSecMode, function(req, res, next) {
  nconf.load();
  console.time('init');
  var pdwMode = nconf.get('messages:pdwMode');
  var maxLimit = nconf.get('messages:maxLimit');
  var defaultLimit = nconf.get('messages:defaultLimit');
  initData.replaceText = nconf.get('messages:replaceText');
  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0) {
      initData.currentPage = page - 1;
    } else {
      initData.currentPage = 0;
    }
  }
  if (req.query.limit && req.query.limit <= maxLimit) {
    initData.limit = parseInt(req.query.limit, 10);
  } else {
    initData.limit = parseInt(defaultLimit, 10);
  }
  var initSql;
  if (pdwMode) {
    initSql =  "SELECT COUNT(*) AS msgcount FROM messages WHERE alias_id IN (SELECT id FROM capcodes WHERE ignore = 0);";
  } else {
    initSql = "SELECT COUNT(*) AS msgcount FROM messages WHERE alias_id IS NULL OR alias_id NOT IN (SELECT id FROM capcodes WHERE ignore = 1);";
  }
  db.get(initSql,function(err,count){
    if (err) {
      console.error(err);
    } else if (count) {
      initData.msgCount = count.msgcount;
      initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
      if (initData.currentPage > initData.pageCount) {
        initData.currentPage = 0;
      }
      initData.offset = initData.limit * initData.currentPage;
      if (initData.offset < 0) {
        initData.offset = 0;
      }
      initData.offsetEnd = initData.offset + initData.limit;
      console.timeEnd('init');
      console.time('sql');
      var sql;
      if(pdwMode) {
        sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
        sql += " FROM messages";
        sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id WHERE capcodes.ignore = 0";
        sql += " ORDER BY messages.id DESC LIMIT "+initData.limit+" OFFSET "+initData.offset+";";
      } else {
        sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
        sql += " FROM messages";
        sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id WHERE capcodes.ignore = 0 OR capcodes.ignore IS NULL ";
        sql += " ORDER BY messages.id DESC LIMIT "+initData.limit+" OFFSET "+initData.offset+";";
      }
      var result = [];
      db.each(sql,function(err,row){
        //outRow = JSON.parse(newrow);
        if (HideCapcode) {
          if (!req.isAuthenticated()) {
            row = {
              "id": row.id,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": row.color,
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if (err) {
          console.error(err);
        } else if (row) {
          result.push(row);
        } else {
          console.log('empty results');
        }
      },function(err,rowCount){
        if (err) {
          console.timeEnd('sql');
          console.error(err);
          res.status(500).send(err);
        } else if (rowCount > 0) {
          console.timeEnd('sql');
          //var limitResults = result.slice(initData.offset, initData.offsetEnd);
          console.time('send');
          res.status(200).json({'init': initData, 'messages': result});
          console.timeEnd('send');
        } else {
          res.status(200).json({'init': {}, 'messages': []});
        }
      });
    } else {
      console.log('empty results');
    }
  });
});

router.get('/messages/:id', isSecMode, function(req, res, next) {
  nconf.load();
  var pdwMode = nconf.get('messages:pdwMode');
  var id = req.params.id;
  var sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
      sql += " FROM messages";
      sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
      sql += " WHERE messages.id = "+id;
  db.serialize(() => {
    db.get(sql,function(err,row){
      if (err) {
        res.status(500).send(err);
      } else {
        if (HideCapcode) {
          if (!req.isAuthenticated()) {
            row = {
              "id": row.id,
              "message": row.message,
              "source": row.source,
              "timestamp": row.timestamp,
              "alias_id": row.alias_id,
              "alias": row.alias,
              "agency": row.agency,
              "icon": row.icon,
              "color": row.color,
              "ignore": row.ignore,
              "aliasMatch": row.aliasMatch
            };
          }
        }
        if(row.ignore == 1) {
          res.status(200).json({});
        } else {
          if(pdwMode && !row.alias) {
            res.status(200).json({});
          } else {
            res.status(200).json(row);
          }
        }
      }
    });
  });
});
/*
router.get('/messages/address/:id', function(req, res, next) {
    var id = req.params.id;
    db.serialize(() => {
        db.all("SELECT * from messages WHERE address=?", id, function(err,rows){
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                res.status(200);
                res.json(rows);
            }
        });
    });
});*/

/* GET message search */
router.get('/messageSearch', isSecMode, function(req, res, next) {
  nconf.load();
  console.time('init');
  var pdwMode = nconf.get('messages:pdwMode');
  var maxLimit = nconf.get('messages:maxLimit');
  var defaultLimit = nconf.get('messages:defaultLimit');
  initData.replaceText = nconf.get('messages:replaceText');

  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0) {
      initData.currentPage = page - 1;
    } else {
      initData.currentPage = 0;
    }
  }
  if (req.query.limit && req.query.limit <= maxLimit) {
    initData.limit = parseInt(req.query.limit, 10);
  } else {
    initData.limit = parseInt(defaultLimit, 10);
  }

  var query;
  var agency;
  var address;
  // dodgy handling for unexpected results
  if (typeof req.query.q !== 'undefined') { query = req.query.q;
  } else { query = ''; }
  if (typeof req.query.agency !== 'undefined') { agency = req.query.agency;
  } else { agency = ''; }
  if (typeof req.query.address !== 'undefined') { address = req.query.address;
  } else { address = ''; }
  var sql;

  // set select commands based on query type
  // address can be address or source field
  if (query != '') {
    sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch
    FROM messages_search_index
    LEFT JOIN messages ON messages.id = messages_search_index.rowid `;
  } else {
    sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch 
    FROM messages `;
  }
  if(pdwMode) {
    sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id";
  } else {
    sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
  }
  sql += ' WHERE';
  if(query != '') {
    sql += ` messages_search_index MATCH ?`;
  } else {
    if(address != '')
      sql += ` messages.address LIKE "${address}" OR messages.source = "${address}" OR `;
    if(agency != '')
      sql += ` messages.alias_id IN (SELECT id FROM capcodes WHERE agency = "${agency}" AND ignore = 0) OR `;
    sql += ' messages.id IS ?';
  }
  
  sql += " ORDER BY messages.id DESC;";

  console.timeEnd('init');
  console.time('sql');

  var rows = [];
  db.each(sql,query,function(err,row){
    if (err) {
      console.error(err);
    } else if (row) {
      if (HideCapcode) {
        if (!req.isAuthenticated()) {
          row = {
            "id": row.id,
            "message": row.message,
            "source": row.source,
            "timestamp": row.timestamp,
            "alias_id": row.alias_id,
            "alias": row.alias,
            "agency": row.agency,
            "icon": row.icon,
            "color": row.color,
            "ignore": row.ignore,
            "aliasMatch": row.aliasMatch
          };
        }
      }
      if (pdwMode) {
        if (row.ignore == 0)
          rows.push(row);
      } else {
        if (!row.ignore || row.ignore == 0)
          rows.push(row);
      }
    } else {
      console.log('empty results');
    }
  },function(err,rowCount){
    if (err) {
      console.timeEnd('sql');
      console.error(err);
      res.status(500).send(err);
    } else if (rowCount > 0) {
      console.timeEnd('sql');
      var result = rows;
      console.time('initEnd');
      initData.msgCount = result.length;
      initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
      if (initData.currentPage > initData.pageCount) {
        initData.currentPage = 0;
      }
      initData.offset = initData.limit * initData.currentPage;
      if (initData.offset < 0) {
        initData.offset = 0;
      }
      initData.offsetEnd = initData.offset + initData.limit;
      var limitResults = result.slice(initData.offset, initData.offsetEnd);

      console.timeEnd('initEnd');
      res.json({'init': initData, 'messages': limitResults});
    } else {
      console.timeEnd('sql');
      res.status(200).json({'init': {}, 'messages': []});
    }
  });
});

///////////////////
//               //
// GET capcodes  //
//               //
///////////////////


// capcodes aren't pagified at the moment, this should probably be removed
router.get('/capcodes/init', isSecMode, function(req, res, next) {
  //set current page if specifed as get variable (eg: /?page=2)
  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0)
      initData.currentPage = page - 1;
  }
  db.serialize(() => {
    db.get("SELECT id FROM capcodes ORDER BY id DESC LIMIT 1", [], function(err, row) {
      if (err) {
        console.error(err);
      } else {
        initData.msgCount = parseInt(row['id'], 10);
        //console.log(initData.msgCount);
        initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
        var offset = initData.limit * initData.currentPage;
        initData.offset = initData.msgCount - offset;
        if (initData.offset < 0) {
          initData.offset = 0;
        }
        res.json(initData);
      }
    });
  });
});

router.get('/capcodes/:id', isSecMode, function(req, res, next) {
  var id = req.params.id;
  db.serialize(() => {
    db.get("SELECT * from capcodes WHERE id=?", id, function(err, row){
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        if (row) {
          if (HideCapcode) {
            if (!req.isAuthenticated()) {
              row = {
                "id": row.id,
                "message": row.message,
                "source": row.source,
                "timestamp": row.timestamp,
                "alias_id": row.alias_id,
                "alias": row.alias,
                "agency": row.agency,
                "icon": row.icon,
                "color": row.color,
                "ignore": row.ignore,
                "aliasMatch": row.aliasMatch
              };
            }
          }
          res.status(200);
          res.json(row);
        } else {
          row = {
            "id": "",
            "address": "",
            "alias": "",
            "agency": "",
            "icon": "question",
            "color": "black",
            "push": "",
            "pushgroup": "",
            "pushsound": "",
            "pushpri": "0",
            "telegram": "",
            "telechat": "",
            "twitter": "",
            "twitterhashtag": "",
            "discord": "",
            "discwebhook": "",
            "mailenable" : "",
            "mailto" : ""
          };
          res.status(200);
          res.json(row);
        }
      }
    });
  });
});

router.get('/capcodeCheck/:id', isSecMode, function(req, res, next) {
  var id = req.params.id;
  db.serialize(() => {
    db.get("SELECT * from capcodes WHERE address=?", id, function(err, row){
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        if (row) {
          if (HideCapcode) {
            if (!req.isAuthenticated()) {
              row = {
                "id": row.id,
                "message": row.message,
                "source": row.source,
                "timestamp": row.timestamp,
                "alias_id": row.alias_id,
                "alias": row.alias,
                "agency": row.agency,
                "icon": row.icon,
                "color": row.color,
                "ignore": row.ignore,
                "aliasMatch": row.aliasMatch
              };
            }
          }
          res.status(200);
          res.json(row);
        } else {
          row = {
            "id": "",
            "address": "",
            "alias": "",
            "agency": "",
            "icon": "question",
            "color": "black",
            "push": "",
            "pushgroup": "",
            "pushsound": "",
            "pushpri": "0",
            "telegram": "",
            "telechat": "",
            "twitter": "",
            "twitterhashtag": "",
            "discord": "",
            "discwebhook": "",
            "mailenable" : "",
            "mailto" : ""
          };
          res.status(200);
          res.json(row);
        }
      }
    });
  });
});

router.get('/capcodes/agency/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
  db.serialize(() => {
    db.all("SELECT * from capcodes WHERE agency LIKE ?", id, function(err,rows){
      if (err) {
        res.status(500);
        res.send(err);
      } else {
        res.status(200);
        res.json(rows);
      }
    });
  });
});

// lock down POST routes
router.all('*',
  passport.authenticate('localapikey', { session: false, failWithError: true }),
  function(req, res, next) {
    next();
  },
  function(err, req, res, next) {
    console.log('API key auth failed, attempting basic auth');
    isLoggedIn(req, res, next);
  }
);

//////////////////////////////////
//
// POST calls below
//
//////////////////////////////////
router.post('/messages', function(req, res, next) {
  nconf.load();
  if (req.body.address && req.body.message) {
    var filterDupes = nconf.get('messages:duplicateFiltering');
    var dupeLimit = nconf.get('messages:duplicateLimit') || 0; // default 0
    var dupeTime = nconf.get('messages:duplicateTime') || 0; // default 0
    var pdwMode = nconf.get('messages:pdwMode');
    var pushenable = nconf.get('pushover:pushenable');
    var pushkey = nconf.get('pushover:pushAPIKEY');
    var mailEnable = nconf.get('STMP:MailEnable');
    var MailFrom      = nconf.get('STMP:MailFrom');
    var MailFromName  = nconf.get('STMP:MailFromName');
    var SMTPServer    = nconf.get('STMP:SMTPServer');
    var SMTPPort      = nconf.get('STMP:SMTPPort');
    var STMPUsername  = nconf.get('STMP:STMPUsername');
    var STMPPassword  = nconf.get('STMP:STMPPassword');
    var STMPSecure    = nconf.get('STMP:STMPSecure');

    db.serialize(() => {
      //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
      var address = req.body.address || '0000000';
      var message = req.body.message.replace(/["]+/g, '') || 'null';
      var datetime = req.body.datetime || 1;
      var timeDiff = datetime - dupeTime;
      var source = req.body.source || 'UNK';
      
      var dupeCheck = 'SELECT * FROM messages WHERE ';
      if (dupeLimit != 0 || dupeTime != 0) {
        dupeCheck += 'id IN ( SELECT id FROM messages ';
        if (dupeTime != 0) {
          dupeCheck += 'WHERE timestamp > '+timeDiff+' ';
        }
        if (dupeLimit != 0) {
          dupeCheck += 'ORDER BY id DESC LIMIT '+dupeLimit;
        }
        dupeCheck +=' ) AND message LIKE "'+message+'" AND address="'+address+'";';
      } else {
        dupeCheck += 'message LIKE "'+message+'" AND address="'+address+'";';
      }

      db.get(dupeCheck, [], function (err, row) {
        if (err) {
          res.status(500).send(err);
        } else {
          if (row && filterDupes) {
            console.log('Ignoring duplicate: ', message);
            res.status(200);
            res.send('Ignoring duplicate');
          } else {
            db.get("SELECT id, ignore, push, pushpri, pushgroup, pushsound, telegram, telechat, twitter, twitterhashtag, discord, discwebhook, mailenable, mailto FROM capcodes WHERE ? LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1", address, function(err,row) {
              var insert;
              var alias_id = null;
              var pushonoff = null;
              var pushpri = null;
              var pushgroup = null;
              var pushsound = null;
              var teleonoff = null;
              var telechat = null;
              var twitonoff = null;
              var disconoff = null;
              var discwebhook = null;
              var mailonoff = null;
              var mailTo = "";
              if (err) { console.error(err) }
              if (row) {
                if (row.ignore == '1') {
                  insert = false;
                  console.log('Ignoring filtered address: '+address+' alias: '+row.id);
                } else {
                  insert = true;
                  alias_id = row.id;
                  pushonoff = row.push;
                  pushPri = row.pushpri;
                  pushGroup = row.pushgroup;
                  pushSound = row.pushsound;
                  teleonoff = row.telegram;
                  telechat = row.telechat
                  twitonoff = row.twitter
                  twithashtags = row.twitterhashtag
                  telechat = row.telechat;
                  disconoff = row.discord;
                  discwebhook = row.discwebhook;
                  mailonoff = row.mailenable;
                  mailTo = row.mailto;
                }
              } else {
                insert = true;
              }
              if (insert == true) {
                db.run("INSERT INTO messages (address, message, timestamp, source, alias_id) VALUES ($mesAddress, $mesBody, $mesDT, $mesSource, $aliasId);", {
                  $mesAddress: address,
                  $mesBody: message,
                  $mesDT: datetime,
                  $mesSource: source,
                  $aliasId: alias_id
                }, function(err){
                  if (err) {
                    res.status(500).send(err);
                  } else {
                    // emit the full message
                    var sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch FROM messages";
                    if(pdwMode) {
                        sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id ";
                    } else {
                        sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
                    }
                        sql += " WHERE messages.id = "+this.lastID;
                    var reqLastID = this.lastID;
                    db.get(sql,function(err,row){
                      if (err) {
                        res.status(500).send(err);
                      } else {
                        if(row) {
                          //console.log(row);
                          //req.io.emit('messagePost', row);
                          if (HideCapcode) {
                            //Emit full details to the admin socket
                            req.io.of('adminio').emit('messagePost', row);
                            // Emit No capdoe to normal socket
                            row = {
                              "id": row.id,
                              "message": row.message,
                              "source": row.source,
                              "timestamp": row.timestamp,
                              "alias_id": row.alias_id,
                              "alias": row.alias,
                              "agency": row.agency,
                              "icon": row.icon,
                              "color": row.color,
                              "ignore": row.ignore,
                              "aliasMatch": row.aliasMatch
                            };
                            req.io.emit('messagePost', row);
                          } else {
                            //Just emit - No Security enabled
                            req.io.emit('messagePost', row);
                          }
                        }
                        res.status(200).send(''+reqLastID);
                        //Check to see if Email is enabled globaly
                        if (mailEnable == true) {
                          // Check to see if the capcode is set to mailto
                          if (mailonoff == 1) {
                            let smtpConfig = {
                              host: SMTPServer,
                              port: SMTPPort,
                              secure: STMPSecure, // upgrade later with STARTTLS
                              auth: {
                                user: STMPUsername,
                                pass: STMPPassword
                              },
                              tls: {
                                // do not fail on invalid certs
                                rejectUnauthorized: false
                              }
                            };
                            let transporter = nodemailer.createTransport(smtpConfig,[])

                            let mailOptions = {
                              from: '"'+MailFromName+'" <'+MailFrom+'>', // sender address
                              to: mailTo, // list of receivers
                              subject: row.agency+' - '+row.alias, // Subject line
                              text: row.message, // plain text body
                              html: '<b>'+row.message+'</b>' // html body
                            };

                            // send mail with defined transport object
                            transporter.sendMail(mailOptions, (error, info) => {
                              if (error) {
                                return console.error('SMTP:' + error);
                              }
                              console.log('SMTP:' + 'Message sent: %s', info.messageId);
                            });
                          }
                        };

                        //check config to see if push is gloably enabled and for the alias
                        if (pushenable == true && pushonoff == 1) {
                          //ensure key has been entered before trying to push
                          if (pushGroup == 0 || !pushGroup) {
                            console.error('Pushover: ' + address + ' No User/Group key set. Please enter User/Group Key.');
                          } else {
                            var p = new push({
                              user: pushGroup,
                              token: pushkey,
                            });
                            
                            var msg = {
                              message: row.message,
                              title: row.agency+' - '+row.alias,
                              sound: pushSound,
                              priority: pushPri
                            };

                            if (pushPri == 2) {
                              //emergency message
                              msg.retry = 60;
                              msg.expire = 240;
                            }

                            if (pushPri == 2) {
                              console.log("SENDING EMERGENCY PUSH NOTIFICATION")
                            }
                            p.send(msg, function (err, result) {
                              if (err) { console.error('Pushover:' + err); }
                              console.log('Pushover:' + result);
                            });
                          }
                        };
                        //check config to see if push is gloably enabled and for the alias
                        if (teleenable == true && teleonoff == 1) {
                          //ensure chatid has been entered before trying to push
                          if (telechat == 0 || !telechat) {
                            console.error('Telegram: ' + address + ' No ChatID key set. Please enter ChatID.');
                          } else {
                            //Notification formatted in Markdown for pretty notifications
                            var notificationText = `*${row.agency} - ${row.alias}*\n` + 
                                                   `Message: ${row.message}`;
                            
                            t.sendMessage({
                                chat_id: telechat,
                                text: notificationText,
                                parse_mode: "Markdown"
                            }).then(function(data) {
                              //uncomment below line to debug messages at the console!
                              console.log('Telegram: ' + util.inspect(data, false, null));
                            }).catch(function(err) {
                                console.log('Telegram: ' + err);
                            });
                          }
                        };
                        //start Twitter Module
                        if (twitenable == true && twitonoff == 1) {
                          //ensure API Keys have been entered before trying to post. 
                          if ((twitconskey == 0 || !twitconskey) || (twitconssecret == 0 || !twitconssecret) || (twitacctoken == 0 || !twitacctoken) || (twitaccsecret == 0 || !twitaccsecret)) {
                            console.error('Twitter: ' + address + ' No API keys set. Please check API keys.');
                          } else {
                            var tw = new twit({
                              consumer_key: twitconskey,
                              consumer_secret: twitconssecret,
                              access_token: twitacctoken,
                              access_token_secret: twitaccsecret,
                            });
                            
                            var twittertext = `${row.agency} - ${row.alias} \n` +
                              `${row.message} \n` +
                              `${twithashtags}` + ' ' + `${twitglobalhashtags}`
                            
                            tw.post('statuses/update', {
                              status: twittertext
                            }, function (err, data, response) {
                              if (err) { console.error('Twitter: ' + err); }else{ console.log('Twitter: ' + 'Tweet Posted')}
                            })
                          }
                        };
                        
                        //Start Discord Module
                        if (discenable == true && disconoff == 1) {
                          var toHex = require('colornames')
                          var hostname = nconf.get('hostname');
                          //Ensure webhook ID and Token have been entered into the alias. 
                          if (discwebhook == 0 || !discwebhook) {
                            console.error('Discord: ' + address + ' No Webhook URL set. Please enter Webhook URL.');
                          } else {
                            var webhook = discwebhook.split('/');
                            var discwebhookid = webhook[5];
                            var discwebhooktoken = webhook[6];

                            var d = new discord.WebhookClient(discwebhookid, discwebhooktoken);
            
                            //Use embedded discord notification format from discord.js 
                            var notificationembed = new discord.RichEmbed({
                              timestamp: new Date(),
                            });
                            // toHex doesn't support putting HEX in, needs to check and skip over if already hex. 
                            var isHex = /^#[0-9A-F]{6}$/i.test(row.color)
                            if (!isHex || isHex == false) {
                              var discordcolor = toHex(row.color)
                            } else {
                              var discordcolor = row.color
                            }
                            notificationembed.setColor(discordcolor);
                            notificationembed.setTitle(`**${row.agency} - ${row.alias}**`);
                            notificationembed.setDescription(`${row.message}`);
                            if (hostname == undefined || !hostname) {
                              console.log('Discord: Hostname not set in config file using pagermon github')
                              notificationembed.setAuthor('PagerMon', '', `https://github.com/davidmckenzie/pagermon`);
                            } else {
                              notificationembed.setAuthor('PagerMon', '', `${hostname}`);
                            }
                            //Print notification template when debugging enabled
                            console.log(notificationembed)
                            d.send(notificationembed)
                              .then(console.log(`Discord: Message Sent`))
                              .catch(function(err) {
                                'Discord: ' + console.error(err);
                              });
                          }
                        };
                      }
                    });
                          }
                      });
              } else {
                  res.status(200);
                  res.send('Ignoring filtered');
              }
            });
          }
        }
      });
    });
  } else {
    res.status(500).json({message: 'Error - address or message missing'});
  }
});

router.post('/capcodes', function(req, res, next) {
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  if (req.body.address && req.body.alias) {
    var id = req.body.id || null;
    var address = req.body.address || 0;
    var alias = req.body.alias || 'null';
    var agency = req.body.agency || 'null';
    var color = req.body.color || 'black';
    var icon = req.body.icon || 'question';
    var ignore = req.body.ignore || 0;
    var push = req.body.push || 0;
    var pushpri = req.body.pushpri || "0";
    var pushgroup = req.body.pushgroup || 0;
    var pushsound = req.body.pushsound || '';
    var telegram = req.body.telegram || 0;
    var telechat = req.body.telechat || '';
    var twitter = req.body.twitter || 0;
    var twitterhashtag = req.body.twitterhashtag || '';
    var discord = req.body.discord || 0;
    var discwebhook = req.body.discwebhook || '';
    var Mailenable = req.body.mailenable || 0;
    var MailTo = req.body.mailto || '';
    db.serialize(() => {
      db.run("REPLACE INTO capcodes (id, address, alias, agency, color, icon, ignore, push, pushpri, pushgroup, pushsound, telegram, telechat, twitter, twitterhashtag, discord, discwebhook, mailenable, mailto) VALUES ($mesID, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPush, $mesPushPri, $mesPushGroup, $mesPushSound, $mesTelegram, $mesTeleChat, $mesTwitter, $mesTwitterHashTag, $mesDiscord, $mesDiscWebhook, $MailEnable, $MailTo );", {
        $mesID: id,
        $mesAddress: address,
        $mesAlias: alias,
        $mesAgency: agency,
        $mesColor: color,
        $mesIcon: icon,
        $mesIgnore: ignore,
        $mesPush : push,
        $mesPushPri: pushpri,
        $mesPushGroup: pushgroup,
        $mesPushSound: pushsound,
        $mesTelegram: telegram,
        $mesTeleChat: telechat,
        $mesTwitter: twitter,
        $mesTwitterHashTag: twitterhashtag,
        $mesDiscord: discord,
        $mesDiscWebhook: discwebhook,
        $MailEnable : Mailenable,
        $MailTo : MailTo
      }, function(err){
        if (err) {
          res.status(500).send(err);
        } else {
          res.status(200);
          res.send(''+this.lastID);
          if (!updateRequired || updateRequired == 0) {
            nconf.set('database:aliasRefreshRequired', 1);
            nconf.save();
          }
        }
      });
      console.log(req.body || 'no request body');
    });
  } else {
    res.status(500).json({message: 'Error - address or alias missing'});
  }
});

router.post('/capcodes/:id', function(req, res, next) {
  var id = req.params.id || req.body.id || null;
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  if (id == 'deleteMultiple') {
    // do delete multiple
    var idList = req.body.deleteList || [0, 0];
    if (!idList.some(isNaN)) {
      console.log('Deleting: '+idList);
      db.serialize(() => {
        db.run(inParam('DELETE FROM capcodes WHERE id IN (?#)', idList), idList, function(err){
          if (err) {
            res.status(500).send(err);
          } else {
            res.status(200).send({'status': 'ok'});
            if (!updateRequired || updateRequired == 0) {
              nconf.set('database:aliasRefreshRequired', 1);
              nconf.save();
            }
          }
        });
      });
    } else {
      res.status(500).send({'status': 'id list contained non-numbers'});
    }
  } else {
    if (req.body.address && req.body.alias) {
      if (id == 'new')
        id = null;
      var address = req.body.address || 0;
      var alias = req.body.alias || 'null';
      var agency = req.body.agency || 'null';
      var color = req.body.color || 'black';
      var icon = req.body.icon || 'question';
      var ignore = req.body.ignore || 0;
      var push = req.body.push || 0;
      var pushpri = req.body.pushpri || "0";
      var pushgroup = req.body.pushgroup || 0;
      var pushsound = req.body.pushsound || '';
      var telegram = req.body.telegram || 0;
      var telechat = req.body.telechat || '';
      var twitter = req.body.twitter || 0;
      var twitterhashtag = req.body.twitterhashtag || '';
      var discord = req.body.discord || 0;
      var discwebhook = req.body.discwebhook || '';
      var Mailenable = req.body.mailenable || 0;
      var MailTo = req.body.mailto || '';
      var updateAlias = req.body.updateAlias || 0;
      console.time('insert');
      db.serialize(() => {
        //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
        db.run("REPLACE INTO capcodes (id, address, alias, agency, color, icon, ignore, push, pushpri, pushgroup, pushsound, telegram, telechat, twitter, twitterhashtag, discord, discwebhook, mailenable, mailto  ) VALUES ($mesID, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPush, $mesPushPri, $mesPushGroup, $mesPushSound, $mesTelegram, $mesTeleChat, $mesTwitter, $mesTwitterHashTag, $mesDiscord, $mesDiscWebhook, $MailEnable, $MailTo );", {
          $mesID: id,
          $mesAddress: address,
          $mesAlias: alias,
          $mesAgency: agency,
          $mesColor: color,
          $mesIcon: icon,
          $mesIgnore: ignore,
          $mesPush : push,
          $mesPushPri: pushpri,
          $mesPushGroup: pushgroup,
          $mesPushSound: pushsound,
          $mesTelegram: telegram,
          $mesTeleChat: telechat,
          $mesTwitter: twitter,
          $mesTwitterHashTag: twitterhashtag,
          $mesDiscord: discord,
          $mesDiscWebhook: discwebhook,
          $MailEnable : Mailenable,
          $MailTo : MailTo
        }, function(err){
          if (err) {
            console.timeEnd('insert');
            res.status(500).send(err);
          } else {
            console.timeEnd('insert');
            if (updateAlias == 1) {
              console.time('updateMap');
              db.run("UPDATE messages SET alias_id = (SELECT id FROM capcodes WHERE messages.address LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1);", function(err){
                if (err) { console.error(err); console.timeEnd('updateMap'); }
                else { console.timeEnd('updateMap'); }
              });
            } else {
              if (!updateRequired || updateRequired == 0) {
                nconf.set('database:aliasRefreshRequired', 1);
                nconf.save();
              }
            }
            res.status(200).send({'status': 'ok', 'id': this.lastID});
          }
        });
        console.log(req.body || 'request body empty');
      });
    } else {
      res.status(500).json({message: 'Error - address or alias missing'});
    }
  }
});

router.delete('/capcodes/:id', function(req, res, next) {
  // delete single alias
  var id = parseInt(req.params.id, 10);
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  console.log('Deleting '+id);
  db.serialize(() => {
    //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
    db.run("DELETE FROM capcodes WHERE id=?", id, function(err){
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send({'status': 'ok'});
        if (!updateRequired || updateRequired == 0) {
          nconf.set('database:aliasRefreshRequired', 1);
          nconf.save();
        }
      }
    });
    console.log(req.body || 'request body empty');
  });
});

router.post('/capcodeRefresh', function(req, res, next) {
  nconf.load();
  console.time('updateMap');
  db.run("UPDATE messages SET alias_id = (SELECT id FROM capcodes WHERE messages.address LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1);", function(err){
    if (err) { console.error(err); console.timeEnd('updateMap'); }
    else {
      console.timeEnd('updateMap');
      nconf.set('database:aliasRefreshRequired', 0);
      nconf.save();
      res.status(200).send({'status': 'ok'});
    }
  });
});

router.use([handleError]);

module.exports = router;

function inParam (sql, arr) {
  return sql.replace('?#', arr.map(()=> '?' ).join(','));
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.status(401).json({error: 'Authentication failed.'});
  }
}

// route middleware to make sure a user is logged in, only if in sec mode
function isSecMode(req, res, next) {
  if (apiSecurity) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
      return next();
    } else {
      return res.status(401).json({error: 'Authentication failed.'});
    }
  } else {
    // if not sec mode then continue
    return next();
  }
}

function handleError(err,req,res,next){
  var output = {
    error: {
      name: err.name,
      message: err.message,
      text: err.toString()
    }
  };
  var statusCode = err.status || 500;
  res.status(statusCode).json(output);
}
