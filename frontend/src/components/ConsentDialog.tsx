import { useTranslation } from "react-i18next";
import { v4 as uuidv4 } from "uuid";
import Modal from "./UI/Modal";
import { updateConsent } from "../apis/ShortPositionAPI";

const localStorageConsentIdKey = "consentId";
const localStorageConsentAccepted = "consentAccepted";

const getOrGenerateConsentId = (): string => {
  const existingConsentId = localStorage.getItem(localStorageConsentIdKey);

  if (existingConsentId) {
    return existingConsentId;
  } else {
    const newConsentId = uuidv4();
    localStorage.setItem(localStorageConsentIdKey, newConsentId);
    return newConsentId;
  }
};

const ConsentDialog: React.FC<{
  onClose: () => void;
  onConsentAccepted: (value: boolean) => void;
}> = ({ onClose, onConsentAccepted }) => {
  const { t } = useTranslation();

  const consentAccepted = () => {
    localStorage.setItem(localStorageConsentAccepted, JSON.stringify(true));
    const consentId = getOrGenerateConsentId();
    updateConsent(consentId, true);
    onConsentAccepted(true);
    onClose();
  };

  const consentDeclined = () => {
    localStorage.setItem(localStorageConsentAccepted, JSON.stringify(false));

    const consentId = getOrGenerateConsentId();
    updateConsent(consentId, false);
    onConsentAccepted(false);
    onClose();
  };

  return (
    <Modal
      title={t("Cookie policy")}
      okButtonTitle="Accept"
      closeButtonTitle="Decline"
      onOk={consentAccepted}
      onClose={consentDeclined}
    >
      <div>
        <h2 className="pb-5 text-lg font-medium">
          {t(
            "We use cookies to collect statistics on the usage of the website"
          )}
        </h2>
        <p className="text-base pb-5">
          {t(
            "If you click the 'Accept' button, you consent to our use of cookies for statistical purposes. We use this data to improve the user experience for you and other visitors."
          )}
        </p>
        <p className="text-base pb-5">
          {t(
            "If you click the 'Decline' button, we will not set cookies for statistical purposes. However, we will use a cookie to remember your choice and to support the functionality of the website."
          )}
        </p>
        <p className="text-base pb-5">
          {t(
            "You can change or withdraw your consent at any time by clicking the green 'cookie' button in the bottom left corner."
          )}
        </p>
        <p className="text-base pb-5">
          {t(
            "You can read more about our cookie policy in the privacy policy."
          )}
        </p>
      </div>
    </Modal>
  );
};

export default ConsentDialog;
