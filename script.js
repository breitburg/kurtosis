const PIDS = {
  agora: 201403,
  "agora-blok-rooms": 201403,
  "agora-flexispace": 201403,
  ebib: 201406,
  "arenberg-main": 201401,
  "arenberg-rest": 201401,
  "arenberg-tulp": 201401,
  erasmus: 201404,
  "agora-rooms": 202203,
};

// Set default date to today
let today = new Date();
let dd = String(today.getDate()).padStart(2, "0");
let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
let yyyy = today.getFullYear();

// Format today's date
let minDate = yyyy + "-" + mm + "-" + dd;

// Set the min date for the input field
let dateInput = document.getElementById("date");
dateInput.value = minDate;
dateInput.min = minDate;

// Set the max date for the input field
let maxDate = yyyy + "-" + mm + "-" + (parseInt(today.getDate()) + 9);
dateInput.max = maxDate;

// Load saved r-number from local storage
const savedRNumber = localStorage.getItem("rNumber");

if (savedRNumber) {
  document.getElementById("rNumber").value = savedRNumber;
}

// Load saved library from local storage
const savedLibrary = localStorage.getItem("library");

if (savedLibrary) {
  document.getElementById("library").value = savedLibrary;
}

async function fetchTimeslots(date, uid) {
  const selectedLibrary = document.getElementById("library").value;

  const seats = await fetch(`/seats/${selectedLibrary}.json`).then(response =>
    response.json()
  );

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const formattedDate = `${year}-${month}-${day}`;

  const startDateTime = `${formattedDate}T00:00:00`;

  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  const nextDayYear = nextDay.getFullYear();
  const nextDayMonth = String(nextDay.getMonth() + 1).padStart(2, "0");
  const nextDayDay = String(nextDay.getDate()).padStart(2, "0");
  const nextDayFormattedDate = `${nextDayYear}-${nextDayMonth}-${nextDayDay}`;

  const endDateTime = `${nextDayFormattedDate}T00:00:00`;

  const url = `https://wsrt.ghum.kuleuven.be/service1.asmx/GetReservationsJSON?uid=${uid}&ResourceIDList=${Object.keys(
    seats
  ).join(",")}&startdtstring=${startDateTime}&enddtstring=${endDateTime}`;

  const timeslots = await fetch(url)
    .then(response => response.json())
    .then(data =>
      data.map(item => ({
        resource_id: item.ResourceID,
        date: new Date(item.Startdatetime),
        status: item.Status,
      }))
    );

  if (timeslots.length === 0) {
    alert(
      "Your username (r-number/u-number/b-number) was rejected by KURT. Please make sure you have entered it exactly as it is on your KU Leuven card"
    );
    throw new Error("Invalid username");
  }

  /* This doesn't work on holidays because the library can be open but there can be no booked seats, 
  so this reports the library as closed when in reality it is just empty */

  /* if (!timeslots.some(item => item.status !== "U")) {
    alert("There are no available seats, this library is probably closed.");
    throw new Error("Library down");
  } */

  return [timeslots, seats];
}

function sortTimeslots(timeslots, seats) {
  const sortedTimeslots = {};
  for (const [resourceId, resourceName] of Object.entries(seats)) {
    sortedTimeslots[resourceName] = {
      resourceId: parseInt(resourceId),
      reservations: timeslots.filter(
        reservation => reservation.resource_id === parseInt(resourceId)
      ),
    };
  }
  return sortedTimeslots;
}

