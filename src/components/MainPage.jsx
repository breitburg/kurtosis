import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronUp, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/i18n.js';
import SeatTable from './SeatTable';
import SelectedSlotsPanel from './SelectedSlotsPanel';
import OnboardingScreen from './OnboardingScreen';
import Contributors from './Contributors.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import CodeBlock from './CodeBlock.jsx';
import Slot from '../models/Slot.js';
import KurtApi from '../services/KurtApi.js';

// Helper function to format error details with full stack trace
const formatErrorDetails = (error) => {
  const errorDetails = {
    message: error.message || 'Unknown error',
    name: error.name || 'Error',
    timestamp: new Date().toISOString(),
    stack: error.stack || 'No stack trace available'
  };

  // Add additional context if available
  if (error.cause) {
    errorDetails.cause = error.cause;
  }
  
  if (error.code) {
    errorDetails.code = error.code;
  }

  return JSON.stringify(errorDetails, null, 2);
};

// Helper function to get error name for display
const getErrorName = (error) => {
  return error.name || 'Error';
};

const SortOption = {
  SEAT_NUMBER: 'seatNumber',
  TOTAL_AVAILABLE: 'totalAvailable',
  MAX_CONSECUTIVE: 'maxConsecutive',
  AVAILABLE_NOW: 'availableNow',
};

const getSortLabels = (t) => ({
  [SortOption.SEAT_NUMBER]: t('sortOptions.sequential'),
  [SortOption.TOTAL_AVAILABLE]: t('sortOptions.mostAvailable'),
  [SortOption.MAX_CONSECUTIVE]: t('sortOptions.maxConsecutive'),
  [SortOption.AVAILABLE_NOW]: t('sortOptions.availableNow'),
});

