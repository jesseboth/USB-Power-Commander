const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { spawn } = require('child_process');
const port = process.env.PORT || 8888;

// Template for the return objects
const postReturn = {
    success: false,
    return: undefined,
    error: undefined,
}

const EventEmitter = require('events');
const { DefaultDeserializer } = require('v8');
const { error } = require('console');
class Emitter extends EventEmitter { };
const myEmitter = new Emitter();
const serveFile = async (filePath, contentType, response) => {
    try {
        const rawData = await fsPromises.readFile(
            filePath,
            !contentType.includes('image') ? 'utf8' : ''
        );
        const data = contentType === 'application/json'
            ? JSON.parse(rawData) : rawData;
        response.writeHead(
            filePath.includes('404.html') ? 404 : 200,
            { 'Content-Type': contentType }
        );
        response.end(
            contentType === 'application/json' ? JSON.stringify(data) : data
        );
    } catch (err) {
        console.error(err);
        myEmitter.emit('log', `${err.name}: ${err.message}`, 'errLog.txt');
        response.statusCode = 500;
        response.end();
    }
}

const server = http.createServer((req, res) =>  {
    myEmitter.emit('log', `${req.url}\t${req.method}`, 'reqLog.txt');

    const extension = path.extname(req.url);

    let contentType;

    // is this needed?
    if (req.url === '/config' && req.method === 'POST') {
        retJson = JSON.parse(JSON.stringify(postReturn));

        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString(); // convert Buffer to string
        });

        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                retJson.success = true;

                let x = 0;
                if (data.hasOwnProperty("ports")) { retJson["ports"] = reqPorts(data.ports); delete data.ports;}
                if (data.hasOwnProperty("portNameChange")) { retJson["portNameChange"] = reqPortNameChange(data.portNameChange); delete data.portNameChange;}


                // Handle invalid data
                if (Object.keys(data).length > 0) {
                    retJson.success = false;
                    retJson.error = "Invalid data: " + Object.keys(data).map(key => `${key}: ${data[key]}`).join(", ");
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(retJson));

            } catch (error) {
                console.error('Error parsing JSON:', error);
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid JSON');
            }
        });

        return;
    }

    switch (extension) {
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.jpg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.txt':
            contentType = 'text/plain';
            break;
        case '.otf':
            contentType = 'application/x-font-opentype';
            break;
        default:
            contentType = 'text/html';
    }

    let filePath =
        contentType === 'text/html' && req.url === '/'
            ? path.join(__dirname, 'views', 'index.html')
            : contentType === 'text/html' && req.url.slice(-1) === '/'
                ? path.join(__dirname, 'views', req.url, 'index.html')
                : contentType === 'text/html'
                    ? path.join(__dirname, 'views', req.url)
                    : path.join(__dirname, req.url);

    // makes .html extension not required in the browser
    if (!extension && req.url.slice(-1) !== '/') filePath += '.html';

    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
        serveFile(filePath, contentType, res);
    } else {
        switch (path.parse(filePath).base) {
            case 'old-page.html':
                res.writeHead(301, { 'Location': '/new-page.html' });
                res.end();
                break;
            case 'www-page.html':
                res.writeHead(301, { 'Location': '/' });
                res.end();
                break;
            default:
                serveFile(path.join(__dirname, 'views', '404.html'), 'text/html', res);
        }
    }
});
const PORT = process.env.PORT || port;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Function to read and parse the JSON file
const getJsonData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading or parsing file: ${err}`);
        return null;
    }
};

const config = getJsonData('data/config.json');

function reqPorts(ports) {
    retVal = JSON.parse(JSON.stringify(postReturn));

    // json structure
    // retVal.return {
    //     "0": {
    //         "Name": "Port 1",
    //         "state": "0"
    //     },
    //     ...
    // }
}

function reqPortNameChange(portNameChange) {
    // input json structure
    // {
    //     "0": "New Name"
    // }

    retVal = JSON.parse(JSON.stringify(postReturn));


    retVal.success = true;
    return retVal;
}