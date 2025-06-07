import React from 'react';
import { X } from 'lucide-react';
import Slot from '../models/Slot.js';
import SlotStatus from '../models/SlotStatus.js';

const SeatSlot = ({ slot, onSlotClick, isSlotSelected, isHourBlocked }) => {
  const isSelected = isSlotSelected(slot);
  const isBlocked = isHourBlocked(slot.hour);
  
  const getSlotStyles = () => {
    const baseStyles = isBlocked && !isSelected ? 'grayscale' : '';
    
    if (isSelected) {
      return `bg-blue-500 text-white rounded-[2px] cursor-pointer ${baseStyles}`;
    } else if (slot.isAvailable() && !isBlocked) {
      return `bg-[#33b400] text-white rounded-[2px] cursor-pointer hover:bg-[#2a9200] ${baseStyles}`;
    } else if (slot.isAvailable() && isBlocked) {
      return `bg-[#33b400] text-white rounded-[2px] cursor-not-allowed ${baseStyles}`;
    } else if (slot.isBusy()) {
      return `text-[#b80600] ${baseStyles}`;
    } else {
      return `text-neutral-600 ${baseStyles}`;
    }
  };

  const handleClick = () => {
    if (slot.isAvailable() && (!isBlocked || isSelected)) {
      onSlotClick(slot);
    }
  };
  
  return (
    <div 
      className={`
        flex-1 min-w-0 h-5 flex items-center justify-center
        ${getSlotStyles()}
      `}
      onClick={handleClick}
    >
      <span className="leading-none">
        {isSelected ? <X size={18} /> : slot.getDisplayStatus()}
      </span>
    </div>
  );
};

const TableRow = ({ seatName, slots, onSlotClick, isSlotSelected, isHourBlocked, availableHours }) => {
  return (
    <div className="w-full border-b border-neutral-300">
      <div className="flex items-center gap-1 pb-1 py-1">
        <div className="w-20 md:w-32 flex-shrink-0 text-left">
          <span className="text-black font-normal">
            {seatName}
          </span>
        </div>
        {slots.map((slot) => (
          <div
            key={`${slot.resourceId}-${slot.hour}`}
            className={`${!availableHours.has(slot.hour) ? 'hidden md:flex' : 'flex'} flex-1`}
          >
            <SeatSlot 
              slot={slot} 
              onSlotClick={onSlotClick}
              isSlotSelected={isSlotSelected}
              isHourBlocked={isHourBlocked}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const TableHeader = ({ isHourBlocked, onHourClick, availableHours }) => {
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // [8, 9, 10, ..., 23]
  
  const handleHourClick = (hour) => {
    if (isHourBlocked(hour)) {
      onHourClick(hour);
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 pb-1 py-1">
        <div className="w-20 md:w-32 flex-shrink-0 text-left">
          <span className="text-neutral-500 font-normal">
            № / Hour
          </span>
        </div>
        {hours.map((hour) => (
          <div 
            key={hour} 
            className={`flex-1 min-w-0 text-center flex items-center justify-center ${isHourBlocked(hour) ? 'bg-blue-100 rounded-[2px] cursor-pointer hover:bg-blue-200' : ''} ${!availableHours.has(hour) ? 'hidden md:flex' : ''}`}
            onClick={() => handleHourClick(hour)}
          >
            <span className="text-black font-normal">
              {hour.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SeatTable = ({ slots, onSlotClick, isSlotSelected, isHourBlocked, onHourClick }) => {
  // Group slots by resourceId
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.resourceId]) {
      acc[slot.resourceId] = {};
    }
    acc[slot.resourceId][slot.hour] = slot;
    return acc;
  }, {});

  // Calculate which hours have at least one available slot
  const availableHours = React.useMemo(() => {
    const hours = new Set();
    for (let hour = 8; hour <= 23; hour++) {
      const hasAvailableSlot = Object.values(groupedSlots).some(seatSlots => {
        const slot = seatSlots[hour];
        return slot && slot.isAvailable();
      });
      if (hasAvailableSlot) {
        hours.add(hour);
      }
    }
    return hours;
  }, [groupedSlots]);

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

  // Calculate hidden hours for mobile warning
  const allHours = Array.from({ length: 16 }, (_, i) => i + 8);
  const hiddenHours = allHours.filter(hour => !availableHours.has(hour));
  
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex flex-col gap-1 min-w-max">
        {/* Mobile warning about hidden hours */}
        {hiddenHours.length > 0 && (
          <div className="md:hidden bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
            <div className="text-yellow-800 font-medium mb-1">
              Hidden hours (no available seats):
            </div>
            <div className="text-yellow-700">
              {hiddenHours.map(hour => hour.toString().padStart(2, '0')).join(', ')}:00
            </div>
          </div>
        )}
        
        <TableHeader isHourBlocked={isHourBlocked} onHourClick={onHourClick} availableHours={availableHours} />
        {seatData.map((seatInfo) => (
          <TableRow
            key={seatInfo.resourceId}
            seatName={seatInfo.seatName}
            slots={seatInfo.slots}
            onSlotClick={onSlotClick}
            isSlotSelected={isSlotSelected}
            isHourBlocked={isHourBlocked}
            availableHours={availableHours}
          />
        ))}
      </div>
    </div>
  );
};

export default SeatTable;