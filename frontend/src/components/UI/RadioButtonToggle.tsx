import { useTranslation } from "react-i18next";

const RadioButtonToggle: React.FC<{
  options: string[];
  selectedOption: string;
  onSelectChange: (value: string) => void;
}> = ({ options, selectedOption, onSelectChange }) => {
  const { t } = useTranslation();

  return (
    <div className="">
      <div className="inline-flex rounded-xl">
        {options.map((option, index) => (
          <div key={option}>
            <input
              type="radio"
              name={`${option}-${index}`}
              id={`${option}-${index}`}
              value={option}
              className="peer hidden"
              checked={selectedOption === option}
              onChange={(event) => onSelectChange(event.target.value)}
            />
            <label
              htmlFor={`${option}-${index}`}
              className="block text-xs-plus sm:text-sm cursor-pointer select-none rounded-xl px-3 py-1 text-center peer-checked:bg-blue-500 peer-checked:font-medium peer-checked:text-white dark:text-white hover:bg-blue-100"
            >
              {t(option)}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RadioButtonToggle;
