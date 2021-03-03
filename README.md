# shopify-thief
## a little shopify comment plugin crawler API

## description

If the Shopify webpage uses https://loox.app/ for the reviews, this crawler can iterate through all the comments and export them as an HTML or a CSV file in a format which can be imported by VITALS plugin.

It grabs author, body, image URL from the reviews.

You can use 2 GET endpoints:
### /html?url=https://www.your-shopify-page.com/products/product-you-want-to-crawl-the-reviews-from
This will give you an HTML formatted output. Just to see what is being crawled

### /csv?productHandle=your-product-handle&url=https://www.your-shopify-page.com/products/product-you-want-to-crawl-the-reviews-from

**URL parameters:**
- `productHandle` - the importer needs `product_handle` for the product identification. If your product's URL is https://yourshop.myshopify.com/products/awesome-product, then **awesome-product** is the handle.
- `url` - URL of the product

It will automatically download a CSV file.
This CSV can be imported to your shopify. More details [here](https://www.notion.so/How-to-Import-Product-Reviews-from-a-CSV-file-c8a96b601ad044eea968b317e33c097d).

Both endpoints will translate the review comments into German.