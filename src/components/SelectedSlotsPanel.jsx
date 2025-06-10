import { Link, ArrowUpRightIcon, TimerResetIcon } from 'lucide-react';

const SelectedSlotsPanel = ({
  selectedSlotsInfo,
  handleCopyBookingLink,
  handleOpenBookingLink,
  copiedRangeIndex,
  isMobile = false
}) => {
  const buttonPadding = isMobile ? "p-3" : "p-1";
  const contentPadding = isMobile ? "px-4 py-3" : "px-1";

  return (
    <div className="flex-col gap-8 flex">
      {/* Total hours header */}
      <h2 className="text-3xl leading-none font-bold text-black dark:text-white tracking-tight">
        {selectedSlotsInfo.totalHours} hour
        {selectedSlotsInfo.totalHours !== 1 ? 's' : ''}
        <br />in total<br />selected
      </h2>

      {/* Long session alert */}
      {selectedSlotsInfo.hasLongSession && (
        <div className="p-2 pr-3 border-2 border-black dark:border-white flex items-start gap-2">
          <TimerResetIcon size={22} className="text-black dark:text-white flex-shrink-0 mt-1" />
          <p className="leading-normal text-black dark:text-white font-medium">
            Planning a long study session? Consider including an hour break to allow others to use the space while you step away.
          </p>
        </div>
      )}

      {/* Time ranges list */}
      <div className="flex flex-col gap-1">
        <p className="mb-4 font-medium text-lg">
          Your booking links:
        </p>
        {selectedSlotsInfo.timeRanges.map((range, index) => (
          <div
            key={index}
            className="flex justify-between items-center py-1 border-b border-neutral-200 dark:border-neutral-700"
          >
            {/* Action buttons */}
            <div className="flex items-center gap-1 mr-1">
              {/* Link icon for copying link */}
              <div className="relative">
                <button
                  onClick={() => handleCopyBookingLink(range, index)}
                  className={`${buttonPadding} rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800`}
                  title="Copy booking link"
                >
                  <Link size={14} />
                </button>
                {copiedRangeIndex === index && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-neutral-700 dark:bg-neutral-300 text-white dark:text-black text-xs rounded whitespace-nowrap">
                    Copied
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-neutral-700 dark:border-t-neutral-300"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Clickable main content area */}
            <div
              onClick={() => handleOpenBookingLink(range)}
              className={`flex-1 flex flex-row items-center cursor-pointer rounded ${contentPadding} gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800`}
            >
              <span className="text-base text-black dark:text-white">
                {range.seatName}
              </span>
              <span className="text-base flex-1 text-neutral-500 dark:text-neutral-400">
                {String(range.start).padStart(2, '0')}:00 -{' '}
                {String(range.end).padStart(2, '0')}:00
              </span>
              <ArrowUpRightIcon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Info text */}
      <p className="text-xs leading-normal tracking-wide text-black dark:text-white">
        It's impossible to book solely within this tool, trust us,
        we{' '}
        <a href="/statement" className="underline">
          tried hard
        </a>{' '}
        to make it happen.
      </p>
    </div>
  );
};

export default SelectedSlotsPanel;