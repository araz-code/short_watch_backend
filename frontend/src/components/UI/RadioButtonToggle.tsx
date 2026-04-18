import { useTranslation } from "react-i18next";

const RadioButtonToggle: React.FC<{
  options: string[];
  selectedOption: string;
  onSelectChange: (value: string) => void;
}> = ({ options, selectedOption, onSelectChange }) => {
  const { t } = useTranslation();

  return (
    <div className="inline-flex rounded-full bg-gray-100 dark:bg-[#2a2a2a] p-0.5">
      {options.map((option, index) => (
        <label
          key={option}
          htmlFor={`${option}-${index}`}
          className={`block text-xs-plus sm:text-sm cursor-pointer select-none rounded-full px-3 sm:px-4 py-1.5 text-center ${
            selectedOption === option
              ? "bg-blue-500 text-white font-medium shadow-sm"
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
