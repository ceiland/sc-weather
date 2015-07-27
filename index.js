var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');

var app = express();

var logFile = 'log.txt'
var zipCheck = new RegExp(/^\d{5}$/);
var tokenCheck = new RegExp('' + process.env.TOKEN);

app.set('port', (process.env.PORT || 9001));
app.use(bodyParser.urlencoded({extended:false}));

app.listen(app.get('port'), function () {
    console.log('Now listening on port', app.get('port'))
});

app.post('/', function (req, res) {
    var zip = req.body.text
    var token = req.body.token
    var fullUserName = req.body.user_name + '@' + req.body.team_domain

    // Filter bad tokens
    if (!tokenCheck.test(token)) {
        console.warn('WARNING: Bad POST body (' + req.ip + ')')
        console.warn('\t\tIncorrect Slack API token: ' + token)
        console.warn('\t\tCommand Payload: ' + zip)
        return 0
    }

    /* Debug
    console.log('Receiving a message...')
    console.dir(req.body)
    console.log('Request text = \"' + zip + '\"')
    console.log('Checking... ' + zipCheck.test(zip))
    */

    if (!zipCheck.test(zip)) {
        res.send('Hi! I am currently hacking you. \nThe value you just sent me is NOT A ZIP CODE.')
    }
    else {
        res.send('Hi! You (' + fullUserName + ') just asked for weather info in zip code: ' + zip)
        console.log('(' + fullUserName + ') just asked for weather info in zip code: ' + zip)
    }

});

app.get('/', function (req, res) {
    res.send('Get out')
});