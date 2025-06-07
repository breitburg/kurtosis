import React from 'react';
import Slot from '../models/Slot.js';
import SlotStatus from '../models/SlotStatus.js';

const SeatSlot = ({ slot }) => {
  const getSlotStyles = () => {
    if (slot.isAvailable()) {
      return 'bg-[#33b400] text-white rounded-[2px]';
    } else if (slot.isBusy()) {
      return 'text-[#b80600]';
    } else {
      return 'text-gray-600';
    }
  };
  
  return (
    <div className={`
      flex-1 min-w-0 h-5 flex items-center justify-center
      ${getSlotStyles()}
    `}>
      <span className="text-sm font-medium leading-none">
        {slot.getDisplayStatus()}
      </span>
    </div>
  );
};

const TableRow = ({ seatName, slots }) => {
  return (
    <div className="w-full border-b border-gray-300">
      <div className="flex items-center gap-1 pb-1">
        <div className="w-32 flex-shrink-0 text-left">
          <span className="text-sm text-black font-normal">
            {seatName}
          </span>
        </div>
        {slots.map((slot) => (
          <SeatSlot key={`${slot.resourceId}-${slot.hour}`} slot={slot} />
        ))}
      </div>
    </div>
  );
};

const TableHeader = () => {
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // [8, 9, 10, ..., 23]
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 pb-1">
        <div className="w-32 flex-shrink-0 text-left">
          <span className="text-sm text-gray-500 font-normal">
            № / Hour
          </span>
        </div>
        {hours.map((hour) => (
          <div key={hour} className="flex-1 min-w-0 text-center">
            <span className="text-sm text-black font-normal">
              {hour.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SeatTable = ({ slots }) => {
  // Group slots by resourceId
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.resourceId]) {
      acc[slot.resourceId] = {};
    }
    acc[slot.resourceId][slot.hour] = slot;
    return acc;
  }, {});

  // Create complete seat data with missing hours filled as 'U', preserving sort order
  const seatData = Object.keys(groupedSlots)
    .map(resourceId => {
      // Get the sort order from the first slot of this resource
      const firstSlot = Object.values(groupedSlots[resourceId])[0];
      const sortOrder = firstSlot?.sortOrder ?? 999999; // Default high number if no sort order
      
      return { resourceId, sortOrder };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder) // Sort by the preserved order
    .map(({ resourceId }) => {
    const seatSlots = [];
    for (let hour = 8; hour <= 23; hour++) {
      const existingSlot = groupedSlots[resourceId][hour];
      if (existingSlot) {
        seatSlots.push(existingSlot);
      } else {
        seatSlots.push(new Slot(resourceId, hour, SlotStatus.UNAVAILABLE));
      }
    }
    
    return {
      resourceId,
      seatName: seatSlots[0]?.seatName || resourceId, // Use actual seat name if available
      slots: seatSlots
    };
  });

  return (
    <div className="w-full">
      <div className="flex flex-col gap-1">
        <TableHeader />
        {seatData.map((seatInfo) => (
          <TableRow
            key={seatInfo.resourceId}
            seatName={seatInfo.seatName}
            slots={seatInfo.slots}
          />
        ))}
      </div>
    </div>
  );
};

export default SeatTable;