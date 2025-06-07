import Slot from '../models/Slot.js';
import SlotStatus from '../models/SlotStatus.js';

class KurtApi {
  constructor(baseUrl = 'https://wsrt.ghum.kuleuven.be/service1.asmx') {
    this.baseUrl = baseUrl;
  }

  /**
   * Query availability for specified resource IDs on a given date
   * @param {string[]} resourceIds - Array of resource IDs (e.g., ["300855", "300856"])
   * @param {string} date - Date in YYYY-MM-DD format (e.g., "2025-06-07")
   * @param {string} uid - User ID in r-number/u-number/b-number format (e.g., "r0123456")
   * @returns {Promise<Slot[]>} - Array of Slot objects
   */
  async queryAvailability(resourceIds, date, uid) {
    try {
      // Parse the date string to Date object
      const dateObj = new Date(date);
      
      // Format start datetime
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      const startDateTime = `${formattedDate}T00:00:00`;

      // Format end datetime (next day)
      const nextDay = new Date(dateObj);
      nextDay.setDate(dateObj.getDate() + 1);
      const nextDayYear = nextDay.getFullYear();
      const nextDayMonth = String(nextDay.getMonth() + 1).padStart(2, "0");
      const nextDayDay = String(nextDay.getDate()).padStart(2, "0");
      const nextDayFormattedDate = `${nextDayYear}-${nextDayMonth}-${nextDayDay}`;
      const endDateTime = `${nextDayFormattedDate}T00:00:00`;

      const url = `${this.baseUrl}/GetReservationsJSON?uid=${uid}&ResourceIDList=${resourceIds.join(",")}&startdtstring=${startDateTime}&enddtstring=${endDateTime}`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const timeslots = data.map(item => ({
        resource_id: item.ResourceID,
        date: item.Startdatetime ? new Date(item.Startdatetime) : null,
        status: item.Status,
      }));
      
      // Debug: Check what statuses we're getting from API
      const statusCounts = timeslots.reduce((acc, slot) => {
        acc[slot.status] = (acc[slot.status] || 0) + 1;
        return acc;
      }, {});
      console.log('API status distribution:', statusCounts);
      
      return this.parseResponse(timeslots, resourceIds, date);
    } catch (error) {
      console.error('Error querying availability:', error);
      throw error;
    }
  }

  /**
   * Parse the KURT API response into Slot objects
   * @param {Array} timeslots - The processed timeslots from API response
   * @param {string[]} resourceIds - Original resource IDs requested
   * @returns {Slot[]} - Array of Slot objects
   */
  parseResponse(timeslots, resourceIds, selectedDate) {
    const slots = [];

    // Validate inputs
    if (!Array.isArray(timeslots)) {
      console.error('Timeslots is not an array:', timeslots);
      return slots;
    }
    
    if (!Array.isArray(resourceIds)) {
      console.error('Resource IDs is not an array:', resourceIds);
      return slots;
    }

    // Create a map to track reservations by resource and hour
    const reservations = new Map();
    
    // Parse reservations from timeslots
    timeslots.forEach(timeslot => {
      const resourceId = timeslot.resource_id;
      const date = timeslot.date;
      const status = timeslot.status;
      
      // Only process if we have valid data and status indicates busy/reserved
      if (resourceId && date && status && status !== 'Available') {
        try {
          const hour = date.getHours();
          const key = `${resourceId}-${hour}`;
          reservations.set(key, true);
        } catch (err) {
          console.warn('Error parsing timeslot:', timeslot, err);
        }
      }
    });

    // Generate slots for all requested resources and hours (8-23)
    const now = new Date();
    const selectedDateObj = new Date(selectedDate);
    const isToday = selectedDateObj.toDateString() === now.toDateString();
    const currentHour = now.getHours();
    
    resourceIds.forEach(resourceId => {
      for (let hour = 8; hour <= 23; hour++) {
        const key = `${resourceId}-${hour}`;
        const isReserved = reservations.has(key);
        
        let status;
        
        // If it's today and the hour has passed, mark as unavailable
        if (isToday && hour < currentHour) {
          status = SlotStatus.UNAVAILABLE;
        } else if (isReserved) {
          status = SlotStatus.BUSY;
        } else {
          status = SlotStatus.AVAILABLE;
        }
        
        slots.push(new Slot(resourceId, hour, status));
      }
    });

    return slots;
  }

  /**
   * Get availability for a single resource
   * @param {string} resourceId - Single resource ID
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} uid - User ID
   * @returns {Promise<Slot[]>} - Array of Slot objects for the resource
   */
  async getResourceAvailability(resourceId, date, uid) {
    return this.queryAvailability([resourceId], date, uid);
  }

  /**
   * Get availability for multiple resources
   * @param {string[]} resourceIds - Array of resource IDs
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} uid - User ID
   * @returns {Promise<Slot[]>} - Array of Slot objects for all resources
   */
  async getMultipleResourcesAvailability(resourceIds, date, uid) {
    return this.queryAvailability(resourceIds, date, uid);
  }

  /**
   * Generate booking link for a resource with specific time range
   * @param {string} resourceId - The resource ID
   * @param {Date} selectedDate - The selected date
   * @param {number} startTime - Start hour (e.g., 8)
   * @param {number} endTime - End hour (e.g., 10)
   * @returns {string} - Booking URL
   */
  generateBookingLink(resourceId, selectedDate, startTime, endTime) {
    const startTimeFormatted = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(
      2,
      "0"
    )}T${String(startTime).padStart(2, "0")}:00:00`;

    const endTimeFormatted = `${selectedDate.getFullYear()}-${String(
      selectedDate.getMonth() + 1
    ).padStart(2, "0")}-${String(
      endTime == 0 ? selectedDate.getDate() + 1 : selectedDate.getDate()
    ).padStart(2, "0")}T${String(endTime).padStart(2, "0")}:00:00`;

    return `https://www-sso.groupware.kuleuven.be/sites/KURT/Pages/NEW-Reservation.aspx?StartDateTime=${startTimeFormatted}&EndDateTime=${endTimeFormatted}&ID=${resourceId}&type=b`;
  }
}

export default KurtApi;