'use strict';

const myMap = L.map('mapid').setView([38.792458, -122.780053], 7);
const apiKey = "AIzaSyDO1s4feAKvoD59SHzKZk30gLG6mRZYVT4";
const accessToken = 'pk.eyJ1Ijoid3dlYmJ5MSIsImEiOiJja29tMXF6aXowM2hkMnVwbDM3ano1MWowIn0.pgOwNUc7CwQNmO6eoi4PcQ';
const searchURL = 'https://www.googleapis.com/youtube/v3/search';
const videoURL = 'https://www.googleapis.com/youtube/v3/videos';
let videos = [];


function start() {
    swal("Wildfire Video Mapper", "7 of the 10 most destructive fires in California history have happened since 2015. Use this tool to search for wildfire footage mapped to the location in which it was shot. Click a fire icon to see the footage. Warning: Some of it is harrowing.", "warning");
    paintMap();
    watchForm();
    $('#myBar').hide();
}

function paintMap() {
    L.tileLayer(`https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=${accessToken}`, {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: `${accessToken}`
    }).addTo(myMap);

    /*pre-load map with one Kincade Fire marker & video*/
    let fireIcon = L.icon({
        iconUrl: 'fireicon.ico',
    });

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
        let max = $('#max').val();
        fetchVideos(search_terms, max);
        $('#myBar').show();
        $('#myBar').text('Loading....');
        updateProgress();
    });
}

function updateProgress() {
    let elem = document.getElementById('myBar');
    let width = 1;
    let id = setInterval(frame, 100);

    function frame() {
        if (width >= 100) {
            clearInterval(id);
            $('#myBar').text('Ready');
        } else {
            width++;
            elem.style.width = width + '%';
        }
    }
}

async function fetchVideos(search_terms, max = 3) {
    const params = {
        key: apiKey,
        q: search_terms,
        maxResults: max,
        part: "snippet",
        type: 'video',
        /*find youtube videos within a 300mi radius of the Kincade Fire
        will return only videos that actually have a lat and long*/
        location: '38.792458, -122.780053',
        locationRadius: '300mi'
    }
    const queryString = formatQueryParams(params)
    const url = searchURL + '?' + queryString;
    let resp
    try {
        resp = await fetch(url);
        let resp_json = await resp.json();
        /*take the response and use it to build an array of video objects*/
        //buildVideoArray(resp_json);
        resp_json.items.map(console.dir);
    } catch {
        console.error(resp.statusText);
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
        /*make a new object with videoId as first property*/
        let video = {
            videoId: `${element.id.videoId}`
        };
        /*push onto the videos array*/
        videos.push(video)
    });
    /*add more properties to each video object in the videos array*/
    await addLat(videos);
    await addLong(videos);
    await addEmbedHtml(videos);
    /*display and map the videos*/
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

async function fetchLocation(video_id) {
    const params = {
        part: "recordingDetails,player",
        key: apiKey,
        id: video_id
    }

    const queryString = formatQueryParams(params);
    const url = videoURL + '?' + queryString;

    try {
        const resp = await fetch(url);
        let resp_json = await resp.json();
        return await resp_json.items[0].recordingDetails.location;
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
    $('#results-list').empty();
    for (let i = 0; i < videos.length; i++) {
        $('#results-list').append(`<li>${videos[i].embed_html}<li>`);
    }
    mapVideos(videos);
}

function mapVideos(videos) {
    let myIcon = L.icon({
        iconUrl: 'fireicon.ico',
    });
    for (let i = 0; i < videos.length; i++) {
        let lat = videos[i].lat;
        let long = videos[i].long;
        let firemarker = L.marker([lat, long], { icon: myIcon }).bindPopup(`${videos[i].embed_html}`);
        firemarker.addTo(myMap);
    }
    myMap.setZoom(9);
}

$(start);