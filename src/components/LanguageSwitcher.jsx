import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const availableLanguages = Object.keys(i18n.services.resourceStore.data);

  const getLanguageLabel = (code) => {
    const labels = {
      nl: 'Nederlands',
      en: 'English', 
      fr: 'Français'
    };
    return labels[code] || code;
  };

  return (
    <div className="relative">
      <Globe size={12} className="absolute left-2 md:left-0 top-1/2 transform -translate-y-1/2 text-black dark:text-white pointer-events-none" />
      <select
        className="text-xs bg-transparent border-none px-2 py-1 pl-7 md:p-0 md:pl-5 cursor-pointer text-black dark:text-white"
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label={t('language')}
      >
        {availableLanguages.map(code => (
          <option key={code} value={code}>
            {getLanguageLabel(code)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;