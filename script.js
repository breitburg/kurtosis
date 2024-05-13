let SEATS = {};

// Set default date to today
let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();

// Format today's date
let minDate = yyyy + '-' + mm + '-' + dd;

// Set the min date for the input field
let dateInput = document.getElementById('date');
dateInput.value = minDate;
dateInput.min = minDate;

// Load saved r-number from local storage
const savedRNumber = localStorage.getItem('rNumber');

if (savedRNumber) {
    document.getElementById('rNumber').value = savedRNumber;
}

// Fetch seats data from seats.json file
fetch('seats.json')
    .then(response => response.json())
    .then(data => {
        SEATS = data;
    })
    .catch(error => {
        alert('Failed to fetch seats data from the server. Please try again later.');
    });

function fetchTimeslots(date, uid) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const startDateTime = `${formattedDate}T00:00:00`;

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    const nextDayYear = nextDay.getFullYear();
    const nextDayMonth = String(nextDay.getMonth() + 1).padStart(2, '0');
    const nextDayDay = String(nextDay.getDate()).padStart(2, '0');
    const nextDayFormattedDate = `${nextDayYear}-${nextDayMonth}-${nextDayDay}`;

    const endDateTime = `${nextDayFormattedDate}T00:00:00`;

    const url = `https://wsrt.ghum.kuleuven.be/service1.asmx/GetReservationsJSON?uid=${uid}&ResourceIDList=${Object.keys(SEATS).join(',')}&startdtstring=${startDateTime}&enddtstring=${endDateTime}`;

    return fetch(url)
        .then(response => response.json())
        .then(data => data.map(item => ({
            resource_id: item.ResourceID,
            date: new Date(item.Startdatetime),
            status: item.Status
        })));
}

function sortTimeslots(timeslots) {
    const sortedTimeslots = {};
    for (const [resourceId, resourceName] of Object.entries(SEATS)) {
        sortedTimeslots[resourceName] = {
            resourceId: parseInt(resourceId),
            reservations: timeslots.filter(reservation => reservation.resource_id === parseInt(resourceId))
        };
    }
    return sortedTimeslots;
}

function renderTable(sortedTimeslots, selectedDate) {
    const table = document.getElementById('seatTable');
    table.innerHTML = `
        <tr>
            <th>Name</th>
            ${[...Array(24)].map((_, index) => `<th>${index}</th>`).join('')}
            <th>Links</th>
        </tr>
    `;

    for (const [resourceName, resourceData] of Object.entries(sortedTimeslots)) {
        const resourceReservations = resourceData.reservations;
        let rowHtml = `<tr><td>${resourceName}</td>`;

        for (let hour = 0; hour < 24; hour++) {
            const hourReservations = resourceReservations.filter(reservation => reservation.date.getHours() === hour);

            let displayStatus = 'A';
            if (hourReservations.length > 0) {
                displayStatus = hourReservations[0].status === 'U' ? 'U' : 'B';
            }

            const cellClass = displayStatus === 'U' ? 'unavailable' : (displayStatus === 'B' ? 'booked' : 'available');
            rowHtml += `<td class="${cellClass}">${displayStatus}</td>`;
        }

        const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const selectedDay = String(selectedDate.getDate()).padStart(2, '0');
        const selectedYear = selectedDate.getFullYear()
        const selectedFormattedDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;

        const checkInLink = `https://kuleuven.be/kurtqr?id=${resourceData.resourceId}`;
        const bookLink = `https://www-sso.groupware.kuleuven.be/sites/KURT/Pages/default.aspx?pid=201403&showresults=done&resourceid=${resourceData.resourceId}&startDate=${selectedFormattedDate}T00%3A00%3A00`;
        rowHtml += `<td><a href="${bookLink}" target="_blank">Book</a><br><a href="${checkInLink}" target="_blank">Check In</a></td>`;

        rowHtml += '</tr>';
        table.insertAdjacentHTML('beforeend', rowHtml);
    }

    // Show the table after rendering
    table.style.display = 'table';
}

document.getElementById('queryForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const selectedDate = new Date(document.getElementById('date').value);
    const rNumberField = document.getElementById('rNumber');
    let rNumber = rNumberField.value;

    // Check if the r-number starts with 'r' and add it if it doesn't
    if (!rNumber.startsWith('r')) {
        rNumber = `r${rNumber}`;
        rNumberField.value = rNumber;
    }

    // Check if the checkbox is checked
    const rememberRNumber = document.getElementById('rememberRNumber').checked;

    // Save r-number to local storage only if the checkbox is checked
    if (rememberRNumber) {
        localStorage.setItem('rNumber', rNumber);
    } else {
        localStorage.removeItem('rNumber');
    }

    const fetchButton = document.getElementById('fetchButton');
    let previousButtonText = fetchButton.textContent;

    fetchButton.textContent = 'Fetching...';
    fetchButton.disabled = true;

    // Hide the table before fetching data
    document.getElementById('seatTable').style.display = 'none';

    fetchTimeslots(selectedDate, rNumber)
        .then(timeslots => sortTimeslots(timeslots))
        .then(sortedTimeslots => {
            renderTable(sortedTimeslots, selectedDate);
            fetchButton.textContent = previousButtonText;
            fetchButton.disabled = false;
        });
});
