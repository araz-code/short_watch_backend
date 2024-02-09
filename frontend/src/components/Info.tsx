import { useTranslation } from "react-i18next";

const Info: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h2 className="pb-5 text-lg font-medium">
        {t("infoDataSourceHeadline")}
      </h2>
      <p className="text-base pb-5">{t("infoDataSource")}</p>
      <h2 className="pb-5 text-lg font-medium">
        {t("infoEuRulesShortingHeadline")}
      </h2>
      <p className="text-base pb-3">{t("infoEuRulesShorting1")}</p>
      <p className="text-base pb-5">{t("infoEuRulesShorting2")}</p>
      <h2 className="pb-5 text-lg font-medium">
        {t("infoShortSellersHeadline")}
      </h2>
      <p className="text-base pb-3">{t("infoShortSellers1")}</p>

      <p className="text-base pb-5">{t("infoShortSellers2")}</p>

      <h2 className="pb-5 text-lg font-medium">
        {t("infoWhyShortSellHeadline")}
      </h2>

      <p className="text-base pb-2">{t("infoWhyShortSell")}</p>
    </div>
  );
};

export default Info;
