const axios = require('axios');
const cheerio = require('cheerio');
const probe = require('probe-image-size');

const base = 'https://www.gocomics.com/calvinandhobbes/';
var today_url = '';

var NodeHelper = require("node_helper");
module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node helper: " + this.name);

    },

    socketNotificationReceived: function(notification, payload) {
        if(notification === "GET_COMIC") {
            console.log("Got notification to get the new comic");
            this.sendComic();
        }
    },

    fetchValidComicLinkForToday: function () {
        return new Promise(function (resolve, reject) {
            console.log("Creating comic link for today");
            var today = new Date();
            var year = today.getFullYear();
            var month = today.getMonth() + 1;
            month = (month < 10 ? '0' : '') + month;
            var date = (today.getDate() < 10 ? '0' : '') + today.getDate();
            today_url = base + year + '/' + month + '/' + date;
            console.log('Link for today: ' + today_url);
            resolve(today_url);
        });
    },

    getComicLink: function (html) {
    return new Promise(function (resolve, reject) {
        console.log("Trying to get comic link from meta tags");
        try {
            const $ = cheerio.load(html);

            // GoComics stellt das direkte Bild immer im Open Graph Meta-Tag bereit
            const comicUrl = $('meta[property="og:image"]').attr('content');

            console.log('Comic URL found: ' + comicUrl);

            if (comicUrl != null && comicUrl.trim() !== "") {
                resolve(comicUrl);
            } else {
                throw Error("Could not find the og:image metadata element");
            }
        } catch (e) {
            reject(e);
        }
    });
    },

    sendComicNotification: function (comicLink) {
        var comic = {};

        probe(comicLink)
        .then(result => {
            comic = result;
            comic.day = new Date().getDay();
        })
        .then( () => {
            console.log("Sending new comic");
            this.sendSocketNotification('COMIC', comic);
        });
    },

    sendComic: async function () {
        try {
            var url = await this.fetchValidComicLinkForToday();
            var html = await axios.get(url, {
                headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
	    });
            var comicUrl = await this.getComicLink(html.data);
            this.sendComicNotification(comicUrl);
        }
        catch (e) {
            console.error(e);
        }
    }
});
