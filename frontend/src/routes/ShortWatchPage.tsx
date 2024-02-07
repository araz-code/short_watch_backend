import { useQuery } from "react-query";
import { fetchShortPositions } from "../apis/ShortPositionAPI";
import PageTemplate from "../components/PageTemplate";
import ShortPositionRow from "../components/ShortPositionRow";
import PricePoint from "../models/PricePoint";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import DropDownMenu from "../components/UI/DropDownMenu";
import ErrorBlock from "../components/UI/ErrorBlock";
import LoadingIndicator from "../components/UI/LoadingIndicator";
import Modal from "../components/UI/Modal";
import Info from "../components/Info";

const options = ["Symbol", "Date", "Value"];

const sort = (list: PricePoint[], selectedSorting: string) => {
  return list.sort((a, b) => {
    switch (selectedSorting) {
      case "Symbol":
        return a.symbol.localeCompare(b.symbol);
      case "Date":
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      case "Value":
        return +b.value - +a.value;
      default:
        return a.symbol.localeCompare(b.symbol);
    }
  });
};

const ShortWatchPage: React.FC = () => {
  const searchElement = useRef<HTMLInputElement>(null);
  const [selectedSorting, setSelectedSorting] = useState<string>(() => {
    const savedSorting = localStorage.getItem("selectedSorting");
    return savedSorting ? savedSorting : options[0];
  });
  const [showInfo, setShowInfo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["shorts"],
    queryFn: ({ signal }) => fetchShortPositions({ signal, category: "pick" }),
  });

  useEffect(() => {
    localStorage.setItem("selectedSorting", selectedSorting);
  }, [selectedSorting]);

  let content;

  if (isLoading) {
    content = (
      <div className="grid place-items-center h-screen">
        <LoadingIndicator />;
      </div>
    );
  } else if (isError) {
    const errorInfo = error as { info?: { message?: string } };

    content = (
      <ErrorBlock
        title="An error occurred"
        message={errorInfo.info?.message || "Failed to fetch short positions."}
      />
    );
  } else if (data) {
    content = (
      <ul>
        {sort(
          data.filter(
            (item: PricePoint) =>
              item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.name.toLowerCase().includes(searchTerm.toLowerCase())
          ),
          selectedSorting
        ).map((short: PricePoint) => (
          <li key={short.code}>
            <Link
              to={`/short-watch-details?code=${
                short.code
              }&name=${encodeURIComponent(short.name)}`}
            >
              <ShortPositionRow {...short} />
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="h-[calc(100dvh - 5rem)] xl:h-[calc(100dvh)] min-h-[620px] overflow-hidden">
      <PageTemplate>
        <div className="w-screen lg:w-[900px] m-auto">
          <p className="text-xl lg:text-3xl text-center font-bold py-6">
            Danish Short Watch
          </p>
          <section className="w-full">
            <div className="flex items-center mx-2">
              <input
                type="search"
                placeholder="Search"
                ref={searchElement}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="flex-1 border p-2 rounded-l focus:outline-none w-full"
              />
            </div>
            <div className="flex">
              <div className="p-2 pb-4">
                <DropDownMenu
                  options={options}
                  selectedMenuItem={selectedSorting}
                  onSelectMenuItemChange={setSelectedSorting}
                />
              </div>
              <button
                className="text-blue-500 text-center align-middle bg-transparent border-none text-lg ml-4"
                onClick={() => setShowInfo(true)}
              >
                Info
              </button>
            </div>
            <div className="overflow-y-auto min-h-[300px] h-[calc(100vh-25rem)]">
              {content}
            </div>
            <div className="flex mt-5">
              <div className="ml-3 mr-10">
                <Link
                  to="/privacy-policy"
                  className="text-blue-500 underline text-sm"
                >
                  Privacy policy
                </Link>
              </div>
              <div>
                <Link
                  to="/terms-of-agreement"
                  className="text-blue-500 underline text-sm"
                >
                  Terms of agreement
                </Link>
              </div>
            </div>
          </section>
        </div>
      </PageTemplate>

      {showInfo && (
        <div className="w-screen lg:w-[900px] m-auto">
          <Modal title="Information" onClose={() => setShowInfo(false)}>
            <Info />
          </Modal>
        </div>
      )}
    </div>
  );
};

export default ShortWatchPage;
