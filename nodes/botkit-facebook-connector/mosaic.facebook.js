var Botkit = require('botkit');
module.exports = function(RED) {
    function MosaicFacebookNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var nodeMethod = config.method || "GET";
        node.on('input', function(data) {
            if(data.req){
                if (data.req.query['hub.verify_token'] === config.verifyToken) {
                    console.log('*** token verified *** ');
                    data.res.send(data.req.query['hub.challenge']);
                } else {
                    data.res.send('Error, wrong validation token');    
                }
            }
            var RED = require('node-red/red.js');
            var controller = Botkit.facebookbot({
                    access_token: config.pageToken,
                    verify_token: config.verifyToken,
                    receive_via_postback: true
            });

            var bot = controller.spawn({});

            controller.setupWebserver(process.env.botport,function(err,webserver) {
                controller.createWebhookEndpoints(controller.webserver, bot, function() {
                    console.log('This bot is online!!!');
                    controller.startTicking();
                });
            });

            // this is triggered when a user clicks the send-to-messenger plugin
            controller.on('facebook_optin', function(bot, message) {
                console.log('** Inside facebook_optin ***: -> ', message);
                bot.reply(message, 'Welcome to my app!');
            });

            // user said hello
            controller.hears(['hello'], 'message_received', function(bot, message) {
                console.log('** Bot starts hearing and sending replies .... ', message);
                console.log(RED);
                bot.reply(message, 'Hey there.');

            });
            controller.hears(['cookies'], 'message_received', function(bot, message) {

                bot.startConversation(message, function(err, convo) {

                    convo.say('Did someone say cookies!?!!');
                    convo.ask('What is your favorite type of cookie?', function(response, convo) {
                        convo.say('Golly, I love ' + response.text + ' too!!!');
                        convo.next();
                    });
                });
            });
            controller.hears('test', 'message_received', function(bot, message) {

                var attachment = {
                    'type':'template',
                    'payload':{
                        'template_type':'generic',
                        'elements':[
                            {
                                'title':'Chocolate Cookie',
                                'image_url':'http://www.cookies.com/skin/frontend/smartwave/mango/images/cookies-logo.png',
                                'subtitle':'A delicious chocolate cookie',
                                'buttons':[
                                    {
                                    'type':'postback',
                                    'title':'Eat Cookie',
                                    'payload':'chocolate'
                                    }
                                ]
                            },
                        ]
                    }
                };

                bot.reply(message, {
                    attachment: attachment,
                });

            });

            controller.on('facebook_postback', function(bot, message) {

                if (message.payload == 'chocolate') {
                    bot.reply(message, 'You ate the chocolate cookie!')
                }

            });
            node.send(data);
        });
    }
    RED.nodes.registerType("mosaic.facebook",MosaicFacebookNode,{});
}