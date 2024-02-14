import { useTranslation } from "react-i18next";
import appEnImages from "../../static/app-en.png";
import appDaImages from "../../static/app-da.png";

const AppImage: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <img
      className="max-h-[500px] w-auto self-center"
      src={
        i18n.language === "da" || i18n.language === "da-DK"
          ? appDaImages
          : appEnImages
      }
      alt="app images"
    />
  );
};

export default AppImage;
