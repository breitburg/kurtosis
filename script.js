let SEATS = {};

// Set default date to today
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

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
        console.error('Error fetching seats data:', error);
    });

function fetchTimeslots(date, uid) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const startDateTime = `${formattedDate}T00:00:00`;
    const endDateTime = `${formattedDate}T23:59:59`;

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

function renderTable(sortedTimeslots) {
    const table = document.getElementById('seatTable');
    table.innerHTML = `
        <tr>
            <th>Name</th>
            ${[...Array(24)].map((_, index) => `<th>${index}</th>`).join('')}
            <th>Check In Link</th>
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

        const checkInLink = `https://kuleuven.be/kurtqr?id=${resourceData.resourceId}`;
        rowHtml += `<td><a href="${checkInLink}" target="_blank">Check In</a></td>`;

        rowHtml += '</tr>';
        table.insertAdjacentHTML('beforeend', rowHtml);
    }

    // Show the table after rendering
    table.style.display = 'table';
}

document.getElementById('filterForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const selectedDate = new Date(document.getElementById('date').value);
    const rNumber = document.getElementById('rNumber').value;

    // Save r-number to local storage
    localStorage.setItem('rNumber', rNumber);

    const loadingMessage = document.getElementById('loadingMessage');
    loadingMessage.style.display = 'block';

    // Hide the table before fetching data
    document.getElementById('seatTable').style.display = 'none';

    fetchTimeslots(selectedDate, rNumber)
        .then(timeslots => sortTimeslots(timeslots))
        .then(sortedTimeslots => {
            renderTable(sortedTimeslots);
            loadingMessage.style.display = 'none';
        });
});
