var express = require('express');
var bodyParser = require('body-parser');

var app = express();

app.set('port', (process.env.PORT || 9001));
app.use(bodyParser.json());

app.listen(app.get('port'), function () {
    console.log('Now listening on port ', app.get('port'));
});

app.post('/', function (req, res) {
    var zip = (req.body['text'][0] || 'NULL')
    res.send('You requested weather for zip: ' + zip)
});