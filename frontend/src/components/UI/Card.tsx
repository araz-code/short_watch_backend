/*import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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

export default BoxWithIcon;*/

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const Card: React.FC<{
  icon: IconDefinition;
  title: string;
  content: string;
}> = ({ icon, title, content }) => {
  return (
    <figure className="p-4 max-w-sm text-gray-800 dark:text-white">
      <div className="flex flex-col border p-5 rounded-md shadow-md h-full">
        <div className="flex flex-col items-center mb-3">
          <div className="mb-2 text-[#305f9e] dark:text-white">
            <FontAwesomeIcon size="2x" icon={icon} />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
        </div>
        <div className="flex flex-col justify-between flex-grow">
          <p className="leading-relaxed">{content}</p>
        </div>
      </div>
    </figure>
  );
};

export default Card;
