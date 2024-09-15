import { useTranslation } from "react-i18next";

const FavoriteToggleButton: React.FC<{
  isFavorite: boolean;
  removeFromMyList: () => void;
  addToMyList: () => void;
}> = (props) => {
  const { isFavorite, removeFromMyList, addToMyList } = props;
  const { t } = useTranslation();

  return (
    <button
      className="underline bg-transparent border-none text-lg pr-4 pt-4 text-[#daa520] hover:text-[#b8860b]"
      onClick={() => (isFavorite ? removeFromMyList() : addToMyList())}
      title={isFavorite ? t("Remove from my list") : t("Add to my list")}
    >
      {isFavorite ? (
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.27L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.27L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
};

export default FavoriteToggleButton;
