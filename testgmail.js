var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var bodyParser = require('body-parser');//body-parser extract the entire body portion of an incoming request stream and exposes it on req.body.
const express = require('express');
var Promise = require('bluebird');
const app = express();
var search_msg_response = {};
var search_msg_request = {};
var _from, _to, _labels, _subject, _time, _in;

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

port = process.env.port || 3015;
app.listen(port);

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly',
    //'https://www.googleapis.com/auth/gmail.metadata',
    'https://mail.google.com/',
    //'https://www.googleapis.com/auth/gmail.modify'
];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'gmail-nodejs-quickstart.json';

var reqPayload = {}

// Load client secrets from a local file.
var initAuthorize = function () {
    fs.readFile('client_secret_new.json', function processClientSecrets(err, content) {
        // console.log("init");
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }
        // Authorize a client with the loaded credentials, then call the
        // Gmail API.
        //  authorize(JSON.parse(content), listLabels);
        // authorize(JSON.parse(content), createLabel);
        //    authorize(JSON.parse(content), getThreads);
        authorize(JSON.parse(content), getMessages);
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
    // console.log("#############", TOKEN_PATH);
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function (err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function (code) {
        rl.close();
        oauth2Client.getToken(code, function (err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }
    fs.writeFile(TOKEN_PATH, JSON.stringify(token));
    console.log('Token stored to ' + TOKEN_PATH);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLabels(auth) {
    var gmail = google.gmail('v1');
    gmail.users.labels.list({
        auth: auth,
        userId: 'me',
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var labels = response.labels;
        if (labels.length == 0) {
            console.log('No labels found.');
        } else {
            console.log('Labels:');
            for (var i = 0; i < labels.length; i++) {
                var label = labels[i];
                console.log('- %s', label.name);
            }
            //
            //   createLabel(auth);
        }
    });
}

function createLabel(auth) {
    var gmail = google.gmail({ version: 'v1', auth: auth });
    gmail.users.labels.create({
        //   auth: auth,
        userId: 'me',

        /*  label:{ */
        name: 'Test Label 123',
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow'
        /* } */
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        // var labels = response.;
        console.log("RRRRRRR", response);
    });
}

function getThreads(auth) {
    fs.exists(__dirname + "/threads/listThreads.json", function (exists) {
        if (exists) {
            fs.unlink(__dirname + "/listThreads.json");
        }
    });
    fs.exists(__dirname + "/threads/eachThreads.json", function (exists) {
        if (exists) {
            fs.unlink(__dirname + "/eachThreads.json");
        }
    });

    var gmail = google.gmail({ version: 'v1', auth: auth }/* 'v1' */);//{ qs: { q: 'whatever query' }
    var nextPageToken = null;

    gmail.users.threads.list({
        // auth: auth,
        userId: 'me',
        // pageToken: nextPageToken,
        //  q: 'in:sent after:2018/01/cls30 before:2018/01/31'
        q: '[]'
    }, function (err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        // console.log("Threads: ",response);
        const content = JSON.stringify(response);
        writeToFile(__dirname + "/threads/listThreads.json", content);

        var threads = response.threads;
        if (threads.length == 0) {
            console.log('No messages found.');
        } else {
            the_format = 'full'//'metadata';//'minimal';//'full';//'raw';
            console.log("########## threads.length : ", threads.length);
            var j = 1;
            for (var i = 0; i < threads.length; i++) {
                var _thread = threads[i];
                // console.log('- %s', _thread.id);
                gmail.users.threads.get({
                    auth: auth,
                    userId: 'me',
                    id: _thread.id,
                    format: the_format,
                }, function (err, response) {
                    if (err) {
                        console.log('The API returned an error: ' + err);
                        return;
                    }
                    var content = JSON.stringify(response);
                    console.log(response);

                    writeToFile(__dirname + "/threads/eachThreads" + (j++) + ".json", content);
                });
            }
            // console.log("The file was saved!");
        }
    });
}

function getMessages(auth) {
    console.log("AUTH::",auth);
    deleteFiles();
    console.log("#############");
    //SEARCH https://support.google.com/mail/answer/7190?hl=en

    reqPayload = search_msg_request.body;
    console.log("=>1", reqPayload.person);

    _from = reqPayload.person[0].from;
    _to = reqPayload.person[0].to;

    _labels = reqPayload.labels;
    _subject = reqPayload.subject;
    _time = reqPayload.time;
    _in = reqPayload.in;

    var query_string;
    var gmail = google.gmail({ version: 'v1', auth: auth });
    var nextPageToken = null;

    if (_subject != undefined && _subject != "") {
        query_string = ' subject:' + _subject;
    }
    if (_to != undefined && _to.length > 0) {
        var myto;
        for (var i = 0; i < _to.length; i++) {//0 1 2

            if (_to.length > 1) {
                if (i == 0)
                    myto = _to[i];
                else {
                    myto += _to[i];
                }
            } else {//1 element
                myto = _to[i];
            }

            if (i < (_to.length - 1)) {
                myto += ' | '
            }

        }
        if (query_string != undefined) {
            query_string += " to:" + myto;
        } else {
            query_string = " to:" + myto;
        }
    }
    if (_from != undefined && _from.length > 0) {
        var myfrom;
        for (var i = 0; i < _from.length; i++) {//0 1 2

            if (_from.length > 1) {
                if (i == 0)
                    myfrom = _from[i];
                else {
                    myfrom += _from[i];
                }
            } else {//1 element
                myfrom = _from[i];
            }

            if (i < (_from.length - 1)) {
                myfrom += ' | '
            }

        }
        if (query_string != undefined) {
            query_string += " from:" + myfrom;
        } else {
            query_string = " from:" + myfrom;
        }
    }
    if (_time != undefined && _time.length > 0) {
        var mytime = ' ';
        for (var i = 0; i < _time.length; i++) {//0 1 2
            mytime += _time[i] + ' ';
        }
        if (query_string != undefined) {
            query_string += mytime;
        } else {
            query_string = mytime;
        }
    }
    if (_in != undefined && _in.length > 0) {
        var myin = ' ';
        for (var i = 0; i < _in.length; i++) {//0 1 2
            myin += _in[i] + ' ';
        }
        if (query_string != undefined) {
            query_string += 'in:' + myin;
        } else {
            query_string = 'in:' + myin;
        }
    }
    console.log("query_param : ", query_string);
    var myFinalresp = { "emails": [] };

    new Promise(function (resolve, reject) {
        gmail.users.messages.list({
            auth: auth,
            userId: 'me',
            //  pageToken: nextPageToken,
        }, { qs: { q: query_string } }, function (err, response) {
            if (err) {
                console.log('The API returned an error: ' + err);
                return;
            }
            console.log("Messages: ", response);
            const content = JSON.stringify(response);
            var msgs = response.messages;
            if (!msgs || msgs.length == 0) {
                console.log('No messages found.');
                return resolve([]);
            }
            return resolve(msgs);
        });
    })
        .then(function (msgs) {
            the_format = 'metadata'//'metadata';//'minimal';//'full';//'raw';
            metadataHeaders: ['From', 'To', 'Cc', 'Date', 'Subject', 'Snippet']
            var messageReq = {
                auth: auth,
                userId: 'me',
                format: the_format,
                metadataHeaders: ['From', 'To', 'Cc', 'Date', 'Subject', 'Snippet']
            }
            msgresponse = Promise.map(msgs, function (msg) {
                messageReq.id = msg.id
                var msg_response = {};
                return new Promise(function (resolve1, reject1) {
                    gmail.users.messages.get(messageReq, function (err, response) {
                        if (err) {
                            console.log('The API returned an error: ' + err);
                            return;
                        }
                        msg_response.emailProvider=[];
                        msg_response.emailProvider.push("gmail");

                        msg_response.redirectUrl = {};
                        msg_response.redirectUrl.dweb = "https://mail.google.com/mail/#all/" + msg.id;
                        msg_response.redirectUrl.mob = "https://mail.google.com/mail/mu/mp/218/#cv/priority/%5Esmartlabel_personal/" + msg.id;

                        msg_response.snippet = response.snippet;
                        var reqmetaArr = response.payload.headers;

                        for (var h = 0; h < reqmetaArr.length; h++) {
                            if (reqmetaArr[h].name == "From") {
                                msg_response.from = reqmetaArr[h].value;
                            } else if (reqmetaArr[h].name == "To") {
                                msg_response.to = reqmetaArr[h].value;
                            } else if (reqmetaArr[h].name == "Cc") {
                                msg_response.cc = reqmetaArr[h].value;
                            } else if (reqmetaArr[h].name == "Date") {
                                msg_response.date = reqmetaArr[h].value;
                            } else if (reqmetaArr[h].name == "Subject") {
                                msg_response.subject = reqmetaArr[h].value;
                            }
                        }
                        return resolve1(msg_response);
                    });
                })
            })
            return Promise.all(msgresponse);

        })
        .then(function (response) {
            console.log("=======================final response", response);
            search_msg_response.send(response);
        })
}

function deleteFiles() {
    fs.exists(__dirname + "/messages/eachMessages.json", function (exists) {
        if (exists) {
            fs.unlink(__dirname + "/messages/eachMessages.json");
        }
    });

    /*fs.exists(__dirname + "/messages/listMessages.json", function (exists) {
        if (exists) {
            fs.unlink(__dirname + "/messages/listMessages.json");
        }
    }); */
}

function writeToFile(filePath, content) {
    fs.writeFile(filePath, content, 'utf8', function (err) {
        if (err) {
            return console.log(err);
        }
    });
}

/* app.get('/getMessages', function(request, response) {
    // clientRes = response;
    // message = request.query.message;
    // webSocketSend(message);
    console.log("123");
    response.send(msg_response);
}); */

app.post('/searchMessages', function (req, res) {
    search_msg_request = req;
    search_msg_response = res;
    //console.log("HERE" , req.body.person);
    initAuthorize()/* .then(function(res){
       console.log("RR",res) 
   });*/
    // console.log("REQUEST",req.body);
    //console.log("123",res.send(msg_response));
});