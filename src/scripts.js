let config = {}
let portNames = {}
let hostNames = {}

document.body.onload = async function() {
    await postToServer("ports", {"get": {}}).then(data => {
        if(data.success) {
            config = data.return;
        }
        else {
            console.error(data.error);
        }
    });

    await postToServer("portNames", {"get": {}}).then(data => {
        if(data.success) {
            portNames = data.return;
        }
        else {
            console.error(data.error);
        }
    });

    await postToServer("hostNames", {"get": {}}).then(data => {
        if(data.success) {
            hostNames = data.return;
        }
        else {
            console.error(data.error);
        }

        for(let host in hostNames) {
            document.getElementById(`${host}-name`).textContent = hostNames[host].name;
        }
    });

    createPortsTable(config, portNames);
}

async function postToServer(action, value) {
  const body = {};
  body[action] = value;

  try {
    const response = await fetch(`/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if(data.success == false) {
        console.error("Error: " + data.error);
    }
    return data[action]; // Returns the parsed JSON response
  } catch (error) {
    console.error('Error:', error);
    throw error; // Rethrow the error for the caller to handle
  }
}

async function createButtonListener(name, initial){
    const id = `${name}-switch`;

    // Set initial states if needed, this can also be done in the HTML directly
    document.getElementById(id).checked = initial;

    // Add event listener to the switch
    document.getElementById(id).addEventListener('change', function() {
        if (this.checked) {
            postToServer('ports', {"set": {[name]: {"enable": true}}});
        } else {
            postToServer('ports', {"set": {[name]: {"enable": false}}});
        }
    });

}

async function createRadioListener(name, initial){
    let row = document.getElementById(`${name}-row`);
    row.addEventListener('click', function(event) {
        // Prevent event firing when clicking on input elements

        if(event.target.type == "radio") {
            postToServer('ports', {"set": {[name]: {"select": parseInt(event.target.value)}}});
        }
    });
}

function createPortsTable(ports, portNames) {
    const data = document.getElementById('data');
    let htmlContent = ''; // Start with an empty string

    for(let port in ports) {
        let enable = ports[port].enable ? "checked" : "";
        let host1 = ports[port].select == 0 ? "checked" : "";
        let host2 = ports[port].select == 1 ? "checked" : "";

        htmlContent += `
            <tr id="${port}-row">
                <td>
                    <button id="${port}-edit" onclick="openModal('${port}-name')">✎</button>
                    <span id="${port}-name">${portNames[port].name}</span>
                </td>
                <td>
                    <label class="switch">
                        <input type="checkbox" id="${port}-switch" ${enable}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>
                    <input class="radio" type="radio" name="${port}-host" value="0" ${host1}>
                </td>
                <td>
                    <input class="radio" type="radio" name="${port}-host" value="1" ${host2}>
                </td>
            </tr>
        `;
    }

    data.innerHTML = htmlContent; // Update HTML in one operation

    // Add event listeners for row selection
    for(let port in ports) {
        createButtonListener(port, ports[port].enable);
        createRadioListener(port, ports[port].select);
    }
}

currentItem = '';
originalName = '';
listenerSet = false;
function openModal(item) {
    currentItem = item;
    originalName = document.getElementById(item).textContent.trim();
    if(item.startsWith('host')) {
        document.getElementById('rename').textContent = 'Rename Host';
    } else {
        document.getElementById('rename').textContent = 'Rename Port';
    }

    document.getElementById('modal').style.display = 'block';
    document.getElementById('new-name').value = document.getElementById(item).textContent.trim();
    document.getElementById('new-name').focus();
    document.getElementById('new-name').select();

    if(!listenerSet) {
        listenerSet = true;
        document.getElementById('new-name').addEventListener('keyup', function(event) {
            console.log("here")
            if (event.key === 'Enter') {
                event.preventDefault();
                renameItem();
                
                // turn off listener
                document.getElementById('new-name').removeEventListener('keyup', this);
            }
        });
    }
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function renameItem() {
    const newName = document.getElementById('new-name').value.replace(/\s+/g, '-');

    if (currentItem && newName.trim() !== '') {
        const object = currentItem.split('-')[0];

        let different = newName !== originalName;
        if(different && object.startsWith('host')) {
            hostNames[object] = newName;
            ret = postToServer('hostNames', {"set": {[object]: newName}});
        } else if(different) {
            portNames[object] = newName;
            ret = postToServer('portNames', {"set": {[object]: newName}});
        } else {
            console.log('No change');
        }

        const target = document.getElementById(currentItem);
        if (target) {
            target.textContent = newName + ' ';
            closeModal();
        }
    }
}

setInterval(scale, 25);
function scale() {
    const body = document.body;

    const minWidth = 250;
    const maxWidth = 550;

    const minScale = .45;
    const maxScale = 1;

    // if(window.innerWidth < maxWidth) {
    //     let scale = (window.innerWidth - minWidth) / (maxWidth - minWidth) * (maxScale - minScale) + minScale;
    //     body.style.transform = `scale(${scale})`;
    //     body.style.right = `${(1 - scale) * 50}%`;
    //     body.style.top = `${(1 - scale) * 50}%`;
    // }

    if (window.innerWidth < maxWidth) {
        let scale = ((window.innerWidth - minWidth) / (maxWidth - minWidth)) * (maxScale - minScale) + minScale;
        body.style.transform = `scale(${scale})`;
        body.style.transformOrigin = "top left";  // Set transform origin to the top center
        // body.style.right = `${(1 - scale) * 50}%`;   // Horizontally center the scaled content
        body.style.position = 'absolute';           // Position absolute to maintain layout
    } else {
        body.style.transformOrigin = "top left";  // Set transform origin to the top center
        body.style.position = 'relative'
        body.style.transform = `scale(1)`;
        // Reset transformations and positioning when not scaling
        // body.style.transform = 'none';
        // body.style.left = '0';
    }
}