import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const BoxWithIcon: React.FC<{
  icon: IconDefinition;
  title: string;
  content: string;
}> = ({ icon, title, content }) => {
  return (
    <div className="border p-4 rounded-md shadow-md flex flex-col items-center w-[85%] h-full">
      <div className="mb-2 text-[#305f9e]">
        <FontAwesomeIcon size="2x" icon={icon} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-md text-gray-700">{content}</p>
    </div>
  );
};

export default BoxWithIcon;
