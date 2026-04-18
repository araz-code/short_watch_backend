import { useTranslation } from "react-i18next";
import { useRef, useLayoutEffect, useState, useCallback } from "react";

const RadioButtonToggle: React.FC<{
  options: string[];
  selectedOption: string;
  onSelectChange: (value: string) => void;
}> = ({ options, selectedOption, onSelectChange }) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLLabelElement | null)[]>([]);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    opacity: 0,
  });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const selectedIndex = options.indexOf(selectedOption);
    const label = labelRefs.current[selectedIndex];
    if (label) {
      const containerRect = container.getBoundingClientRect();
      const labelRect = label.getBoundingClientRect();
      setIndicatorStyle({
        width: labelRect.width,
        transform: `translateX(${labelRect.left - containerRect.left}px)`,
        opacity: 1,
      });
    }
  }, [selectedOption, options]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex rounded-full bg-gray-100 dark:bg-[#2a2a2a] p-0.5"
    >
      <div
        className="absolute top-0.5 left-0 h-[calc(100%-4px)] bg-blue-500 rounded-full transition-all duration-300 ease-out shadow-sm"
        style={indicatorStyle}
      />
      {options.map((option, index) => (
        <label
          key={option}
          ref={(el) => {
            labelRefs.current[index] = el;
          }}
          htmlFor={`${option}-${index}`}
          className={`relative z-10 block text-xs-plus sm:text-sm cursor-pointer select-none rounded-full px-3 sm:px-4 py-1.5 text-center transition-colors duration-300 ${
            selectedOption === option
              ? "text-white font-medium"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          <input
            type="radio"
            name={`toggle-${options.join("-")}`}
            id={`${option}-${index}`}
            value={option}
            className="hidden"
            checked={selectedOption === option}
            onChange={(event) => onSelectChange(event.target.value)}
          />
          {t(option)}
        </label>
      ))}
    </div>
  );
};

export default RadioButtonToggle;
