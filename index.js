var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
var Q = require('q');

var weatherPostOptions = {
    host: process.env.WEATHER_HOST,
    port: 80,
    path: process.env.WEATHER_PATH,
    method: 'POST'
}

var timezonePostOptions = {
    host: process.env.TIMEZONE_HOST,
    port: 443,
    path: process.env.TIMEZONE_PATH,
    method: 'POST'
}

var geocodePostOptions = {
    host: process.env.GEOCODE_HOST,
    port: 443,
    path: process.env.GEOCODE_PATH,
    method: 'GET'
}

var slackPostOptions = {
    host: 'hooks.slack.com',
    port: 443,
    path: '/services/' + process.env.SLACK_TEAM_ID + '/' + process.env.SLACK_HOOK_BOT_USER_ID + '/' + process.env.SLACK_HOOK_API_TOKEN,
    method: 'POST'
}

var httpReq = function (opts) {
    var deferred = Q.defer();
    var resData = '';
    var req = http.request(opts, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            resData += chunk;
        });

        res.on('end', function () {
            resData = JSON.parse(resData);
            deferred.resolve(resData);
        });
    });

    req.on('error', function (e) {
        console.log('Request Error: ' + e.message)
    });

    req.end();

    return deferred.promise;
};

var httpsReq = function (opts) {
    var deferred = Q.defer();
    var resData = '';
    var req = https.request(opts, function (res) {
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            resData += chunk;
        });

        res.on('end', function () {
            resData = JSON.parse(resData);
            deferred.resolve(resData);
        });
    });

    req.on('error', function (e) {
        console.log('Request Error: ' + e.message)
    });

    req.end();

    return deferred.promise;
};

var app = express();
app.set('port', (process.env.PORT || 9001));
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(app.get('port'), function () {
    console.log('Now listening on port', app.get('port'))
});

app.post('/', function (request, response) {
    var weatherData = {};
    var geocodeData = {};
    var responseData = {};
    var timezoneData = {};

    var botData = {
        channel: '#secrets',
        username: 'weatherbot',
        attachments: []
    }

    geocodePostOptions.path = process.env.GEOCODE_PATH + '?components=postal_code:' + request.body.text + '|country:USA&sensor=true&key=' + process.env.GEOCODE_API_TOKEN,
    httpsReq(geocodePostOptions).then(function (geocodePostResponse) {
        weatherPostOptions.path = process.env.WEATHER_PATH + '?zip=' + request.body.text + '&units=imperial&APPID=' + process.env.WEATHER_API_TOKEN
        geocodeData = geocodePostResponse;
        return httpReq(weatherPostOptions);
    }).then(function (weatherPostResponse) {
        timezonePostOptions.path = process.env.TIMEZONE_PATH + '?location=' + geocodeData['results'][0]['geometry']['location']['lat'] + ',' + geocodeData['results'][0]['geometry']['location']['lng'] + '&timestamp=' + weatherPostResponse['dt'] + '&key=' + process.env.TIMEZONE_API_TOKEN
        weatherData = weatherPostResponse;
        return httpsReq(timezonePostOptions);
    }).then(function (timezonePostResponse) {
        slackPostOptions.path = slackPostOptions.path
        timezoneData = timezonePostResponse
        switch (weatherData['cod'].toString()) {
            case '404':
                res.send(weatherData['message']);
                break;
            case '200':
                responseData.formattedAddress = geocodeData['results'][0]['formatted_address']
                responseData.cityLat = weatherData['coord']['lat'];
                responseData.cityLon = weatherData['coord']['lon'];
                responseData.cityCountry = weatherData['sys']['country']
                responseData.cityID = weatherData['id'];

                responseData.currentTime = convertToTime(weatherData['dt'], timezonePostResponse.rawOffset, timezonePostResponse.dstOffset);

                responseData.weatherConditions = toTitleCase(weatherData['weather'][0]['description']);
                responseData.currentTemp = Math.round(weatherData['main']['temp']);
                responseData.lowTemp = Math.round(weatherData['main']['temp_min']);
                responseData.highTemp = Math.round(weatherData['main']['temp_max']);
                responseData.humidityPercentage = weatherData['main']['humidity'];
                responseData.atmosphericPressure = weatherData['main']['pressure']
                responseData.sunrise = weatherData['main']['sunrise']
                responseData.sunset = weatherData['main']['sunset']

                responseData.windSpeed = weatherData['wind']['speed'];
                responseData.windDirection = weatherData['wind']['deg']
                responseData.cloudPercentage = weatherData['clouds']['all'];

                botData.attachments.push(
                {
                    fallback: '' + request.body.user_name + '\'s weather data for ' + responseData.formattedAddress + ' (' + responseData.cityLat + ', ' + responseData.cityLon + ')',
                    pretext: '' + request.body.user_name + '\'s weather data for \n' + responseData.formattedAddress + ' (' + responseData.cityLat + ', ' + responseData.cityLon + ')',
                    title: 'Temp: ' + responseData.currentTemp + '\u00b0F (' + responseData.lowTemp + '\u00b0F / ' + responseData.highTemp + '\u00b0F)',
                    title_link: 'http://openweathermap.org/city/' + responseData.cityID,
                    text: ':weather-cloudy: ' + responseData.cloudPercentage + '%  |  :weather-humidity: ' + responseData.humidityPercentage + '%  |  :weather-barometer: ' + responseData.atmosphericPressure + ' hPa\n' + responseData.weatherConditions,
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
    response.send('');
});

function convertToTime(unixtime, rawOffset, dstOffset) {
    unixtime = Number(unixtime)
    rawOffset = Number(rawOffset)
    dstOffset = Number(dstOffset)
    localTime = unixtime + rawOffset + dstOffset

    var date = new Date(localTime * 1000);
    var meridian;
    var hour = date.getUTCHours();
    if (hour > 12) {
        hour = hour % 12;
        meridian = 'P';
    } else if (hour == 12) {
        meridian = 'P';
    } else {
        meridian = 'A';
    }
    var min = '0' + date.getUTCMinutes();
    var sec = '0' + date.getUTCSeconds();

    var mon = date.getUTCMonth() + 1;
    var day = date.getUTCDate();
    var yr = date.getUTCFullYear();
    return '(' + mon + '/' + day + '/' + yr + ') ' + hour + ':' + min.substr(-2) + ':' + sec.substr(-2) + ' ' + meridian + 'M';
};

function toTitleCase(str) {
    return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
};
