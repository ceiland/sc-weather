var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');

var app = express();

var zipCheck = new RegExp(/^\d{5}$/);
var tokenCheck = new RegExp('' + process.env.TOKEN);

app.set('port', (process.env.PORT || 9001));
app.use(bodyParser.urlencoded({extended:false}));

app.listen(app.get('port'), function () {
    console.log('Now listening on port', app.get('port'))
});

app.post('/', function (req, res) {
    var weatherPostData = ''

    var slackData = {
        token: req.body.token,
        team_id: req.body.team_id,
        team_domain: req.body.team_domain,
        channel_id: req.body.channel_id,
        channel_name: req.body.channel_name,
        user_id: req.body.user_id,
        user_name: req.body.user_name,
        command: req.body.command,
        zip: req.body.text,
        fullUserName: req.body.user_name + '@' + req.body.team_domain + ' on #' + req.body.channel_name
    }

    var weatherData = {
        cityLat: '',
        cityLon: '',
        weatherConditions: '',
        weatherDescription: '',
        currentTemp: '',
        lowTemp: '',
        highTemp: '',
        humidityPercentage: '',
        pressure: '',
        windSpeed: '',
        windDirection: '',
        cloudPercentage: '',
        rainfall: '',
        snowfall: '',
        timestamp: '',
        sunrise: '',
        sunset: '',
        cityName: '',
        cityCountry: '',
        responseCode: ''
    }

    // Filter requests with bad tokens
    if (!tokenCheck.test(slackData.token)) {
        console.warn('WARNING: Bad POST body (' + req.ip + ')')
        console.warn('\t\tIncorrect Slack API token: ' + slackData.token)
        console.warn('\t\tCommand Payload: ')
        console.dir(req.body)
        return 0
    }

    /* Debug
    console.log('Receiving a message...')
    console.dir(req.body)
    console.log('Request text = \"' + slackData.zip + '\"')
    console.log('Checking... ' + zipCheck.test(slackData.zip))
    */

    if (!zipCheck.test(slackData.zip)) {
        console.log('(' + slackData.fullUserName + ') just asked for weather info for INVALID zip code: ' + slackData.zip)
        console.dir(res.body)
        res.send('Hi! I am currently hacking you. \nThe value you just sent me is NOT A ZIP CODE: ' + slackData.zip)
    }
    else {
        /* Debug
        res.send('Hi! You (' + slackData.fullUserName + ') just asked for weather info in zip code: ' + slackData.zip)
        */

        console.log('(' + slackData.fullUserName + ') just asked for weather info for zip code: ' + slackData.zip)

        var weatherPostOptions = {
            host: 'api.openweathermap.org',
            port: 80,
            path: '/data/2.5/weather?zip=' + slackData.zip + ',us&units=imperial&APPID=' + process.env.APPID,
            method: 'POST'
        }

        var slackPostOptions = {

        }

        var request = http.request(weatherPostOptions, function (response) {
            /* Debug
            console.log('\nBEGIN HTTP POST\n----------------------');
            console.log('STATUS:\t' + response.statusCode);
            console.log('HEADERS:\t' + JSON.stringify(response.headers));
            */

            response.setEncoding('utf8');

            response.on('data', function (chunk) {
                weatherPostData += chunk
            });

            response.on('end', function () {
                /* Debug
                console.log('END HTTP POST\n------------------------\n');
                */

                // Iterator method
                /*JSON.parse(weatherPostData, function (key, val) {
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
                weatherPostData = JSON.parse(weatherPostData)

                switch (weatherPostData['cod'].toString()) {
                    case '404':
                        res.send(weatherPostData['message']);
                        break;
                    case '200':
                        weatherData.cityName = weatherPostData['name'];
                        weatherData.cityLat = weatherPostData['coord']['lat'];
                        weatherData.cityLon = weatherPostData['coord']['lon'];
                        weatherData.cityCountry = weatherPostData['sys']['country']

                        weatherData.weatherConditions = weatherPostData['weather'][0]['main'];
                        weatherData.currentTemp = Math.round(weatherPostData['main']['temp']);
                        weatherData.lowTemp = Math.round(weatherPostData['main']['temp_min']);
                        weatherData.highTemp = Math.round(weatherPostData['main']['temp_max']);
                        weatherData.humidityPercentage = weatherPostData['main']['humidity'];

                        weatherData.windSpeed = weatherPostData['wind']['speed'];
                        weatherData.cloudPercentage = weatherPostData['clouds']['all'];

                        var outputMain = 'Weather for ' + weatherData.cityName + ', ' + weatherData.cityCountry + ' (' + weatherData.cityLat + ', ' + weatherData.cityLon + ')\n'
                        var outputTemperature = 'Temperature: ' + weatherData.currentTemp + ' F (' + weatherData.lowTemp + ' / ' + weatherData.highTemp + ')\n'
                        var outputConditions = 'Conditions: ' + weatherData.weatherConditions;

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