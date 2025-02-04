'use strict';


const api_key = 'a1e437f79628464c9ea8d542db6f6e94'; //Funny free api

const map = L.map('map').setView([60.1785553, 24.8786212], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
let previous_line = [];  

const api_routing = 'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql';
const api_address_lookup = 'https://api.digitransit.fi/geocoding/v1/search';    

const form = document.querySelector("#form");

const THREE_HOURS = 1000 * 60 * 60 * 3;


function to_date(seconds) {
    let time = new Date(1970, 0, 1);

    time.setUTCMilliseconds(seconds + THREE_HOURS);
    return time;
}

function get_route(origin, des) {
    console.log(origin.latitude);
    console.log(origin.longitude);
    console.log(des.latitude);
    console.log(des.longitude);
    const GQLQuery = `{
        plan(
            from: {lat: ${origin.latitude}, lon: ${origin.longitude} }
            to: {lat: ${des.latitude}, lon: ${des.longitude} }
            numItineraries: 3
        )
        {
            itineraries {
                legs {
                    startTime
                    endTime
                    mode
                    distance
                    legGeometry  {
                        points
                    }
                }
            }
        }
    }`;

    const fetchOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'digitransit-subscription-key': api_key,
        },
        body: JSON.stringify({ query: GQLQuery }),
    }

    fetch(api_routing, fetchOptions).then(function (response) {
        return response.json();
    }).then(function (result) {

        // Remove previous search on the map or else there'll be
        // multiple paths
        for (let i = previous_line.length - 1; i >= 0; i--)  { 
            previous_line[i].removeFrom(map);
            previous_line.pop();
        }

        const cur_route = result.data.plan.itineraries[0].legs;
        let start_time = cur_route[0].startTime;
        let end_time = cur_route[0].endTime;
        let total_distance = 0;
        for (let i = 0; i < cur_route.length; i++) {
            end_time = cur_route[i].endTime;    
            total_distance += cur_route[i].distance;
            let color = '';

            //Respectfully, stolen this color-coded modes from the given Examples 

            switch (cur_route[i].mode) {
                case 'WALK':
                    color = 'green';
                    break;
                case 'BUS':
                    color = 'red';
                    break;
                case 'RAIL':
                    color = 'cyan'
                    break;
                case 'TRAM':
                    color = 'magenta'
                    break;
                default:
                    color = 'blue';
                    break;
            }
            const route = (cur_route[i].legGeometry.points);
            const pointObjects = L.Polyline.fromEncoded(route).getLatLngs(); // fromEncoded: convert Google encoding to Leaflet polylines
            let element = L.polyline(pointObjects).setStyle({
                color
            }).addTo(map);
            previous_line.push(element);
        }
        map.fitBounds([[origin.latitude, origin.longitude], [des.latitude, des.longitude]]);

        start_time = to_date(start_time);
        end_time = to_date(end_time);

        console.log(cur_route);
        console.log(`Start time: ${start_time}\nEnd time: ${end_time}`);

        const output = document.querySelector("#target-output");

        /* OUTPUTTING THE ROUTE TO USER */
        output.innerHTML = '';

        let h3 = document.createElement("ul");
        let start_text = document.createElement('li');
        start_text.innerText = `Start time: ${start_time}`;
        h3.appendChild(start_text);

        let end_text = document.createElement('li');
        end_text.innerText = `End time: ${end_time}`;
        h3.appendChild(end_text);

        let distance_text = document.createElement('li');
        total_distance = Math.round(total_distance/10)/100
        distance_text.innerText = `Total distance: ${total_distance}km`;
        h3.appendChild(distance_text);

        output.appendChild(h3);



    }).catch(function (e) {
        console.error(e.message);
    });
}


form.addEventListener('submit', async (evt) => {
    evt.preventDefault();

    let address = document.querySelector("#target").value;
    address = encodeURIComponent(address);

    const search = api_address_lookup + `?text=${address}&digitransit-subscription-key=${api_key}`;

    let add_coords = await fetch(search).then(function (response) {
        return response.json();
    })
    
    add_coords = add_coords.features[0].geometry.coordinates;
    console.log(add_coords[0], add_coords[1]);

    let start_lat = add_coords[1];
    let start_long = add_coords[0];

    //The latter coordinates is the school's address.
    get_route({ latitude: start_lat, longitude: start_long}, { latitude: 60.2241122, longitude: 24.7565199 });
})