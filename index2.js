const puppeteer = require('puppeteer');
const fetch = require('node-fetch');
(async () => {

    function KeywordMatcher(testee, keyword) {
        return testee.indexOf(keyword) > -1; 
    }
     
/*     let requestInterceptor = new RequestInterceptor(KeywordMatcher, console);
    let imageSpy = new RequestSpy('/pictures');
    requestInterceptor.addSpy(imageSpy); */

    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    let appsolveVersion = null;
    page.on('request', request => {
        if (request.url().startsWith('https://appsolve.io/assets/js/bundle.js')) {
            const url = new URL(request.url());
            appsolveVersion = url.searchParams.get('v');
        }
        request.continue();
    });
    await page.goto('https://themovermate.com/products/the-mover-mate', { waitUntil: 'networkidle0' });
    
    console.log(appsolveVersion);

    const scrapedData = await page.evaluate(() => {
        const firstItem = window.ShopifyAnalytics.meta.product.id;
        // const firstItem = document.getElementById('vitals-end-section');
        /* const author = firstItem.querySelector('.vtl-pr-review-card__review-author').textContent.trim();
        const date = firstItem.querySelector('.vtl-pr-review-card__review-date').textContent;
        const body = firstItem.querySelector('.vtl-pr-review-card__review-text').textContent;
        const img = firstItem.querySelector('img.vtl-pr-review-card__main-photo')?.getAttribute('src'); */
        // console.log(author, date, body, img);
        return firstItem;
    });

    console.log('scrapedData', scrapedData);

    // https://appsolve.io/api/reviews/1616519256/5878837706906.json

    console.log(`fetching https://appsolve.io/api/reviews/${appsolveVersion}/${scrapedData}.json`);
    fetch(`https://appsolve.io/api/reviews/${appsolveVersion}/${scrapedData}.json`)
        .then(res => res.json())
        .then(json => console.log(json));

    await page.close();
    await browser.close();

})();