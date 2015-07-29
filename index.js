var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
var http = require('http');

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
    var weatherData = ''

    var weather = {
        currentTemp: '',
        lowTemp: '',
        highTemp: '',
        weatherConditions: '',
        humidityPercentage: '',
        windSpeed: '',
        cloudPercentage: '',
        cityName: '',
        cityLat: '',
        cityLon: '',
        cityCountry: ''
    }

    // Filter requests with bad tokens
    if (!tokenCheck.test(token)) {
        console.warn('WARNING: Bad POST body (' + req.ip + ')')
        console.warn('\t\tIncorrect Slack API token: ' + token)
        console.warn('\t\tCommand Payload: ' + req.body)
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
        /* Debug
        res.send('Hi! You (' + fullUserName + ') just asked for weather info in zip code: ' + zip)
        */

        console.log('(' + fullUserName + ') just asked for weather info in zip code: ' + zip)

        var postOptions = {
            host: 'api.openweathermap.org',
            port: 80,
            path: '/data/2.5/weather?zip=' + zip + ',us&units=imperial&APPID=' + process.env.APPID,
            method: 'POST'
        }

        var request = http.request(postOptions, function (response) {
            /* Debug
            console.log('\nBEGIN HTTP POST\n----------------------');
            console.log('STATUS:\t' + response.statusCode);
            console.log('HEADERS:\t' + JSON.stringify(response.headers));
            */

            response.setEncoding('utf8');

            response.on('data', function (chunk) {
                weatherData += chunk
            });

            response.on('end', function () {
                /* Debug
                console.log('END HTTP POST\n------------------------\n');
                */

                // Iterator method
                /*JSON.parse(weatherData, function (key, val) {
                    switch (key) {
                        case 'temp':
                            console.log('Current Temp: ' + val);
                            break;
                        case 'temp_min':
                            console.log('Lo Temp: ' + val);
                            break;
                        case 'temp_max':
                            console.log('Hi Temp: ' + val);
                            break;
                    }
                    console.log('\"' + key + '\" : ' + val)
                })*/

                // Array Method
                weatherData = JSON.parse(weatherData)

                switch (weatherData['cod'].toString()) {
                    case '404':
                        res.send(weatherData['message']);
                        break;
                    case '200':
                        weather.cityName = weatherData['name'];
                        weather.cityLat = weatherData['coord']['lat'];
                        weather.cityLon = weatherData['coord']['lon'];
                        weather.cityCountry = weatherData['sys']['country']

                        weather.weatherConditions = weatherData['weather'][0]['main'];
                        weather.currentTemp = Math.round(weatherData['main']['temp']);
                        weather.lowTemp = Math.round(weatherData['main']['temp_min']);
                        weather.highTemp = Math.round(weatherData['main']['temp_max']);
                        weather.humidityPercentage = weatherData['main']['humidity'];

                        weather.windSpeed = weatherData['wind']['speed'];
                        weather.cloudPercentage = weatherData['clouds']['all'];

                        var outputMain = 'Weather for ' + weather.cityName + ', ' + weather.cityCountry + ' (' + weather.cityLat + ', ' + weather.cityLon + ')\n'
                        var outputTemperature = 'Temperature: ' + weather.currentTemp + ' F (' + weather.lowTemp + ' / ' + weather.highTemp + ')\n'
                        var outputConditions = 'Conditions: ' + weather.weatherConditions;

                        res.send(outputMain + outputTemperature + outputConditions);
                        break;
                    default:
                        res.send('Unknown error');
                };

            });

        });

        request.on('error', function (e) {
            console.log('Request Error: ' + e.message)
        });

        request.end()
    }

});

app.get('/', function (req, res) {
    res.send('Get out')
});