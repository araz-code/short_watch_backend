const Info: React.FC = () => {
  return (
    <div>
      <h2 className="pb-5 text-lg font-medium">Data Source</h2>
      <p className="text-base pb-5">
        Every 15 minutes, the data in the app is updated with data from the
        Danish FSA's website, where information about short positions is
        continuously published. The timestamps for updates of short positions
        are based on the Danish FSA's data, not on the time when we fetched the
        information.
      </p>
      <h2 className="pb-5 text-lg font-medium">EU rules on short selling</h2>
      <p className="text-base pb-2">
        According to EU regulations, a natural or legal person who has a short
        position representing 0.1% or more of the issued share capital must
        report this to the Danish FSA. The Danish FSA aggregates these short
        positions for each stock and publishes them on their website. These
        percentage figures are the ones you see in the app.
      </p>
      <p className="text-base pb-5">
        It is important to understand that, as a short position only needs to be
        reported when it constitutes 0.1% or more of a company's issued shares,
        the actual short position could potentially be greater than the
        indicated percentage. This is because short positions below 0.1% are not
        included in the Danish FSA's data.
      </p>
      <h2 className="pb-5 text-lg font-medium">Short sellers</h2>
      <p className="text-base pb-2">
        EU regulations requires that a short seller's position is disclosed when
        it constitutes 0.5% or more of the issued share capital. Additionally,
        the short seller must report any change of 0.1% or more in the short net
        position.
      </p>

      <p className="text-base pb-5">
        When a short seller reduces their short position to below 0.5%, the
        short seller is removed from the list of "Largest sellers" in the app.
      </p>

      <h2 className="pb-5 text-lg font-medium">Why short sell?</h2>

      <p className="text-base pb-2">
        Some investors choose to take a short position as a strategic move in
        the market. This involves borrowing shares they do not own and selling
        them with the hope of buying them back later at a lower price, resulting
        in a profit. This practice may be motivated by an expectation that the
        stock's value will decline in the future, but it can also serve as a
        form of risk management in an investment portfolio.
      </p>
    </div>
  );
};

export default Info;
