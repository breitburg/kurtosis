import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronUp, X } from 'lucide-react';
import SeatTable from './SeatTable';
import SelectedSlotsPanel from './SelectedSlotsPanel';
import Slot from '../models/Slot.js';
import KurtApi from '../services/KurtApi.js';

const SortOption = {
  SEAT_NUMBER: 'seatNumber',
  TOTAL_AVAILABLE: 'totalAvailable',
  MAX_CONSECUTIVE: 'maxConsecutive',
  AVAILABLE_NOW: 'availableNow',
};

const SORT_LABELS = {
  [SortOption.SEAT_NUMBER]: 'Sequential',
  [SortOption.TOTAL_AVAILABLE]: 'Most available hours',
  [SortOption.MAX_CONSECUTIVE]: 'Max consecutive hours',
  [SortOption.AVAILABLE_NOW]: 'Available right now first',
};

const MainPage = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSort, setSelectedSort] = useState(SortOption.SEAT_NUMBER);
  const [selectedLibrary, setSelectedLibrary] = useState(() => {
    return localStorage.getItem('lastUsedStudySpace') || 'library-0';
  });
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [libraries, setLibraries] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState(new Set());
  const [copiedRangeIndex, setCopiedRangeIndex] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rNumber, setRNumber] = useState(() => {
    return localStorage.getItem('rNumber') || '';
  });
  const [tempRNumber, setTempRNumber] = useState('');

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
          day: 'numeric',
        });
      }

      options.push({ value: isoDate, label });
    }

    return options;
  };

  const dateOptions = generateDateOptions();

  // Save selected library to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('lastUsedStudySpace', selectedLibrary);
  }, [selectedLibrary]);

  // Load library data
  useEffect(() => {
    const loadLibraries = async () => {
      try {
        const response = await fetch('/studyspaces.json');
        if (!response.ok) {
          throw new Error(
            `Failed to fetch studyspaces.json: ${response.status}`
          );
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

        // Validate saved library still exists
        const savedLibrary = localStorage.getItem('lastUsedStudySpace');
        if (savedLibrary && !libraryData.find(lib => lib.file === savedLibrary)) {
          // If saved library doesn't exist, reset to default
          setSelectedLibrary('library-0');
        }
      } catch (err) {
        console.error('Failed to load libraries:', err);
      }
    };

    loadLibraries();
  }, []);

  // Group libraries by building name for dropdown
  const groupedLibraries = useMemo(() => {
    const groups = {};
    libraries.forEach((library) => {
      if (!groups[library.buildingName]) {
        groups[library.buildingName] = [];
      }
      groups[library.buildingName].push(library);
    });
    return groups;
  }, [libraries]);

  // Get display name for selected library (building + space name)
  const getSelectedLibraryDisplayName = () => {
    const library = libraries.find((lib) => lib.file === selectedLibrary);
    return library ? (
      <>
        {library.buildingName}
        <br />
        {library.spaceName}
      </>
    ) : '';
  };

  // Set default date to today
  useEffect(() => {
    if (dateOptions.length > 0 && !selectedDate) {
      setSelectedDate(dateOptions[0].value);
    }
  }, [dateOptions, selectedDate]);

  // Validate R-number format: [a-z] + 7 digits
  const validateRNumber = (value) => {
    const rNumberPattern = /^[a-z]\d{7}$/;
    return rNumberPattern.test(value.toLowerCase());
  };

  // Handle R-number input change
  const handleRNumberChange = (value) => {
    setTempRNumber(value);
  };

  // Handle R-number submission
  const handleRNumberSubmit = () => {
    if (!tempRNumber.trim()) return;

    const trimmedRNumber = tempRNumber.trim();
    if (!validateRNumber(trimmedRNumber)) {
      return;
    }

    setRNumber(trimmedRNumber.toLowerCase());
    localStorage.setItem('rNumber', trimmedRNumber.toLowerCase());
    setTempRNumber('');
  };

  // Handle logout (clear R-number)
  const handleLogout = () => {
    setRNumber('');
    localStorage.removeItem('rNumber');
    setSlots([]);
    setSelectedSlots(new Set());
  };

  // Load seat data when library or date changes
  const loadSeatData = useCallback(async () => {
    if (!selectedLibrary || !selectedDate || libraries.length === 0 || !rNumber) return;

    setLoading(true);
    setError(null);
    setSelectedSlots(new Set()); // Clear selected slots when starting new data load

    try {
      const library = libraries.find((lib) => lib.file === selectedLibrary);
      if (!library) {
        throw new Error('Library not found');
      }

      const resourceIds = Object.keys(library.seats);
      const uid = rNumber;

      const api = new KurtApi();
      const slotsData = await api.queryAvailability(
        resourceIds,
        selectedDate,
        uid
      );

      // Add seat names to slots
      const slotsWithNames = slotsData.map((slot) => {
        const seatName = library.seats[slot.resourceId] || slot.resourceId;
        return new Slot(slot.resourceId, slot.hour, slot.status, seatName);
      });

      setSlots(slotsWithNames);
    } catch (err) {
      console.error('Failed to load seat data:', err);
      setError(err.message);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedLibrary, selectedDate, libraries, rNumber]);

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadSeatData();
  }, [loadSeatData]);


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
          availableNow: false,
        };
      }
      acc[slot.resourceId].slots.push(slot);
      if (slot.isAvailable()) {
        acc[slot.resourceId].availableCount++;
      }
      return acc;
    }, {});

    // Calculate metrics for each seat
    Object.values(groupedSlots).forEach((group) => {
      // Sort slots by hour for consecutive calculation
      const sortedSlots = group.slots.sort((a, b) => a.hour - b.hour);

      // Calculate max consecutive available hours
      let maxConsecutive = 0;
      let currentConsecutive = 0;

      sortedSlots.forEach((slot) => {
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
      const currentSlot = sortedSlots.find((slot) => slot.hour === currentHour);
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
      group.slots.forEach((slot) => {
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
    return slots.some(
      (slot) => slot.hour === currentHour && slot.isAvailable()
    );
  }, [selectedDate, slots]);

  // Get available sort options
  const availableSortOptions = useMemo(() => {
    const options = [
      SortOption.SEAT_NUMBER,
      SortOption.TOTAL_AVAILABLE,
      SortOption.MAX_CONSECUTIVE,
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
    return Array.from(selectedSlots).some((slotKey) => {
      const [, slotHour] = slotKey.split('-');
      return parseInt(slotHour) === hour;
    });
  };

  // Handle hour click to deselect all slots in that hour
  const handleHourClick = (hour) => {
    const newSelectedSlots = new Set(selectedSlots);
    Array.from(selectedSlots).forEach((slotKey) => {
      const [, slotHour] = slotKey.split('-');
      if (parseInt(slotHour) === hour) {
        newSelectedSlots.delete(slotKey);
      }
    });
    setSelectedSlots(newSelectedSlots);
  };

  // Get selected slots information for display
  const getSelectedSlotsInfo = () => {
    const selectedSlotsArray = Array.from(selectedSlots)
      .map((slotKey) => {
        const [resourceId, hour] = slotKey.split('-');
        const slot = slots.find(
          (s) => s.resourceId === resourceId && s.hour === parseInt(hour)
        );
        return slot;
      })
      .filter(Boolean);

    // Group consecutive slots by seat
    const groupedByResource = selectedSlotsArray.reduce((acc, slot) => {
      if (!acc[slot.resourceId]) {
        acc[slot.resourceId] = {
          seatName: slot.seatName,
          hours: [],
        };
      }
      acc[slot.resourceId].hours.push(slot.hour);
      return acc;
    }, {});

    // Convert to time ranges
    const timeRanges = Object.entries(groupedByResource)
      .map(([, data]) => {
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
      })
      .flat()
      .sort((a, b) => a.start - b.start);

    const totalHours = selectedSlotsArray.length;
    return { timeRanges, totalHours };
  };

  // Generate booking link for a range
  const generateBookingLinkForRange = (range) => {
    const library = libraries.find((lib) => lib.file === selectedLibrary);
    if (!library) {
      console.error('Library not found');
      return null;
    }

    // Find the resourceId for this seat
    const resourceId = Object.keys(library.seats).find(
      (id) => library.seats[id] === range.seatName
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


  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        {rNumber && (
          <header className={`flex flex-col md:flex-row items-start gap-4 md:gap-12 p-4 md:p-8 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Library Selection */}
            <div className="w-full md:w-auto relative">
              <select
                className="library-select text-xl leading-tight font-medium text-transparent cursor-pointer w-full md:w-70 p-2 md:p-0 rounded md:rounded-none relative z-10"
                value={selectedLibrary}
                onChange={(e) => setSelectedLibrary(e.target.value)}
                disabled={loading}
                aria-label="Select library"
              >
                {Object.entries(groupedLibraries).map(([buildingName, librariesInBuilding]) => (
                  <optgroup key={buildingName} label={buildingName}>
                    {librariesInBuilding.map((library) => (
                      <option key={library.file} value={library.file} className="text-black">
                        {library.spaceName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 right-8 flex items-center px-2 md:px-0 text-xl leading-tight font-medium text-black z-20">
                {getSelectedLibraryDisplayName()}
              </div>
            </div>

            {/* Date Selection */}
            <div className="flex w-full sm:flex-1 items-center">
              <select
                className="text-black cursor-pointer w-full p-2 md:p-0 rounded md:rounded-none"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading}
                aria-label="Select date"
              >
                {dateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Options */}
            <div className="flex w-full sm:flex-1 items-center">
              <select
                className="text-black cursor-pointer w-full p-2 md:p-0 rounded md:rounded-none"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                aria-label="Sort by"
              >
                {availableSortOptions.map((option) => (
                  <option key={option} value={option}>
                    {SORT_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>

            {/* User Info & Actions */}
            <div className="flex flex-1 items-center">
              <div className="text-xs tracking-wide space-y-2">
                <div className="text-black">
                  <p>Want to say hi or report a bug?</p>
                  <p>
                    <a href="mailto:kurtosis@breitburg.com" className="underline">Contact</a> or make a <a href="https://github.com/breitburg/kurtosis/issues/new" className="underline">new issue</a>
                  </p>
                </div>
                {rNumber && (
                  <div className="text-black">
                    <p>Using {rNumber}</p>
                    <button
                      type="button"
                      className="text-black underline cursor-pointer"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        {!rNumber ? (
          <main className="flex justify-center items-start">
            <section className="w-md m-6 sm:m-12">
              <div className="flex flex-col gap-8 items-start">
                <header>
                  <h1 className="font-bold text-5xl leading-none text-black tracking-tight">
                    Kurtosis<br />finds seats faster.
                  </h1>
                </header>
                <div className="text-lg leading-normal text-black space-y-4">
                  <p>
                    Built by students and is not affiliated with KU Leuven.
                    Please use it responsibly and do not abuse the system.
                  </p>
                  <p>
                    This website communicates directly with the <a href="https://kuleuven.be/kurt" className='underline'>KU Leuven Reservation Tool</a> and does not store or
                    process any personal data. Moreover, it's <a href="https://github.com/breitburg/kurtosis" className='underline'>open-source</a>.
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <label htmlFor="r-number-input" className="font-medium text-lg">
                    Enter your R-number to begin:
                  </label>
                  <input
                    id="r-number-input"
                    type="text"
                    value={tempRNumber}
                    onChange={(e) => handleRNumberChange(e.target.value)}
                    placeholder="r0123456"
                    className="w-full p-2 text-xl text-black placeholder:text-black/30 bg-transparent border-2 border-neutral-400 outline-none focus:border-black"
                    onKeyDown={(e) => e.key === 'Enter' && handleRNumberSubmit()}
                  />
                </div>
                <button
                  onClick={handleRNumberSubmit}
                  disabled={!tempRNumber.trim() || !validateRNumber(tempRNumber)}
                  className="flex items-center justify-center aspect-square bg-black rounded-full w-50 p-4 font-medium text-2xl text-white disabled:bg-neutral-300 disabled:cursor-not-allowed hover:bg-neutral-800 cursor-pointer"
                >
                  Get Started
                </button>
              </div>
            </section>
          </main>
        ) : loading ? (
          <div className="flex justify-center items-center py-8 text-neutral-500">
            <p className="text-center">
              Looking up seats availability...
            </p>
          </div>
        ) : slots.length > 0 &&
          !slots.some((slot) => slot.isAvailable()) &&
          !error ? (
          <div className="flex flex-col gap-4 justify-center items-center py-8 text-neutral-500">
            <div className="text-center text-6xl" aria-hidden="true">
              ☹︎
            </div>
            <div className="text-center">
              <p>No available time slots found.</p>
              <p>Try to check another study space.</p>
            </div>
          </div>
        ) : (
          <main className="flex flex-col lg:flex-row gap-4 lg:gap-12 px-4 md:px-8 pb-8">
            {/* Sidebar */}
            <aside className="w-full lg:w-70">
              <div className={`${selectedSlots.size !== 0 ? 'md:hidden ' : ''}my-8 md:my-0 gap-4 flex flex-col`}>
                <h2
                  className="text-3xl leading-none font-bold text-black tracking-tight"
                  style={{
                    textWrap:
                      'balance' /* Tailwind CSS doesn't support textWrap yet */,
                  }}
                >
                  Select the{' '}
                  <span className="bg-black text-white px-3 rounded-sm text-xl font-medium">
                    A
                  </span>{' '}
                  slots you want to book
                </h2>

                <p className="text-black leading-normal text-base">
                  You can select multiple slots across different seats to create
                  a sequence of seats to change during study session in case of
                  limited library capacity.
                </p>
              </div>
              {selectedSlots.size !== 0 && (
                <div className="hidden md:flex">
                  <SelectedSlotsPanel
                    selectedSlotsInfo={getSelectedSlotsInfo()}
                    handleCopyBookingLink={handleCopyBookingLink}
                    handleOpenBookingLink={handleOpenBookingLink}
                    copiedRangeIndex={copiedRangeIndex}
                    isMobile={false}
                  />
                </div>
              )}
            </aside>

            {/* Seat Table */}
            <section className="flex-1 overflow-auto min-h-0">
              {error && (
                <div className="text-center text-red-500 py-8" role="alert">
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
            </section>
          </main>
        )}

        {/* Mobile Drawer Toggle Button */}
        {selectedSlots.size > 0 && !isDrawerOpen && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="md:hidden fixed bottom-0 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-4 rounded-t-xl z-50 cursor-pointer shadow-lg flex items-center font-medium gap-2"
            aria-label="Open booking links panel"
          >
            Your {getSelectedSlotsInfo().timeRanges.length} booking link{getSelectedSlotsInfo().timeRanges.length !== 1 ? 's' : ''}
            <ChevronUp size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}

        {/* Mobile Drawer */}
        {selectedSlots.size > 0 && (
          <div
            className={`md:hidden fixed inset-0 bg-white transform duration-300 ease-out z-60 shadow-2xl ${
              isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 right-4 bg-gray-200 text-black p-2 rounded-full z-70 cursor-pointer"
              aria-label="Close booking links panel"
            >
              <X size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <div className="p-4 pt-16 h-full overflow-y-auto">
              <SelectedSlotsPanel
                selectedSlotsInfo={getSelectedSlotsInfo()}
                handleCopyBookingLink={handleCopyBookingLink}
                handleOpenBookingLink={handleOpenBookingLink}
                copiedRangeIndex={copiedRangeIndex}
                isMobile={true}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default MainPage;