const MainPage = () => {
  const { t } = useTranslation();
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
  const [COPIED_RANGE_INDEX, SET_COPIED_RANGE_INDEX] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [rNumber, setRNumber] = useState(() => {
    return localStorage.getItem('rNumber') || '';
  });
  const [showContributors, setShowContributors] = useState(false);

  // Generate date options (today + 8 days)
  const generateDateOptions = () => {
    const options = [];
    const today = new Date();

    for (let i = 0; i < 9; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const isoDate = date.toISOString().split('T')[0];
      let label;

      if (i === 0) {
        label = t('dates.today');
      } else if (i === 1) {
        label = t('dates.tomorrow');
      } else {
        label = date.toLocaleDateString(i18n.language, {
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
        setError(err);
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

  // Handle R-number submission from onboarding
  const handleRNumberSubmit = (rNumber) => {
    setRNumber(rNumber);
    localStorage.setItem('rNumber', rNumber);
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
      setError(err);
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
  const getSortedSlots = useCallback(() => {
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
  }, [slots, selectedSort]);

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

  const sortedSlots = useMemo(() => getSortedSlots(), [getSortedSlots]);

  // Calculate occupancy percentage (excluding unavailable slots)
  const occupancyPercentage = useMemo(() => {
    if (!slots.length) return 0;
    
    // Only count available and busy slots (exclude unavailable ones)
    const availableSlots = slots.filter(slot => !slot.isUnavailable());
    const totalSlots = availableSlots.length;
    const busySlots = availableSlots.filter(slot => slot.isBusy()).length;
    
    return totalSlots > 0 ? Math.round((busySlots / totalSlots) * 100) : 0;
  }, [slots]);

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
      .map(([resourceId, data]) => {
        const sortedHours = data.hours.sort((a, b) => a - b);
        const ranges = [];
        let start = sortedHours[0];
        let end = sortedHours[0];

        for (let i = 1; i < sortedHours.length; i++) {
          if (sortedHours[i] === end + 1) {
            end = sortedHours[i];
          } else {
            ranges.push({ start, end: end + 1, seatName: data.seatName, resourceId });
            start = sortedHours[i];
            end = sortedHours[i];
          }
        }
        ranges.push({ start, end: end + 1, seatName: data.seatName, resourceId });
        return ranges;
      })
      .flat()
      .sort((a, b) => a.start - b.start);

    const totalHours = selectedSlotsArray.length;
    const hasLongSession = timeRanges.some(range => (range.end - range.start) > 6);

    return { timeRanges, totalHours, hasLongSession };
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
    alert('KURT has recently discontinued the KURT 2 booking system that was previously used for reservations. Please book your seat manually using KURT 3. You will now be redirected to the new KURT 3 system.');
    window.open('https://kuleuven.be/kurt', '_blank');
  };

  // Handle copying booking link
  const HANDLE_COPY_BOOKING_LINK = async (range, index) => {
    const bookingLink = generateBookingLinkForRange(range);
    if (bookingLink) {
      try {
        await navigator.clipboard.writeText(bookingLink);
        SET_COPIED_RANGE_INDEX(index);
        setTimeout(() => SET_COPIED_RANGE_INDEX(null), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  // Handle check-in link
  const handleCheckIn = (range) => {
    const checkInLink = `https://kurt3.ghum.kuleuven.be/check-in/${range.resourceId}`;
    window.open(checkInLink, '_blank');
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
                className="library-select text-xl font-medium cursor-pointer w-full md:w-70 p-2 md:p-0 rounded md:rounded-none relative z-10"
                value={selectedLibrary}
                onChange={(e) => setSelectedLibrary(e.target.value)}
                disabled={loading}
                aria-label={t('selectLibrary')}
              >
                {Object.entries(groupedLibraries).map(([buildingName, librariesInBuilding]) => (
                  <optgroup key={buildingName} label={buildingName} className="bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white">
                    {librariesInBuilding.map((library) => (
                      <option key={library.file} value={library.file} className="bg-white dark:bg-black text-black dark:text-white">
                        {library.spaceName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 right-8 flex items-center px-2 md:px-0 text-xl leading-tight font-medium z-20 text-black dark:text-white">
                {getSelectedLibraryDisplayName()}
              </div>
            </div>

            {/* Date Selection */}
            <div className="flex w-full sm:flex-1 items-center">
              <select
                className="text-black dark:text-white cursor-pointer w-full p-2 md:p-0 rounded md:rounded-none bg-white dark:bg-black border-neutral-300 dark:border-neutral-700"
                value={selectedDate || ''}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={loading}
                aria-label={t('selectDate')}
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
                className="text-black dark:text-white cursor-pointer w-full p-2 md:p-0 rounded md:rounded-none bg-white dark:bg-black border-neutral-300 dark:border-neutral-700"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                aria-label={t('sortBy')}
              >
                {availableSortOptions.map((option) => (
                  <option key={option} value={option}>
                    {getSortLabels(t)[option]}
                  </option>
                ))}
              </select>
            </div>

            {/* User Info & Actions */}
            <div className="flex flex-1 items-center">
              <div className="text-xs tracking-wide space-y-2 text-black dark:text-white">
                <LanguageSwitcher />
                <div>
                  <p>
                    {t('userInfo.madeBy')} <button
                      type="button"
                      className="underline cursor-pointer"
                      onClick={() => setShowContributors(true)}
                    >
                      {t('userInfo.students')}
                    </button> {t('userInfo.inBelgium')}
                  </p>
                  <p>
                    {t('userInfo.wantToSayHi')}
                  </p>
                  <p>
                    <a href="mailto:kurtosis@breitburg.com" className="underline">{t('userInfo.emailUs')}</a> {t('userInfo.or')} <a href="https://github.com/breitburg/kurtosis/issues/new" className="underline">{t('userInfo.newIssue')}</a>
                  </p>
                </div>
                {rNumber && (
                  <div>
                    <p>{t('userInfo.using')} {rNumber}</p>
                    <button
                      type="button"
                      className="text-black dark:text-white underline cursor-pointer"
                      onClick={handleLogout}
                    >
                      {t('userInfo.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Main Content */}
        {!rNumber ? (
          <OnboardingScreen onRNumberSubmit={handleRNumberSubmit} />
        ) : loading ? (
          <div className="flex justify-center items-center py-8 text-neutral-500">
            <p className="text-center">
              {t('loading.lookingUp')}
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
              <p>{t('noSlots.title')}</p>
              <p>{t('noSlots.subtitle')}</p>
            </div>
          </div>
        ) : (
          <main className="flex flex-col lg:flex-row gap-4 lg:gap-12 px-4 md:px-8 pb-8">
            {/* Sidebar */}
            <aside className="w-full lg:w-70">
              <div className={`${selectedSlots.size !== 0 ? 'md:hidden ' : ''}my-8 md:my-0 gap-4 flex flex-col`}>
                <h2
                  className="text-3xl leading-none font-bold text-black dark:text-white tracking-tight"
                  style={{
                    textWrap:
                      'balance' /* Tailwind CSS doesn't support textWrap yet */,
                  }}
                >
                  {t('selectSlots').split('{highlighted}')[0]}
                  <span className="bg-black dark:bg-white text-white dark:text-black px-3 rounded-sm text-xl font-medium">
                    A
                  </span>
                  {t('selectSlots').split('{highlighted}')[1]}
                </h2>

                <p className="text-black dark:text-white leading-normal text-base">
                  {t('selectSlotsDescription')}
                </p>
                
                {slots.length > 0 && (
                  <div className="text-black dark:text-white text-sm">
                    <span className="font-medium">{t('libraryOccupancy', { percentage: occupancyPercentage })}</span>
                  </div>
                )}
              </div>
              {selectedSlots.size !== 0 && (
                <div className="hidden md:flex">
                  <SelectedSlotsPanel
                    selectedSlotsInfo={getSelectedSlotsInfo()}
                    handleOpenBookingLink={handleOpenBookingLink}
                    handleCheckIn={handleCheckIn}
                    isMobile={false}
                  />
                </div>
              )}
            </aside>

            {/* Seat Table */}
            <section className="flex-1 overflow-auto min-h-0">
              {error && (
                <div className="flex flex-col gap-4 justify-center items-center py-8" role="alert">
                  <div className="text-center text-6xl" aria-hidden="true">
                    ⚠︎
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{t('errorOccurred')}</p>
                  </div>
                  <button
                    onClick={loadSeatData}
                    className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-medium hover:opacity-70 cursor-pointer"
                  >
                    {t('retry')}
                  </button>
                  <CodeBlock 
                    content={formatErrorDetails(error)} 
                    title={error.message || 'Unknown error'}
                    collapsible={true}
                  />
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
            className="md:hidden fixed bottom-0 left-1/2 transform -translate-x-1/2 px-4 py-4 rounded-t-xl z-50 cursor-pointer shadow-lg flex items-center font-medium gap-2 bg-blue-500 text-white"
            aria-label="Open booking links panel"
          >
            {getSelectedSlotsInfo().timeRanges.length === 1 
              ? t('bookingLinks', { count: getSelectedSlotsInfo().timeRanges.length })
              : t('bookingLinksPlural', { count: getSelectedSlotsInfo().timeRanges.length })
            }
            <ChevronUp size={20} strokeWidth={2.5} aria-hidden="true" />
          </button>
        )}

        {/* Mobile Drawer */}
        {selectedSlots.size > 0 && (
          <div
            className={`md:hidden fixed inset-0 bg-white dark:bg-black transform z-60 shadow-2xl ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
              }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
          >
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="absolute top-4 right-4 bg-gray-200 dark:bg-neutral-800 text-black dark:text-white p-2 rounded-full z-70 cursor-pointer"
              aria-label="Close booking links panel"
            >
              <X size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <div className="p-4 pt-16 h-full overflow-y-auto">
              <SelectedSlotsPanel
                selectedSlotsInfo={getSelectedSlotsInfo()}
                handleOpenBookingLink={handleOpenBookingLink}
                handleCheckIn={handleCheckIn}
                isMobile={true}
              />
            </div>
          </div>
        )}

      </div>

      {/* Contributors Modal */}
      {showContributors && (
        <div className="fixed inset-0 bg-neutral-500/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <Contributors onClose={() => setShowContributors(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
