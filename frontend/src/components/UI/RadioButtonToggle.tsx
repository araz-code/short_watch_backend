import { useTranslation } from "react-i18next";

const RadioButtonToggle: React.FC<{
  options: string[];
  selectedOption: string;
  onSelectChange: (value: string) => void;
}> = ({ options, selectedOption, onSelectChange }) => {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      className="inline-flex items-center gap-4 text-[11px] font-medium tracking-wide uppercase"
    >
      {options.map((option, index) => {
        const isSelected = selectedOption === option;
        return (
          <label
            key={option}
            htmlFor={`${option}-${index}`}
            className={`cursor-pointer select-none border-b-2 pb-0.5 transition-colors duration-150 ${
              isSelected
                ? "text-blue-500 border-blue-500"
                : "text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <input
              type="radio"
              name={`toggle-${options.join("-")}`}
              id={`${option}-${index}`}
              value={option}
              className="sr-only"
              checked={isSelected}
              onChange={(event) => onSelectChange(event.target.value)}
            />
            {t(option)}
          </label>
        );
      })}
    </div>
  );
};

export default RadioButtonToggle;
