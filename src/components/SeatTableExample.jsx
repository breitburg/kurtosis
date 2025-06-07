import React from 'react';
import SeatTable from './SeatTable';
import Slot from '../models/Slot.js';
import SlotStatus from '../models/SlotStatus.js';

const SeatTableExample = () => {
  // Flat list of slots - table will figure out what to display
  const slots = [
    // Seat 300855 - only some hours have data
    new Slot('300855', 13, SlotStatus.AVAILABLE),
    new Slot('300855', 14, SlotStatus.AVAILABLE),
    new Slot('300855', 15, SlotStatus.AVAILABLE),
    new Slot('300855', 16, SlotStatus.AVAILABLE),
    new Slot('300855', 19, SlotStatus.BUSY),
    new Slot('300855', 20, SlotStatus.BUSY),
    
    // Seat 300856 - scattered availability
    new Slot('300856', 11, SlotStatus.AVAILABLE),
    new Slot('300856', 12, SlotStatus.AVAILABLE),
    new Slot('300856', 15, SlotStatus.AVAILABLE),
    new Slot('300856', 16, SlotStatus.AVAILABLE),
    new Slot('300856', 17, SlotStatus.BUSY),
    new Slot('300856', 18, SlotStatus.BUSY),
    
    // Seat 300857 - mixed status with explicit unavailable times
    new Slot('300857', 8, SlotStatus.UNAVAILABLE),
    new Slot('300857', 9, SlotStatus.UNAVAILABLE),
    new Slot('300857', 13, SlotStatus.AVAILABLE),
    new Slot('300857', 14, SlotStatus.AVAILABLE),
    new Slot('300857', 18, SlotStatus.AVAILABLE),
    new Slot('300857', 19, SlotStatus.AVAILABLE),
    new Slot('300857', 23, SlotStatus.UNAVAILABLE)
  ];

  return (
    <div className="p-4">
      <SeatTable slots={slots} />
    </div>
  );
};

export default SeatTableExample;