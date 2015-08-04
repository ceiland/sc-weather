var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');

var app = express();

var zipCheck = new RegExp(/^\d{5}$/);
var tokenCheck = new RegExp('' + process.env.SLACK_SLASH_API_TOKEN);

app.set('port', (process.env.PORT || 9001));
app.use(bodyParser.urlencoded({extended:false}));

app.listen(app.get('port'), function () {
    console.log('Now listening on port', app.get('port'))
});

app.post('/', function (req, res) {
    var weatherPostData = ''
    var geocodeResponseData = ''
    var attachmentVars = [];

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
        cityID: '',
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

    var geocodeData = {
        formattedAddress: ''
    }

    var botData = {
        channel: '#general',
        username: 'weatherbot',
        attachments: attachmentVars
        }

    var weatherPostOptions = {
        host: 'api.openweathermap.org',
        port: 80,
        path: '/data/2.5/weather?zip=' + slackData.zip + ',us&units=imperial&APPID=' + process.env.APPID,
        method: 'POST'
    }

    var slackPostOptions = {
        host: 'hooks.slack.com',
        port: 443,
        path: '/services/' + process.env.SLACK_TEAM_ID + '/' + process.env.SLACK_HOOK_BOT_USER_ID + '/' + process.env.SLACK_HOOK_API_TOKEN,
        method: 'POST'
    }

    var geocodePostOptions = {
        host: process.env.GEOCODE_HOST,
        port: 443,
        path: process.env.GEOCODE_PATH + '?address=' + slackData.zip + '&sensor=true&key=' + process.env.GEOCODE_API_TOKEN,
        method: 'GET'
    }

    var timezonePostOptions = {
		host: process.env.TIMEZONE_HOST,
		port: 443,
		path: process.env.TIMEZONE_PATH + '?location=' + weatherData.cityLat + ',' + weatherData.cityLon + '&timestamp=' + weatherData.timestamp + '&key=' + process.env.TIMEZONE_API_TOKEN,
		method: 'GET'
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
        console.dir(req.body)
        res.send('Hi! I am currently hacking you. \nThe value you just sent me is NOT A ZIP CODE: ' + slackData.zip)
        return 0
    }
    /* Debug
    res.send('Hi! You (' + slackData.fullUserName + ') just asked for weather info in zip code: ' + slackData.zip)
    */

    console.log('(' + slackData.fullUserName + ') just asked for weather info: ')

    var geocodeRequest = https.request(geocodePostOptions, function (geocodeResponse) {
    	geocodeResponse.setEncoding('utf8')

    	geocodeResponse.on('data', function (chunk) {
    		geocodeResponseData += chunk
    	});

    	geocodeResponse.on('end', function () {
    		geocodeResponseData = JSON.parse(geocodeResponseData)

    		switch (geocodeResponseData['status'].toString()) {
    			case 'OK':
    				geocodeData.formattedAddress = geocodeResponseData['results'][0]['formatted_address'];
    				console.log('    Geocode Location: ' + geocodeData.formattedAddress)
    				break;
    			default:
    				console.log('    Geocode Data Resposne: ' + geocodeData['status']);
    				break;
    		};


    		var weatherRequest = http.request(weatherPostOptions, function (weatherResponse) {
    		    weatherResponse.setEncoding('utf8');

    		    weatherResponse.on('data', function (chunk) {
    		        weatherPostData += chunk
    		    });

    		    weatherResponse.on('end', function () {
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
    		                weatherData.cityID = weatherPostData['id'];

    		                weatherData.weatherConditions = toTitleCase(weatherPostData['weather'][0]['description']);
    		                weatherData.currentTemp = Math.round(weatherPostData['main']['temp']);
    		                weatherData.lowTemp = Math.round(weatherPostData['main']['temp_min']);
    		                weatherData.highTemp = Math.round(weatherPostData['main']['temp_max']);
    		                weatherData.humidityPercentage = weatherPostData['main']['humidity'];

    		                weatherData.windSpeed = weatherPostData['wind']['speed'];
    		                weatherData.cloudPercentage = weatherPostData['clouds']['all'];

    		                attachmentVars.push(
                            {
                                fallback: '' + slackData.user_name + '\'s weather data for ' + geocodeData.formattedAddress + ' (' + weatherData.cityLat + ', ' + weatherData.cityLon + ')',
                                pretext: '' + slackData.user_name + '\'s weather data for ' + geocodeData.formattedAddress + ' (' + weatherData.cityLat + ', ' + weatherData.cityLon + ')',
                                title: 'Temp: ' + weatherData.currentTemp + '\u00b0F (' + weatherData.lowTemp + '\u00b0F / ' + weatherData.highTemp + '\u00b0F)',
                                title_link: 'http://openweathermap.org/city/' + weatherData.cityID,
                                text: '' + weatherData.weatherConditions + '\n' + weatherData.cloudPercentage + '% Cloudy (' + weatherData.humidityPercentage + '% Humidity)',
                                color: '#7CD197'
                            });

    		                var botPost = https.request(slackPostOptions, function (botResponse) {
    		                });

    		                botPost.on('error', function (e) {
    		                    console.log('Webhook Post Error: ' + e.message)
    		                });

    		                botPost.write(JSON.stringify(botData))
    		                botPost.end()

    		                break;
    		            default:
    		                res.send('Unknown error');
    		        };
    		    });
    		});

    		weatherRequest.on('error', function (e) {
    		    console.log('Request Error: ' + e.message)
    		});

    		weatherRequest.end()

        });
    });

    geocodeRequest.on('error', function (e) {
        console.log('Geocode Request Error: ' + e.message)
    });

    geocodeRequest.end();



});

app.get('/', function (req, res) {
    res.send('Get out')
});

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};

function convertToTime(unixtime) {
    var date = new Date(unixtime * 1000);
    var hour = date.getHours();
    var min = '0' + date.getMinutes();
    var sec = '0' + date.getSeconds();
    return hour + ':' + min.substr(-2) + ':' + sec.substr(-2);
};