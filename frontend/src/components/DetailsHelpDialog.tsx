import { useTranslation } from "react-i18next";
import Modal from "./UI/Modal";

const DetailsHelpDialog: React.FC<{ onClose: () => void; sharesOutstanding: number | null }> = ({ onClose, sharesOutstanding }) => {
  const { t } = useTranslation();

  return (
    <Modal
      title={t("How to read this page")}
      closeButtonTitle="Close"
      onClose={onClose}
      enableXClose={true}
      centerOnMobile={true}
    >
      <div className="space-y-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("The big number")}
          </h2>
          <p>
            {t(
              "The percentage at the top is the latest aggregate short interest in the stock: The sum of all disclosed short positions, expressed as a share of the company's issued capital. The arrow next to it shows the change since the previous reported value."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Percentile and 7-day change")}
          </h2>
          <p>
            {t(
              "The percentile tells you how the current short interest ranks against this stock's full history. 90th means it has only been higher 10% of the time. The 7d figure shows how much the short percentage has moved over the last week."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Avg. short price")}
          </h2>
          <p className="mb-2">
            {t(
              "The average price at which all short positions were opened, weighted by the number of shares shorted at each price level. A stock trading well above this number means shorts are currently sitting at a loss."
            )}
          </p>
          <p>
            {t(
              "The net avg. price refines this further: It only includes price levels where more shares were shorted than covered, meaning it reflects where the still-open shorts are concentrated. If a price level has already been fully covered, it no longer influences this number."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("The chart")}
          </h2>
          <p className="mb-3">
            {t(
              "The blue area is the short position over time. The yellow dashed line marks the latest value so you can see at a glance whether shorts are higher or lower than today. Use the period buttons (1W, 1M, …, Max) to zoom in or out."
            )}
          </p>
          <p>
            {t(
              "Toggle the bar-chart icon to overlay the daily closing price (purple) and trading volume (grey). When closing prices are visible, a small bar profile appears on the left edge of the chart (see below)."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Three tabs below the chart")}
          </h2>
          <p className="mb-2">
            <strong>{t("Historic data")}</strong>
            {": "}
            {t(
              "every reported snapshot of the aggregate short percentage, newest first."
            )}
          </p>
          <p className="mb-2">
            <strong>{t("Largest sellers")}</strong>
            {": "}
            {t(
              "the named short sellers currently disclosing positions of 0.5% or more, with their sizes and the dates of their latest changes."
            )}
          </p>
          <p>
            <strong>{t("Price flow")}</strong>
            {": "}
            {t(
              "shares opened (red) and covered (green) bucketed by the price at which the trade most likely happened. The Net column shows the direction in each band. Bars on the left of the chart visualize the same data."
            )}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("How is price flow calculated?")}
          </h2>
          <p>
            {t(
              "For each day where the aggregate short percentage changes, the change is converted into a number of shares (delta % × total shares outstanding). Because Danish disclosures must be filed by 15:30 the trading day after the trade, the trade itself is attributed to the previous trading day's closing price. Each delta is then placed in a 2%-wide price band."
            )}
          </p>
          {sharesOutstanding != null && (
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {t("Shares outstanding")}{": "}
              <span className="font-semibold text-gray-700 dark:text-gray-200 tabular-nums">
                {sharesOutstanding.toLocaleString()}
              </span>
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400 mb-2">
            {t("Star to follow")}
          </h2>
          <p>
            {t(
              "Tap the yellow star in the top right to add this stock to your personal list. From the main page you can then filter to only the stocks you starred."
            )}
          </p>
        </section>
      </div>
    </Modal>
  );
};

export default DetailsHelpDialog;