function renderTable(sortedTimeslots, selectedDate, selectedLibrary) {
  const table = document.getElementById("seatTable");
  // Start from hour 6
  table.innerHTML = `
        <tr>
            <th>Name</th>
            ${[...Array(24 - 6)]
      .map((_, index) => `<th>${index + 6}</th>`)
      .join("")} 
            <th colspan="2">Actions</th>
        </tr>
    `;

  for (const [resourceName, resourceData] of Object.entries(sortedTimeslots)) {
    const resourceReservations = resourceData.reservations;
    let rowHtml = `<tr><td class="smolFont">${resourceName}</td>`;

    for (let hour = 6; hour < 24; hour++) {
      // Start from hour 6
      const hourReservations = resourceReservations.filter(
        reservation => reservation.date.getHours() === hour
      );

      let displayStatus = "A";
      if (hourReservations.length > 0) {
        if (hourReservations[0].status === "U") {
          displayStatus = "U"; // Unavailable
        } else if (hourReservations[0].status === "B") {
          displayStatus = "B"; // Booked
        } else if (hourReservations[0].status === "C") {
          displayStatus = "C"; // Closed
        }
      }

      const cellClass =
        displayStatus === "U" || displayStatus === "C"
          ? "unavailable"
          : displayStatus === "B"
            ? "booked"
            : "available";
      rowHtml += `<td class="${cellClass}">${displayStatus}</td>`;
    }

    const selectedMonth = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const selectedDay = String(selectedDate.getDate()).padStart(2, "0");
    const selectedYear = selectedDate.getFullYear();
    const selectedFormattedDate = `${selectedYear}-${selectedMonth}-${selectedDay}`;

    const checkInLink = `https://kuleuven.be/kurtqr?id=${resourceData.resourceId}`;
    const bookLink = `https://www-sso.groupware.kuleuven.be/sites/KURT/Pages/default.aspx?pid=${PIDS[selectedLibrary]}&showresults=done&resourceid=${resourceData.resourceId}&startDate=${selectedFormattedDate}T00%3A00%3A00`;
    rowHtml += `<td class="smolFont"><button onClick='openBookingDialog(${JSON.stringify(
      {
        resourceId: resourceData.resourceId,
        reservations: resourceReservations,
      }
    )})'>Book</button></td><td class="smolFont"><button onClick='window.open("${checkInLink}")'>Check&nbsp;In</button></td>`;

    rowHtml += "</tr>";
    table.insertAdjacentHTML("beforeend", rowHtml);

  }

  // Show the banner if the user has not hidden it yet and the selected study space is within Agora
  if (!localStorage.getItem("hideBanner") && selectedLibrary.startsWith("agora")) {
    console.log("showing banner");
    document.getElementById("banner").style.display = "flex";
  }
  
  // Show the table after rendering
  table.style.display = "table";
}

let currentlyBooking = {};

function openBookingDialog(resourceData) {
  const dialog = document.getElementById("bookDialog");
  dialog.showModal();

  currentlyBooking = resourceData;

  document.getElementById("startTime").innerHTML = "";

  const reservationAvailable = isReservationAvailable(
    document.getElementById("date").value
  );

  for (let i = 0; i < 24; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i}:00`;
    option.disabled =
      reservationAvailable &&
      resourceData.reservations.some(
        reservation => new Date(reservation.date).getHours() === i
      );
    document.getElementById("startTime").appendChild(option);
  }

  refreshDropdowns(document.getElementById("startTime").value);
}

document.getElementById("bookDialog").addEventListener("close", function () {
  currentlyBooking = {};
});

function isReservationAvailable(targetDateInput) {
  const now = new Date();

  const targetDate = new Date(targetDateInput);

  targetDate.setHours(18, 0, 0, 0); // Reservation opens at 18:00

  // Check if the target date is within the next 8 days
  if (targetDate.getTime() - now.getTime() <= 8 * 24 * 60 * 60 * 1000) {
    return true;
  } else {
    return false;
  }
}

function generateLink() {
  const startTime = document.getElementById("startTime").value;
  const endTime = document.getElementById("endTime").value;

  const selectedDate = new Date(document.getElementById("date").value);

  const startTimeFormatted = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(
    2,
    "0"
  )}T${startTime.padStart(2, "0")}:00:00`;

  const endTimeFormatted = `${selectedDate.getFullYear()}-${String(
    selectedDate.getMonth() + 1
  ).padStart(2, "0")}-${String(
    endTime == 0 ? selectedDate.getDate() + 1 : selectedDate.getDate()
  ).padStart(2, "0")}T${endTime.padStart(2, "0")}:00:00`;

  return `https://www-sso.groupware.kuleuven.be/sites/KURT/Pages/NEW-Reservation.aspx?StartDateTime=${startTimeFormatted}&EndDateTime=${endTimeFormatted}&ID=${currentlyBooking.resourceId}&type=b`;
}

