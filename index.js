const puppeteer = require('puppeteer');
const ObjectsToCsv = require('objects-to-csv');
const translate = require('@vitalets/google-translate-api');
const express = require('express');
const app = express();

app.get('/html', async function (req, res) {
    const url = req.query.url;
    const reviews = await scrape(url);
    res.contentType = 'html';
    await translateReviews(reviews);
    res.send(reviewsToHtml(reviews));
});

app.get('/csv', async function (req, res) {
    const url = req.query.url;
    const productHandle = req.query.productHandle;
    const reviews = await scrape(url);
    await translateReviews(reviews);
    res.contentType = 'text/csv';
    res.attachment('export.csv');
    res.send(await reviewsToCsv(reviews, productHandle));
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
        text += review.original_body
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

async function translateReviews(reviews) {
    return Promise.all(reviews.map(review => translateReview(review)));
}

async function translateReview(review) {
    return translate(
        review.body,
        {
            from: 'en',
            to: 'de'
        }
    ).then(res => {
        review.body = res.text;
    }).catch(err => {
        console.error(err);
    });
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
            constructor(author, body, original_body, imageUrl, rating, product_handle ) {
              this.author = author;
              this.body = body;
              this.original_body = original_body;
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
        const rawReviews = Array.from(document.getElementsByClassName('grid-item-wrap'));

        for (let index = 0; index < numOfPages; index++) {
            if(button.getAttribute('style') !== 'display: none;') {
                document.getElementById('loadMore').click();
                await delay(500);
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
                    rawReview.querySelector('.pre-wrap.main-text.action').textContent,
                    img ? img.firstChild.src.replace('.jpg', '_mid.jpg') : null,
                    5
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