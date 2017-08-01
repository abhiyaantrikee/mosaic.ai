var Botkit = require('botkit');
var debug = require('debug')('mosaic.facebook');
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
//var Promise = require('bluebird');
var rp = require('request-promise');

var configData = require('../../config/' + process.env.NODE_ENV + ".json");

module.exports = function (RED) {
    function MosaicFacebookNode(config) {
        debug('*** Mosaic facebook Node starting up ***', config);
        RED.nodes.createNode(this, config);
        var node = this;
        var nodeMethod = config.method || "GET";
        var api_host = config.api_host || 'graph.facebook.com';

        if (config.pageToken && config.verifyToken) {
            debug('*** Config Page token and Verify token Present ***');


            var controller = Botkit.facebookbot({
                access_token: config.pageToken,
                verify_token: config.verifyToken,
                receive_via_postback: true
            });

            var bot = controller.spawn({});

            //MONKEY PATCH
            var setupWebserverOrig = controller.setupWebserver;

            controller.setupWebserver = function (port, cb) {
                var facebook_botkit = controller;
                if (!port) {
                    throw new Error('Cannot start webserver without a port');
                }

                var static_dir = process.cwd() + '/public';

                if (facebook_botkit.config && facebook_botkit.config.webserver && facebook_botkit.config.webserver.static_dir)
                    static_dir = facebook_botkit.config.webserver.static_dir;

                facebook_botkit.config.port = port;

                console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& STARTING ');
                facebook_botkit.webserver = express();
                console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& EXPRESS STARTED');


                // ATTACH STATUS CHECK ROUTE
                facebook_botkit.webserver.get('/api/status', function (request, response) {
                    return response.status(200).send("SERVER RUNNING!");
                });

                // Validate that requests come from facebook, and abort on validation errors
                if (facebook_botkit.config.validate_requests === true) {
                    // Load verify middleware just for post route on our receive webhook, and catch any errors it might throw to prevent the request from being parsed further.
                    facebook_botkit.webserver.post('/facebook/receive', bodyParser.json({ verify: verifyRequest }));
                    facebook_botkit.webserver.use(abortOnValidationError);
                }

                facebook_botkit.webserver.use(bodyParser.json());
                facebook_botkit.webserver.use(bodyParser.urlencoded({ extended: true }));
                facebook_botkit.webserver.use(express.static(static_dir));

                debug('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& LISTENING SERVER MAKE A CALL ......');

                rp.get("http://localhost:3000/api/status").then(function (data) {
                    debug('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', data);

                }).catch(function (e) {
                    debug('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', e.error);
                    var server = facebook_botkit.webserver.listen(
                        facebook_botkit.config.port,
                        facebook_botkit.config.hostname,
                        function (err) {
                            debug('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&');
                            if (err) {
                                debug('&&&&& ERROR OCCURRED AS SERVER IS ALREADY UP...', err);
                                cb(null, facebook_botkit.webserver);
                            } else {
                                facebook_botkit.log('** Starting webserver on port ' +
                                    facebook_botkit.config.port);
                                if (cb) { cb(null, facebook_botkit.webserver); }
                            }
                        });
                });





                request.post('https://' + api_host + '/me/subscribed_apps?access_token='
                    + config.pageToken,
                    function (err, res, body) {
                        if (err) {
                            facebook_botkit.log('Could not subscribe to page messages');
                        } else {
                            facebook_botkit.debug('Successfully subscribed to Facebook events:', body);
                            facebook_botkit.startTicking();
                        }
                    });

                return facebook_botkit;

            };

            controller.setupWebserver(process.env.botport, function (err, webserver) {
                debug('*** SETTING UP THE WEBSERVER *** ', err, webserver);

                if (err) {
                    debug(' *** ERROR, SINCE SERVER WAS ALREADY STARTED *** ', err);
                    webserver.close();
                    controller.setupWebserver(process.env.botport, function (err, webserver) {
                        debug(' *** RESTARTED THE WEBSERVER ***')
                    });
                }

                controller.createWebhookEndpoints(controller.webserver, bot, function () {
                    debug('*** Facebook bot is online ***');
                    controller.startTicking();
                });
            });

            // this is triggered when a user clicks the send-to-messenger plugin
            controller.on('facebook_optin', function (bot, message) {
                debug('*** Inside facebook_optin ***: -> ', message);
                bot.reply(message, 'Welcome to my app!');
            });

            //MIDDLEWARE - TO PREPROCESS BEFORE RECEIVE
            controller.middleware.receive.use(function (bot, message, next) {

                // do something...
                // message.extrainfo = 'foo';
                
                next();

            });
            // // user said hello
            // controller.hears(['hello'], 'message_received', function (bot, message) {
            //     debug('*** Bot starts hearing and sending replies *** ', message);
            //     node.send('Hello from Facebook');
            //     bot.reply(message, 'Hey there.');

            // });
            controller.hears(['cookies'], 'message_received', function (bot, message) {

                bot.startConversation(message, function (err, convo) {
                    if (err) {
                        debug('*** ERROR has occurred while cookies *** ', err);
                        throw new Error(err);
                    }
                    convo.say('Did someone say cookies!?!!');
                    convo.ask('What is your favorite type of cookie?', function (response, convo) {
                        convo.say('Golly, I love ' + response.text + ' too!!!');
                        convo.next();
                    });
                });
            });

            controller.on('facebook_postback', function (bot, message) {

                if (message.payload == 'chocolate') {
                    bot.reply(message, 'You ate the chocolate cookie!')
                }

            });
        }
        else {
            debug('**** config pageotoken exist ****');
        }

    }

    RED.nodes.registerType("mosaic.facebook", MosaicFacebookNode, {});
}