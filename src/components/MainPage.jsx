import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SeatTable from './SeatTable';
import Slot from '../models/Slot.js';
import KurtApi from '../services/KurtApi.js';

const SortOption = {
  SEAT_NUMBER: 'seatNumber',
  TOTAL_AVAILABLE: 'totalAvailable',
  MAX_CONSECUTIVE: 'maxConsecutive',
  AVAILABLE_NOW: 'availableNow'
};

const SORT_LABELS = {
  [SortOption.SEAT_NUMBER]: 'Sequential',
  [SortOption.TOTAL_AVAILABLE]: 'Most available hours',
  [SortOption.MAX_CONSECUTIVE]: 'Max consecutive hours',
  [SortOption.AVAILABLE_NOW]: 'Available right now first'
};

const MainPage = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSort, setSelectedSort] = useState(SortOption.SEAT_NUMBER);
  const [selectedLibrary, setSelectedLibrary] = useState('agora.json');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);


  // Generate date options (today + 7 days)
  const generateDateOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 8; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const isoDate = date.toISOString().split('T')[0];
      let label;

      if (i === 0) {
        label = 'Today';
      } else if (i === 1) {
        label = 'Tomorrow';
      } else {
        label = date.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
      }

      options.push({ value: isoDate, label });
    }

    return options;
  };

  const dateOptions = generateDateOptions();

  // Load library data
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const libraryFiles = [
          'agora.json', 'agora-blok-rooms.json', 'agora-flexispace.json', 'agora-rooms.json',
          'antwerp-balustrade.json', 'antwerp-silentstudy.json',
          'arenberg-main.json', 'arenberg-rest.json', 'arenberg-tulp.json',
          'ebib.json', 'erasmus.json', 'kulak.json',
          'ldc-back.json', 'ldc-flex.json', 'ldc-inkom.json', 'ldc-leeszaal.json', 'ldc-rooms.json'
        ];

        const libraryData = [];

        for (const file of libraryFiles) {
          try {
            const response = await fetch(`/${file}`);
            if (response.ok) {
              const data = await response.json();
              libraryData.push({
                file,
                buildingName: data.buildingName,
                spaceName: data.spaceName,
                seats: data.seats
              });
            }
          } catch (err) {
            console.warn(`Failed to load ${file}:`, err);
          }
        }

        setLibraries(libraryData);
      } catch (err) {
        console.error('Failed to load libraries:', err);
      }
    };

    loadLibraries();
  }, []);

  // Set default date to today
  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0].value);
    }
  }, [dateOptions, selectedDate]);

  // Load seat data when library or date changes
  const loadSeatData = useCallback(async () => {
    if (!selectedLibrary || !selectedDate || libraries.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const library = libraries.find(lib => lib.file === selectedLibrary);
      if (!library) {
        throw new Error('Library not found');
      }

      const resourceIds = Object.keys(library.seats);
      const uid = 'r0971578';

      const api = new KurtApi();
      const slotsData = await api.queryAvailability(resourceIds, selectedDate, uid);

      // Add seat names to slots
      const slotsWithNames = slotsData.map(slot => {
        const seatName = library.seats[slot.resourceId] || slot.resourceId;
        return new Slot(slot.resourceId, slot.hour, slot.status, seatName);
      });

      setSlots(slotsWithNames);
      setLastUpdated(new Date());
      setSecondsSinceUpdate(0);

    } catch (err) {
      console.error('Failed to load seat data:', err);
      setError(err.message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedLibrary, selectedDate, libraries]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadSeatData();
  }, [loadSeatData]);

  // Update seconds counter
  useEffect(() => {
    if (!lastUpdated || loading) return;

    const interval = setInterval(() => {
      const now = new Date();
      const diffInSeconds = Math.floor((now - lastUpdated) / 1000);
      setSecondsSinceUpdate(diffInSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastUpdated, loading]);

  // Sort slots based on selected sort option
  const getSortedSlots = () => {
    if (!slots.length) return [];

    // Group slots by resourceId and calculate metrics
    const groupedSlots = slots.reduce((acc, slot) => {
      if (!acc[slot.resourceId]) {
        acc[slot.resourceId] = {
          resourceId: slot.resourceId,
          seatName: slot.seatName || slot.resourceId,
          slots: [],
          availableCount: 0,
          maxConsecutive: 0,
          availableNow: false
        };
      }
      acc[slot.resourceId].slots.push(slot);
      if (slot.isAvailable()) {
        acc[slot.resourceId].availableCount++;
      }
      return acc;
    }, {});

    // Calculate metrics for each seat
    Object.values(groupedSlots).forEach(group => {
      // Sort slots by hour for consecutive calculation
      const sortedSlots = group.slots.sort((a, b) => a.hour - b.hour);

      // Calculate max consecutive available hours
      let maxConsecutive = 0;
      let currentConsecutive = 0;

      sortedSlots.forEach(slot => {
        if (slot.isAvailable()) {
          currentConsecutive++;
          maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        } else {
          currentConsecutive = 0;
        }
      });

      group.maxConsecutive = maxConsecutive;

      // Check if available right now (current hour)
      const currentHour = new Date().getHours();
      const currentSlot = sortedSlots.find(slot => slot.hour === currentHour);
      group.availableNow = currentSlot ? currentSlot.isAvailable() : false;

      // Re-sort slots back to original order (8-23)
      group.slots = sortedSlots;
    });

    const sortedGroups = Object.values(groupedSlots);

    switch (selectedSort) {
      case SortOption.SEAT_NUMBER:
        sortedGroups.sort((a, b) => {
          const aNum = parseInt(a.seatName.match(/\d+/)?.[0] || '0');
          const bNum = parseInt(b.seatName.match(/\d+/)?.[0] || '0');
          return aNum - bNum;
        });
        break;
      case SortOption.TOTAL_AVAILABLE:
        sortedGroups.sort((a, b) => b.availableCount - a.availableCount);
        break;
      case SortOption.MAX_CONSECUTIVE:
        sortedGroups.sort((a, b) => b.maxConsecutive - a.maxConsecutive);
        break;
      case SortOption.AVAILABLE_NOW:
        sortedGroups.sort((a, b) => {
          if (a.availableNow && !b.availableNow) return -1;
          if (!a.availableNow && b.availableNow) return 1;
          // If both same availability status, sort by total available hours
          return b.availableCount - a.availableCount;
        });
        break;
      default:
        break;
    }

    // Flatten back to slot array, preserving the sorted order by adding a sortOrder property
    const flattenedSlots = [];
    sortedGroups.forEach((group, groupIndex) => {
      group.slots.forEach(slot => {
        slot.sortOrder = groupIndex; // Add sort order to preserve grouping
        flattenedSlots.push(slot);
      });
    });

    return flattenedSlots;
  };

  // Check if "Available right now" option should be shown
  const shouldShowAvailableNow = useMemo(() => {
    // Only show if today is selected
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) return false;

    // Only show if there's at least one slot available for current hour
    const currentHour = new Date().getHours();
    return slots.some(slot => slot.hour === currentHour && slot.isAvailable());
  }, [selectedDate, slots]);

  // Get available sort options
  const availableSortOptions = useMemo(() => {
    const options = [
      SortOption.SEAT_NUMBER,
      SortOption.TOTAL_AVAILABLE,
      SortOption.MAX_CONSECUTIVE
    ];

    if (shouldShowAvailableNow) {
      options.push(SortOption.AVAILABLE_NOW);
    }

    return options;
  }, [shouldShowAvailableNow]);

  // Reset sort to seat number if current sort is no longer available
  useEffect(() => {
    if (!availableSortOptions.includes(selectedSort)) {
      setSelectedSort(SortOption.SEAT_NUMBER);
    }
  }, [availableSortOptions, selectedSort]);

  const sortedSlots = useMemo(() => getSortedSlots(), [slots, selectedSort]);


  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never updated';
    if (secondsSinceUpdate < 60) return `Last updated ${secondsSinceUpdate} sec. ago`;
    const minutes = Math.floor(secondsSinceUpdate / 60);
    return `Last updated ${minutes} min. ago`;
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-start gap-12 p-8">
          {/* Left: Library Name */}
          <select
            className="library-select text-xl leading-tight font-medium text-black bg-white border-none outline-none cursor-pointer w-70"
            value={selectedLibrary}
            onChange={(e) => setSelectedLibrary(e.target.value)}
            disabled={loading}
          >
            {libraries.map(library => (
              <option key={library.file} value={library.file}>
                {`${library.buildingName}\n${library.spaceName}`}
              </option>
            ))}
          </select>

          {/* Date Dropdown */}
          <div className="1 flex">
            <select
              className="text-black bg-white border-none outline-none cursor-pointer"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={loading}
            >
              {dateOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex-1 flex">
            <select
              className="text-black bg-white border-none outline-none cursor-pointer"
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value)}
            >
              {availableSortOptions.map(option => (
                <option key={option} value={option}>{SORT_LABELS[option]}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex-1 flex">
            <div className="text-left text-xs tracking-wide">
              <div className="text-black">{loading ? 'Currently looking for seats...' : formatLastUpdated()}</div>
              {!loading && (
                <button
                  className="text-black underline"
                  onClick={loadSeatData}
                >
                  Refresh
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex gap-12 px-8 pb-8">
          {/* Left Sidebar */}
          <div className="w-70">
            <h2 className="text-3xl leading-none font-bold text-black tracking-tight mb-8">
              Click on the <span className="bg-black text-white px-4 rounded-sm text-xl font-medium">A</span> slots you want to book
            </h2>

            <p className="text-black leading-normal">
              You can select multiple slots across different seats to create a sequence of seats to change during study session in case of limited library capacity.
            </p>
          </div>

          {/* Main Table Area */}
          <div className="flex-1 overflow-auto">
            {loading && (
              <div className="text-center text-gray-500 py-8">
                Loading seat data...
              </div>
            )}
            {error && (
              <div className="text-center text-red-500 py-8">
                Error: {error}
              </div>
            )}
            {!loading && !error && (
              <SeatTable slots={sortedSlots} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;