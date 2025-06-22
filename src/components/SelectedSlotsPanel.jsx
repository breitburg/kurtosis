import { ArrowUpRightIcon, TimerResetIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SelectedSlotsPanel = ({
  selectedSlotsInfo,
  handleOpenBookingLink,
  isMobile = false
}) => {
  const { t } = useTranslation();
  const contentPadding = isMobile ? "px-4 py-3" : "px-1";

  return (
    <div className="flex-col gap-8 flex">
      {/* Total hours header */}
      <h2 className="text-3xl leading-none font-bold text-black dark:text-white tracking-tight">
        {selectedSlotsInfo.totalHours} {selectedSlotsInfo.totalHours === 1 ? t('selectedSlots.hour') : t('selectedSlots.hours')}
        <br />{t('selectedSlots.inTotal')}<br />{t('selectedSlots.selected')}
      </h2>

      {/* Long session alert */}
      {selectedSlotsInfo.hasLongSession && (
        <div className="p-2 pr-3 border-2 border-black dark:border-white flex items-start gap-2">
          <TimerResetIcon size={22} className="text-black dark:text-white flex-shrink-0 mt-1" />
          <p className="leading-normal text-black dark:text-white font-medium">
            {t('selectedSlots.longSessionAlert')}
          </p>
        </div>
      )}

      {/* Time ranges list */}
      <div className="flex flex-col gap-1">
        <p className="mb-4 font-medium text-lg">
          {t('selectedSlots.bookingLinks')}
        </p>
        {selectedSlotsInfo.timeRanges.map((range, index) => (
          <div
            key={index}
            className="py-1 border-b border-neutral-200 dark:border-neutral-700"
          >
            {/* Clickable main content area */}
            <div
              onClick={() => handleOpenBookingLink(range)}
              className={`flex flex-row items-center cursor-pointer rounded ${contentPadding} gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800`}
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
        {t('selectedSlots.impossibleToBook').split('{link}')[0]}
        <a href="/statement" className="underline">
          {t('selectedSlots.linkText')}
        </a>
        {t('selectedSlots.impossibleToBook').split('{link}')[1]}
      </p>
    </div>
  );
};

export default SelectedSlotsPanel;