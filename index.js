'use strict';

const myMap = L.map('mapid').setView([38.792458, -122.780053], 7);
const apiKey = "AIzaSyCZfD8CLRAVwxJXoLOKwM_hIFFEok4EVeE";
const searchURL = `https://www.googleapis.com/youtube/v3/search`;
const videoURL = 'https://www.googleapis.com/youtube/v3/videos';
let videos = [];


function start() {
    paintMap();
    watchForm();
}

function paintMap() {
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.satellite',
        accessToken: 'pk.eyJ1Ijoid3dlYmJ5MSIsImEiOiJjazI3dWs2dTEwdHFxM2lxaGJndjRpdzZiIn0.rlFiPrSydlJ-HY3K4cdTgw'
    }).addTo(myMap);

    myMap.locate({ setView: true, maxZoom: 7 });
    myMap.on('locationfound', onLocationFound);

    let fireIcon = L.icon({
        iconUrl: 'favicon.ico',
    });

    function onLocationFound(e) {
        L.marker(e.latlng).addTo(myMap).bindPopup(`<h1>You are here</h1>`);
    }

    let firemarker = L.marker([38.792458, -122.780053], { icon: fireIcon }).bindPopup(`<iframe width=\"480\" height=\"270\" src=\"//www.youtube.com/embed/Nz0YQOIktk4\" frameborder=\"0\" allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\" allowfullscreen></iframe>`);
    firemarker.addTo(myMap);
}

function watchForm() {
    $(".chosen-select").chosen({
        no_results_text: "Oops, nothing found!",
        width: "95%"
    });
    $('form').submit(event => {
        event.preventDefault();
        let search_terms = $('#select').val().join(',');
        console.log(search_terms);
        let max = $('#max').val();
        console.log(max);
        fetchVideos(search_terms, max);
    });
}

async function fetchVideos(search_terms, max = 3) {

    const params = {
        key: apiKey,
        q: search_terms,
        maxResults: max,
        part: "snippet",
        type: 'video',
        location: '38.792458, -122.780053',
        locationRadius: '300mi'
    }
    const queryString = formatQueryParams(params)
    const url = searchURL + '?' + queryString;

    try {
        const resp = await fetch(url);
        let resp_json = await resp.json();
        buildVideoArray(resp_json);
    } catch {
        throw new Error(response.statusText);
    }
}

function formatQueryParams(params) {
    const queryItems = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    return queryItems.join('&');
}

async function buildVideoArray(resp_json) {
    let video_items = resp_json.items;
    video_items.forEach(function(element) {
        //make a new object with videoId as first property
        let video = {
            videoId: `${element.id.videoId}`
        };
        videos.push(video)
    });
    await addLat(videos);
    await addLong(videos);
    await addEmbedHtml(videos);
    displayVideos(videos);
}

async function fetchLat(video_id) {
    const params = {
        part: "recordingDetails",
        key: apiKey,
        id: video_id
    }

    const queryString = formatQueryParams(params);
    const url = videoURL + '?' + queryString;

    try {
        const resp = await fetch(url);
        let resp_json = await resp.json();
        let lat = await resp_json.items[0].recordingDetails.location.latitude;
        return lat;
    } catch (err) {
        $('#js-error-message').text(`Something went wrong: ${err.message}`);
    }

}

async function fetchLong(video_id) {
    const params = {
        part: "recordingDetails",
        key: apiKey,
        id: video_id
    }

    const queryString = formatQueryParams(params);
    const url = videoURL + '?' + queryString;

    try {
        const resp = await fetch(url);
        let resp_json = await resp.json();
        let long = await resp_json.items[0].recordingDetails.location.longitude;
        return long;
    } catch (err) {
        $('#js-error-message').text(`Something went wrong: ${err.message}`);
    }
}

async function fetchEmbedHtml(video_id) {
    const params = {
        part: "player",
        key: apiKey,
        id: video_id
    }
    const queryString = formatQueryParams(params)
    const url = videoURL + '?' + queryString;

    try {
        const resp = await fetch(url);
        let resp_json = await resp.json();
        let embed_html = await resp_json.items[0].player.embedHtml;
        return embed_html;
    } catch (err) {
        $('#js-error-message').text(`Something went wrong: ${err.message}`);
    }
}

async function addLat(videos) {
    for (let i = 0; i < videos.length; i++) {
        videos[i].lat = await fetchLat(videos[i].videoId);
    }
}

async function addLong(videos) {
    for (let i = 0; i < videos.length; i++) {
        videos[i].long = await fetchLong(videos[i].videoId);
    }
}

async function addEmbedHtml(videos) {
    for (let i = 0; i < videos.length; i++) {
        videos[i].embed_html = await fetchEmbedHtml(videos[i].videoId);
    }
}

function displayVideos(videos) {
    console.log(videos);
    $('#results-list').empty();
    for (let i = 0; i < videos.length; i++) {
        $('#results-list').append(`<li>${videos[i].embed_html}<li>`);
    }
    mapVideos(videos);
}

function mapVideos(videos) {
    console.log('mapVideos ran');
    let myIcon = L.icon({
        iconUrl: 'favicon.ico',
    });
    for (let i = 0; i < videos.length; i++) {
        let lat = videos[i].lat;
        let long = videos[i].long;
        let firemarker = L.marker([lat, long], { icon: myIcon }).bindPopup(`${videos[i].embed_html}`);
        firemarker.addTo(myMap);
    }
}

$(start);