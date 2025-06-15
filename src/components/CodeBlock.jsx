import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

const CodeBlock = ({ content, title, collapsible = false }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="max-w-2xl mx-auto border-2 border-black dark:border-white">
      {title && (
        <div className="p-2 flex justify-between items-center gap-4">
          <div 
            className={`flex items-center gap-2 ${collapsible ? 'cursor-pointer hover:opacity-70' : ''}`}
            onClick={collapsible ? toggleExpanded : undefined}
            title={collapsible ? (isExpanded ? t('codeBlock.collapse') : t('codeBlock.expand')) : undefined}
          >
            {collapsible && (
              <span className="text-black dark:text-white">
                {isExpanded ? <ChevronDown size={16} strokeWidth={3} /> : <ChevronRight size={16} strokeWidth={3} />}
              </span>
            )}
            <h3 className="leading-normal text-black dark:text-white font-medium">{title}</h3>
          </div>
          <button
            onClick={handleCopy}
            className="text-black dark:text-white hover:opacity-70 cursor-pointer"
            title={copied ? t('codeBlock.copied') : t('codeBlock.copy')}
          >
            {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={3} />}
          </button>
        </div>
      )}
      {isExpanded && (
        <div className="p-2">
          <pre className="text-sm text-black dark:text-white whitespace-pre-wrap font-mono overflow-x-auto">
            <code>{content}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default CodeBlock;