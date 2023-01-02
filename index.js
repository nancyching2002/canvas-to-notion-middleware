//To start server - script: npm run dev

//Requires:
const express = require('express')
const app = express()
const https = require('https');
var fs = require('fs'); 
const { Client } = require('@notionhq/client');

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

//Format for ejs file
app.set('view-engine','ejs')
app.use(express.urlencoded({ extended: false}))
//Connect to frontend ejs file
app.get("/", (req, res) => {
    res.render('home.ejs')
})
//Grabs values from form submitted on home.ejs
app.post('/', (req, res) => {
    getCanvas(req.body.canvas_token, req.body.notion_token, req.body.notion_link);
})

app.listen(5000, () => {console.log("(Server started on Port 5000)")})

//Activates when button submitted
//First connects to Canavs API; gets list of courses, parses through the course list to find curr courses
//Then posts those courses one by one to notion
function getCanvas(submitted_token, submitted_notion_token, submitted_notion_link){
    const token = submitted_token;
    const notion_token = submitted_notion_token;
    const notion_link = submitted_notion_link;

    var courses = []
    //GET Command
    var options = {
        'method': 'GET',
        'hostname': 'american.instructure.com',
        'path': '/api/v1/courses/?per_page=100',
        'headers': {
        'Authorization': 'Bearer '+token,
        },
        'maxRedirects': 20
        };
    //Console.log comments in terminal to confirm connection
    https.get(options, res => {
    let data = [];
    const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
    console.log('Status Code:', res.statusCode);
    if (res.statusCode != 200) {
        console.log('Error: Invalid Token');
        process.exit();
    }
    else {
    console.log('Date in Response header:', headerDate);
    res.on('data', chunk => {
        data.push(chunk);
    });

    res.on('end', () => {
        console.log('Response ended: ');
        const users = JSON.parse(Buffer.concat(data).toString());

        //Status code for enrollment term id = 137 is Fall2022 Enrollment
        const notion = new Client( {auth: notion_token} );

        for(user of users) {
            if (user.enrollment_term_id == 137) {
                console.log(`name: ${user.name}`);

                // POST request - place Canvas courses in database in Notion
                var options_notion= {
                    'method': 'POST',
                    'hostname': 'api.notion.com',
                    'path': '/v1/pages/',
                    'headers': {
                    'Authorization': notion_token,
                    'Content-Type': 'application/json',
                    'Notion-Version': '2022-06-28'
                    },
                    'maxRedirects': 20
                };
                var req = https.request(options_notion, function (res) {
                    var chunks = [];
                
                    res.on("data", function (chunk) {
                    chunks.push(chunk);
                    });
                
                    res.on("end", function (chunk) {
                    var body = Buffer.concat(chunks);
                    });
                
                    res.on("error", function (error) {
                    console.error(error);
                    });
                });
                //The text that POSTS to Notion database based on link
                var postData = JSON.stringify({
                    "parent": {
                    "database_id": notion_link
                    },
                    "properties": {
                    "Name": {
                        "title": [
                        {
                            "type": "text",
                            "text": {
                            "content": user.name
                            }
                        }
                        ]
                    }
                    }
                });
                req.write(postData);
                req.end();
                console.log("Sucessfully posted to Notion database!");
                courses.push(user.name);
            }
        }
}); }
    }).on('error', err => {
    console.log('Error: ', err.message);
    });
}




