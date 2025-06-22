import React from 'react';
import { X, LucideTicketCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
      return `bg-[#33b400] text-white rounded-[2px] ${baseStyles}`;
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
        flex-1 h-5 min-w-8 flex items-center justify-center
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

const TableRow = ({ seatName, slots, onSlotClick, isSlotSelected, isHourBlocked, onCheckIn, showCheckInRow }) => {
  const { t } = useTranslation();
  
  const handleCheckIn = () => {
    if (slots.length > 0) {
      onCheckIn({ resourceId: slots[0].resourceId });
    }
  };
  
  return (
    <div className="w-full border-b border-neutral-300 dark:border-neutral-700">
      <div className="flex items-center gap-1 pb-1">
        <div className="w-20 md:w-32 flex-shrink-0 text-left">
          <span className="text-black dark:text-white font-normal">
            {seatName}
          </span>
        </div>
        {slots.map((slot) => (
          <div
            key={`${slot.resourceId}-${slot.hour}`}
            className="flex flex-1"
          >
            <SeatSlot 
              slot={slot} 
              onSlotClick={onSlotClick}
              isSlotSelected={isSlotSelected}
              isHourBlocked={isHourBlocked}
            />
          </div>
        ))}
        {showCheckInRow && (
          <div className="w-12 flex-shrink-0 flex justify-center">
            <button 
              onClick={handleCheckIn}
              className="p-1 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800" 
              title={t('selectedSlots.checkIn')}
            >
              <LucideTicketCheck size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TableHeader = ({ isHourBlocked, onHourClick, slots, showCheckInRow }) => {
  const { t } = useTranslation();
  const hours = Array.from({ length: 16 }, (_, i) => i + 8); // [8, 9, 10, ..., 23]
  
  const handleHourClick = (hour) => {
    if (isHourBlocked(hour)) {
      onHourClick(hour);
    }
  };

  const hasAvailableSlotInHour = (hour) => {
    return slots.some(slot => slot.hour === hour && slot.isAvailable());
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center gap-1 py-1">
        <div className="w-20 md:w-32 flex-shrink-0 text-left">
          <span className="text-neutral-500 dark:text-neutral-400 font-normal">
            {t('seatHour')}
          </span>
        </div>
        {hours.map((hour) => (
          <div 
            key={hour} 
            className={`flex-1 min-w-0 text-center flex items-center justify-center ${isHourBlocked(hour) ? 'bg-blue-100 rounded-[2px] cursor-pointer text-blue-500 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800' : ''}`}
            onClick={() => handleHourClick(hour)}
          >
            <span className={`font-normal ${!hasAvailableSlotInHour(hour) ? 'line-through text-neutral-400' : ''}`}>
              {hour.toString().padStart(2, '0')}
            </span>
          </div>
        ))}
        {showCheckInRow && (
          <div className="w-12 flex-shrink-0">
          </div>
        )}
      </div>
    </div>
  );
};

const SeatTable = ({ slots, onSlotClick, isSlotSelected, isHourBlocked, onHourClick, onCheckIn, showCheckInRow }) => {
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
    <div className="w-full overflow-x-auto">
      <div className="flex flex-col gap-1 min-w-max">
        
        <TableHeader isHourBlocked={isHourBlocked} onHourClick={onHourClick} slots={slots} showCheckInRow={showCheckInRow} />
        {seatData.map((seatInfo) => (
          <TableRow
            key={seatInfo.resourceId}
            seatName={seatInfo.seatName.trim()}
            slots={seatInfo.slots}
            onSlotClick={onSlotClick}
            isSlotSelected={isSlotSelected}
            isHourBlocked={isHourBlocked}
            onCheckIn={onCheckIn}
            showCheckInRow={showCheckInRow}
          />
        ))}
      </div>
    </div>
  );
};

export default SeatTable;