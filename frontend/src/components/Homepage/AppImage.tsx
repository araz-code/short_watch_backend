import { useTranslation } from "react-i18next";
import appEnImages from "../../static/app-en.png";
import appDaImages from "../../static/app-da.png";

const AppImage: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <div className="relative inline-block self-center">
      <img
        className="max-h-[500px] w-auto self-center drop-shadow-2xl"
        src={
          i18n.language === "da" || i18n.language === "da-DK"
            ? appDaImages
            : appEnImages
        }
        alt="app images"
      />
      <div className="absolute bottom-[-25px] left-1/2 transform -translate-x-1/2 w-[80%] h-4 bg-black/35 rounded-[100%] blur-xl"></div>
    </div>
  );
};

export default AppImage;
