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

        // TODO: send to server
        if (this.checked) {
            console.log(id, 'is ON');
        } else {
            console.log(id, 'is OFF');
        }
    });

}

async function createRadioListener(name, initial){
    let row = document.getElementById(`${name}-row`);
    row.addEventListener('click', function(event) {
        // Prevent event firing when clicking on input elements

        if(event.target.type == "radio") {
            console.log(event.target.name, "select: ", event.target.value);
        }
    });
}

// document.addEventListener('DOMContentLoaded', function() {
//     setupHostSelection();
// });

// function setupHostSelection() {
//     const allRadioButtons = document.querySelectorAll('input[type="radio"]');

//     allRadioButtons.forEach(radio => {
//         console.log(radio.name, radio.value, radio.checked)
//         radio.addEventListener('change', function() {
//             if (this.checked) {
//                 console.log(`Selected Host ${this.value} for ${this.name}`);
//             }
//         });
//     });
// }

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
function openModal(item) {
    currentItem = item;
    renameValue = item;
    document.getElementById('modal').style.display = 'block';
    document.getElementById('new-name').value = document.getElementById(item).textContent.trim();
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function renameItem() {
    const newName = document.getElementById('new-name').value;
    if (currentItem && newName.trim() !== '') {
        console.log(`Renaming ${currentItem} to ${newName}`); 

        const object = currentItem.split('-')[0];
        if(object.startsWith('host')) {
            hostNames[object] = newName;
            postToServer('hostNames', {"set": {[object]: newName}});
        } else {
            portNames[object] = newName;
            postToServer('portNames', {"set": {[object]: newName}});
        }

        // const target = document.querySelector(`th:contains(${currentItem.charAt(0).toUpperCase() + currentItem.slice(1)})`);
        const target = document.getElementById(currentItem);
        if (target) {
            target.textContent = newName + ' ';
            closeModal();
        }
    }
}