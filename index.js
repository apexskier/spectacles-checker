const fetch = require('node-fetch');
const distanceInWordsToNow = require('date-fns/distance_in_words_to_now');
const addMilliseconds = require('date-fns/add_milliseconds');
const FormData = require('form-data');

const myLat = parseFloat(process.env.LAT);
const myLng = parseFloat(process.env.LNG);
const PUSH_TOKEN = process.env.PUSH_TOKEN;
const PUSH_USER_KEY = process.env.PUSH_USER_KEY;

function check() {
    return fetch('https://www.spectacles.com/locations')
        .then(r => r.json())
    // return Promise.resolve({
    //     countdown: 5071,
    //     coordinates: [{lat: 47.5, lng: -122.1}],
    // })
        .then(r => {
            let distance = null;
            let close = false;

            let message = '';
            let title;

            if (r.countdown > 0) {
                const arrivingIn = distanceInWordsToNow(addMilliseconds(new Date(), r.countdown));
                message = `A bot's dropping in ${arrivingIn}.\n`;
                title = "Snapbot coming";
            }

            const distances = r.coordinates.map(({lat, lng}) => latlngDiff([myLat, myLng], [lat, lng]) * 0.000621371);
            distances.sort((a, b) => a - b);
            distances.forEach(distance => {
                if (distance < 40) {
                    message += `It's close!! 😱 `;
                    title = "🚨 Snapbot landed close";
                } else {
                    title = "Snapbot landed";
                }
                message += `A bot dropped ${distance.toFixed(1)} miles away.\n`
            });

            if (message) {
                message += '\nhttps://spectacles.com/map';

                const form = new FormData();
                form.append('token', PUSH_TOKEN);
                form.append('user', PUSH_USER_KEY);
                form.append('message', message);
                form.append('title', title);
                return fetch('https://api.pushover.net/1/messages.json', {
                    method: 'POST',
                    body: form,
                })
                    .then(r => {
                        if (r.status !== 200) {
                            console.warn('push failed!');
                        }
                    })
                    .catch(err => console.warn('failed to push notification', err));
            }

            return r.countdown || -1;
        })
        .catch(err => console.warn('failed', err));
}

function checkLoop() {
    console.log('checking...');
    check()
        .then(time => {
            if (time > 0) {
                setTimeout(check, time - 120);
                setTimeout(checkLoop, time + 30);
            } else {
                setTimeout(checkLoop, 1000 * 60 * 60 * 4);
            }
        });
}
checkLoop();

function latlngDiff(coords1, coords2) {
    const [lat1, lng1] = coords1;
    const [lat2, lng2] = coords2;

    const R = 6371e3; // metres
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lng2 - lng1);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}

