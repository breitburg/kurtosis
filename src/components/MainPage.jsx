import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'lucide-react';
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
  const [selectedLibrary, setSelectedLibrary] = useState('library-0');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [copiedRangeIndex, setCopiedRangeIndex] = useState(null);


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
        const response = await fetch('/studyspaces.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch studyspaces.json: ${response.status}`);
        }
        
        const studyspaces = await response.json();
        
        const libraryData = studyspaces.map((data, index) => ({
          file: `library-${index}`, // Generate a unique identifier
          buildingName: data.buildingName,
          spaceName: data.spaceName,
          seats: data.seats,
          locationId: data.locationId,
          pid: data.pid,
        }));

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
    setSelectedSlots(new Set()); // Clear selected slots when starting new data load

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

  // Handle slot selection/deselection
  const handleSlotClick = (slot) => {
    if (!slot.isAvailable()) return;
    
    const slotKey = `${slot.resourceId}-${slot.hour}`;
    const newSelectedSlots = new Set(selectedSlots);
    
    if (selectedSlots.has(slotKey)) {
      newSelectedSlots.delete(slotKey);
    } else {
      newSelectedSlots.add(slotKey);
    }
    
    setSelectedSlots(newSelectedSlots);
  };

  // Check if a slot is selected
  const isSlotSelected = (slot) => {
    const slotKey = `${slot.resourceId}-${slot.hour}`;
    return selectedSlots.has(slotKey);
  };

  // Check if any slot in the same hour is selected
  const isHourBlocked = (hour) => {
    return Array.from(selectedSlots).some(slotKey => {
      const [, slotHour] = slotKey.split('-');
      return parseInt(slotHour) === hour;
    });
  };

  // Handle hour click to deselect all slots in that hour
  const handleHourClick = (hour) => {
    const newSelectedSlots = new Set(selectedSlots);
    Array.from(selectedSlots).forEach(slotKey => {
      const [, slotHour] = slotKey.split('-');
      if (parseInt(slotHour) === hour) {
        newSelectedSlots.delete(slotKey);
      }
    });
    setSelectedSlots(newSelectedSlots);
  };

  // Get selected slots information for display
  const getSelectedSlotsInfo = () => {
    const selectedSlotsArray = Array.from(selectedSlots).map(slotKey => {
      const [resourceId, hour] = slotKey.split('-');
      const slot = slots.find(s => s.resourceId === resourceId && s.hour === parseInt(hour));
      return slot;
    }).filter(Boolean);

    // Group consecutive slots by seat
    const groupedByResource = selectedSlotsArray.reduce((acc, slot) => {
      if (!acc[slot.resourceId]) {
        acc[slot.resourceId] = {
          seatName: slot.seatName,
          hours: []
        };
      }
      acc[slot.resourceId].hours.push(slot.hour);
      return acc;
    }, {});

    // Convert to time ranges
    const timeRanges = Object.entries(groupedByResource).map(([, data]) => {
      const sortedHours = data.hours.sort((a, b) => a - b);
      const ranges = [];
      let start = sortedHours[0];
      let end = sortedHours[0];

      for (let i = 1; i < sortedHours.length; i++) {
        if (sortedHours[i] === end + 1) {
          end = sortedHours[i];
        } else {
          ranges.push({ start, end: end + 1, seatName: data.seatName });
          start = sortedHours[i];
          end = sortedHours[i];
        }
      }
      ranges.push({ start, end: end + 1, seatName: data.seatName });
      return ranges;
    }).flat();

    const totalHours = selectedSlotsArray.length;
    return { timeRanges, totalHours };
  };

  // Generate booking link for a range
  const generateBookingLinkForRange = (range) => {
    const library = libraries.find(lib => lib.file === selectedLibrary);
    if (!library) {
      console.error('Library not found');
      return null;
    }

    // Find the resourceId for this seat
    const resourceId = Object.keys(library.seats).find(
      id => library.seats[id] === range.seatName
    );

    if (!resourceId) {
      console.error('Resource ID not found for seat:', range.seatName);
      return null;
    }

    const api = new KurtApi();
    const selectedDateObj = new Date(selectedDate);

    // Generate booking link for the specific time range
    return api.generateBookingLink(
      resourceId,
      selectedDateObj,
      range.start,
      range.end
    );
  };

  // Handle opening booking link
  const handleOpenBookingLink = (range) => {
    const bookingLink = generateBookingLinkForRange(range);
    if (bookingLink) {
      window.open(bookingLink, '_blank');
    }
  };

  // Handle copying booking link
  const handleCopyBookingLink = async (range, index) => {
    const bookingLink = generateBookingLinkForRange(range);
    if (bookingLink) {
      try {
        await navigator.clipboard.writeText(bookingLink);
        setCopiedRangeIndex(index);
        setTimeout(() => setCopiedRangeIndex(null), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };


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
        <header className="flex flex-col md:flex-row md:items-start gap-4 md:gap-12 p-4 md:p-8">
          {/* Library Name */}
          <div className="w-full md:w-auto">
            <select
              className="library-select text-xl leading-tight font-medium text-black bg-white border border-gray-300 md:border-none outline-none cursor-pointer w-full md:w-70 p-2 md:p-0 rounded md:rounded-none"
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
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row gap-4 w-full md:flex-1">
            {/* Date Dropdown */}
            <div className="flex-1">
              <select
                className="text-black bg-white border border-gray-300 md:border-none outline-none cursor-pointer w-full p-2 md:p-0 rounded md:rounded-none"
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
            <div className="flex-1">
              <select
                className="text-black bg-white border border-gray-300 md:border-none outline-none cursor-pointer w-full p-2 md:p-0 rounded md:rounded-none"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
              >
                {availableSortOptions.map(option => (
                  <option key={option} value={option}>{SORT_LABELS[option]}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="flex-1">
              <div className="text-left text-xs tracking-wide">
                {loading ? (
                  <div></div>
                ) : (
                  <div className="text-black">{formatLastUpdated()}</div>
                )}
                {!loading && (
                  <button
                    className="text-black underline p-2 md:p-0 -m-2 md:m-0 cursor-pointer"
                    onClick={loadSeatData}
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center text-neutral-500">
              Looking up seats availability...
            </div>
          </div>
        ) : slots.length > 0 && !slots.some(slot => slot.isAvailable()) && !error ? (
          <div className="flex justify-center items-center py-8">
            <div className="text-center text-neutral-500">
              No available time slots found
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-12 px-4 md:px-8 pb-8">
            {/* Left Sidebar */}
            <div className="w-full lg:w-70">
              {selectedSlots.size === 0 ? (
                // Instructions when no slots selected
                <>
                  <h2 className="text-3xl leading-none font-bold text-black tracking-tight mb-4 md:mb-8">
                    Click on the <span className="bg-black text-white px-2 md:px-4 rounded-sm text-xl font-medium">A</span> slots you want to book
                  </h2>

                  <p className="text-black leading-normal text-base">
                    You can select multiple slots across different seats to create a sequence of seats to change during study session in case of limited library capacity.
                  </p>
                </>
              ) : (
                // Selected slots information panel
                <div className="flex flex-col gap-8">
                  {/* Total hours header */}
                  <div>
                    <h2 className="text-4xl leading-none font-bold text-black tracking-tight">
                      {getSelectedSlotsInfo().totalHours} hour{getSelectedSlotsInfo().totalHours !== 1 ? 's' : ''}
                    </h2>
                    <h2 className="text-4xl leading-none font-bold text-black tracking-tight">
                      in total
                    </h2>
                    <h2 className="text-4xl leading-none font-bold text-black tracking-tight">
                      selected
                    </h2>
                  </div>


                  {/* Time ranges list */}
                  <div className="flex flex-col gap-1">
                    <p className="mb-4 font-medium text-lg">
                      Your booking links:
                    </p>
                    {getSelectedSlotsInfo().timeRanges.map((range, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center py-1 border-b border-neutral-200"
                      >
                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mr-1">
                          {/* Link icon for copying link */}
                          <div className="relative">
                            <button
                              onClick={() => handleCopyBookingLink(range, index)}
                              className="p-1 hover:bg-neutral-100 rounded cursor-pointer"
                              title="Copy booking link"
                            >
                              <Link size={14} />
                            </button>
                            {copiedRangeIndex === index && (
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-neutral-700 text-white text-xs rounded whitespace-nowrap">
                                Copied!
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-neutral-700"></div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Clickable main content area */}
                        <div 
                          onClick={() => handleOpenBookingLink(range)}
                          className="flex-1 flex flex-col sm:flex-row items-start sm:items-center cursor-pointer hover:bg-neutral-100 rounded px-1 gap-1"
                        >
                          <span className="text-black text-base flex-1">
                            {range.seatName}
                          </span>
                          <span className="text-base text-neutral-500">
                            {String(range.start).padStart(2, '0')}:00 - {String(range.end).padStart(2, '0')}:00
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>


                  {/* Info text */}
                  <p className="text-black text-xs leading-normal tracking-wide">
                    It's impossible to book solely within this tool, trust us, we{' '}
                    <a href="/statement" className="underline">tried hard</a> to make it happen.
                  </p>
                </div>
              )}
            </div>

            {/* Main Table Area */}
            <div className="flex-1 overflow-auto min-h-0">
              {error && (
                <div className="text-center text-red-500 py-8">
                  Error: {error}
                </div>
              )}
              {!error && (
                <SeatTable 
                  slots={sortedSlots} 
                  onSlotClick={handleSlotClick}
                  isSlotSelected={isSlotSelected}
                  isHourBlocked={isHourBlocked}
                  onHourClick={handleHourClick}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainPage;