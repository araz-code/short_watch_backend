import PageTemplate from "../components/PageTemplate";

const englishVersion = () => {
  return (
    <>
      <div className="m-auto mb-12 mt-4">
        <h1 className="text-4xl font-bold text-center">
          Terms of Agreement for use of the Danish Short Watch App
        </h1>
      </div>

      <section>
        <p className="pb-2">
          We cannot guarantee the accuracy of data within the Danish Short Watch
          app (the app). This data is collected from Danish FSA’s web portal
          which is a database for company announcements filed by companies which
          under section 25 of the Danish Capital Markets Act are obliged to file
          information with the Danish FSA.
        </p>

        <p className="pb-2">
          We are not responsible for how users utilize the app or the
          information and materials published therein.
        </p>

        <p className="pb-2">
          Users are solely responsible for downloading or using information and
          other resources publicly available in the app, including those
          accessed through external links.
        </p>

        <p className="pb-2">
          We cannot be held liable for delays or errors in data.
        </p>

        <p className="pb-2">
          We are not responsible for loss on the user or any indirect losses
          incurred.
        </p>
      </section>
    </>
  );
};

const danishVersion = () => {
  return (
    <>
      <div className="m-auto mb-12">
        <h1 className="text-4xl font-bold text-center">
          Aftalevilkår for brug af Danish Short Watch app{" "}
        </h1>
      </div>

      <section>
        <p className="pb-2">
          Vi kan ikke garantere nøjagtigheden af data i Danish Short
          Watch-app'en (app'en). Disse data indsamles fra Finanstilsynets
          webportal, som er en database over virksomhedsmeddelelser indsendt af
          virksomheder, der i henhold til § 25 i den danske kapitalmarkedslov er
          forpligtet til at indsende oplysninger til den danske Finanstilsyn.
        </p>

        <p className="pb-2">
          Vi er ikke ansvarlige for, hvordan brugere anvender app'en eller de
          oplysninger, der er offentliggjort deri.
        </p>

        <p className="pb-2">
          Brugere er udelukkende ansvarlige for at downloade eller bruge
          information og andre ressourcer, der er offentligt tilgængelige i
          appen, herunder dem der tilgås gennem eksterne links.
        </p>

        <p className="pb-2">
          Vi kan ikke holdes ansvarlige for forsinkelser eller fejl i data.
        </p>

        <p className="pb-2">
          Vi er ikke ansvarlige for tab hos brugeren eller eventuelle indirekte
          tab, der måtte opstå.
        </p>
      </section>
    </>
  );
};

const TermsOfAgreement: React.FC<{ language: string }> = ({ language }) => {
  return (
    <PageTemplate>
      <div className="px-10">
        {language === "danish" ? danishVersion() : englishVersion()}
      </div>
    </PageTemplate>
  );
};

export default TermsOfAgreement;
