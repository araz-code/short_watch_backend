import { useTranslation } from "react-i18next";

const RadioButtonToggle: React.FC<{
  options: string[];
  selectedOption: string;
  onSelectChange: (value: string) => void;
}> = ({ options, selectedOption, onSelectChange }) => {
  const { t } = useTranslation();

  return (
    <div className="flex rounded-xl bg-gray-200 p-0">
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
            className="block text-sm cursor-pointer select-none rounded-xl px-3 py-1 text-center peer-checked:bg-blue-500 peer-checked:font-medium peer-checked:text-white"
          >
            {t(option)}
          </label>
        </div>
      ))}
    </div>
  );
};

export default RadioButtonToggle;
