import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const OnboardingScreen = ({ onRNumberSubmit }) => {
  const { t } = useTranslation();
  const [tempRNumber, setTempRNumber] = useState('');

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

    onRNumberSubmit(trimmedRNumber.toLowerCase());
    setTempRNumber('');
  };

  return (
    <main className="flex justify-center items-start">
      <section className="w-md m-6 sm:m-12">
        <div className="flex flex-col gap-8 items-start">
          <div className="self-start">
            <LanguageSwitcher />
          </div>
          <header>
            <h1 className="font-bold text-5xl leading-none text-black dark:text-white tracking-tight">
              {t('onboarding.title')}
            </h1>
          </header>
          <div className="text-lg leading-normal text-black dark:text-white space-y-4">
            <p>
              {t('onboarding.description1')}
            </p>
            <p>
              {t('onboarding.description2').split('{link}')[0]}
              <a href="https://kuleuven.be/kurt" className='underline'>{t('onboarding.linkText')}</a>
              {t('onboarding.description2').split('{link}')[1].split('{openSourceLink}')[0]}
              <a href="https://github.com/breitburg/kurtosis" className='underline'>{t('onboarding.openSourceText')}</a>
              {t('onboarding.description2').split('{openSourceLink}')[1]}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label htmlFor="r-number-input" className="font-medium text-lg">
              {t('onboarding.enterRNumber')}
            </label>
            <input
              id="r-number-input"
              type="text"
              value={tempRNumber}
              onChange={(e) => handleRNumberChange(e.target.value)}
              placeholder="r0123456"
              className="w-full p-2 text-xl text-black dark:text-white placeholder:text-neutral-500 dark:placeholder:text-neutral-400 bg-transparent border-2 border-neutral-400 dark:border-neutral-600 outline-none focus:border-black dark:focus:border-white"
              onKeyDown={(e) => e.key === 'Enter' && handleRNumberSubmit()}
            />
          </div>
          <button
            onClick={handleRNumberSubmit}
            disabled={!tempRNumber.trim() || !validateRNumber(tempRNumber)}
            className={`flex items-center justify-center aspect-square rounded-full w-50 p-4 font-medium text-2xl
              ${!tempRNumber.trim() || !validateRNumber(tempRNumber) 
                ? 'bg-neutral-300 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-600 cursor-not-allowed' 
                : 'bg-black dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer'
              }`}
          >
            {t('onboarding.getStarted')}
          </button>
        </div>
      </section>
    </main>
  );
};

export default OnboardingScreen;