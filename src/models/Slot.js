import SlotStatus from './SlotStatus.js';

class Slot {
  constructor(resourceId, hour, status, seatName = null) {
    this.resourceId = resourceId;
    this.hour = hour; // 0-23
    this.status = status; // SlotStatus enum value
    this.seatName = seatName;
  }

  isAvailable() {
    return this.status === SlotStatus.AVAILABLE;
  }

  isBusy() {
    return this.status === SlotStatus.BUSY;
  }

  isUnavailable() {
    return this.status === SlotStatus.UNAVAILABLE;
  }

  getDisplayStatus() {
    return this.status;
  }
}

export default Slot;