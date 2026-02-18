require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');
const {S3Client, PutObjectCommand}  = require('@aws-sdk/client-s3')

const firstUrl = 'https://www.glassdoor.com/Interview/Megazone-Cloud-Interview-Questions-E3045036.htm'
const urlPageVer = 'https://www.glassdoor.com/Interview/Megazone-Cloud-Interview-Questions-E3045036'
const urlNum = 0;

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
})
async function uploadToS3(data, filename){
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `scrape/${filename}`,
    Body: JSON.stringify(data),
    ContentType: 'application/json'
  };
  try {
    await s3.send(new PutObjectCommand(params));
    console.log(`Successfully uploaded ${filename} to S3`);
  }catch (err){
    console.error("S3 Upload Error:", err);
  }
}
(async () => {
  // Launch a fresh browser instance for each URL
  const browser = await chromium.launch({ 
    headless: false
  });
  let urlNum = 0;
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

    const page = await context.newPage();
  // Get the page amount dynamically
  try {
    await page.goto(firstUrl, {waitUntl:'domcontentloaded', timeout: 6000});
    await page.waitForTimeout(6000);
      urlNum = await page.evaluate(() => {
        const element = document.querySelector('div[class^="PaginationContainer_paginationContainer"]');
        if (element){ 
          let pageArr = element.innerText.split('\n').map(item => item.trim());
          let pageString = pageArr[pageArr.length - 1];
          let pageAmountArr = pageString.split(' ').map(item => item.trim());
          let pageAmountNum = parseInt(pageAmountArr[5].replaceAll(',', ''));
          return Math.ceil(pageAmountNum/5);
        } else {
          console.log("Element not Found");
          return 1;
        }
     });
     console.log(`Total pages: ${urlNum}`);
  } catch (err) {
      console.error(`An error occurred on ${firstUrl}:`, err);
  } finally {
    // Close this browser instance
    await browser.close();
  }
  for (let i = 0; i < urlNum; i++) {
    const url = `${urlPageVer}${i > 0 ? `_P${i + 1}` : ''}.htm`;
    console.log(`\nProcessing URL ${i + 1}/${urlNum}: ${url}`);

    // Launch a fresh browser instance for each URL
    const browser = await chromium.launch({ 
      headless: false
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
      // Navigate and wait until the network is quiet
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 6000
      });
    
      // Wait 2 seconds just to let the dynamic overlays appear
      await page.waitForTimeout(6000);

      // Inject your cleanup logic
      await page.evaluate(() => {
        const addGlobalStyle = (css) => {
          const head = document.head || document.getElementsByTagName('head')[0];
          const style = document.createElement('style');
          style.type = 'text/css';
          style.appendChild(document.createTextNode(css));
          head.appendChild(style);
        };

        addGlobalStyle("#HardsellOverlay {display:none !important;}");
        addGlobalStyle("body {overflow:auto !important; position: initial !important}");
        
        // Stop the events that trigger the login popups
        window.addEventListener("scroll", event => event.stopPropagation(), true);
        window.addEventListener("mousemove", event => event.stopPropagation(), true);

        // Remove the specific elements you found
        const elements = document.querySelectorAll('.WM9O1Ta4u2kn5dVL1Pdj');
        elements.forEach(el => el.remove());
      });

      console.log("Cleanup script executed successfully.");
      
      // Scrape the data
      const content = await page.innerText('body');
      let newcontent = content.replaceAll('\n', ' ').replaceAll('\t', ' ').replaceAll('  ', ' ');
      newcontent = newcontent.replaceAll('Skip to content Skip to footer Community Jobs Companies Salaries For Employers Search Sign In Elevate your career Discover your earning potential, land dream jobs, and share work-life insights anonymously. Sign in / Register Want the inside scoop on your own company? Check out your Company Bowl for anonymous work chats. Bowls Get actionable career advice tailored to you by joining more bowls. Explore more bowls Followed companies Stay ahead in opportunities and insider tips by following your dream companies. Search for companies Saved jobs Get personalized job recommendations and updates by starting your searches. Search jobs Megazone Cloud Is this your company? Add an interview Follow About Reviews Pay & benefits Jobs Interviews Get smarter for your next interview Unlock tailored insights about interviewing at Megazone Cloud, so you can prepare with confidence. Upload resume Megazone Cloud interview questions ', '');
      const cleancontent = newcontent.replaceAll('Top companies for "Compensation and Benefits" near you IBM 3.6 Compensation & Benefits GE 3.8 Compensation & Benefits Amazon 3.7 Compensation & Benefits The Home Depot 3.5 Compensation & Benefits Related searches: Megazone Cloud reviews | Megazone Cloud jobs | Megazone Cloud salaries | Megazone Cloud benefits Interviews Megazone Cloud interviews Glassdoor has millions of jobs plus salary information, company reviews, and interview questions from people on the inside making it easy to find a job that’s right for you. Glassdoor About / Press Awards Blog Research Contact Us Guides Employers Get a Free Employer Account Employer Center Information Help Guidelines Terms of Use Privacy & Ad Choices Do Not Sell Or Share My Information Cookie Consent Tool Security Work With Us Advertisers Careers Download the App android icon, opens in new window apple icon, opens in new window glassdoor icon facebook icon, opens in new window twitter icon, opens in new window youtube icon, opens in new window instagram icon, opens in new window tiktok icon, opens in new window United States Browse by: Companies Jobs Locations Communities Recent Posts Copyright © 2008-2026. Glassdoor LLC. \"Glassdoor,\" \"Worklife Pro,\" \"Bowls,\" and logo are proprietary trademarks of Glassdoor LLC.', '');
      //const newcontent = content.replaceAll('Skip to content\nSkip to footer\nCommunity\nJobs\nCompanies\nSalaries\nFor Employers\nSearch\nSign In\n\nElevate your career\n\nDiscover your earning potential, land dream jobs, and share work-life insights anonymously.\n\nSign in / Register\nWant the inside scoop on your own company?\nCheck out your Company Bowl for anonymous work chats.\nBowls\n\nGet actionable career advice tailored to you by joining more bowls.\n\nExplore more bowls\nFollowed companies\n\nStay ahead in opportunities and insider tips by following your dream companies.\n\nSearch for companies\nSaved jobs\n\nGet personalized job recommendations and updates by starting your searches.\n\nSearch jobs\n\nMegazone Cloud\n\nIs this your company?\n\nAdd an interview\nFollow\nAbout\nReviews\nPay & benefits\nJobs\nInterviews\nGet smarter for your next interview\n\nUnlock tailored insights about interviewing at Megazone Cloud, so you can prepare with confidence.\n\nUpload resume', '');
      // Save to file
      const filename = `glassdoor_page_${i + 1}.txt`;
      await uploadToS3(cleancontent, filename);
      //fs.writeFileSync(filename, cleancontent);
      //console.log(`Content saved to ${filename} (${cleancontent.length} characters)`);

    } catch (err) {
      console.error(`An error occurred on ${url}:`, err);
    } finally {
      // Close this browser instance
      await browser.close();
    }

    // Wait 10 seconds before next URL (except after the last one)
    /*if (i < urlNum - 1) {
      console.log('Waiting 10 seconds before next URL...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }*/
  }

  console.log('\nAll URLs processed!');
})();