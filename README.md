# MZC-Glassdoor-Scraper
Scrapes Megazone Cloud Glassdoor Interviews for sentiment analysis

How to run:
1. Clone the repo
2. In terminal: npm install @aws-sdk/client-s3 dotenv
3. In terminal: npm i playwright
4. In terminal: npx playwright install
5. In terminal: npx playwright install-deps
6. Add your environment secrets in the .env file
7. In terminal: node original_beat_cloudflare.js
8. Check your S3 bucket if it received the payload

You can also have the script save the scraped content in text files locally by un-commenting: fs.writeFileSync(filename, cleancontent); and commenting: await uploadToS3(cleancontent, filename);
