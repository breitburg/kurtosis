import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Contributors({ onClose }) {
  const { t } = useTranslation();
  const [contributors, setContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContributors = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/breitburg/kurtosis/contributors');
        const data = await response.json();
        setContributors(data);
      } catch (error) {
        console.error('Failed to fetch contributors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContributors();
  }, []);

  return (
    <div className="flex flex-col p-4 gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl leading-tight font-medium text-black dark:text-white">{t('contributors.title')}</h1>
        <button
          type="button"
          onClick={onClose}
          className="bg-gray-200 dark:bg-neutral-800 text-black dark:text-white p-2 rounded-full cursor-pointer"
          aria-label={t('contributors.close')}
        >
          <X size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="text-black dark:text-white leading-normal text-base">{t('contributors.loading')}</div>
      ) : contributors.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {contributors.map((contributor) => (
            <a
              key={contributor.id}
              href={`https://github.com/${contributor.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center text-center gap-4 hover:opacity-75 cursor-pointer"
            >
              <img
                src={contributor.avatar_url}
                alt={contributor.login}
                className="w-16 h-16 rounded-full"
              />
              <div className="text-black dark:text-white">
                {contributor.login}
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="text-black dark:text-white leading-normal text-base mb-6">{t('contributors.notFound')}</div>
      )}

      <a
        href="https://github.com/breitburg/kurtosis"
        target="_blank"
        rel="noopener noreferrer"
        className="text-neutral-600 tracking-wide underline text-xs text-center"
      >
        {t('contributors.viewOnGitHub')}
      </a>
    </div>
  );
}