document.getElementById("bookButton").addEventListener("click", function () {
  window.open(generateLink());
});

document
  .getElementById("copyLink")
  .addEventListener("click", async function () {
    try {
      await navigator.clipboard.writeText(generateLink());
      this.textContent = "Copied!";
      this.disabled = true;
    } catch (err) {
      console.error("Failed to copy!", err);
      this.textContent = "Failed to copy!";
      this.disabled = true;
    }

    setTimeout(() => {
      this.textContent = "Copy booking link";
      this.disabled = false;
    }, 1000);
  });

function refreshDropdowns(startTime) {
  console.log(startTime);
  const selectedStartTime = parseInt(startTime);
  const selectedEndTime = selectedStartTime + 1;

  document.getElementById("endTime").innerHTML = "";

  const reservationAvailable = isReservationAvailable(
    document.getElementById("date").value
  );

  if (reservationAvailable) {
    document.getElementById("reservationClosed").style.display = "none";
  } else {
    document.getElementById("reservationClosed").style.display = "block";
  }

  console.log(reservationAvailable);

  for (let i = selectedEndTime; i < 24; i++) {
    // Only allow to select if the timeslot is available and if by selecting this time, there is no booked timeslot between the selected start and end time
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i}:00`;
    option.disabled =
      reservationAvailable &&
      currentlyBooking.reservations.some(
        reservation =>
          new Date(reservation.date).getHours() >= selectedStartTime &&
          new Date(reservation.date).getHours() < i
      );
    document.getElementById("endTime").appendChild(option);
  }

  // Add 00:00 as the last option
  const option = document.createElement("option");
  option.value = "0";
  option.textContent = `00:00`;
  option.disabled = currentlyBooking.reservations.some(
    reservation =>
      new Date(reservation.date).getHours() > selectedStartTime &&
      new Date(reservation.date).getHours() <= 23
  );

  document.getElementById("endTime").appendChild(option);

  if (selectedEndTime === 24) {
    option.selected = true;
  }
}

document
  .getElementById("startTime")
  .addEventListener("change", e => refreshDropdowns(e.target.value));

document
  .getElementById("queryForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const selectedDate = new Date(document.getElementById("date").value);
    const rNumberField = document.getElementById("rNumber");
    document.getElementById("rNumber").value = rNumberField.value
      .trim()
      .toLowerCase();
    let rNumber = rNumberField.value;

    // Check if the r-number starts with 'r' and add it if it doesn't
    if (!rNumber.startsWith("r") && !rNumber.startsWith("u") && !rNumber.startsWith("b")) {
      rNumber = `r${rNumber}`;
      rNumberField.value = rNumber;
    }

    if (rNumber.match(/[rub]\d{7}/) === null) {
      alert(
        "Invalid username (r-number/u-number/b-number). Make sure you entered it exactly as it is on your KU Leuven card"
      );
      return;
    }

    if (rNumber.match(/[u]\d{7}/)) {
      alert(
        "Warning: You entered a U-number. We were unable to test the functionality of this tool with U-numbers. Please proceed with caution."
      );
    }

    if (rNumber.match(/[b]\d{7}/)) {
      alert(
        "Warning: You entered a B-number. We were unable to test the functionality of this tool with B-numbers. Please proceed with caution."
      );
    }

    // Check if the checkbox is checked
    const rememberRNumber = document.getElementById("rememberRNumber").checked;

    // Save r-number to local storage only if the checkbox is checked
    if (rememberRNumber) {
      localStorage.setItem("rNumber", rNumber);
    } else {
      localStorage.removeItem("rNumber");
    }

    // Save selected library to local storage
    const selectedLibrary = document.getElementById("library").value;
    localStorage.setItem("library", selectedLibrary);

    const fetchButton = document.getElementById("fetchButton");
    let previousButtonText = fetchButton.textContent;

    fetchButton.textContent = "Fetching...";
    fetchButton.disabled = true;

    // Hide the table before fetching data
    document.getElementById("seatTable").style.display = "none";

    fetchTimeslots(selectedDate, rNumber)
      .then(([timeslots, seats]) => sortTimeslots(timeslots, seats))
      .then(sortedTimeslots => {
        renderTable(
          sortedTimeslots,
          selectedDate,
          document.getElementById("library").value
        );
        fetchButton.textContent = previousButtonText;
        fetchButton.disabled = false;
      })
      .catch(error => {
        console.log(error);
        fetchButton.textContent = previousButtonText;
        fetchButton.disabled = false;
      });
  });


function doNotShowBannerAgain() {
  document.getElementById("banner").style.display = "none";
  localStorage.setItem("hideBanner", true);
}

// Add event listener to the autoButton to open the autoModal
document.getElementById("autoButton").addEventListener("click", function () {
  const autoModal = document.getElementById("autoModal");
  autoModal.showModal();
});

// Add functionality to the computeButton to compute the most efficient sequence of seats
document.getElementById("computeButton").addEventListener("click", function () {
  const startTime = parseInt(document.getElementById("autoStartTime").value);
  const endTime = parseInt(document.getElementById("autoEndTime").value);

  const selectedDate = new Date(document.getElementById("date").value);
  const rNumber = document.getElementById("rNumber").value;

  fetchTimeslots(selectedDate, rNumber)
    .then(([timeslots, seats]) => {
      const sortedTimeslots = sortTimeslots(timeslots, seats);
      const efficientSequence = computeEfficientSequence(sortedTimeslots, startTime, endTime);
      displayEfficientSequence(efficientSequence);
    })
    .catch(error => {
      console.log(error);
    });
});

function computeEfficientSequence(sortedTimeslots, startTime, endTime) {
  const sequence = [];
  let currentTime = startTime;

  while (currentTime < endTime) {
    let bestSeat = null;
    let bestEndTime = currentTime;

    for (const [resourceName, resourceData] of Object.entries(sortedTimeslots)) {
      const resourceReservations = resourceData.reservations;

      let available = true;
      let tempEndTime = currentTime;

      while (tempEndTime < endTime && available) {
        const hourReservations = resourceReservations.filter(
          reservation => reservation.date.getHours() === tempEndTime
        );

        if (hourReservations.length > 0 && hourReservations[0].status !== "A") {
          available = false;
        } else {
          tempEndTime++;
        }
      }

      if (tempEndTime > bestEndTime) {
        bestSeat = resourceName;
        bestEndTime = tempEndTime;
      }
    }

    if (bestSeat) {
      sequence.push({ seat: bestSeat, startTime: currentTime, endTime: bestEndTime });
      currentTime = bestEndTime;
    } else {
      break;
    }
  }

  return sequence;
}

function displayEfficientSequence(sequence) {
  const listContainer = document.createElement("div");
  listContainer.classList.add("efficient-sequence");

  sequence.forEach(item => {
    const listItem = document.createElement("div");
    listItem.classList.add("sequence-item");

    const seatInfo = document.createElement("span");
    seatInfo.textContent = `${item.seat}: ${item.startTime}:00 - ${item.endTime}:00`;

    const bookButton = document.createElement("button");
    bookButton.textContent = "Book";
    bookButton.addEventListener("click", function () {
      bookButton.style.textDecoration = "line-through";
    });

    listItem.appendChild(seatInfo);
    listItem.appendChild(bookButton);
    listContainer.appendChild(listItem);
  });

  const autoModal = document.getElementById("autoModal");
  autoModal.appendChild(listContainer);
}
