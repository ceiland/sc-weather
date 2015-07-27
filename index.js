var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var regex = require('regex');

var app = express();

var logFile = 'log.txt'
var zipCode = new regex(/./);

app.set('port', (process.env.PORT || 9001));
app.use(bodyParser.urlencoded());

app.listen(app.get('port'), function () {
    console.log('Now listening on port ', app.get('port'))
});

app.post('/', function (req, res) {
    console.log('Receiving a message...')
    console.dir(req.body)
    var zip = req.body.text
    console.log('Request text = ' + zip)
    console.log('Request regex vs \d = ' + zipCode.test(zip))

});

app.get('/', function (req, res) {
    res.send('Get out')
});