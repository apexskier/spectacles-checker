const fetch = require('node-fetch');
const distanceInWordsToNow = require('date-fns/distance_in_words_to_now');
const addSeconds = require('date-fns/add_seconds');
const FormData = require('form-data');

const myLat = parseFloat(process.env.LAT);
const myLng = parseFloat(process.env.LNG);
const PUSH_TOKEN = process.env.PUSH_TOKEN;
const PUSH_USER_KEY = process.env.PUSH_USER_KEY;

function check() {
    return fetch('https://www.spectacles.com/locations')
        .then(r => r.json())
    // Promise.resolve({
    //     countdown: 5071,
    //     coordinates: [47.5, -122.1],
    // })
        .then(r => {
            let distance = null;
            let close = false;
            let arrivingIn = null;

            const [lat, lng] = r.coordinates
            if (lat && lng) {
                distance = latlngDiff([myLat, myLng], [lat, lng]) * 0.000621371;

                if (distance < 40) {
                    close = true;
                }
            }

            if (r.countdown > 0) {
                // assuming seconds
                arrivingIn = distanceInWordsToNow(addSeconds(new Date(), r.countdown));
            }

            let message = '';
            let title;
            if (r.countdown) {
                message += `A bot's dropping in ${arrivingIn}.`;
                title = "Snapbot coming";
                if (distance) {
                    message += ' ';
                }
            }
            if (distance) {
                if (close) {
                    message += `It's close!! 😱`;
                }
                message += `A bot dropped ${distance.toFixed(1)} miles away.
    https://spectacles.com/map`
                if (close) {
                    title = "🚨 Snapbot landed close";
                } else {
                    title = "Snapbot landed";
                }
            }

            if (message) {
                const form = new FormData();
                form.append('token', PUSH_TOKEN);
                form.append('user', PUSH_USER_KEY);
                form.append('message', message);
                form.append('message', message);
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
                setTimeout(checkLoop, 1000 * 60 * 60 * 8);
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

