const  puppeteer = require('puppeteer');
var express = require('express')
var app = express();

app.get('/', async function (req, res) {
    const url = req.query.url;
    const data = await scrape(url);
    res.contentType = 'html';
    res.send(data);
});

async function scrape(shopUrl) {

    let browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      });
    let page = await browser.newPage();

    await page.goto(shopUrl, { waitUntil: 'networkidle2' });

    const frameHandle = await page.$('iframe[id="looxReviewsFrame"]');
    const frame = await frameHandle.contentFrame();

    let data = await frame.evaluate(async () => {

        for (let index = 0; index < 9; index++) {
            let button = document.getElementById('loadMore');
            if(button) {
                document.getElementById('loadMore').click();
                await delay(200);
            } else {
                break;
            }  
        }
        
        var reviews = document.getElementsByClassName('grid-item-wrap');
        var text = '<div>';

        for(var i=0; i<reviews.length; i++) {
            text += '<h4>'
            text += reviews[i].querySelector('.block.title').textContent
            text += '</h4>'
            text += '\r\n';
            text += '<p>'
            text += reviews[i].querySelector('.pre-wrap.main-text.action').textContent
            text += '</p>'
            text += '\r\n';
            const img = reviews[i].getElementsByClassName('item-img')[0];
            if(img) {
                const imgUrl = img.firstChild.src.replace('.jpg', '_mid.jpg');
                text += `<a href="${imgUrl}">${imgUrl}</a>`;
            }
            text += '\r\n';
            text += '</br>';
        }

        return text + '</div>';


        function delay(time) {
            return new Promise(function(resolve) { 
                setTimeout(resolve, time)
            });
        }

    });

    console.log(data);

    // debugger;

    await browser.close();

    return data;

};

let server = app.listen(process.env.PORT || 3000, function() {
    console.log('Server is listening on port ' + process.env.PORT || 3000)
});