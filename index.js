const puppeteer = require('puppeteer');
const ObjectsToCsv = require('objects-to-csv');
const express = require('express')
const app = express();

app.get('/html', async function (req, res) {
    const url = req.query.url;
    const data = await scrape(url);
    res.contentType = 'html';
    res.send(reviewsToHtml(data));
});

app.get('/csv', async function (req, res) {
    const url = req.query.url;
    const productHandle = req.query.productHandle;
    const data = await scrape(url);
    res.contentType = 'text/csv';
    res.attachment('export.csv');
    res.send(await reviewsToCsv(data, productHandle));
});

function reviewsToHtml(reviews) {
    let text = '<div>';
    text += '<p>num of reviews: ' + reviews.length + '</p>'; 

    reviews.forEach(review => {
        text += '<h4>';
        text += review.author;
        text += '</h4>';
        text += '\r\n';
        text += '<p>';
        text += review.body
        text += '</p>'
        text += '\r\n';
        text += review.imageUrl ? `<a href="${review.imageUrl}">${review.imageUrl}</a>` : '';
        text += '\r\n';
        text += '</br>';
    });

    return text + '</div>';
}

async function reviewsToCsv(reviews, productHandle) {
    reviews = reviews.map(review => ({...review, product_handle: productHandle}));
    const csv = new ObjectsToCsv(reviews);
    return await csv.toString(true, false);
}

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

        class Review {
            constructor(author, body, imageUrl, rating, product_handle ) {
              this.author = author;
              this.body = body;
              this.imageUrl = imageUrl;
              this.rating = rating;
              this.product_handle = product_handle;
        
            }
        }

        let button = document.getElementById('loadMore');
        const dataUrl = button.getAttribute('data-url');
        const dataUrlParams = new URLSearchParams(dataUrl);
        const numOfReviews = parseInt(dataUrlParams.get('total'));
        const reviewsPerClick = 5;
        const numOfPages = Math.floor(numOfReviews / reviewsPerClick);
        const maxClicksPerPage = 10;
        const rawReviews = Array.from(document.getElementsByClassName('grid-item-wrap'));

        for (let index = 0; index < numOfPages; index++) {
            if(button.getAttribute('style') !== 'display: none;') {
                document.getElementById('loadMore').click();
                await delay(1000);
                rawReviews.push(...Array.from(document.getElementsByClassName('grid-item-wrap')));
            }
        }

        return parseReviews(rawReviews);

        function parseReviews(rawReviews) {
            const duplicateReviews = Array.from(rawReviews).map(rawReview => {
                const img = rawReview.getElementsByClassName('item-img')[0];
                return new Review(
                    rawReview.querySelector('.block.title').textContent,
                    rawReview.querySelector('.pre-wrap.main-text.action').textContent,
                    img ? img.firstChild.src.replace('.jpg', '_mid.jpg') : null
                );
            });

            const uniqueReviews = duplicateReviews.filter((v,i,a)=>a.findIndex(t=>(t.author === v.author))===i);
            return uniqueReviews;

        }

        function delay(time) {
            return new Promise(function(resolve) { 
                setTimeout(resolve, time)
            });
        }

    });

    await browser.close();

    return data;

};

let server = app.listen(process.env.PORT || 3000, function() {
    console.log('Server is listening on port ' + process.env.PORT || 3000)
});