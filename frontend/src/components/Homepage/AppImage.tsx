import { useTranslation } from "react-i18next";
import appEnImages from "../../static/app-en.png";
import appDaImages from "../../static/app-da.png";

const AppImage: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <div className="relative inline-block self-center">
      <img
        className="max-h-[500px] w-auto self-center"
        src={
          i18n.language === "da" || i18n.language === "da-DK"
            ? appDaImages
            : appEnImages
        }
        alt="app images"
      />
      <div className="absolute bottom-[-30px] left-1/2 transform -translate-x-1/2 w-[100%] h-2 bg-black opacity-60 rounded-full blur-lg"></div>
    </div>
  );
};

export default AppImage;
