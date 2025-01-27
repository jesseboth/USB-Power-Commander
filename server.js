const http = require('http');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const port = process.env.PORT || 8888;
const deploy = process.env.DEPLOY || false;
const debugCheck = process.env.DEBUG || false;
const exec = require('child_process').exec;

// Template for the return objects
const postReturn = {
    success: false,
    return: undefined,
    error: undefined,
}

const EventEmitter = require('events');
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
                if (data.hasOwnProperty("portNames")) { retJson["portNames"] = reqPortNames(data.portNames); delete data.portNames;}
                if (data.hasOwnProperty("hostNames")) { retJson["hostNames"] = reqHostNames(data.hostNames); delete data.hostNames;}


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

const writeJsonData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (err) {
        console.error(`Error writing file: ${err}`);
    }
}

let piGpioInitOnce = false;
let piGpioSetOnce = false;

const host = getJsonData('data/host.json');
const config = getJsonData('data/config.json');
const gpio = getJsonData('data/hardware.json');
const status = {};
if(deploy){
    piGpioInit().then(() => {
        for (const key in gpio) {
            status[key] = getJsonData(`data/ports/${key}`);
            piGpioSet(key, status[key].enable, status[key].select);
        }
    }).catch(error => {
        console.error("Initialization failed:", error);
    });
} else {
    for (const key in gpio) {
        status[key] = getJsonData(`data/ports/${key}`);
    }
}

function reqPorts(ports) {
    retVal = JSON.parse(JSON.stringify(postReturn));
    retVal.return = {}

    
    if (ports.hasOwnProperty("get")) {
        debug("Getting ports");
        if(ports.get.length == undefined){
            for (key in gpio) {
                retVal.return[key] = {
                    "enable": status[key].enable,
                    "select": status[key].select
                }
            }
        }
        else {
            for (key in ports.get) {
                if (gpio.hasOwnProperty(key)) {
                    retVal.return[key] = {
                        "enable": status[key].enable,
                        "select": status[key].select
                    }
                }
            }
        }
    }
    else if (ports.hasOwnProperty("set")) {
        for (key in ports.set) {
            if (gpio.hasOwnProperty(key)) {
                if (ports.set[key].hasOwnProperty("enable")) {
                    status[key].enable = ports.set[key].enable;
                }
                if (ports.set[key].hasOwnProperty("select")) {
                    status[key].select = ports.set[key].select;
                }

                piGpioSet(key, status[key].enable, status[key].select);
            }

            writeJsonData(`data/ports/${key}`, status[key]);
        }
    }
    else {
        retVal.success = false;
        retVal.error = "Invalid data: " + Object.keys(ports).map(key => `${key}: ${ports[key]}`).join(", ");
        return retVal;
    }

    retVal.success = true;
    return retVal;
}

function reqPortNames(ports) {
    retVal = JSON.parse(JSON.stringify(postReturn));
    retVal.return = {}

    
    if (ports.hasOwnProperty("get")) {
        debug("Getting port names");
        if(ports.get.length == undefined){
            for (key in gpio) {
                retVal.return[key] = {
                    "name": config[key].name,
                }
            }
        }
        else {
            for (key in ports.get) {
                if (gpio.hasOwnProperty(key)) {
                    retVal.return[key] = {
                        "name": config[key].name,
                    }
                }
            }
        }
    }
    else if (ports.hasOwnProperty("set")) {
        for (key in ports.set) {
            if (gpio.hasOwnProperty(key)) {
                debug("Setting port", key, "to:", ports.set[key]);
                if(ports.set[key].split(" ").length > 1 || ports.set[key].split("\t").length > 1){
                    retVal.success = false;
                    retVal.error = "Name cannot contain spaces or tabs";
                    return retVal;
                }
                config[key].name = ports.set[key];
            }
        }

        writeJsonData('data/config.json', config);
    }
    else {
        retVal.success = false;
        retVal.error = "Invalid data: " + Object.keys(ports).map(key => `${key}: ${ports[key]}`).join(", ");
        return retVal;
    }

    retVal.success = true;
    return retVal;
}

function reqHostNames(hosts) {
    retVal = JSON.parse(JSON.stringify(postReturn));
    retVal.return = {}

    if (hosts.hasOwnProperty("get")) {
        debug("Getting host names");
        if(hosts.get.length == undefined){
            for (key in host) {
                retVal.return[key] = {
                    "name": host[key].name,
                }
            }
        }
        else {
            for (key in hosts.get) {
                if (host.hasOwnProperty(key)) {
                    retVal.return[key] = {
                        "name": host[key].name,
                    }
                }
            }
        }
    }
    else if (hosts.hasOwnProperty("set")) {
        for (key in hosts.set) {
            if (host.hasOwnProperty(key)) {
                debug("Setting host", key, "to:", hosts.set[key]);
                if(hosts.set[key].split(" ").length > 1 || hosts.set[key].split("\t").length > 1){
                    retVal.success = false;
                    retVal.error = "Name cannot contain spaces or tabs";
                    return retVal;
                }
                host[key].name = hosts.set[key];
            }
        }

        writeJsonData('data/host.json', host);
    }
    else {
        retVal.success = false;
        retVal.error = "Invalid data: " + Object.keys(hosts).map(key => `${key}: ${hosts[key]}`).join(", ");
        return retVal;
    }

    retVal.success = true;
    return retVal;
}

function piGpioInit() {
    debug("here")
    if (!deploy) {
        if (!piGpioInitOnce) {
            console.error("Cannot initialize GPIO pins on non-deployed server");
            piGpioInitOnce = true;
        }
        return;
    }

    return new Promise((resolve, reject) => {
        // Assume some asynchronous initialization logic here
        // For demonstration, using setTimeout to simulate async behavior
        
        Object.keys(gpio).forEach(key => {
            let commandEn = `pinctrl set ${gpio[key].en} op`; // Set as output
            let commandSel = `pinctrl set ${gpio[key].sel} op`; // Set as output
            
            exec(commandEn, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error setting up pin ${gpio[key].en}: ${err}`);
                    return;
                }
                debug(`Pin ${gpio[key].en} set as output: ${stdout}`);
            });
            
            exec(commandSel, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Error setting up pin ${gpio[key].sel}: ${err}`);
                    return;
                }
                debug(`Pin ${gpio[key].sel} set as output: ${stdout}`);
            });
        });
        setTimeout(() => {
            debug("GPIO initialization completed.");
            resolve();  // Resolve the promise upon completion
        }, 1000);
    });
}
    
function piGpioSet(port, en, sel) {
    if (!deploy) {
        if (!piGpioSetOnce) {
            console.error("Cannot set GPIO pins on non-deployed server");
            piGpioSetOnce = true;
        }
        return;
    }

    let commandEn = `pinctrl set ${gpio[port].en} ${en ? 'dh' : 'dl'}`;
    let commandSel = `pinctrl set ${gpio[port].sel} ${sel ? 'dh' : 'dl'}`;

    exec(commandEn, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error setting port ${port} en ${gpio[port].en} to ${en ? "HIGH" : "LOW"}: ${err}`);
            return;
        }
        debug(`Port ${port} en ${gpio[port].en} set to ${en ? "HIGH" : "LOW"}: ${stdout}`);
    });

    exec(commandSel, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error setting port ${port} sel ${gpio[port].sel} to ${sel ? "HIGH" : "LOW"}: ${err}`);
            return;
        }
        debug(`Port ${port} sel ${gpio[port].sel} set to ${sel ? "HIGH" : "LOW"}: ${stdout}`);
    });
}

function debug(msg, ...args) {
    if(debugCheck){
        console.log(msg, ...args);
    }
}