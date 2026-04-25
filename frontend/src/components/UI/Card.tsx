import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const Card: React.FC<{
  icon: IconDefinition;
  title: string;
  content: string;
}> = ({ icon, title, content }) => {
  return (
    <figure className="p-4 max-w-sm group">
      <div className="flex flex-col p-6 h-full rounded-2xl bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="flex flex-col items-center mb-4">
          <div className="mb-3 w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
            <FontAwesomeIcon size="lg" icon={icon} />
          </div>
          <h3 className="text-lg font-semibold self-start text-gray-800 dark:text-white">
            {title}
          </h3>
        </div>
        <div className="flex flex-col justify-between grow">
          <p className="leading-relaxed text-md text-gray-600 dark:text-gray-400">
            {content}
          </p>
        </div>
      </div>
    </figure>
  );
};

export default Card;
